const { test } = require('node:test'), assert = require('node:assert/strict'), { createHmac, createHash } = require('node:crypto');
const secret = 'unit-test-only-secret-12345678901234567890';
const env = { EMAIL_SECRET: secret, EMAIL_DOMAIN: 'inbound.example.invalid', WEBHOOK_URL: 'https://app.example.invalid/api/webhooks/cloudflare-email' };
const to = 'wallet-' + 'a'.repeat(48) + '@inbound.example.invalid';
const raw = 'From: bank@example.invalid\r\nSubject: Payment\r\n\r\nAmount Rp 100';
const message = () => ({ to, rawSize: Buffer.byteLength(raw), raw: new Response(raw).body, setReject: () => assert.fail('Valid message rejected') });
function checkSignature(options) { assert.equal(options.headers['x-email-signature'], createHmac('sha256', secret).update(options.headers['x-email-timestamp'] + '.' + options.body).digest('hex')); }

test('Worker sends stable identity and signed MIME without R2; queued database acknowledgement is accepted', async () => {
  const worker = (await import('../cloudflare/email-worker/worker.mjs')).default, original = global.fetch;
  try {
    let deliveries = 0;
    global.fetch = async (url, options) => {
      assert.equal(url.href, env.WEBHOOK_URL); checkSignature(options);
      const payload = JSON.parse(options.body);
      assert.equal(payload.id, createHash('sha256').update(to + '\0').update(raw).digest('hex'));
      assert.equal(Buffer.from(payload.raw, 'base64').toString(), raw);
      deliveries++;
      return new Response(JSON.stringify({ success: true, data: { received: true, queued: true } }));
    };
    await worker.email(message(), env); await worker.email(message(), env); assert.equal(deliveries, 2);
  } finally { global.fetch = original; }
});

test('Worker propagates failures and unrelated 2xx responses instead of losing email silently', async () => {
  const worker = (await import('../cloudflare/email-worker/worker.mjs')).default, original = global.fetch;
  try {
    for (const response of [new Response('down', { status: 503 }), new Response('{}'), new Response(JSON.stringify({ success: true, data: { retried: true } }))]) {
      global.fetch = async () => response;
      await assert.rejects(() => worker.email(message(), env), /not acknowledged/);
    }
    global.fetch = async () => { throw new Error('Offline'); };
    await assert.rejects(() => worker.email(message(), env), /Offline/);
    await assert.rejects(() => worker.email(message(), { ...env, WEBHOOK_URL: 'http://example.invalid/api/webhooks/cloudflare-email' }), /URL invalid/);
  } finally { global.fetch = original; }
});

test('Scheduled retry is signed, requires database acknowledgement, and exposes no archive endpoint', async () => {
  const worker = (await import('../cloudflare/email-worker/worker.mjs')).default, original = global.fetch;
  try {
    global.fetch = async (_url, options) => { checkSignature(options); assert.deepEqual(JSON.parse(options.body), { action: 'retry' }); return new Response(JSON.stringify({ success: true, data: { retried: true } })); };
    await worker.scheduled({}, env);
    global.fetch = async () => new Response('{}');
    await assert.rejects(() => worker.scheduled({}, env), /not acknowledged/);
    assert.equal((await worker.fetch(new Request('https://worker.example/read'))).status, 404);
    let rejected = false;
    await worker.email({ ...message(), to: 'support@inbound.example.invalid', setReject: () => { rejected = true; } }, env); assert.ok(rejected);
    rejected = false;
    await worker.email({ ...message(), rawSize: 1048577, setReject: () => { rejected = true; } }, env); assert.ok(rejected);
    rejected = false;
    await worker.email({ ...message(), raw: new Response('x'.repeat(1048577)).body, setReject: () => { rejected = true; } }, env); assert.ok(rejected);
  } finally { global.fetch = original; }
});