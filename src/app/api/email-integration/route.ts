import { randomBytes } from 'node:crypto';
import pool from '@/lib/db';
import { requireUser } from '@/lib/server/auth';
import { assert, atomic, balance, categoryAllowed, failure, id, money, ok, ownedAccount, text } from '@/lib/server/api';
import { gmailVerification, mailbox, receivedEmailText, suggestEmail } from '@/lib/inbound-email';
import { claimEmailReference, linkEmailTransaction, syncEmail } from '@/lib/server/email-sync';
import { emailCategory } from '@/lib/server/email-category';
import { emailConfig, originalEmail } from '@/lib/server/email-provider';
export async function GET(req:Request) {
 try {const user=await requireUser(req); const inbox=await pool.query('SELECT local_part,enabled,forwarding_sender FROM email_inboxes WHERE user_id=$1',[user]);
  const routes=await pool.query('SELECT * FROM email_wallet_routes WHERE user_id=$1 ORDER BY sender',[user]);
  const params=new URL(req.url).searchParams,page=Number(params.get('page')||0),status=params.get('status')||'all';
  assert(Number.isInteger(page)&&page>=0&&page<=10000,'Halaman tidak valid.');assert(['all','pending','posted','ignored'].includes(status),'Status tidak valid.');
  const emails=await pool.query("SELECT * FROM inbound_emails WHERE user_id=$1 AND ($2='all' OR status=$2) AND sender<>'forwarding-noreply@google.com' ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET $3",[user,status,page*50]);
  const confirmation=(await pool.query("SELECT id,subject FROM inbound_emails WHERE user_id=$1 AND sender='forwarding-noreply@google.com' ORDER BY created_at DESC LIMIT 1",[user])).rows[0]||null;
  const {domain,provider,configured}=emailConfig();
  return ok({configured,provider,address:domain&&inbox.rows[0]?`${inbox.rows[0].local_part}@${domain}`:null,enabled:inbox.rows[0]?.enabled||false,forwarding_sender:inbox.rows[0]?.forwarding_sender||null,routes:routes.rows,emails:emails.rows.slice(0,50),has_more:emails.rows.length>50,page,confirmation});
 }catch(error){return failure(error);}
}
export async function POST(req:Request) {
 try {const user=await requireUser(req),body=await req.json();
  if(body.action==='forwarder')return ok(await atomic(async client=>{
   assert((await client.query('SELECT user_id FROM email_inboxes WHERE user_id=$1 FOR UPDATE',[user])).rows[0],'Penerimaan email belum diatur.',404);
   if(body.id===null){await client.query('UPDATE email_inboxes SET forwarding_sender=NULL WHERE user_id=$1',[user]);return {sender:null};}
   const item=(await client.query('SELECT sender,suggested,status FROM inbound_emails WHERE id=$1 AND user_id=$2 FOR UPDATE',[id(body.id),user])).rows[0];assert(item,'Email tidak ditemukan.',404);
   assert(item.status==='pending','Email sudah diproses.',409);
   const sender=mailbox(item.sender);assert(sender&&sender!=='forwarding-noreply@google.com'&&item.suggested.source_sender&&sender!==item.suggested.source_sender,'Email ini bukan pesan transaksi yang diteruskan.');
   await client.query('UPDATE email_inboxes SET forwarding_sender=$1 WHERE user_id=$2',[sender,user]);return {sender};
  }));
  if(body.action==='reparse') {
   const item=(await pool.query('SELECT e.user_id,e.provider_id,e.provider,e.recipient,e.status,i.local_part FROM inbound_emails e JOIN email_inboxes i ON i.user_id=e.user_id WHERE e.id=$1 AND e.user_id=$2',[id(body.id),user])).rows[0];assert(item,'Email tidak ditemukan.',404);assert(item.status==='pending','Email sudah diproses.',409);
   const email=await originalEmail(item);
   const suggestion=suggestEmail(String(email.subject||''),receivedEmailText(email));
   const updated=await pool.query("UPDATE inbound_emails SET suggested=$1,sync_reason=NULL WHERE id=$2 AND user_id=$3 AND status='pending' RETURNING id",[JSON.stringify(suggestion),body.id,user]);assert(updated.rows[0],'Email sudah diproses.',409);return ok(suggestion);
  }
  if(body.action==='verification') {
   const item=(await pool.query("SELECT provider_id,provider,verification FROM inbound_emails WHERE id=$1 AND user_id=$2 AND sender='forwarding-noreply@google.com'",[id(body.id),user])).rows[0];assert(item,'Email konfirmasi tidak ditemukan.',404);
   if(item.provider==='cloudflare'){assert(item.verification,'Tautan konfirmasi tidak dikenali. Minta Gmail mengirim ulang konfirmasi.');return ok(item.verification);}
   const response=await fetch('https://api.resend.com/emails/receiving/'+encodeURIComponent(item.provider_id),{headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY},cache:'no-store',signal:AbortSignal.timeout(10000)});assert(response.ok,'Email konfirmasi belum dapat dibuka.',503);
   const email=await response.json(),verification=gmailVerification(String(email.text||email.html||''));
   assert(verification,'Tautan konfirmasi tidak dikenali. Minta Gmail mengirim ulang konfirmasi.');return ok(verification);
  }
  if(body.action==='inbox') {
   const {configured}=emailConfig(); assert(configured,'Konfigurasi penyedia email belum tersedia.',503);
   assert(typeof body.enabled==='boolean','Status tidak valid.');
   await pool.query('INSERT INTO email_inboxes(user_id,local_part,enabled) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET enabled=EXCLUDED.enabled',[user,'wallet-'+randomBytes(24).toString('hex'),body.enabled]);return ok();
  }
  if(body.action==='route')return ok(await atomic(async client=> {
   const sender=mailbox(text(body.sender,254)); assert(sender,'Alamat pengirim tidak valid.');
   const hint=text(body.account_hint,30).toLowerCase(); assert(/^[\d*x-]{4,30}$/.test(hint),'Identitas rekening tidak valid. Gunakan nomor tersamar seperti di email.');
   await ownedAccount(client,body.account_id,user);
   assert(!(await client.query('SELECT 1 FROM goal_wallets WHERE account_id=$1',[body.account_id])).rows[0],'Wallet celengan tidak dapat dipetakan.');
   assert(body.auto_sync===undefined||typeof body.auto_sync==='boolean','Status sinkronisasi tidak valid.');
   const auto=body.auto_sync===true,type=body.transaction_type||'expense';assert(['income','expense'].includes(type),'Jenis pemetaan tidak valid.');
   const dual=body.expense_category_id!==undefined||body.income_category_id!==undefined;
   let category=body.category_id?await emailCategory(client,user,type,body.category_id):null;
   let expense:string|null=null,income:string|null=null;
   if(dual){expense=await emailCategory(client,user,'expense',body.expense_category_id||'uncategorized');income=await emailCategory(client,user,'income',body.income_category_id||'uncategorized');category=type==='expense'?expense:income;}
   if(auto)await categoryAllowed(client,category,user,type);
   else if(category)await categoryAllowed(client,category,user,type);
   const saved=(await client.query('INSERT INTO email_wallet_routes(user_id,sender,account_hint,account_id,auto_sync,category_id,transaction_type,auto_enabled_at) VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $5 THEN now() END) ON CONFLICT(user_id,sender,account_hint) DO UPDATE SET account_id=EXCLUDED.account_id,auto_sync=EXCLUDED.auto_sync,category_id=EXCLUDED.category_id,transaction_type=EXCLUDED.transaction_type,auto_enabled_at=CASE WHEN EXCLUDED.auto_sync THEN CASE WHEN email_wallet_routes.auto_sync THEN email_wallet_routes.auto_enabled_at ELSE now() END ELSE NULL END RETURNING *',[user,sender,hint,body.account_id,auto,category,type])).rows[0];
   if(dual)return (await client.query('UPDATE email_wallet_routes SET expense_category_id=$1,income_category_id=$2 WHERE id=$3 RETURNING *',[expense,income,saved.id])).rows[0];
   return (await client.query(type==='expense'?'UPDATE email_wallet_routes SET expense_category_id=$1 WHERE id=$2 RETURNING *':'UPDATE email_wallet_routes SET income_category_id=$1 WHERE id=$2 RETURNING *',[category,saved.id])).rows[0];
  }));
  if(body.action==='sync'){assert(body.new_only===undefined||typeof body.new_only==='boolean','Pilihan sinkronisasi tidak valid.');return ok(await atomic(async client=>{const result=await syncEmail(client,id(body.id),user,body.new_only!==true);if(result.status==='pending')await client.query('UPDATE inbound_emails SET sync_reason=$1 WHERE id=$2 AND user_id=$3',[result.reason,body.id,user]);return result;}));}
  assert(['post','ignore'].includes(body.action),'Aksi tidak valid.');
  return ok(await atomic(async client=> {
   const item=(await client.query('SELECT * FROM inbound_emails WHERE id=$1 AND user_id=$2 FOR UPDATE',[id(body.id),user])).rows[0]; assert(item,'Email tidak ditemukan.',404);
   if(item.status!=='pending') {assert(item.status===(body.action==='post'?'posted':'ignored'),'Email sudah diproses.',409); return {status:item.status,transaction_id:item.transaction_id};}
   if(body.action==='ignore') {await client.query("UPDATE inbound_emails SET status='ignored' WHERE id=$1",[item.id]);return {status:'ignored'};}
   const accounts=[...new Set<string>([id(body.account_id),...(body.type==='transfer'?[id(body.transfer_to_account_id)]:[])])].sort();
   for(const account of accounts)await ownedAccount(client,account,user);
   assert(!(await client.query('SELECT 1 FROM goal_wallets WHERE account_id=ANY($1::uuid[])',[accounts])).rows[0],'Gunakan menu Celengan Impian untuk wallet celengan.');
   assert(['income','expense','transfer'].includes(body.type),'Jenis transaksi tidak valid.');
   let transactionCategory:string|null=null;
   if(body.type==='transfer')assert(body.account_id!==body.transfer_to_account_id,'Wallet tujuan harus berbeda.');
   else transactionCategory=await emailCategory(client,user,body.type,body.category_id);
   const amount=money(body.amount), date=new Date(body.date);assert(!Number.isNaN(date.getTime()),'Tanggal transaksi tidak valid.');
   if(body.type==='transfer')assert(await balance(client,body.account_id,user)>=amount,'Saldo sumber tidak cukup.',409);
   const claim=await claimEmailReference(client,item);
   if(claim?.existing){await linkEmailTransaction(client,item,claim.existing);return {status:'posted',transaction_id:claim.existing};}
   // User reviews original email; received_at is never silently used as transaction date.
   const saved=(await client.query('INSERT INTO transactions(user_id,account_id,category_id,type,amount,note,date,transfer_to_account_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[user,body.account_id,transactionCategory,body.type,amount,`Email: ${item.subject}`.slice(0,500),date.toISOString(),body.type==='transfer'?body.transfer_to_account_id:null])).rows[0];
   await linkEmailTransaction(client,item,saved.id,claim?.key);
   return {status:'posted',transaction_id:saved.id};
  }));
 }catch(error){return failure(error);}
}
export async function DELETE(req:Request) {
 try {const user=await requireUser(req),route=id(new URL(req.url).searchParams.get('id'));assert((await pool.query('DELETE FROM email_wallet_routes WHERE id=$1 AND user_id=$2 RETURNING id',[route,user])).rows[0],'Pemetaan tidak ditemukan.',404);return ok();}catch(error){return failure(error);}
}
