# CelenganGenZ

Aplikasi pencatat keuangan pribadi dengan wallet, budget bulanan, dana darurat, target tabungan, laporan, dan split bill.

## Menjalankan proyek

1. Salin `.env.example` ke `.env.local`, lalu isi `DATABASE_URL` PostgreSQL.
2. Jalankan `npm install`.
3. Jalankan `npm run db:migrate` untuk menambahkan tabel sesi, hubungan wallet celengan, dan riwayat split bill. Migrasi dapat dijalankan ulang dan tidak menghapus data lama.
4. Jalankan `npm run dev`. Perangkat pada jaringan yang sama bisa membuka `http://IP-LAPTOP:3000`.

Development dan build memakai Webpack agar tidak bergantung pada junction Turbopack di Windows. Untuk produksi, gunakan `npm run build` kemudian `npm start`, dengan HTTPS agar cookie sesi dapat digunakan.

## Perilaku data

- Login menggunakan cookie HttpOnly dengan sesi PostgreSQL yang berlaku 30 hari. Logout mencabut sesi. Semua API data memeriksa sesi dan kepemilikan resource; ID pengguna dari body/URL tidak menentukan akun yang diakses.
- Profil yang dikirim ke browser tidak menyertakan password atau hash. Sesi lama yang disimpan di localStorage tidak lagi diterima; pengguna perlu masuk ulang setelah pembaruan ini.
- Dashboard dan halaman dana darurat memakai pilihan wallet yang sama. Mengosongkan pilihan berarti saldo dana darurat nol.
- Setiap celengan baru memiliki wallet khusus. Menabung dan menarik tabungan dicatat sebagai transfer, bukan pemasukan/pengeluaran. Saldo sumber, saldo tujuan, dan progres diperbarui dalam transaksi database yang sama. Permintaan yang diulang dengan ID sama tidak menghasilkan transfer tambahan.
- Celengan lama mempertahankan progresnya. Pilih **Hubungkan saldo lama** dan wallet sumber untuk memindahkan uang tanpa menaikkan progres lagi. Tidak ada pemindahan saldo lama secara otomatis.
- Wallet celengan serta transfernya dikelola lewat Celengan Impian. Target hanya bisa diarsipkan setelah saldo wallet nol; riwayat transfer tetap dipertahankan.
- Perubahan tampilan disahkan setelah respons penyimpanan berhasil. Hapus transaksi massal dan salin budget dijalankan secara transaksional.
- Split bill menyimpan riwayat dan status pembayaran per peserta. Status ditandai manual setelah pembayaran diterima, dan tidak otomatis membuat transaksi wallet. Pembulatan rupiah dibagikan agar jumlah tagihan peserta sama dengan total.

## Pemeriksaan

- `npm test`: perhitungan saldo, reservasi dana, periode budget, dan pembulatan split bill.
- `npm run test:integration`: jalankan saat server development aktif. Menguji API dengan dua akun sementara dan menghapus fixture setelah selesai. Gunakan database pengujian untuk pengujian berulang.
- `npx tsc --noEmit`: pemeriksaan TypeScript.

Migrasi SQL ada di `db/migrations/`. Jalankan migrasi pada setiap database tujuan sebelum memakai versi ini.

## Penerimaan notifikasi transaksi lewat email

Implementasi awal menggunakan Resend Receiving. Tidak memakai Gmail OAuth atau membaca inbox pengguna. Buka **Pengaturan → Kelola transaksi dari email**.


1. Siapkan domain penerima di Resend (domain `*.resend.app` yang diberikan Resend atau subdomain khusus dengan MX sesuai petunjuk Resend). Jangan mengganti MX domain mailbox utama.
2. Isi `INBOUND_EMAIL_DOMAIN`, `RESEND_API_KEY` (akses mengambil email diterima), dan `RESEND_WEBHOOK_SECRET` pada environment server. Restart server setelah konfigurasi.
3. Deploy backend melalui HTTPS publik. Buat webhook Resend untuk `email.received`, tujuan `https://DOMAIN-APLIKASI/api/webhooks/email`. Server lokal Wi-Fi tidak dapat menerima panggilan dari Resend; development membutuhkan tunnel HTTPS yang dijalankan selama pengujian.
4. Aktifkan penerimaan email di halaman integrasi. Alamat acak dibuat khusus per pengguna. Saat dijeda, email baru tidak dimasukkan; pengiriman ulang setelah diaktifkan bukan impor sejarah.
5. Tambahkan alamat tersebut sebagai alamat penerusan Gmail. Selesaikan verifikasi Gmail melalui **Cara menghubungkan Gmail → Buka konfirmasi Gmail** di aplikasi, lalu buat filter terbatas pada notifikasi transaksi bank. Email konfirmasi bukan transaksi. Jangan meneruskan seluruh inbox.
6. Cocokkan pengirim dan identitas rekening tersamar dengan wallet. Parser awal hanya mengusulkan nominal IDR yang jelas, arah transaksi, dan identitas rekening yang diberi label eksplisit. Format bank berbeda-beda dan belum semuanya dikenali.
7. Periksa email asli dan konfirmasikan tanggal/jam transaksi, kategori, nominal, dan wallet. Pilih transfer untuk perpindahan antar wallet sendiri. Saldo dan transaksi diperbarui bersama setelah database menyimpan; email masuk sendiri belum mengubah saldo.

