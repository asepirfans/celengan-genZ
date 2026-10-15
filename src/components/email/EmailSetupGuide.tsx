'use client';

import Image from 'next/image';
import { useId, useState } from 'react';

const steps = [
 {id:'browser',title:'Buka Gmail di browser',description:'Gunakan Safari atau Chrome, bukan aplikasi Gmail. Buka menu browser, lalu pilih Minta Situs Desktop / Situs desktop.',hint:'Kalau pengaturannya tidak tampil di HP, gunakan komputer untuk setup sekali ini.'},
 {id:'address',title:'Tambahkan alamat penerima',description:'Di Gmail, buka Setelan → Lihat semua setelan → Penerusan dan POP/IMAP. Pilih Tambahkan alamat penerusan, tempel alamat aplikasi, lalu lanjutkan.',hint:'Alamat pada gambar hanya contoh. Gunakan alamat milikmu di bawah.'},
 {id:'confirm',title:'Konfirmasi lewat aplikasi',description:'Kembali ke halaman ini dan cek email konfirmasi. Buka tautannya, lalu tekan Confirm / Konfirmasi di halaman Google sampai muncul Confirmation Success.',hint:'Sesudah berhasil, refresh Gmail. Tidak perlu membuka Cloudflare.'},
 {id:'filter',title:'Teruskan email bank saja',description:'Buka opsi pencarian Gmail. Tempel pengirim bank pada kolom Dari / From, lalu pilih Buat filter. Centang Teruskan ke dan pilih alamat aplikasi.',hint:'Pada pengaturan penerusan umum, tetap pilih Disable forwarding. Simpan filter bank. Email baru yang cocok akan diteruskan.'},
 {id:'wallet',title:'Pilih dompet yang sesuai',description:'Setelah email transaksi masuk, pilih Hubungkan dompet pada email tersebut. Cocokkan rekening sumber, pilih dompet dan kategori, lalu aktifkan Catat otomatis ke dompet.',hint:'Kalau Gmail penerus berbeda dari email akun, pilih Kenali Gmail ini hanya jika alamat itu milikmu. Top-up dari bank mengurangi dompet sumber.'},
 {id:'test',title:'Coba satu email transaksi',description:'Forward satu bukti transaksi bank ke alamat aplikasi, lalu cek email masuk. Detail lengkap dengan pemetaan otomatis akan masuk ke Tercatat; detail yang belum jelas masuk ke Periksa.',hint:'Untuk menguji filter otomatis, gunakan email bank baru yang diterima setelah filter disimpan. Transaksi yang sama tidak dicatat dua kali.'},
] as const;

type Props = {address:string|null;busy:boolean;hasConfirmation:boolean;onCopy:()=>void;onConfirmation:()=>void;onRefresh:()=>void;verification: {url?:string;code?:string}|null};
const action='inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-medium disabled:opacity-50';

