# Penerimaan email lewat Cloudflare

Alur: filter Gmail → `wallet-<token>@masuk.domainmu.com` → Email Worker → endpoint Vercel `/api/webhooks/cloudflare-email` → Supabase. Resend tidak menjadi perantara. Parser, pilihan kategori, dompet, dan penanda duplikat yang sudah ada tetap dipakai.

## Siapkan domain dan server

1. Domain harus memakai DNS Cloudflare. Untuk banyak user dengan satu catch-all, gunakan domain utama yang emailnya belum dipakai layanan lain. Cloudflare hanya menyediakan catch-all pada domain utama. Subdomain seperti `masuk.domainmu.com` dapat dipakai dengan literal routing rule untuk setiap alamat wallet, tetapi kode aplikasi ini belum membuat rule tersebut secara otomatis; batas routing rules juga berlaku. Jangan mengganti MX domain utama jika sedang digunakan layanan email lain.
2. Deploy aplikasi Next.js ke Vercel dan jalankan `npm run db:migrate` pada database tujuan. Migrasi `006-cloudflare-email.sql` menambahkan metadata provider; data lama tetap dianggap Resend.
3. Salin `cloudflare/email-worker/wrangler.jsonc` dan isi `EMAIL_DOMAIN` serta `WEBHOOK_URL` dengan domain penerima dan URL API Vercel yang benar. Endpoint produksi harus dapat diakses tanpa halaman login Vercel Deployment Protection; autentikasi endpoint dilakukan memakai HMAC, bukan cookie user. Server lokal HTTP dan proxy Resend lama tidak menjadi URL produksi Worker.

## Siapkan Worker dan buffer privat

1. Buat bucket **R2 Standard privat** bernama `celengan-email-buffer`. Jangan aktifkan akses publik atau custom domain bucket. R2 perlu diaktifkan di akun dan mungkin meminta metode pembayaran. Ada kuota gratis tetapi penggunaan di atasnya dapat berbayar; ini bukan batas biaya keras.
2. Pada lifecycle bucket, buat aturan **hapus objek berumur 7 hari** untuk ketiga prefix: `pending/`, `archive/`, dan `failed/` (prefix terakhir dicadangkan untuk pemeriksaan operasional). Aturan lifecycle wajib sebelum menerima email nyata. Aplikasi tidak menghapus isi bucket melalui Vercel. Sesuaikan teks retensi di UI bila kebijakan ini diubah.
3. Dari folder `cloudflare/email-worker`, jalankan `npx wrangler login` lalu `npx wrangler deploy`. Konfigurasi membuat Cron Trigger setiap lima menit. Worker menampung MIME sebelum mengirim; bila API gagal/timeout atau tidak memberi acknowledgement yang valid, pesan tetap ada di `pending/` untuk dicoba ulang. Cron memproses lima pesan per putaran dan menyimpan cursor agar pesan gagal tidak menghalangi pesan lain. Tingkatkan throughput setelah mengukur batas CPU/operasi R2. Pantau metrik invocation errors, kegagalan R2, dan umur pesan pending. Jika gagal sebelum tersimpan di R2, penampungan ini belum menjamin pemulihan.
4. Buat secret lokal menggunakan perintah berikut dari root proyek (ganti domain dan origin Worker):

```powershell
node scripts/configure-cloudflare-email.cjs --domain masuk.domainmu.com --worker-url https://celengan-email-ingress.SUBDOMAIN.workers.dev
```

5. Nilai `CLOUDFLARE_EMAIL_SECRET` tersimpan pada `.env.local` yang diabaikan Git. Masukkan nilai yang sama sebagai secret **`EMAIL_SECRET`** di dashboard Worker (atau `npx wrangler secret put EMAIL_SECRET`). Jangan menaruh secret di `wrangler.jsonc`, pesan chat, atau kode klien.
6. Di Cloudflare Email Routing buat **catch-all ke Worker pada domain utama** yang dipilih. Worker hanya menerima local part `wallet-` diikuti 48 karakter hex; backend hanya menerima alamat yang terdaftar dan aktif. Satu catch-all menangani banyak user. Jika memakai subdomain, buat literal routing rule ke Worker untuk setiap alamat wallet (bukan catch-all); otomatisasi pembuatan rule subdomain belum tersedia.