Format transfer keluar wondr by BNI yang diteruskan sudah membaca nominal, biaya admin, total, rekening sumber tersamar, serta tanggal/jam WIB/WITA/WIT. Usulan nominal memakai total (nominal + biaya) jika angka cocok. Waktu dikonversi dari zona yang tertulis pada email, bukan waktu penerimaannya. Pemetaan dapat memakai pengirim asli dari header email yang diteruskan; header itu hanya membantu memilih wallet dan bukan bukti keaslian bank. Kategori dan wallet tetap perlu dipilih jika belum ada pemetaan.

Pembayaran Virtual Account wondr BNI dengan judul **Transaksi berhasil!** juga dikenali sebagai pengeluaran jika isi email menyebut pembayaran Virtual Account. Format jam tanpa detik (misalnya `07:15 WIB`) diterima dengan detik `00`; tidak mengambil waktu dari header penerusan. Judul sukses saja tanpa jenis transaksi yang dikenali tidak cukup untuk klasifikasi otomatis.

QRIS wondr BNI juga dikenali, termasuk tanggal dengan spasi (`13 Okt 2026`) dan tidak adanya baris biaya admin jika nominal sama dengan total. Pembaca umum mengenali label nominal/total, arah transaksi, tanggal berformat Indonesia/ISO, waktu dengan WIB/WITA/WIT, rekening atau wallet, serta referensi transaksi. Pembayaran umum tanpa total debit eksplisit tidak memenuhi syarat sinkronisasi otomatis. Tidak ada jaminan semua format DANA/GoPay/Shopee/bank didukung; hanya detail yang terdeteksi lengkap dan cocok dengan pemetaan yang boleh dicatat otomatis. Tombol **Baca ulang** tersedia untuk email pending yang belum lengkap; tindakan ini hanya memperbarui detail, tidak membuat transaksi dompet.

Webhook diverifikasi menggunakan Svix pada body asli dengan pemeriksaan waktu. Isi email diambil dari API Resend server-side; payload webhook sendiri hanya metadata. Pengiriman ulang ID email yang sama tidak menambah antrean atau transaksi kedua. Untuk template berisi referensi bank yang dikenali, kunci referensi juga mencegah duplikat antar email berbeda.

### Menerima email nyata saat server masih di laptop

Jalankan `node scripts/email-webhook-proxy.cjs`, lalu `cloudflared tunnel --url http://127.0.0.1:3011 --no-autoupdate`. Proxy hanya menerima POST `/api/webhooks/email` dan tidak membuka halaman aplikasi development ke internet. Dengan API key terisi di `.env.local`, jalankan `node scripts/setup-email-webhook.cjs https://URL-TUNNEL/api/webhooks/email` untuk mendaftarkan webhook dan menyimpan signing secret tanpa mencetaknya. Skrip dapat memperbarui webhook milik setup ini melalui `RESEND_WEBHOOK_ID`; webhook lain tidak ditimpa.

Server aplikasi, proxy, tunnel, koneksi internet, dan laptop harus tetap berjalan. URL quick tunnel dapat berubah setelah dijalankan ulang; perbarui webhook menggunakan skrip setup. Ini menerima email nyata, tetapi bukan deployment dengan ketersediaan 24 jam. Untuk penggunaan tetap, gunakan hosting atau named tunnel dengan domain dan URL stabil.

Isi email lengkap dan lampiran tidak disimpan di database aplikasi; hanya pengirim, subjek, waktu penerimaan, usulan hasil parsing, serta status. Hindari subjek berisi data sensitif. Signature webhook membuktikan pengiriman dari penyedia, bukan keaslian bank. Sinkronisasi otomatis dapat dipilih untuk template yang dikenali melalui pengaturan pemetaan di bawah. Pengirim/body forward saja tidak membuktikan keaslian bank.

### Sinkronisasi dompet dari email yang dikenali

Pada email transaksi, pilih **Hubungkan dompet**, pilih wallet dan kategori untuk masing-masing jenis, lalu aktifkan **Catat otomatis ke dompet** dan simpan hubungan. Jenis transaksi mengikuti email yang dikenali; satu rekening memakai kategori pemasukan dan pengeluaran terpisah. Pengaturan awal tetap manual; mengaktifkan otomatis merupakan pilihan pengguna. Template transfer keluar wondr BNI telah dikenali. Sinkronisasi hanya mencatat jika nominal positif, tanggal valid, rekening sumber, referensi bank, pengirim, dan jenis cocok dengan satu pemetaan aktif. Email yang diteruskan secara manual dapat berasal dari alamat email profil atau alamat penerusan yang dikenali pengguna. Jika alamat Gmail berbeda dari email login, pilih **Kenali Gmail ini & sinkronkan** pada email pending: alamat pengirim diambil dari email milik pengguna di server, tidak dari input bebas. Ini mengenali satu alamat penerusan per pengguna dan memproses email pilihan saja; email baru mengikuti aturan otomatis. Alamat yang dikenali bisa dihapus di bagian penerimaan email. Ini persetujuan pengguna terhadap sumber notifikasi, bukan verifikasi kepemilikan Gmail atau keaslian bank. Format lain yang belum lengkap tetap menunggu pemeriksaan. Transfer antar rekening sendiri perlu dicatat sebagai transfer secara manual, bukan menggunakan pemetaan pengeluaran.

