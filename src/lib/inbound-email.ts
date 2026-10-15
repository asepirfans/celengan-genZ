/** Suggestions only: email text is not proof that a bank transaction happened. */
import { createHash } from 'node:crypto';
export interface EmailSuggestion { amount?: number; type?: 'income'|'expense'; account_hint?: string; date?: string; source_sender?: string; bank_reference?: string; principal_amount?: number; fee_amount?: number; recipient_name_hash?:string; auto_eligible?:boolean; reason: string }
export function gmailVerification(content:string):{url?:string;code?:string}|null {
 const text=content.slice(0,100000).replace(/&amp;/g,'&');
 const urls=text.match(/https:\/\/[^\s<>"']+/g)||[];
 const url=urls.find(value=>{try{const parsed=new URL(value);return parsed.protocol==='https:'&&['mail.google.com','mail-settings.google.com'].includes(parsed.hostname)&&parsed.pathname.startsWith('/mail/vf-');}catch{return false;}});
 const code=text.match(/(?:confirmation code|kode konfirmasi)\s*:\s*(\d{5,12})/i)?.[1];
 return url||code?{url,code}:null;
}
export function receivedEmailText(email: {text?: string|null; html?: string|null}): string {
 if(email.text?.trim())return email.text.slice(0,100000);
 return (email.html||'').slice(0,300000).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').slice(0,100000);
}
function idr(raw:string):number|undefined {
 let value=raw;
 if(/^[1-9]\d{0,2}(?:\.\d{3})+(?:,00)?$/.test(value))value=value.replace(/,00$/,'').replace(/\./g,'');
 else if(/^[1-9]\d{0,2}(?:,\d{3})+(?:\.00)?$/.test(value))value=value.replace(/\.00$/,'').replace(/,/g,'');
 else if(/^\d+(?:[.,]00)?$/.test(value))value=value.replace(/[.,]00$/,'');
 else return undefined;
 const result=Number(value);return Number.isSafeInteger(result)&&result>=0?result:undefined;
}
function bniSuggestion(content:string):EmailSuggestion|null {
 const plain=content.replace(/\*{1,2}([A-Za-z][^*\n]*?)\*{1,2}/g,'$1').replace(/\s+/g,' ');
 const transfer=/\bTransfer berhasil\b/i.test(plain);
 const virtualAccount=/\bTransaksi berhasil\b/i.test(plain)&&/melakukan pembayaran pakai Virtual Account/i.test(plain);
 const qris=/\bTransaksi berhasil\b/i.test(plain)&&/(?:bayar|pembayaran)\s+(?:pakai\s+)?QRIS|Jenis transaksi\s*:?\s*QRIS/i.test(plain);
 if(!/wondr by BNI/i.test(plain)||(!transfer&&!virtualAccount&&!qris)||!/Sumber dana/i.test(plain))return null;
 const labelled=(label:string)=>[...plain.matchAll(new RegExp('(?:'+label+')\\s*:?\\s*Rp\\.?\\s*([\\d.,]+)','gi'))].map(m=>idr(m[1]));
 const values=labelled('Nominal'),fees=labelled('Biaya admin'),totals=labelled('Total');
 const unique=[...new Set(values)]; const principal=unique.length===1?unique[0]:undefined;
 const total=totals.length===1?totals[0]:undefined;
 const fee=fees.length===1?fees[0]:qris&&fees.length===0&&principal===total?0:undefined;
 const amount=principal&&fee!==undefined&&total===principal+fee?total:undefined;
 const date=labelledDate(plain);
 const source=plain.match(/Sumber dana\s+.*?([*xX]{2,}\d{2,6})(?=\s|$)/i)?.[1].toLowerCase();
 const original=content.match(/^\s*From:\s*(.+)$/mi)?.[1];const sender=original?mailbox(original.trim()):null;
 const references=[...new Set([...plain.matchAll(/Reference ID\s*:?\s*([A-Za-z0-9-]{6,100})\b/gi)].map(m=>m[1]))];
 const reference=references.length===1?references[0]:undefined;
 const lines=content.split(/\r?\n/).map(line=>line.trim().replace(/^\*\s*|\s*\*$/g,'')).filter(Boolean);
 const recipientIndex=transfer?lines.findIndex(line=>line.toLowerCase()==='penerima'):-1;
 const recipient=recipientIndex>=0?lines[recipientIndex+1]:undefined;
 const recipientHash=recipient?createHash('sha256').update(recipient.trim().replace(/\s+/g,' ').toLowerCase()).digest('hex'):undefined;
 return {amount,type:'expense',account_hint:source,date,source_sender:sender||undefined,bank_reference:reference,principal_amount:principal,fee_amount:fee,recipient_name_hash:recipientHash,reason:amount&&date&&source&&reference?(qris?'Pembayaran QRIS BNI terbaca.':virtualAccount?'Pembayaran Virtual Account BNI terbaca. Total termasuk biaya admin.':'Transfer keluar BNI terbaca. Periksa jika rekening tujuan milik sendiri.'):'Detail email belum lengkap atau mengandung beberapa transaksi. Periksa sebelum mencatat.'};
}
function labelledMoney(content:string,label:string):number|undefined {
 const values=[...content.matchAll(new RegExp('\\b(?:'+label+')\\s*[:=]?\\s*(?:Rp\\.?|IDR)\\s*([\\d.,]+)','gi'))].filter(m=>!/(?:tip|fee|biaya|admin|tax|pajak|diskon|discount|cashback)\s*$/i.test(content.slice(Math.max(0,m.index!-30),m.index))).map(m=>idr(m[1].replace(/[.,]$/,'')));
 const unique=[...new Set(values)];return unique.length===1?unique[0]:undefined;
}
function normalizedEmail(content:string):string {
 // Email-to-text converters insert image/tracking URLs between labels and values.
 return content.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<[^>]*>/g,match=>/^<[^<>\s]+@[^<>\s]+>$/.test(match)?match:' ')
  .replace(/\[(?:image:[^\]]*|https?:\/\/[^\]]*)\]/gi,' ')
  .replace(/https?:\/\/[^\s<>\[\]]+/gi,' ')
  .replace(/&nbsp;|&#160;|&#xA0;/gi,' ').replace(/&amp;/gi,'&')
  .replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\r\n?/g,'\n');
}
function unambiguousMoney(content:string):number|undefined {
 const values=[...content.matchAll(/\b(?:Rp\.?|IDR)\s*([\d.,]+)/gi)]
  .filter(m=>!/(?:tip|fee|biaya(?: admin)?|admin|tax|pajak|diskon|discount|cashback)(?:\s+(?:amount|total|transaksi))?\s*[:=]?\s*$/i.test(content.slice(Math.max(0,m.index!-50),m.index)))
  .map(m=>idr(m[1].replace(/[.,]$/,'')));
 const unique=[...new Set(values)];return unique.length===1&&unique[0]?unique[0]:undefined;
}
function jagoSuggestion(content:string):EmailSuggestion|null {
 const plain=content.replace(/\*{1,2}([A-Za-z][^*\n]*?)\*{1,2}/g,'$1').replace(/\s+/g,' ');
 if(!/Thank you for trusting Jago!/i.test(plain)||!/You have made a payment\b/i.test(plain)||!/Transaction Summary/i.test(plain))return null;
 const summaries=[...plain.matchAll(/Transaction Summary\s+From\s*:?\s*([\d*xX-]{4,30})\s+To\s*:?\s*(.+?)\s+Amount\s*:?\s*(?:Rp\.?|IDR)\s*([\d.,]+)\s+Transaction Date\s*:?\s*(.+?)\s+Transaction Status\s*:?\s*(\w+)/gi)];
 if(summaries.length!==1)return {amount:(plain.match(/Transaction Summary/gi)||[]).length===1?labelledMoney(plain,'amount|payment amount|nominal')||unambiguousMoney(plain):undefined,type:'expense',date:labelledDate(plain),auto_eligible:false,reason:'Sebagian detail pembayaran Jago belum lengkap atau berisi beberapa transaksi. Periksa email asli.'};
 const match=summaries[0];
 if(match[5].toLowerCase()!=='successful')return {auto_eligible:false,reason:'Status pembayaran Jago belum berhasil.'};
 // Parse Amount inside the summary, never Tip Amount, merchant PAN or tracking links.
 const amount=idr(match[3].replace(/[.,]$/,''))||undefined;
 const date=labelledDate('Transaction Date '+match[4]);
 const original=content.match(/^\s*(?:From|Dari):\s*(.+)$/mi)?.[1];
 const refs=[...new Set([...plain.matchAll(/(?:reference id|transaction id)\s*[:=]?\s*([a-z0-9-]{6,100})\b/gi)].map(m=>m[1]))];
 const tip=labelledMoney(plain,'tip amount');
 const destination=match[2].trim().replace(/\s+/g,' ').toLowerCase();
 const eligible=!!(amount&&date&&tip===0&&/\b\d{10,25}\b/.test(destination)&&refs.length<=1);
 // This is an application fingerprint, not a bank-issued reference. Identical
 // payments within the bank's timestamp precision cannot be distinguished.
 const fingerprint=amount&&date&&destination?'jago-fp-'+createHash('sha256').update(JSON.stringify(['jago-payment-v1',match[1].toLowerCase(),date,destination,amount,tip])).digest('hex'):undefined;
 return {amount,type:'expense',account_hint:match[1].toLowerCase(),date,source_sender:original?mailbox(original.trim())||undefined:undefined,bank_reference:refs.length===1?refs[0]:refs.length===0?fingerprint:undefined,auto_eligible:eligible,reason:eligible?'Pembayaran Jago terbaca. Forward ulang dikenali dari rekening, waktu, tujuan, dan nominal. Pembayaran identik pada menit yang sama perlu diperiksa.':'Pembayaran Jago perlu diperiksa: tanggal, tujuan atau total debit termasuk tip belum cukup jelas.'};
}
function labelledDate(content:string):string|undefined {
 const days:{year:number;month:number;day:number}[]=[];
 const months:Record<string,number>={jan:1,januari:1,january:1,feb:2,februari:2,february:2,mar:3,maret:3,march:3,apr:4,april:4,mei:5,may:5,jun:6,juni:6,june:6,jul:7,juli:7,july:7,agu:8,ags:8,agustus:8,aug:8,august:8,sep:9,september:9,okt:10,oktober:10,oct:10,october:10,nov:11,november:11,des:12,desember:12,dec:12,december:12};
 for(const m of content.matchAll(/(?:tanggal(?: transaksi| pembayaran)?|transaction date|date)\s*[:=]?\s*(\d{1,2})[-\s]+([a-z]+)[-\s]+(\d{4})/gi))days.push({year:Number(m[3]),month:months[m[2].toLowerCase()]||0,day:Number(m[1])});
 for(const m of content.matchAll(/(?:tanggal(?: transaksi| pembayaran)?|transaction date|date)\s*[:=]?\s*(\d{4})-(\d{2})-(\d{2})/gi))days.push({year:Number(m[1]),month:Number(m[2]),day:Number(m[3])});
 for(const m of content.matchAll(/tanggal(?: transaksi| pembayaran)?\s*[:=]?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/gi))days.push({year:Number(m[3]),month:Number(m[2]),day:Number(m[1])});
 const uniqueDays=[...new Map(days.map(day=>[JSON.stringify(day),day])).values()];
 const times=[...content.matchAll(/(?:waktu|jam|time)(?: transaksi| pembayaran)?\s*[:=]?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT)\b/gi)].map(m=>({hour:Number(m[1]),minute:Number(m[2]),second:Number(m[3]||0),zone:m[4].toUpperCase()}));
 for(const m of content.matchAll(/transaction date\s*[:=]?\s*\d{1,2}[-\s]+[a-z]+[-\s]+\d{4}\s*,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(WIB|WITA|WIT)\b/gi))times.push({hour:Number(m[1]),minute:Number(m[2]),second:Number(m[3]||0),zone:m[4].toUpperCase()});
 const uniqueTimes=[...new Map(times.map(time=>[JSON.stringify(time),time])).values()];
 if(uniqueDays.length!==1||uniqueTimes.length!==1)return undefined;
 const d=uniqueDays[0],t=uniqueTimes[0],value=new Date(Date.UTC(d.year,d.month-1,d.day,t.hour,t.minute,t.second));
 if(d.year<2000||d.month<1||d.month>12||value.getUTCFullYear()!==d.year||value.getUTCMonth()!==d.month-1||value.getUTCDate()!==d.day||t.hour>23||t.minute>59||t.second>59)return undefined;
 const offset=t.zone==='WIB'?7:t.zone==='WITA'?8:9;return new Date(value.getTime()-offset*3600000).toISOString();
}
export function mailbox(value: string): string | null {
 const match = value.trim().match(/^(?:[^<>]*<)?([a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,})>?$/i);
 return match?.[1].toLowerCase() || null;
}
export function suggestEmail(subject: string, body: string): EmailSuggestion {
 const content = normalizedEmail(`${subject}\n${body}`.slice(0,100000));
 if (/kode\s*(?:otp|verifikasi)|one.time.password|verification.code/i.test(subject)||/(?:kode\s*(?:otp|verifikasi)|verification.code|OTP)\s*[:=]?\s*\d{4,12}\b/i.test(body)) return {reason:'Email verifikasi tidak diproses sebagai transaksi.'};
 if (/\b(?:gagal|ditolak|dibatalkan|pending|failed|declined|cancelled)\b/i.test(subject)||/(?:status(?: transaksi)?\s*[:=]\s*|^\s*(?:transaksi|transfer|pembayaran|payment|transaction)\s+)(?:gagal|ditolak|dibatalkan|pending|failed|declined|cancelled)\b/im.test(body)) return {reason:'Status transaksi belum dapat dipastikan berhasil.'};
 const bni=bniSuggestion(content);if(bni)return bni;
 const jago=jagoSuggestion(content);if(jago)return jago;
 const plain=content.replace(/\*{1,2}([A-Za-z][^*\n]*?)\*{1,2}/g,'$1').replace(/\s+/g,' ');
 const principal=labelledMoney(plain,'nominal(?: transaksi| pembayaran| transfer)?|jumlah transaksi|transaction amount|amount|jumlah diterima|jumlah|nilai transaksi|payment amount|paid amount|jumlah pembayaran|jumlah transfer');
 const total=labelledMoney(plain,'total(?: pembayaran| transaksi| dibayar| payment| amount)?|jumlah pembayaran|jumlah dibayar|total paid|you paid');
 const income = /dana masuk|transfer masuk|pemasukan|credited|incoming transfer|(?:menerima|received)\s+(?:transfer|dana|uang|payment)|(?:top.?up|isi saldo)\s+(?:berhasil|sukses)/i.test(plain);
 const expense = /dana keluar|transfer keluar|pengeluaran|(?:pembayaran|bayar|payment)\s+(?:berhasil|sukses|successful)|debited|(?:bayar|membayar|melakukan pembayaran)\s+(?:pakai|dengan|menggunakan)|pembayaran\s+(?:QRIS|Virtual Account)/i.test(plain);
 const type = income!==expense ? income?'income':'expense' : undefined;
 const received=labelledMoney(plain,'jumlah diterima|dana diterima|saldo diterima|received amount|amount received');
 const amount=(type==='income'?(received??principal??total):(total??principal))||unambiguousMoney(plain);
 const creditUnclear=type==='income'&&received===undefined&&principal!==undefined&&total!==undefined&&principal!==total;
 const hints=[...plain.matchAll(/(?:rekening sumber|sumber dana|rekening|account|wallet|akun|nomor hp)\s*(?:number|no\.?|nomor)?\s*[:=]\s*([\d*xX+-]{4,30})/gi)].map(m=>m[1].toLowerCase());
 // Some receipts put the holder's name between the source label and mask.
 // Never use a destination, customer number or merchant PAN as the source.
 for(const m of plain.matchAll(/(?:rekening sumber|sumber dana|dari rekening|source account)\s*[:=]?\s*(?:[a-z][a-z .'-]{0,120}?\s+)?([*xX]{2,}\d{2,8}|\d{6,30})(?=\s|$)/gi))hints.push(m[1].toLowerCase());
 const hint=[...new Set(hints)];
 const refs=[...new Set([...plain.matchAll(/(?:reference id|transaction id|id transaksi|nomor transaksi|no\.? referensi|nomor referensi)\s*[:=]?\s*([a-z0-9-]{6,100})\b/gi)].map(m=>m[1]))];
 const original=content.match(/^\s*(?:From|Dari):\s*(.+)$/mi)?.[1];
 const date=labelledDate(plain),account=hint.length===1?hint[0]:undefined,reference=refs.length===1?refs[0]:undefined;
 const eligible=!!(amount&&type&&date&&account&&reference&&!creditUnclear&&(type==='income'?(received!==undefined||principal!==undefined||total!==undefined):total!==undefined));
 return {amount,type,account_hint:account,date,source_sender:original?mailbox(original.trim())||undefined:undefined,bank_reference:reference,auto_eligible:eligible,reason:eligible?'Detail transaksi terbaca. Cocokkan dengan dompet sumber.':'Sebagian detail email belum jelas. Periksa nominal, jenis, tanggal, rekening, dan referensi.'};
}
