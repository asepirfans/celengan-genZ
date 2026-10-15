import PostalMime from 'postal-mime';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { assert } from './api';
import { mailbox } from '@/lib/inbound-email';

export function emailConfig() {
 const provider=process.env.INBOUND_EMAIL_PROVIDER||'resend';
 const domain=(provider==='cloudflare'?process.env.CLOUDFLARE_EMAIL_DOMAIN:process.env.INBOUND_EMAIL_DOMAIN)?.trim().toLowerCase();
 const configured=!!(domain&&/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)&&(provider==='cloudflare'?process.env.CLOUDFLARE_EMAIL_SECRET&&process.env.CLOUDFLARE_EMAIL_SECRET.length>=32:provider==='resend'&&process.env.RESEND_API_KEY&&process.env.RESEND_WEBHOOK_SECRET));
 return {provider,domain,configured};
}
export function signCloudflare(body:string,timestamp:string,secret:string) {return createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex');}
export function verifyCloudflare(body:string,headers:Headers,secret:string,now=Date.now()) {
 const timestamp=headers.get('x-email-timestamp')||'',signature=headers.get('x-email-signature')||'';
 if(!/^\d{10,13}$/.test(timestamp)||Math.abs(now-Number(timestamp)*1000)>300000||!/^([a-f0-9]{64})$/.test(signature))return false;
 return timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(signCloudflare(body,timestamp,secret),'hex'));
}
export async function boundedBody(req:Request,limit:number) {
 assert(Number(req.headers.get('content-length')||0)<=limit,'Payload terlalu besar.',413);
 const reader=req.body?.getReader();assert(reader,'Payload kosong.');let size=0;const chunks:Uint8Array[]=[];
 for(;;){const value=await reader.read();if(value.done)break;size+=value.value.length;if(size>limit){await reader.cancel();assert(false,'Payload terlalu besar.',413);}chunks.push(value.value);}
 return Buffer.concat(chunks).toString('utf8');
}
export async function parseCloudflareRaw(raw:unknown) {
 assert(typeof raw==='string'&&raw.length<=1400000&&/^[A-Za-z0-9+/]*={0,2}$/.test(raw),'Format email tidak valid.');
 const bytes=Buffer.from(raw,'base64');assert(bytes.length>0&&bytes.length<=1048576&&bytes.toString('base64')===raw,'Ukuran atau encoding email tidak valid.');
 return PostalMime.parse(bytes,{maxNestingDepth:30,maxPartCount:100,maxHeadersSize:32768});
}
export async function originalEmail(item:{provider:string;provider_id:string;recipient?:string|null;local_part:string}) {
 if(item.provider==='cloudflare'){
  const secret=process.env.CLOUDFLARE_EMAIL_SECRET,url=process.env.CLOUDFLARE_EMAIL_WORKER_URL;assert(secret&&url,'Penyimpanan email Cloudflare belum dikonfigurasi.',503);
  const target=new URL('/read',url);assert(target.protocol==='https:'&&!target.username&&!target.password,'URL Worker tidak valid.',503);
  const body=JSON.stringify({id:item.provider_id.replace(/^cf:/,'')}),timestamp=String(Math.floor(Date.now()/1000));
  const response=await fetch(target,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json','x-email-timestamp':timestamp,'x-email-signature':signCloudflare(body,timestamp,secret)},body,cache:'no-store',signal:AbortSignal.timeout(15000)});
  assert(response.ok,response.status===404?'Salinan email sudah kedaluwarsa. Periksa email asli di Gmail.':'Salinan email belum dapat dibaca.',response.status===404?410:503);
  const data=await response.json();assert(data.recipient===item.recipient,'Tujuan email tidak cocok.',403);return parseCloudflareRaw(data.raw);
 }
 const response=await fetch('https://api.resend.com/emails/receiving/'+encodeURIComponent(item.provider_id),{headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY},cache:'no-store',signal:AbortSignal.timeout(10000)});
 assert(response.ok,'Email asli belum dapat diambil. Coba lagi nanti.',503);const email=await response.json();
 const recipient=item.recipient||`${item.local_part}@${process.env.INBOUND_EMAIL_DOMAIN}`;
 assert(Array.isArray(email.to)&&email.to.some((address:unknown)=>typeof address==='string'&&mailbox(address)===recipient),'Tujuan email tidak cocok.',403);return email;
}
