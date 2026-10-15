import { createHash } from 'node:crypto';
import pool from '@/lib/db';
import { assert,atomic,failure,ok } from '@/lib/server/api';
import { boundedBody,parseCloudflareRaw,verifyCloudflare } from '@/lib/server/email-provider';
import { syncEmail } from '@/lib/server/email-sync';
import { gmailVerification,mailbox,receivedEmailText,suggestEmail } from '@/lib/inbound-email';
export const runtime='nodejs';
export async function POST(req:Request){try{
 const secret=process.env.CLOUDFLARE_EMAIL_SECRET,domain=process.env.CLOUDFLARE_EMAIL_DOMAIN?.trim().toLowerCase();
 assert(secret&&secret.length>=32&&domain,'Cloudflare Email belum dikonfigurasi.',503);
 const raw=await boundedBody(req,1500000);assert(verifyCloudflare(raw,req.headers,secret),'Tanda tangan webhook tidak valid.',401);
 const event=JSON.parse(raw);assert(typeof event.recipient==='string'&&mailbox(event.recipient)===event.recipient&&event.recipient.endsWith('@'+domain),'Tujuan email tidak valid.');
 const received=new Date(event.received_at);assert(!Number.isNaN(received.getTime())&&received.getTime()<=Date.now()+300000,'Tanggal email tidak valid.');
 assert(typeof event.raw==='string','Isi email tidak valid.');
 const eventId=createHash('sha256').update(event.recipient+'\0').update(Buffer.from(event.raw,'base64')).digest('hex');assert(event.id===eventId,'ID email tidak cocok.');
 const user=(await pool.query('SELECT user_id FROM email_inboxes WHERE local_part=$1 AND enabled',[event.recipient.split('@')[0]])).rows[0];
 if(!user)return ok({ignored:true});
 const email=await parseCloudflareRaw(event.raw),sender=email.from?.address?mailbox(email.from.address):null;assert(sender,'Pengirim email tidak valid.');
 const content=receivedEmailText(email),subject=String(email.subject||'').slice(0,500),suggestion=suggestEmail(subject,content);
 const verification=sender==='forwarding-noreply@google.com'?gmailVerification(content):null;
 await atomic(async client=>{
  if(!(await client.query('SELECT user_id FROM email_inboxes WHERE user_id=$1 AND enabled FOR SHARE',[user.user_id])).rows[0])return;
  await client.query("INSERT INTO inbound_emails(user_id,provider_id,provider,recipient,sender,subject,received_at,suggested,verification) VALUES($1,$2,'cloudflare',$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,provider_id) DO NOTHING",[user.user_id,'cf:'+eventId,event.recipient,sender,subject,received.toISOString(),JSON.stringify(suggestion),verification?JSON.stringify(verification):null]);
  const item=(await client.query('SELECT id FROM inbound_emails WHERE user_id=$1 AND provider_id=$2',[user.user_id,'cf:'+eventId])).rows[0];
  if(sender==='forwarding-noreply@google.com'){await client.query("UPDATE inbound_emails SET status='ignored' WHERE id=$1 AND status='pending'",[item.id]);return;}
  const result=await syncEmail(client,item.id,user.user_id);if(result.status==='pending')await client.query('UPDATE inbound_emails SET sync_reason=$1 WHERE id=$2',[result.reason,item.id]);
 });return ok({received:true});
}catch(error){return failure(error);}}