## Environment Vercel dan aktivasi

```dotenv
INBOUND_EMAIL_PROVIDER=cloudflare
CLOUDFLARE_EMAIL_DOMAIN=masuk.domainmu.com
CLOUDFLARE_EMAIL_SECRET=nilai-sama-dengan-EMAIL_SECRET-di-Worker
CLOUDFLARE_EMAIL_WORKER_URL=https://celengan-email-ingress.SUBDOMAIN.workers.dev
DATABASE_URL=connection-string-database
```

Redeploy Vercel setelah mengisi environment. Kunci Cloudflare tidak memerlukan `NEXT_PUBLIC_`. Untuk lokal, perintah konfigurasi di atas bisa diulang dengan `--activate` setelah Worker/domain siap. Jangan mengganti provider sebelum konfigurasi selesai. Kode yang sudah ditambahkan tidak otomatis mengubah DNS, men-deploy Worker/Vercel, atau mengganti filter Gmail.

## Migrasi user dari Resend

- Token lokal `wallet-...`, pilihan dompet, kategori, dan Gmail yang dikenali dipertahankan. Domain email berubah; alamat `@thupabe.resend.app` tidak bisa dipindahkan ke Cloudflare karena bukan domain milik kita.
- Di halaman integrasi, user menyalin alamat baru, menambahkannya ke Gmail, membuka konfirmasi lewat tombol aplikasi, lalu mengganti tujuan filter bank. Verifikasi alamat lama tidak otomatis berlaku ke alamat baru.
- Pertahankan `INBOUND_EMAIL_DOMAIN` lama dan kunci Resend selama transisi supaya konfirmasi/riwayat lama masih bisa dibaca. Webhook Resend tetap terpisah dan dapat diterima selama environment legacy tersedia. Jangan langsung mencabut filter/domain/provider lama sebelum pengujian berhasil.
- Pengiriman ulang MIME yang sama dideduplikasi berdasarkan hash MIME + envelope recipient. Notifikasi dengan bank reference/fingerprint yang sama juga berbagi kunci ledger antarprovider, sehingga pengiriman melalui Resend dan Cloudflare tidak menambah transaksi dua kali. Transaksi manual lama yang tidak memiliki penanda email tetap belum direkonsiliasi otomatis.

## Retensi, batas, dan pengujian

- Maksimum MIME **1 MiB** termasuk lampiran; Worker menolak pesan yang lebih besar secara eksplisit. Lampiran tidak dipakai untuk parsing transaksi. Batas aplikasi ini lebih kecil daripada batas produk Cloudflare/Vercel agar pemrosesan terkendali.
- R2 menyimpan salinan lengkap, termasuk lampiran, secara privat sampai aturan lifecycle menghapusnya. Setelah berhasil, salinan dipindahkan dari `pending/` ke `archive/`; database hanya menyimpan metadata dan usulan parsing. `Baca ulang` mengakses salinan lewat `/read` pada Worker memakai HMAC setelah API memverifikasi pemilik email. Setelah salinan kedaluwarsa, user diminta melihat email Gmail asli. Tautan/kode konfirmasi Gmail yang sudah dikenali disimpan sebagai metadata milik user.
- HMAC SHA-256 mencakup timestamp dan seluruh body; timestamp di luar lima menit ditolak. Secret ini membuktikan pesan berasal dari Worker, bukan membuktikan keaslian transaksi bank.
- Waktu kedatangan awal dipertahankan saat retry. Email yang diterima sebelum otomatis diaktifkan tidak mendadak dianggap baru hanya karena baru berhasil dikirim ke Vercel.
- Jalankan `npm test`, `node scripts/test-cloudflare-email.cjs`, `npm run test:integration`, dan `npm run build`. Pengujian Cloudflare menggunakan fixture database sementara dan membersihkannya; tidak mengirim email ke pihak luar.
- Uji email sungguhan ke alamat baru, pastikan muncul pada user yang tepat, baca konfirmasi Gmail, lalu uji ulang email bank yang sama untuk memastikan saldo tidak berubah dua kali. Tes lokal belum membuktikan konfigurasi DNS/Worker produksi.

Referensi: [Email handler](https://developers.cloudflare.com/email-service/api/route-emails/email-handler/), [routing domain](https://developers.cloudflare.com/email-service/get-started/route-emails/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
