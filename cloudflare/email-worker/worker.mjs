const LIMIT=1048576;
const encoder=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
async function key(secret){if(!secret||secret.length<32)throw new Error('Email secret missing');return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function signature(body,timestamp,secret){return hex(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(timestamp+'.'+body)));}
async function send(payload,env){
 const target=new URL(env.WEBHOOK_URL);
 if(target.protocol!=='https:'||target.pathname!=='/api/webhooks/cloudflare-email'||target.username||target.password||target.search||target.hash)throw new Error('Webhook URL invalid');
 const timestamp=String(Math.floor(Date.now()/1000)),body=JSON.stringify(payload);
 const response=await fetch(target,{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-email-timestamp':timestamp,'x-email-signature':await signature(body,timestamp,env.EMAIL_SECRET)},body,signal:AbortSignal.timeout(15000)});
 // A 2xx without the application's acknowledgement is not durable acceptance.
 const result=await response.json().catch(()=>null);
 if(!response.ok||result?.success!==true||!(result.data?.received||result.data?.ignored))throw new Error('Webhook not acknowledged');
 await env.EMAIL_BUFFER.put('archive/'+payload.id+'.json',body);
 await env.EMAIL_BUFFER.delete('pending/'+payload.id+'.json');
}
export default {
 async email(message,env){
  const recipient=message.to.toLowerCase(),domain=env.EMAIL_DOMAIN?.toLowerCase();
  if(!domain||recipient.split('@').length!==2||recipient.split('@')[1]!==domain||!/^wallet-[a-f0-9]{48}$/.test(recipient.split('@')[0])){message.setReject('Recipient not supported');return;}
  if(message.rawSize>LIMIT){message.setReject('Message exceeds application 1 MiB limit');return;}
  const reader=message.raw.getReader(),chunks=[];let size=0;
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>LIMIT){await reader.cancel();message.setReject('Message exceeds application 1 MiB limit');return;}chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const prefix=encoder.encode(recipient+'\0'),identity=new Uint8Array(prefix.length+bytes.length);identity.set(prefix);identity.set(bytes,prefix.length);
  const id=hex(await crypto.subtle.digest('SHA-256',identity));
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  // Preserve the initial receipt time across retries and SMTP redelivery.
  const stored=await env.EMAIL_BUFFER.get('pending/'+id+'.json');
  const payload=stored?await stored.json():{id,recipient,received_at:new Date().toISOString(),raw:btoa(binary)};
  if(!stored)await env.EMAIL_BUFFER.put('pending/'+id+'.json',JSON.stringify(payload));
  try{await send(payload,env);}catch{console.error('Email retained for retry');}
 },
 async scheduled(_event,env){
  // Persist pagination so one failed item cannot starve later emails.
  const saved=await env.EMAIL_BUFFER.get('control/retry-cursor');
  const cursor=saved?await saved.text():undefined;
  const page=await env.EMAIL_BUFFER.list({prefix:'pending/',limit:5,...(cursor?{cursor}:{})});
  for(const entry of page.objects){
   const object=await env.EMAIL_BUFFER.get(entry.key);if(!object)continue;
   try{await send(await object.json(),env);}catch{console.error('Pending email retry failed');}
  }
  if(page.truncated)await env.EMAIL_BUFFER.put('control/retry-cursor',page.cursor);else await env.EMAIL_BUFFER.delete('control/retry-cursor');
 },
 async fetch(request,env){
  if(new URL(request.url).pathname!=='/read'||request.method!=='POST')return new Response('Not found',{status:404});
  if(Number(request.headers.get('content-length')||0)>1024)return new Response('Too large',{status:413});
  const reader=request.body?.getReader();if(!reader)return new Response('Missing body',{status:400});
  let size=0;const chunks=[];for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>1024){await reader.cancel();return new Response('Too large',{status:413});}chunks.push(part.value);}
  const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}const body=new TextDecoder().decode(all);
  const timestamp=request.headers.get('x-email-timestamp')||'',sig=request.headers.get('x-email-signature')||'';
  if(!/^\d{10}$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp)*1000)>300000||!/^[a-f0-9]{64}$/.test(sig))return new Response('Unauthorized',{status:401});
  const bytes=Uint8Array.from(sig.match(/../g),v=>parseInt(v,16));
  if(!await crypto.subtle.verify('HMAC',await key(env.EMAIL_SECRET),bytes,encoder.encode(timestamp+'.'+body)))return new Response('Unauthorized',{status:401});
  let id;try{id=JSON.parse(body).id;}catch{return new Response('Invalid JSON',{status:400});}
  if(!/^[a-f0-9]{64}$/.test(id))return new Response('Invalid id',{status:400});
  const object=await env.EMAIL_BUFFER.get('archive/'+id+'.json')||await env.EMAIL_BUFFER.get('pending/'+id+'.json');
  if(!object)return new Response('Expired',{status:404});
  return new Response(await object.text(),{headers:{'content-type':'application/json','cache-control':'no-store'}});
 }
};
