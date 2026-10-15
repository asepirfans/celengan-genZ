import { Webhook } from 'svix';
import pool from '@/lib/db';
import { assert, atomic, failure, ok } from '@/lib/server/api';
import { syncEmail } from '@/lib/server/email-sync';
import { mailbox, receivedEmailText, suggestEmail } from '@/lib/inbound-email';
export const runtime = 'nodejs';
export async function POST(req: Request) {
 try {
  const secret=process.env.RESEND_WEBHOOK_SECRET, key=process.env.RESEND_API_KEY, domain=process.env.INBOUND_EMAIL_DOMAIN?.toLowerCase();
  assert(secret&&key&&domain,'Penerimaan email belum dikonfigurasi.',503);
  assert(Number(req.headers.get('content-length')||0)<=65536,'Payload terlalu besar.',413);
  const reader=req.body?.getReader(); assert(reader,'Payload kosong.');
  const chunks:Uint8Array[]=[]; let size=0;
  for (;;) {const part=await reader.read(); if(part.done)break; size+=part.value.length; if(size>65536){await reader.cancel(); assert(false,'Payload terlalu besar.',413);} chunks.push(part.value);}
  const raw=Buffer.concat(chunks).toString('utf8');
  try {new Webhook(secret).verify(raw,{'svix-id':req.headers.get('svix-id')||'','svix-timestamp':req.headers.get('svix-timestamp')||'','svix-signature':req.headers.get('svix-signature')||''});} catch {assert(false,'Tanda tangan webhook tidak valid.',401);}
  const event=JSON.parse(raw) as {type:string;data:{email_id:string}};
  if(event.type!=='email.received')return ok({ignored:true});
  assert(typeof event.data?.email_id==='string'&&/^[a-z0-9-]{1,100}$/i.test(event.data.email_id),'ID email tidak valid.');
  const response=await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(event.data.email_id)}`,{headers:{Authorization:`Bearer ${key}`},cache:'no-store',signal:AbortSignal.timeout(10000)});
  assert(response.ok,'Isi email belum dapat diambil. Penyedia dapat mencoba ulang.',503);
  const email=await response.json();
  assert(Array.isArray(email.to)&&email.to.length<=50&&typeof email.from==='string','Format email tidak valid.');
  const recipients=[...new Set<string>(email.to.map((value:unknown)=>typeof value==='string'?mailbox(value):null).filter((value:string|null)=>value?.endsWith('@'+domain)))];
  // Only one inbox may receive a financial email; never broadcast to several users.
  const result=await pool.query('SELECT user_id,local_part FROM email_inboxes WHERE enabled AND local_part=ANY($1::text[])',[recipients.map(value=>value.split('@')[0])]);
  if(result.rows.length!==1)return ok({ignored:true});
  const sender=mailbox(email.from)||'unknown', subject=typeof email.subject==='string'?email.subject.slice(0,500):'';
  const received=new Date(email.created_at); assert(!Number.isNaN(received.getTime()),'Tanggal email tidak valid.');
  const suggestion=suggestEmail(subject,receivedEmailText(email));
  // Persist suggestions only, not the full private email body or attachments.
  await atomic(async client=>{
   const inbox=(await client.query('SELECT user_id FROM email_inboxes WHERE user_id=$1 AND enabled FOR SHARE',[result.rows[0].user_id])).rows[0];if(!inbox)return;
   await client.query('INSERT INTO inbound_emails(user_id,provider_id,sender,subject,received_at,suggested,recipient) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id,provider_id) DO NOTHING',[result.rows[0].user_id,event.data.email_id,sender,subject,received.toISOString(),JSON.stringify(suggestion),result.rows[0].local_part+'@'+domain]);
   const item=(await client.query('SELECT id FROM inbound_emails WHERE user_id=$1 AND provider_id=$2',[result.rows[0].user_id,event.data.email_id])).rows[0];
   if(sender==='forwarding-noreply@google.com'){await client.query("UPDATE inbound_emails SET status='ignored' WHERE id=$1 AND status='pending'",[item.id]);return;}
   const synced=await syncEmail(client,item.id,result.rows[0].user_id);
   if(synced.status==='pending')await client.query('UPDATE inbound_emails SET sync_reason=$1 WHERE id=$2',[synced.reason,item.id]);
  });
  return ok({received:true});
 }catch(error){return failure(error);}
}
