const {test}=require('node:test'),assert=require('node:assert/strict'),{createHmac}=require('node:crypto');
class Bucket {
 constructor(){this.items=new Map();}
 async put(key,value){this.items.set(key,value);}
 async delete(key){this.items.delete(key);}
 async get(key){const value=this.items.get(key);return value===undefined?null:{text:async()=>value,json:async()=>JSON.parse(value)};}
 async list({prefix,limit}){return {objects:[...this.items.keys()].filter(k=>k.startsWith(prefix)).slice(0,limit).map(key=>({key})),truncated:false};}
}
const secret='unit-test-only-secret-12345678901234567890';
test('Cloudflare Worker buffers before delivery, signs requests, retries and protects archive reads',async()=>{
 const worker=(await import('../cloudflare/email-worker/worker.mjs')).default;
 const bucket=new Bucket(),env={EMAIL_SECRET:secret,EMAIL_DOMAIN:'inbound.example.invalid',WEBHOOK_URL:'https://app.example.invalid/api/webhooks/cloudflare-email',EMAIL_BUFFER:bucket};
 const to='wallet-'+'a'.repeat(48)+'@inbound.example.invalid',raw='From: bank@example.invalid\r\nSubject: Payment\r\n\r\nAmount Rp 100';
 const message=()=>({to,rawSize:Buffer.byteLength(raw),raw:new Response(raw).body,setReject:()=>assert.fail('Valid message rejected')});
 const original=global.fetch;let attempts=0,id;
 try{
  global.fetch=async(_url,options)=>{attempts++;const expected=createHmac('sha256',secret).update(options.headers['x-email-timestamp']+'.'+options.body).digest('hex');assert.equal(options.headers['x-email-signature'],expected);const payload=JSON.parse(options.body);id=payload.id;assert.ok(bucket.items.has('pending/'+id+'.json'));return new Response('down',{status:503});};
  await worker.email(message(),env);assert.equal(attempts,1);assert.ok(bucket.items.has('pending/'+id+'.json'));
  global.fetch=async()=>new Response(JSON.stringify({success:true,data:{received:true}}),{status:200});
  await worker.scheduled({},env);assert.ok(!bucket.items.has('pending/'+id+'.json'));assert.ok(bucket.items.has('archive/'+id+'.json'));
  assert.equal((await worker.fetch(new Request('https://worker.example/read',{method:'POST',body:JSON.stringify({id})}),env)).status,401);
  const body=JSON.stringify({id}),timestamp=String(Math.floor(Date.now()/1000));
  const response=await worker.fetch(new Request('https://worker.example/read',{method:'POST',body,headers:{'x-email-timestamp':timestamp,'x-email-signature':createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex')}}),env);
  assert.equal(response.status,200);assert.equal(Buffer.from((await response.json()).raw,'base64').toString(),raw);
  assert.equal((await worker.fetch(new Request('https://worker.example/'),env)).status,404);
  let rejected=false;await worker.email({...message(),to:'support@inbound.example.invalid',setReject:()=>{rejected=true;}},env);assert.ok(rejected);
  rejected=false;await worker.email({...message(),rawSize:1048577,setReject:()=>{rejected=true;}},env);assert.ok(rejected);
 }finally{global.fetch=original;}
});
test('Worker does not discard a message on an unrelated 2xx response',async()=>{
 const worker=(await import('../cloudflare/email-worker/worker.mjs')).default,bucket=new Bucket(),original=global.fetch;
 try{global.fetch=async()=>new Response('{}',{status:200});await worker.email({to:'wallet-'+'b'.repeat(48)+'@inbound.example.invalid',rawSize:1,raw:new Response('x').body,setReject:()=>assert.fail()}, {EMAIL_DOMAIN:'inbound.example.invalid',EMAIL_SECRET:secret,WEBHOOK_URL:'https://app.example.invalid/api/webhooks/cloudflare-email',EMAIL_BUFFER:bucket});assert.equal([...bucket.items.keys()].filter(k=>k.startsWith('pending/')).length,1);}finally{global.fetch=original;}
});
