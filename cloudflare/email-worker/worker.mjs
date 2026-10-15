const LIMIT = 1048576;
const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
async function signature(body, timestamp, secret) {
  if (!secret || secret.length < 32) throw new Error('Email secret missing');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp + '.' + body)));
}
async function send(payload, env, retry = false) {
  const target = new URL(env.WEBHOOK_URL);
  if (target.protocol !== 'https:' || target.pathname !== '/api/webhooks/cloudflare-email' || target.username || target.password || target.search || target.hash) throw new Error('Webhook URL invalid');
  const timestamp = String(Math.floor(Date.now() / 1000)), body = JSON.stringify(payload);
  // Workers supports manual/follow only. Never forward signed email bodies to redirects.
  const response = await fetch(target, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json', 'x-email-timestamp': timestamp, 'x-email-signature': await signature(body, timestamp, env.EMAIL_SECRET) }, body, signal: AbortSignal.timeout(15000) });
  const result = await response.json().catch(() => null);
  const acknowledged = retry ? result?.data?.retried === true : result?.data?.received === true || result?.data?.ignored === true;
  if (!response.ok || result?.success !== true || !acknowledged) throw new Error('Webhook not acknowledged; email was not confirmed stored');
}
export default {
  async email(message, env) {
    const recipient = message.to.toLowerCase(), domain = env.EMAIL_DOMAIN?.toLowerCase();
    if (!domain || recipient.split('@').length !== 2 || recipient.split('@')[1] !== domain || !/^wallet-[a-f0-9]{48}$/.test(recipient.split('@')[0])) { message.setReject('Recipient not supported'); return; }
    if (message.rawSize > LIMIT) { message.setReject('Message exceeds application 1 MiB limit'); return; }
    const reader = message.raw.getReader(), chunks = []; let size = 0;
    for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > LIMIT) { await reader.cancel(); message.setReject('Message exceeds application 1 MiB limit'); return; } chunks.push(part.value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const prefix = encoder.encode(recipient + '\0'), identity = new Uint8Array(prefix.length + bytes.length); identity.set(prefix); identity.set(bytes, prefix.length);
    const id = hex(await crypto.subtle.digest('SHA-256', identity));
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    // No local buffer: failures must propagate instead of silently acknowledging delivery.
    await send({ id, recipient, received_at: new Date().toISOString(), raw: btoa(binary) }, env);
  },
  async scheduled(_event, env) { await send({ action: 'retry' }, env, true); },
  async fetch() { return new Response('Not found', { status: 404 }); }
};