Kategori pemasukan dan pengeluaran secara awal dipilih **Belum dikategorikan**. Saat pemetaan disimpan, kategori dibuat atau digunakan kembali khusus pengguna dan jenis pemasukan/pengeluaran yang dipilih. Pengguna tidak perlu membuat kategori sendiri. Saldo diperbarui melalui transaksi biasa dan kategori dapat diperbaiki kemudian di menu Transaksi.

Untuk email baru, pencatatan dan saldo disimpan dalam transaksi database yang sama dengan penerimaan email. Batas pengaktifan mengikuti waktu email masuk ke aplikasi, bukan tanggal transaksi di dalamnya: forward baru dengan tanggal transaksi lama bisa tercatat otomatis. Email yang sudah masuk sebelum pengaktifan tetap menggunakan tombol **Sinkronkan** secara eksplisit. Email gagal/OTP tidak dicatat. Pemetaan dapat diubah untuk mematikan otomatis atau dihapus. Tampilan integrasi memperbarui data setiap 20 detik saat tab aktif.

Referensi bank yang sama pada pengirim/rekening yang sama hanya menghasilkan satu transaksi, termasuk bila email diteruskan ulang dengan ID email berbeda. Konfirmasi manual memakai kunci referensi yang sama. Menghapus transaksi tidak membuang penanda referensinya; email duplikat tidak membuat ulang transaksi yang dihapus. Ini belum merekonsiliasi transaksi manual lama di luar fitur email atau memverifikasi saldo bank. Otomatisasi mempercayai notifikasi yang sesuai pengaturan pengguna; tidak menambahkan verifikasi keaslian bank pada isi forward.

Dokumentasi penyedia: [Resend Receiving](https://resend.com/docs/dashboard/receiving/get-email-content) dan [verifikasi webhook](https://resend.com/docs/webhooks/verify-webhooks-requests).

Halaman sinkronisasi memisahkan email yang perlu diperiksa, yang sudah tercatat, dan yang diabaikan, dengan paginasi 50 email per halaman. Konfirmasi Gmail tidak dimasukkan ke daftar transaksi. Nama penerima yang sama persis dengan nama profil ditahan untuk pemeriksaan transfer antar dompet; ini tidak mendeteksi semua rekening milik sendiri bila nama berbeda.

Untuk pemasukan, nominal yang diterima diprioritaskan dibanding total yang dibayar pengirim. Jika nominal dan total berbeda tanpa label penerimaan yang jelas, pencatatan otomatis ditahan. Nomor pesanan toko saja tidak dianggap bukti identitas transaksi bank/e-wallet.

Format pembayaran Jago berbahasa Inggris (Transaction Summary) membaca Amount, From, Transaction Date dengan zona waktu, dan status Successful. Tip Amount dipisahkan dari Amount. Pembayaran Jago sukses dengan waktu, rekening, identitas tujuan, nominal, dan tip nol dapat mengikuti pemetaan otomatis. Tanpa ID transaksi bank, aplikasi memakai hash rekening, waktu, tujuan, nominal dan tip untuk mencegah forward ulang; ini bukan referensi bank. Dua pembayaran identik pada menit yang sama tidak bisa dibedakan oleh format email ini dan dapat dianggap duplikat. Tip nonnol atau detail tidak lengkap tetap diperiksa. Nomor PAN dan tautan pelacakan saja bukan ID transaksi. Transaksi manual lama sebelum dukungan fingerprint tidak otomatis direkonsiliasi.

Pembacaan nominal membersihkan tautan gambar/pelacakan, spasi khusus, dan karakter tak terlihat sebelum mengenali label uang. Untuk format lain, satu nominal Rupiah yang tidak ambigu dapat menjadi isian pemeriksaan; biaya, tip, pajak dan nomor rekening tidak dipilih sebagai nominal utama. Nominal yang terbaca sendiri belum cukup untuk pencatatan otomatis.

### Penerimaan Cloudflare (migrasi dari Resend)

Dukungan Cloudflare Email Worker tersedia di `cloudflare/email-worker`. Penyimpanan email memakai PostgreSQL Supabase tanpa R2. Panduan domain, secret, environment Vercel, transisi Gmail, retensi dan pengujian ada di [docs/cloudflare-email-setup.md](docs/cloudflare-email-setup.md). Provider aktif tidak diganti otomatis sebelum domain/Worker siap.
