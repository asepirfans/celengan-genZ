// Expose only the signed inbound webhook, never the development app or its source.
const http = require('node:http');
const port = Number(process.env.EMAIL_PROXY_PORT || 3011);
const upstream = process.env.EMAIL_APP_URL || 'http://127.0.0.1:3000';
const server = http.createServer(async (req, res) => {
 if (req.url !== '/api/webhooks/email' || req.method !== 'POST') {
  res.writeHead(404); res.end('Not found'); return;
 }
 let size = 0; const chunks = [];
 try {
  for await (const chunk of req) {
   size += chunk.length;
   if (size > 65536) { res.writeHead(413); res.end('Payload too large'); return; }
   chunks.push(chunk);
  }
  const headers = { 'content-type': 'application/json' };
  for (const key of ['svix-id','svix-timestamp','svix-signature']) {
   if (typeof req.headers[key] === 'string') headers[key] = req.headers[key];
  }
  const result = await fetch(upstream + '/api/webhooks/email', {
   method: 'POST', headers, body: Buffer.concat(chunks), signal: AbortSignal.timeout(20000),
  });
  res.writeHead(result.status, {'content-type':'application/json','cache-control':'no-store'});
  res.end(await result.text());
 } catch { if (!res.headersSent) res.writeHead(503); res.end('Webhook upstream unavailable'); }
});
server.listen(port, '127.0.0.1', () => console.log('Webhook-only proxy listening on 127.0.0.1:' + port));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close());
