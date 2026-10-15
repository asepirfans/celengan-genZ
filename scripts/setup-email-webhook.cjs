const fs = require('node:fs');
require('@next/env').loadEnvConfig(process.cwd());
async function main() {
 const endpoint = process.argv[2];
 if (!endpoint || new URL(endpoint).protocol !== 'https:' || new URL(endpoint).pathname !== '/api/webhooks/email') throw new Error('URL webhook HTTPS tidak valid.');
 const headers = {Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'};
 const call = async (path, method='GET', body) => {
  const result=await fetch('https://api.resend.com'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  if(!result.ok)throw new Error('Resend '+method+' '+path+': HTTP '+result.status);
  return result.json();
 };
 const list=await call('/webhooks');
 let existing=list.data?.find(item=>item.id===process.env.RESEND_WEBHOOK_ID||item.endpoint===endpoint);
 let webhook;
 if(existing){
  await call('/webhooks/'+existing.id,'PATCH',{endpoint,events:['email.received'],status:'enabled'});
  webhook=await call('/webhooks/'+existing.id);
 }else{
  // Do not overwrite any unrelated webhook already consuming the free plan slot.
  if(list.data?.length)throw new Error('Ada webhook lain di akun ini. Tidak diubah; periksa dashboard Resend.');
  webhook=await call('/webhooks','POST',{endpoint,events:['email.received']});
 }
 if(!webhook.signing_secret)throw new Error('Signing secret tidak tersedia dari Resend.');
 let env=fs.readFileSync('.env.local','utf8');
 for(const [name,value] of Object.entries({RESEND_WEBHOOK_SECRET:webhook.signing_secret,RESEND_WEBHOOK_ID:webhook.id,INBOUND_WEBHOOK_URL:endpoint})){
  const pattern=new RegExp('^'+name+'=.*$','m');
  env=pattern.test(env)?env.replace(pattern,()=>name+'='+value):env.trimEnd()+'\n'+name+'='+value+'\n';
 }
 fs.writeFileSync('.env.local',env);
 console.log('Webhook email.received terdaftar; signing secret disimpan tanpa ditampilkan.');
 console.log('Endpoint: '+endpoint);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
