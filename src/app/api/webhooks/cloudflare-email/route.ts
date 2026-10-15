import { createHash } from 'node:crypto';
import { assert, failure, ok } from '@/lib/server/api';
import { boundedBody, parseCloudflareRaw, verifyCloudflare } from '@/lib/server/email-provider';
import { processCloudflareEmail, retryCloudflareEmails, storeCloudflareEmail } from '@/lib/server/cloudflare-email';
import { mailbox } from '@/lib/inbound-email';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const secret = process.env.CLOUDFLARE_EMAIL_SECRET, domain = process.env.CLOUDFLARE_EMAIL_DOMAIN?.trim().toLowerCase();
    assert(secret && secret.length >= 32 && domain, 'Cloudflare Email belum dikonfigurasi.', 503);
    const raw = await boundedBody(req, 1500000);
    assert(verifyCloudflare(raw, req.headers, secret), 'Tanda tangan webhook tidak valid.', 401);
    const event = JSON.parse(raw);
    assert(event && typeof event === 'object' && !Array.isArray(event), 'Payload tidak valid.');
    if (event.action === 'retry') return ok(await retryCloudflareEmails());
    assert(typeof event.recipient === 'string' && mailbox(event.recipient) === event.recipient && event.recipient.endsWith('@' + domain), 'Tujuan email tidak valid.');
    const received = new Date(event.received_at);
    assert(!Number.isNaN(received.getTime()) && received.getTime() <= Date.now() + 300000, 'Tanggal email tidak valid.');
    const email = await parseCloudflareRaw(event.raw);
    assert(email.from?.address && mailbox(email.from.address), 'Pengirim email tidak valid.');
    const id = createHash('sha256').update(event.recipient + '\0').update(Buffer.from(event.raw, 'base64')).digest('hex');
    assert(event.id === id, 'ID email tidak cocok.');
    if (!await storeCloudflareEmail({ id, recipient: event.recipient, raw: event.raw, received_at: received.toISOString() })) return ok({ ignored: true });
    const processed = await processCloudflareEmail(id);
    return ok({ received: true, queued: !processed });
  } catch (error) { return failure(error); }
}