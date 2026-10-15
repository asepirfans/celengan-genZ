# Cakupan pembacaan email transaksi

Penelusuran 15 Oktober 2026. Bukti adanya layanan email tidak berarti seluruh template transaksinya sudah diuji. Semua data pribadi pada fixture diganti dengan data uji.

| Penyedia | Bukti dan status |
| --- | --- |
| BNI wondr | Email pengguna: transfer keluar, Virtual Account, QRIS. Sudah diuji. |
| Jago | Email pengguna: pembayaran Inggris, termasuk versi dengan tautan gambar/pelacakan. Sudah diuji. Otomatis memakai fingerprint jika tidak ada ID bank; pembayaran identik pada menit sama bisa dianggap duplikat. |
| Mandiri Livin’ | Contoh email pembayaran historis tersedia di PDF publik. Label pembayaran, total, biaya, referensi, tanggal/jam, dan rekening sumber bertopeng digunakan untuk fixture struktur yang disamarkan. Bukan pengujian langsung pada akun Mandiri atau jaminan seluruh template terkini. |
| BCA | Dokumentasi resmi mengonfirmasi pengaturan email myBCA. Panduan KlikBCA Bisnis mengonfirmasi referensi pada email transaksi. Belum mendapat contoh lengkap body email konsumen untuk fixture khusus. Pembaca umum tetap digunakan. |
| GoPay | Panduan resmi mengonfirmasi bukti email pembayaran pulsa/tagihan. Body email lengkap belum diperoleh; belum mengklaim parser khusus GoPay. |
| DANA, OVO, ShopeePay | Belum memperoleh contoh email transaksi konsumen lengkap yang dapat diverifikasi. Pembaca umum memberi usulan nominal bila tidak ambigu; jangan menganggap seluruh format sudah didukung otomatis. |

Pembaca umum menerima variasi label nominal/pembayaran/transfer, sumber rekening dengan nama pemilik sebelum nomor tersamar, dan referensi transaksi. Biaya/tip tidak dipilih sebagai nominal utama. Otomatis tetap membutuhkan jenis, tanggal dengan zona waktu, sumber, referensi dan satu pemetaan aktif. Email promosi, pesanan dikirim, laporan bulanan dan OTP bukan bukti satu transaksi keluar.

## Sumber

- Contoh email pembayaran Livin’ historis: https://berkas.simpkb.id/demo/guruberbagi-rpp/demo/525-1673066940.pdf
- Pengaturan email myBCA: https://www.bca.co.id/id/informasi/edukatips/2026/04/15/09/53/mudahnya-mengatur-notifikasi-transaksi-email-di-mybca
- Panduan KlikBCA Bisnis: https://pustaka.bca.co.id/files/bca-co-id/bisnis/layanan/e-banking-bisnis/klikbca-bisnis/Panduan-Pengguna-KBB-ID.pdf
- Bukti pembayaran GoPay: https://gopay.co.id/bantuan/pulsa-tagihan/cara-melihat-riwayat-pembayaran-pulsa-tagihan
- Shopee membedakan bukti riwayat ShopeePay dari email pengiriman pesanan: https://help.shopee.co.id/portal/4/article/71937-%5BTanda-Terima-Pesanan%5D-Bagaimana-cara-mendapatkan-faktur-pesanan-saya
