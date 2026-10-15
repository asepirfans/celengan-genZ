# Penerimaan email Cloudflare + Supabase

Alur: filter Gmail → `wallet-<token>@domainmu.com` → Email Worker → Vercel `/api/webhooks/cloudflare-email` → PostgreSQL Supabase. Tidak perlu R2, Supabase Storage, URL publik Worker, atau Supabase service-role key di Worker.

## Domain dan backend

1. Gunakan domain dengan DNS Cloudflare dan Email Routing aktif. Catch-all hanya untuk domain utama; jangan mengganti MX mailbox yang sedang digunakan layanan lain. Subdomain memerlukan rule literal untuk setiap alamat wallet, yang belum diotomatisasi aplikasi.
2. Deploy kode terbaru ke Vercel. Endpoint webhook harus tersedia melalui HTTPS tanpa Vercel Deployment Protection. HMAC memverifikasi panggilan Worker.
3. Jalankan `npm run db:migrate` pada database tujuan. Migrasi `007-cloudflare-supabase-buffer.sql` membuat tabel privat `cloudflare_email_payloads`. RLS aktif dan akses `anon` / `authenticated` dicabut. Database hanya diakses backend dengan `DATABASE_URL`.

## Worker

Gunakan `cloudflare/email-worker/worker.mjs` dan konfigurasi `wrangler.jsonc`. Pada Worker `celengan-email-ingress`:

| Jenis | Nama | Nilai |
| --- | --- | --- |
| Variable | `EMAIL_DOMAIN` | `cloudiolabs.my.id` |
| Variable | `WEBHOOK_URL` | `https://celengan-gen-z.vercel.app/api/webhooks/cloudflare-email` |
| Secret | `EMAIL_SECRET` | Sama dengan `CLOUDFLARE_EMAIL_SECRET` di Vercel |

Tidak ada binding `EMAIL_BUFFER` / R2. `workers_dev` boleh tetap nonaktif. Cron Trigger setiap lima menit memanggil endpoint Vercel yang sama dengan payload `{ "action": "retry" }` bertanda tangan, memproses maksimal lima email tertunda dan membersihkan salinan kedaluwarsa. Worker tidak membuka endpoint `/read`.

Untuk konfigurasi lokal, jalankan:

```powershell
node scripts/configure-cloudflare-email.cjs --domain cloudiolabs.my.id
```

Secret tersimpan pada `.env.local` yang diabaikan Git. Jangan masukkan secret ke kode Worker, `wrangler.jsonc`, chat, atau variabel `NEXT_PUBLIC_`.

## Environment Vercel

```dotenv
INBOUND_EMAIL_PROVIDER=cloudflare
CLOUDFLARE_EMAIL_DOMAIN=cloudiolabs.my.id
CLOUDFLARE_EMAIL_SECRET=nilai-sama-dengan-EMAIL_SECRET-di-Worker
DATABASE_URL=connection-string-database
```

Redeploy setelah mengisi environment. `CLOUDFLARE_EMAIL_WORKER_URL` tidak diperlukan lagi. Pertahankan konfigurasi Resend lama selama transisi agar riwayat lama masih terbaca.

Setelah kode, secret, database, dan Cron siap, arahkan catch-all domain utama ke Worker. Worker hanya menerima `wallet-` diikuti 48 karakter hex, dan backend hanya menerima inbox aktif yang terdaftar. Alamat lain di domain tidak diproses.

## Penyimpanan dan kegagalan

- MIME maksimal 1 MiB termasuk lampiran. MIME disimpan sebagai base64 di tabel privat Supabase, sehingga ikut memakai kuota database; bukan penyimpanan tanpa batas.
- Backend mengonfirmasi penerimaan hanya setelah payload tersimpan dalam transaksi database. Parsing dan pencatatan transaksi berlangsung setelahnya. Jika pemrosesan gagal, payload tetap tersimpan untuk Cron retry. Retry tetap memakai waktu kedatangan pertama dan tidak menggandakan transaksi.
- Tanpa buffer di Cloudflare, bila Vercel/database tidak bisa menerima email sama sekali, Worker melempar error dan tidak memberi konfirmasi berhasil. **Cron tidak dapat memulihkan email yang belum pernah tersimpan di Supabase.** Jangan mengandalkan retry SMTP sebagai jaminan. Email asli di Gmail tetap menjadi sumber pemulihan dan dapat diteruskan ulang setelah layanan pulih.
- Salinan tidak dapat dibaca setelah tujuh hari. Cron atau penerimaan email berikutnya menghapus baris kedaluwarsa. Jika keduanya tidak berjalan, data fisik dapat bertahan lebih lama sampai pembersihan berjalan lagi. Metadata transaksi tetap disimpan.
- Batas buffer adalah 10 MiB teks base64 per user dan 100 MiB global. Email baru ditolak dengan HTTP 503 bila penuh; data lama tidak ditimpa. Batas ini bukan batas ukuran seluruh database atau jaminan tagihan. Pantau kuota proyek Supabase.
- `Baca ulang` mengambil payload dari Supabase setelah memeriksa user dan recipient. Tidak ada archive publik atau token service-role dalam browser/Worker.

## Migrasi Gmail dan pengujian

Token wallet, pemetaan dompet, kategori dan Gmail yang dikenali tetap dipakai. Domain Resend `@thupabe.resend.app` tidak bisa dipindahkan: user perlu menambahkan alamat baru di Gmail, menyelesaikan verifikasi, lalu mengganti tujuan filter bank. Jangan meneruskan seluruh inbox.

Jalankan `npm test`, `npm run test:cloudflare`, `npm run test:integration`, dan `npm run build`. Tes Cloudflare memakai akun fixture sementara, memeriksa penyimpanan, retry setelah kegagalan, retensi, akses pemilik, batas buffer, deduplikasi antarprovider dan konfirmasi Gmail; fixture dibersihkan setelah selesai.

Tes produksi harus memakai email nyata ke alamat baru, memastikan user dan dompet benar, lalu mengirim ulang bukti yang sama untuk memeriksa deduplikasi. Jangan menganggap tes lokal sebagai bukti routing DNS/Worker produksi.

Referensi: [Email handler](https://developers.cloudflare.com/email-service/api/route-emails/email-handler/), [routing rules](https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/).