export default function EmailSetupGuide({address,busy,hasConfirmation,onCopy,onConfirmation,onRefresh,verification}:Props){
 const [open,setOpen]=useState(false),[step,setStep]=useState(0),[bank,setBank]=useState('wondr@bni.co.id'),[copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
 const panelId=useId(),current=steps[step];
 async function copySender(){setCopyError(false);try{await navigator.clipboard.writeText(bank);setCopied(true);}catch{setCopyError(true);}}
 return <div className="min-w-0 border-t border-[var(--border-subtle)] pt-3">
  <button type="button" aria-expanded={open} aria-controls={panelId} className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold" onClick={()=>setOpen(!open)}><span>Panduan bergambar Gmail<span className="mt-1 block text-xs font-normal text-[var(--text-secondary)]">Setup sekali, ikuti 6 langkah.</span></span><span aria-hidden="true" className="text-xl font-normal">{open?'−':'+'}</span></button>
  {open&&<div id={panelId} className="mt-4 min-w-0 space-y-4">
   <nav aria-label="Langkah panduan Gmail" className="grid grid-cols-6 gap-2">{steps.map((item,index)=><button type="button" key={item.id} aria-label={`Langkah ${index+1}: ${item.title}`} aria-current={step===index?'step':undefined} onClick={()=>setStep(index)} className={'min-h-11 min-w-0 rounded-xl border text-sm font-semibold '+(step===index?'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--on-accent)]':'border-[var(--border-subtle)] text-[var(--text-secondary)]')}>{index+1}</button>)}</nav>
   <div aria-live="polite" aria-atomic="true"><p className="text-xs text-[var(--text-secondary)]">Langkah {step+1} dari {steps.length}</p><h3 className="mt-1 text-lg font-semibold">{current.title}</h3></div>
   <figure className="space-y-2"><Image src={`/guides/email/${current.id}.svg`} alt={`Ilustrasi contoh: ${current.title}`} width={600} height={340} unoptimized className="h-auto w-full rounded-xl"/><figcaption className="text-xs text-[var(--text-secondary)]">Ilustrasi panduan. Nama menu bisa berbeda mengikuti bahasa dan versi Gmail.</figcaption></figure>
   <p className="text-sm leading-relaxed">{current.description}</p>
   <p className="rounded-xl bg-[var(--surface-elevated)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">{current.hint}</p>
   {!address&&(step===0||step===1)&&<p className="text-sm font-medium">Tekan Aktifkan penerimaan di atas terlebih dahulu untuk membuat alamat penerimamu.</p>}
   {(step===1||step===5)&&address&&<div className="space-y-2"><p className="select-all break-all rounded-xl border border-[var(--border-subtle)] p-3 text-xs">{address}</p><button type="button" disabled={busy} className={action} onClick={onCopy}>Salin alamat saya</button></div>}
   {step===0&&<a href="https://mail.google.com/mail/u/0/#settings/fwdandpop" target="_blank" rel="noopener noreferrer" className={action}>Buka Gmail di browser</a>}
   {step===2&&<div className="space-y-3"><div className="flex flex-wrap gap-2"><button type="button" className={action} disabled={busy} onClick={onRefresh}>Cek email konfirmasi</button>{hasConfirmation&&<button type="button" disabled={busy} className={action} onClick={onConfirmation}>Buka konfirmasi Gmail</button>}</div><p className="text-xs text-[var(--text-secondary)]">{hasConfirmation?'Email konfirmasi tersedia. Pastikan alamat tujuannya sesuai sebelum menyetujui di Google.':'Belum ada email konfirmasi. Di Gmail, pilih Re-send email jika diperlukan.'}</p>{verification?.url&&<a href={verification.url} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-sm font-semibold underline">Konfirmasi penerusan di Gmail</a>}{verification?.code&&<p className="text-sm">Kode konfirmasi: <span className="select-all font-mono">{verification.code}</span></p>}</div>}
   {step===3&&<div className="space-y-2"><label className="block text-xs" htmlFor={panelId+'-bank'}>Contoh pengirim bank yang sudah diuji</label><select id={panelId+'-bank'} value={bank} onChange={e=>{setBank(e.target.value);setCopied(false);setCopyError(false);}} className="min-h-11 w-full min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 text-sm"><option value="wondr@bni.co.id">wondr BNI</option><option value="noreply@jago.com">Bank Jago</option></select><p className="select-all break-all text-xs">{bank}</p><button type="button" className={action} onClick={()=>void copySender()}>{copied?'Pengirim disalin':'Salin pengirim bank'}</button>{copyError&&<p role="status" className="text-xs">Pilih teks pengirim di atas, lalu salin manual.</p>}<p className="text-xs text-[var(--text-secondary)]">Ulangi untuk bank lain. Gunakan pengirim dari email transaksi asli, bukan email promosi.</p></div>}
   {step===5&&<button type="button" className={action} disabled={busy} onClick={onRefresh}>Cek email masuk</button>}
   <div className="flex gap-3 border-t border-[var(--border-subtle)] pt-4"><button type="button" disabled={step===0} className={action+' flex-1'} onClick={()=>setStep(step-1)}>Kembali</button>{step<steps.length-1?<button type="button" className={action+' flex-1 bg-[var(--accent-primary)] text-[var(--on-accent)]'} onClick={()=>setStep(step+1)}>Berikutnya</button>:<button type="button" className={action+' flex-1'} onClick={()=>setOpen(false)}>Tutup panduan</button>}</div>
  </div>}
 </div>;
}
