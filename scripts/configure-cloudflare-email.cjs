const fs=require('node:fs'),{randomBytes}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const args=process.argv.slice(2),index=args.indexOf('--domain'),domain=index>=0?args[index+1]?.toLowerCase():null;
if(!domain||!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)){console.error('Usage: node scripts/configure-cloudflare-email.cjs --domain domainmu.com [--activate]');process.exit(1);}
let content=fs.existsSync('.env.local')?fs.readFileSync('.env.local','utf8'):'';
const values={CLOUDFLARE_EMAIL_DOMAIN:domain,CLOUDFLARE_EMAIL_SECRET:process.env.CLOUDFLARE_EMAIL_SECRET||randomBytes(32).toString('hex')};
if(values.CLOUDFLARE_EMAIL_SECRET.length<32)throw Error('Secret yang ada terlalu pendek.');
if(args.includes('--activate'))values.INBOUND_EMAIL_PROVIDER='cloudflare';
for(const [key,val] of Object.entries(values)){const regex=new RegExp('^'+key+'=.*$','m');content=regex.test(content)?content.replace(regex,()=>key+'='+val):content.replace(/\s*$/,'')+'\n'+key+'='+val+'\n';}
fs.writeFileSync('.env.local',content);
console.log('Konfigurasi Supabase disimpan di .env.local. Gunakan secret yang sama sebagai EMAIL_SECRET di Worker dan CLOUDFLARE_EMAIL_SECRET di Vercel.');
console.log(args.includes('--activate')?'Provider Cloudflare dipilih. Restart server.':'Provider aktif belum diganti. R2 dan URL HTTP Worker tidak diperlukan.');