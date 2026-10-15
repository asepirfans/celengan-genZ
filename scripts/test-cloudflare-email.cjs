// Isolated process configuration; never changes .env.local or live provider routing.
require('@next/env').loadEnvConfig(process.cwd());
const assert=require('node:assert/strict'),{randomBytes,randomUUID,createHash}=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
process.env.CLOUDFLARE_EMAIL_DOMAIN='inbound-fixture.example.invalid';process.env.CLOUDFLARE_EMAIL_SECRET=randomBytes(32).toString('hex');
const resolve=Module._resolveFilename;Module._resolveFilename=function(name,...args){return resolve.call(this,name.startsWith('@/')?path.join(process.cwd(),'src',name.slice(2)):name,...args);};
require.extensions['.ts']=function(mod,filename){mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);};
const pool=require('../src/lib/db.ts').default,{POST}=require('../src/app/api/webhooks/cloudflare-email/route.ts'),{signCloudflare,originalEmail}=require('../src/lib/server/email-provider.ts');
const users=[];let checks=0;
async function deliver(event,status=200,options={}){const body=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000)-(options.stale?1000:0));const response=await POST(new Request('https://app.example.invalid/api/webhooks/cloudflare-email',{method:'POST',body,headers:{'x-email-timestamp':timestamp,'x-email-signature':options.invalid?'0'.repeat(64):signCloudflare(body,timestamp,process.env.CLOUDFLARE_EMAIL_SECRET)}}));assert.equal(response.status,status,await response.clone().text());checks++;return response.json();}
function event(recipient,text){const raw=Buffer.from('From: Bank <receipts@example.invalid>\r\nSubject: Pembayaran berhasil\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n'+text);return {recipient,raw:raw.toString('base64'),received_at:new Date().toISOString(),id:createHash('sha256').update(recipient+'\0').update(raw).digest('hex')};}
(async()=>{try{
 for(let i=0;i<2;i++){
  const user=(await pool.query("INSERT INTO profiles(email,password,full_name,currency) VALUES($1,$2,'Cloudflare fixture','IDR') RETURNING id",['cf-fixture-'+randomUUID()+'@example.invalid',randomBytes(32).toString('hex')])).rows[0];users.push(user.id);
  user.local='wallet-'+randomBytes(24).toString('hex');await pool.query('INSERT INTO email_inboxes(user_id,local_part,enabled) VALUES($1,$2,true)',[user.id,user.local]);
  user.account=(await pool.query("INSERT INTO accounts(user_id,name,type,icon,color,initial_balance) VALUES($1,'CF fixture','bank','landmark','#52613d',1000000) RETURNING id",[user.id])).rows[0].id;
  await pool.query("INSERT INTO email_wallet_routes(user_id,sender,account_hint,account_id,auto_sync,auto_enabled_at) VALUES($1,'receipts@example.invalid','xxxx1234',$2,true,now()-interval '1 day')",[user.id,user.account]);
  users[i]={...user};
 }
 const [a,b]=users,recipient=a.local+'@'+process.env.CLOUDFLARE_EMAIL_DOMAIN;
 const text='Pembayaran berhasil\nNominal Rp50.000\nTotal pembayaran Rp52.500\nWallet: xxxx1234\nTanggal transaksi: 14 Oktober 2026\nWaktu: 20:47 WIB\nID transaksi: CF-FIXTURE-123456';
 const value=event(recipient,text);
 await deliver(value,401,{invalid:true});await deliver(value,401,{stale:true});await deliver({...value,id:'0'.repeat(64)},400);
 await Promise.all([deliver(value),deliver(value)]);
 const row=(await pool.query('SELECT * FROM inbound_emails WHERE user_id=$1',[a.id])).rows;assert.equal(row.length,1);assert.equal(row[0].provider,'cloudflare');assert.equal(row[0].status,'posted');
 assert.equal((await pool.query('SELECT count(*) FROM transactions WHERE user_id=$1',[a.id])).rows[0].count,'1');
 assert.equal((await pool.query('SELECT count(*) FROM inbound_emails WHERE user_id=$1',[b.id])).rows[0].count,'0');checks+=5;
 await deliver(event(recipient,text+'\nDifferent delivery wrapper'));
 assert.equal((await pool.query('SELECT count(*) FROM transactions WHERE user_id=$1',[a.id])).rows[0].count,'1');checks++;
 await deliver(event(b.local+'@'+process.env.CLOUDFLARE_EMAIL_DOMAIN,text));assert.equal((await pool.query('SELECT count(*) FROM transactions WHERE user_id=$1',[b.id])).rows[0].count,'1');checks++;
 // The old Resend webhook remains usable during migration without a second debit.
 const originalFetch=global.fetch;
 try{
  const {Webhook}=require('svix'),resendSecret='whsec_'+randomBytes(32).toString('base64');process.env.RESEND_WEBHOOK_SECRET=resendSecret;process.env.RESEND_API_KEY='fixture-only';process.env.INBOUND_EMAIL_DOMAIN='legacy-fixture.example.invalid';
  global.fetch=async()=>new Response(JSON.stringify({from:'Bank <receipts@example.invalid>',to:[b.local+'@'+process.env.INBOUND_EMAIL_DOMAIN],created_at:new Date().toISOString(),subject:'Pembayaran berhasil',text}),{status:200});
  const body=JSON.stringify({type:'email.received',data:{email_id:randomUUID()}}),eventId='msg_'+randomUUID(),time=new Date();
  const response=await require('../src/app/api/webhooks/email/route.ts').POST(new Request('https://app.example.invalid/api/webhooks/email',{method:'POST',body,headers:{'svix-id':eventId,'svix-timestamp':String(Math.floor(time.getTime()/1000)),'svix-signature':new Webhook(resendSecret).sign(eventId,time,body)}}));
  assert.equal(response.status,200,await response.clone().text());assert.equal((await pool.query('SELECT count(*) FROM transactions WHERE user_id=$1',[b.id])).rows[0].count,'1');checks+=2;
  const stored=event(recipient,text),item={provider:'cloudflare',provider_id:'cf:'+stored.id,recipient,local_part:a.local,user_id:a.id};
  assert.equal((await originalEmail(item)).from.address,'receipts@example.invalid');checks++;
  await assert.rejects(()=>originalEmail({...item,recipient:'wrong@example.invalid'}),error=>error.status===403);checks++;
  await assert.rejects(()=>originalEmail({...item,user_id:b.id}),error=>error.status===410);checks++;
  await pool.query("UPDATE cloudflare_email_payloads SET expires_at=now()-interval '1 minute' WHERE id=$1",[stored.id]);
  await assert.rejects(()=>originalEmail(item),error=>error.status===410);checks++;
 }finally{global.fetch=originalFetch;}
 await pool.query('UPDATE email_inboxes SET enabled=false WHERE user_id=$1',[a.id]);await deliver(event(recipient,text.replace('123456','999999')));assert.equal((await pool.query('SELECT count(*) FROM transactions WHERE user_id=$1',[a.id])).rows[0].count,'1');checks++;
 await deliver(event('wallet-'+randomBytes(24).toString('hex')+'@'+process.env.CLOUDFLARE_EMAIL_DOMAIN,text));
 await deliver(event(a.local+'@wrong.example.invalid',text),400);
 const confirmation=event(b.local+'@'+process.env.CLOUDFLARE_EMAIL_DOMAIN,'Confirmation code: 123456789\nhttps://mail-settings.google.com/mail/vf-fixture');
 const bytes=Buffer.from(confirmation.raw,'base64').toString().replace('Bank <receipts@example.invalid>','Gmail <forwarding-noreply@google.com>');const confirmed=event(confirmation.recipient,'unused');confirmed.raw=Buffer.from(bytes).toString('base64');confirmed.id=createHash('sha256').update(confirmed.recipient+'\0').update(Buffer.from(confirmed.raw,'base64')).digest('hex');await deliver(confirmed);
 const verification=(await pool.query("SELECT verification,status FROM inbound_emails WHERE user_id=$1 AND sender='forwarding-noreply@google.com'",[b.id])).rows[0];assert.equal(verification.status,'ignored');assert.equal(verification.verification.code,'123456789');checks+=2;
 // A processing failure must retain a committed payload; signed retry recovers it once.
 await pool.query('UPDATE email_inboxes SET enabled=true WHERE user_id=$1',[a.id]);
 const retryValue=event(recipient,text.replace('CF-FIXTURE-123456','CF-RETRY-654321'));
 const syncModule=require('../src/lib/server/email-sync.ts'),realSync=syncModule.syncEmail;
 try {syncModule.syncEmail=async()=>{throw new Error('fixture-processing-failure');};const result=await deliver(retryValue);assert.equal(result.data.queued,true);checks++;} finally {syncModule.syncEmail=realSync;}
 const pending=(await pool.query('SELECT * FROM cloudflare_email_payloads WHERE id=$1',[retryValue.id])).rows[0];assert.ok(pending);assert.equal(pending.processed_at,null);assert.equal(pending.attempts,1);checks+=3;
 assert.equal((await pool.query('SELECT count(*) FROM inbound_emails WHERE user_id=$1 AND provider_id=$2',[a.id,'cf:'+retryValue.id])).rows[0].count,'0');checks++;
 await pool.query('UPDATE cloudflare_email_payloads SET next_attempt_at=now() WHERE id=$1',[retryValue.id]);
 await deliver({action:'retry'},401,{invalid:true});await deliver({action:'retry'});
 assert.ok((await pool.query('SELECT processed_at FROM cloudflare_email_payloads WHERE id=$1',[retryValue.id])).rows[0].processed_at);checks++;
 assert.equal((await pool.query('SELECT count(*) FROM transactions WHERE user_id=$1',[a.id])).rows[0].count,'2');checks++;
 await deliver(retryValue);assert.equal((await pool.query('SELECT count(*) FROM transactions WHERE user_id=$1',[a.id])).rows[0].count,'2');checks++;
 // Expired raw mail is unavailable immediately and removed by cron.
 await pool.query("UPDATE cloudflare_email_payloads SET expires_at=now()-interval '1 minute' WHERE id=$1",[retryValue.id]);await deliver({action:'retry'});
 assert.equal((await pool.query('SELECT count(*) FROM cloudflare_email_payloads WHERE id=$1',[retryValue.id])).rows[0].count,'0');checks++;
 assert.equal((await pool.query("SELECT relrowsecurity FROM pg_class WHERE oid='cloudflare_email_payloads'::regclass")).rows[0].relrowsecurity,true);checks++;
 assert.equal((await pool.query("SELECT has_table_privilege('anon','cloudflare_email_payloads','SELECT') AS allowed")).rows[0].allowed,false);checks++;
 // Storage admission refuses new mail rather than acknowledging a full user's buffer.
 const capIds=[];try {
  for(let i=0;i<8;i++){const id=createHash('sha256').update(randomUUID()).digest('hex');capIds.push(id);await pool.query('INSERT INTO cloudflare_email_payloads(id,user_id,recipient,raw_base64,received_at,processed_at) VALUES($1,$2,$3,$4,now(),now())',[id,a.id,recipient,'A'.repeat(1400000)]);}
  await deliver(event(recipient,text.replace('CF-FIXTURE-123456','CF-CAP-123456')),503);
 } finally {await pool.query('DELETE FROM cloudflare_email_payloads WHERE id=ANY($1::text[])',[capIds]);}
 // BNI top-up must debit the mapped source, including fees, once across re-forwards.
 await pool.query("INSERT INTO email_wallet_routes(user_id,sender,account_hint,account_id,auto_sync,auto_enabled_at) VALUES($1,'wondr@bni.co.id','*******667',$2,true,now()-interval '1 day')",[a.id,a.account]);
 const topupText='From: <wondr@bni.co.id>\nTop-up berhasil!\nTerima kasih udah memilih wondr by BNI untuk transaksi kamu! Kamu baru aja top-up e-Wallet dengan detail sebagai berikut:\nPenerima\nDANA TEST\nDANA • 62*******1234\nSumber dana\nNAMA UJI\nTAPLUS • *******667\nTanggal 10 Oktober 2026\nWaktu 10:20:14 WIB\nNominal Rp75.000\nBiaya transaksi Rp0\nTotal Rp75.000\nRef ID CF-TOPUP-123456';
 await pool.query("UPDATE email_inboxes SET forwarding_sender='receipts@example.invalid' WHERE user_id=$1",[a.id]);
 await deliver(event(recipient,topupText));
 const topupRow=(await pool.query("SELECT e.status,e.auto_posted,t.type,t.amount,t.account_id FROM inbound_emails e JOIN transactions t ON t.id=e.transaction_id WHERE e.user_id=$1 AND e.suggested->>'bank_reference'='CF-TOPUP-123456'",[a.id])).rows[0];
 assert.equal(topupRow.status,'posted');assert.equal(topupRow.auto_posted,true);assert.equal(topupRow.type,'expense');assert.equal(Number(topupRow.amount),75000);assert.equal(topupRow.account_id,a.account);checks+=5;
 await deliver(event(recipient,topupText+'\nNew forward wrapper'));
 assert.equal((await pool.query("SELECT count(DISTINCT transaction_id) FROM inbound_emails WHERE user_id=$1 AND suggested->>'bank_reference'='CF-TOPUP-123456'",[a.id])).rows[0].count,'1');checks++;
 console.log('PASS: '+checks+' Cloudflare ingress assertions; signatures, replay, ownership, paused inbox, MIME, atomic duplicates, confirmation and BNI top-up.');
}finally{
 const ids=users.map(user=>typeof user==='string'?user:user.id);
 if(ids.length){await pool.query('DELETE FROM email_transaction_keys WHERE user_id=ANY($1::uuid[])',[ids]);for(const table of ['inbound_emails','email_wallet_routes','email_inboxes','transactions','categories','accounts'])await pool.query('DELETE FROM '+table+' WHERE user_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM profiles WHERE id=ANY($1::uuid[])',[ids]);console.log('Cloudflare fixtures removed.');}
 await pool.end();
}})().catch(error=>{console.error(error.message);process.exitCode=1;});
