const fs=require('node:fs'),{randomBytes}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const args=process.argv.slice(2),value=name=>args[args.indexOf(name)+1];
const domain=args.includes('--domain')?value('--domain')?.toLowerCase():null;
const worker=args.includes('--worker-url')?value('--worker-url'):null;
if(!domain||!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)||!worker){console.error('Usage: node scripts/configure-cloudflare-email.cjs --domain masuk.domainmu.com --worker-url https://nama-worker.subdomain.workers.dev [--activate]');process.exit(1);}
const url=new URL(worker);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Gunakan origin HTTPS Worker tanpa path.');
let content=fs.existsSync('.env.local')?fs.readFileSync('.env.local','utf8'):'';
const values={CLOUDFLARE_EMAIL_DOMAIN:domain,CLOUDFLARE_EMAIL_WORKER_URL:url.origin,CLOUDFLARE_EMAIL_SECRET:process.env.CLOUDFLARE_EMAIL_SECRET||randomBytes(32).toString('hex')};
if(values.CLOUDFLARE_EMAIL_SECRET.length<32)throw Error('Secret yang ada terlalu pendek.');
if(args.includes('--activate'))values.INBOUND_EMAIL_PROVIDER='cloudflare';
for(const [key,val] of Object.entries(values)){const regex=new RegExp('^'+key+'=.*$','m');content=regex.test(content)?content.replace(regex,key+'='+val):content.replace(/\s*$/,'')+'\n'+key+'='+val+'\n';}
fs.writeFileSync('.env.local',content);
console.log('Konfigurasi disimpan di .env.local. Secret tidak dicetak. Salin CLOUDFLARE_EMAIL_SECRET ke secret EMAIL_SECRET pada Worker dan ke environment Vercel.');
console.log(args.includes('--activate')?'Provider Cloudflare dipilih. Restart server setelah domain/Worker siap.':'Provider aktif belum diganti. Aktifkan hanya setelah uji email domain berhasil.');
