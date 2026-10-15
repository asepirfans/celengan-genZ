import pool from '@/lib/db';
import { assert, atomic } from './api';
import { parseCloudflareRaw } from './email-provider';
import { syncEmail } from './email-sync';
import { gmailVerification, mailbox, receivedEmailText, suggestEmail } from '@/lib/inbound-email';

interface Payload { id: string; recipient: string; raw: string; received_at: string; }
// Limits cover base64 payload text, not the entire database or billing.
const GLOBAL_LIMIT = 100 * 1024 * 1024;
const USER_LIMIT = 10 * 1024 * 1024;

export async function storeCloudflareEmail(payload: Payload) {
  return atomic(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('cloudflare-payload-capacity'))");
    await client.query('DELETE FROM cloudflare_email_payloads WHERE expires_at <= now()');
    const inbox = (await client.query('SELECT user_id FROM email_inboxes WHERE local_part=$1 AND enabled FOR SHARE', [payload.recipient.split('@')[0]])).rows[0];
    if (!inbox) return false;
    if ((await client.query('SELECT id FROM cloudflare_email_payloads WHERE id=$1', [payload.id])).rows[0]) return true;
    const usage = (await client.query('SELECT COALESCE(SUM(octet_length(raw_base64)),0) AS total, COALESCE(SUM(octet_length(raw_base64)) FILTER (WHERE user_id=$1),0) AS own FROM cloudflare_email_payloads', [inbox.user_id])).rows[0];
    assert(Number(usage.total) + payload.raw.length <= GLOBAL_LIMIT && Number(usage.own) + payload.raw.length <= USER_LIMIT, 'Penyimpanan email sementara penuh.', 503);
    await client.query('INSERT INTO cloudflare_email_payloads(id,user_id,recipient,raw_base64,received_at) VALUES($1,$2,$3,$4,$5)', [payload.id, inbox.user_id, payload.recipient, payload.raw, payload.received_at]);
    return true;
  });
}

export async function processCloudflareEmail(id: string): Promise<boolean> {
  try {
    await atomic(async client => {
      const payload = (await client.query('SELECT * FROM cloudflare_email_payloads WHERE id=$1 AND expires_at>now() FOR UPDATE', [id])).rows[0];
      if (!payload || payload.processed_at) return;
      const enabled = (await client.query('SELECT user_id FROM email_inboxes WHERE user_id=$1 AND enabled FOR SHARE', [payload.user_id])).rows[0];
      if (enabled) {
        const email = await parseCloudflareRaw(payload.raw_base64);
        const sender = email.from?.address ? mailbox(email.from.address) : null;
        assert(sender, 'Pengirim email tidak valid.');
        const content = receivedEmailText(email), subject = String(email.subject || '').slice(0, 500);
        const suggestion = suggestEmail(subject, content);
        const verification = sender === 'forwarding-noreply@google.com' ? gmailVerification(content) : null;
        await client.query("INSERT INTO inbound_emails(user_id,provider_id,provider,recipient,sender,subject,received_at,suggested,verification) VALUES($1,$2,'cloudflare',$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,provider_id) DO NOTHING", [payload.user_id, 'cf:' + id, payload.recipient, sender, subject, payload.received_at, JSON.stringify(suggestion), verification ? JSON.stringify(verification) : null]);
        const item = (await client.query('SELECT id FROM inbound_emails WHERE user_id=$1 AND provider_id=$2', [payload.user_id, 'cf:' + id])).rows[0];
        if (sender === 'forwarding-noreply@google.com') {
          await client.query("UPDATE inbound_emails SET status='ignored' WHERE id=$1 AND status='pending'", [item.id]);
        } else {
          const result = await syncEmail(client, item.id, payload.user_id);
          if (result.status === 'pending') await client.query('UPDATE inbound_emails SET sync_reason=$1 WHERE id=$2', [result.reason, item.id]);
        }
      }
      await client.query('UPDATE cloudflare_email_payloads SET processed_at=now() WHERE id=$1', [id]);
    });
    return true;
  } catch {
    await pool.query("UPDATE cloudflare_email_payloads SET attempts=attempts+1,next_attempt_at=now()+interval '5 minutes' WHERE id=$1 AND processed_at IS NULL", [id]).catch(() => {});
    console.error('Cloudflare email retained in database for retry');
    return false;
  }
}

export async function retryCloudflareEmails() {
  await pool.query('DELETE FROM cloudflare_email_payloads WHERE expires_at <= now()');
  const rows = (await pool.query('SELECT id FROM cloudflare_email_payloads WHERE processed_at IS NULL AND expires_at>now() AND next_attempt_at<=now() ORDER BY next_attempt_at,created_at LIMIT 5')).rows;
  let processed = 0;
  for (const row of rows) if (await processCloudflareEmail(row.id)) processed++;
  return { retried: true, processed, attempted: rows.length };
}
