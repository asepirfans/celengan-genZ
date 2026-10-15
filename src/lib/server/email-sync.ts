import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { EmailSuggestion } from '@/lib/inbound-email';
import { assert, id } from './api';
import { emailCategory } from './email-category';
interface EmailItem {id:string;user_id:string;sender:string;subject:string;status:string;transaction_id?:string;suggested:EmailSuggestion;created_at:string;received_at:string}
export interface EmailSyncResult {status:string;transaction_id?:string|null;reason?:string}
export async function lockEmail(client:PoolClient,emailId:string,user:string):Promise<EmailItem> {
 const item=(await client.query('SELECT * FROM inbound_emails WHERE id=$1 AND user_id=$2 FOR UPDATE',[id(emailId),user])).rows[0];
 assert(item,'Email tidak ditemukan.',404);return item;
}
export async function claimEmailReference(client:PoolClient,item:EmailItem) {
 const suggestion=item.suggested;
 if(!suggestion.bank_reference||!suggestion.account_hint)return null;
 const key=createHash('sha256').update(JSON.stringify([suggestion.source_sender||item.sender,suggestion.account_hint,suggestion.bank_reference])).digest('hex');
 const claimed=await client.query('INSERT INTO email_transaction_keys(user_id,dedupe_key) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING dedupe_key',[item.user_id,key]);
 if(!claimed.rows[0]){
  const previous=(await client.query('SELECT transaction_id FROM email_transaction_keys WHERE user_id=$1 AND dedupe_key=$2 FOR UPDATE',[item.user_id,key])).rows[0];
  assert(previous?.transaction_id,'Referensi transaksi ini sudah pernah diproses. Periksa riwayat dompet.',409);
  return {key,existing:previous.transaction_id as string};
 }
 return {key,existing:null};
}
export async function linkEmailTransaction(client:PoolClient,item:EmailItem,transaction:string,key?:string,automatic=false){
 if(key)await client.query('UPDATE email_transaction_keys SET transaction_id=$1 WHERE user_id=$2 AND dedupe_key=$3',[transaction,item.user_id,key]);
 await client.query("UPDATE inbound_emails SET status='posted',transaction_id=$1,auto_posted=$2,sync_reason=NULL WHERE id=$3",[transaction,automatic,item.id]);
}
export async function syncEmail(client:PoolClient,emailId:string,user:string,allowHistorical=false):Promise<EmailSyncResult> {
 const inbox=(await client.query('SELECT forwarding_sender FROM email_inboxes WHERE user_id=$1 FOR SHARE',[user])).rows[0];
 const item=await lockEmail(client,emailId,user),s=item.suggested;
 if(item.status!=='pending')return {status:item.status,transaction_id:item.transaction_id};
 const pending=(reason:string)=>({status:'pending',reason});
 if(s.auto_eligible===false)return pending(s.reason||'Detail atau total transaksi belum cukup jelas untuk pencatatan otomatis. Periksa detail email.');
 if(!s.amount||!Number.isSafeInteger(s.amount)||s.amount<1||!s.date||!s.type||!s.account_hint||!s.bank_reference)return pending('Nominal, tanggal, rekening, atau referensi bank belum lengkap. Periksa transaksi secara manual.');
 const date=new Date(s.date);if(Number.isNaN(date.getTime())||date.getTime()>Date.now()+300000)return pending('Tanggal transaksi belum valid. Periksa secara manual.');
 const routes=await client.query('SELECT * FROM email_wallet_routes WHERE user_id=$1 AND auto_sync AND account_hint=$2 AND (sender=$3 OR sender=$4)',[user,s.account_hint,item.sender,s.source_sender||item.sender]);
 if(routes.rows.length!==1)return pending('Pilih satu pemetaan rekening dengan sinkronisasi otomatis aktif.');
 let route=routes.rows[0];
 if(!allowHistorical&&(!route.auto_enabled_at||Math.min(new Date(item.created_at).getTime(),new Date(item.received_at).getTime())<new Date(route.auto_enabled_at).getTime()))return pending('Email diterima sebelum sinkronisasi diaktifkan. Gunakan Sinkronkan untuk mencatatnya.');
 const profile=(await client.query('SELECT email,full_name FROM profiles WHERE id=$1',[user])).rows[0];
 if(item.sender!==route.sender&&item.sender!==profile?.email?.toLowerCase()&&item.sender!==inbox?.forwarding_sender)return pending('Email diteruskan oleh pengirim yang belum dikenal. Periksa secara manual.');
 if(s.recipient_name_hash&&profile?.full_name&&createHash('sha256').update(profile.full_name.trim().replace(/\s+/g,' ').toLowerCase()).digest('hex')===s.recipient_name_hash)return pending('Nama penerima sama dengan pemilik akun. Periksa sebagai transfer antar dompet.');
 const account=(await client.query('SELECT id FROM accounts WHERE id=$1 AND user_id=$2 AND NOT COALESCE(is_archived,false) FOR UPDATE',[route.account_id,user])).rows[0];
 if(!account||(await client.query('SELECT 1 FROM goal_wallets WHERE account_id=$1',[route.account_id])).rows[0])return pending('Dompet pemetaan tidak tersedia untuk sinkronisasi.');
 // Mapping saves also lock the wallet first; use that order to avoid a deadlock.
 const locked=(await client.query('SELECT * FROM email_wallet_routes WHERE id=$1 AND user_id=$2 FOR SHARE',[route.id,user])).rows[0];
 if(!locked?.auto_sync||locked.account_id!==account.id)return pending('Hubungan dompet berubah. Periksa pengaturannya lalu coba lagi.');
 route=locked;
 if(!allowHistorical&&(!route.auto_enabled_at||Math.min(new Date(item.created_at).getTime(),new Date(item.received_at).getTime())<new Date(route.auto_enabled_at).getTime()))return pending('Email diterima sebelum sinkronisasi diaktifkan. Gunakan Sinkronkan untuk mencatatnya.');
 let categoryId=s.type==='income'?route.income_category_id:route.expense_category_id;
 if(!categoryId)categoryId=route.transaction_type===s.type?route.category_id:null;
 if(!categoryId)categoryId=await emailCategory(client,user,s.type,'uncategorized');
 const category=(await client.query('SELECT id FROM categories WHERE id=$1 AND (user_id=$2 OR user_id IS NULL) AND type=$3 FOR SHARE',[categoryId,user,s.type])).rows[0];
 if(!category)return pending('Kategori pemetaan tidak tersedia.');
 // Deleted ledger entries retain their reference tombstone and are never recreated silently.
 const reference=createHash('sha256').update(JSON.stringify([s.source_sender||item.sender,s.account_hint,s.bank_reference])).digest('hex');
 const previous=(await client.query('SELECT transaction_id FROM email_transaction_keys WHERE user_id=$1 AND dedupe_key=$2',[user,reference])).rows[0];
 if(previous&&!previous.transaction_id)return pending('Referensi bank ini sudah pernah diproses dan transaksinya dihapus.');
 const claim=await claimEmailReference(client,item);
 if(claim?.existing){await linkEmailTransaction(client,item,claim.existing,undefined,true);return {status:'posted',transaction_id:claim.existing};}
 const transaction=(await client.query('INSERT INTO transactions(user_id,account_id,category_id,type,amount,note,date) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[user,route.account_id,categoryId,s.type,s.amount,`Sinkron email: ${item.subject}`.slice(0,500),date.toISOString()])).rows[0];
 await linkEmailTransaction(client,item,transaction.id,claim?.key,true);
 return {status:'posted',transaction_id:transaction.id};
}
