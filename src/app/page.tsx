import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, ArrowDownLeft, Wallet, Landmark, ShoppingBag, Target, ChartNoAxesCombined, ReceiptText, LayoutDashboard, ChevronDown, Check } from 'lucide-react';
import { ChickenLogo } from '@/components/ui/ChickenLogo';
import { LandingLink } from '@/components/landing/LandingLink';
import styles from './landing.module.css';

export const metadata: Metadata = {
 title: 'CelenganGenZ — Dompet, budget, dan tujuan dalam satu tempat',
 description: 'Kelola dompet, catat transaksi, susun budget, dan pantau tujuan tabunganmu bersama CelenganGenZ.',
};
const features=[
 {icon:Wallet,title:'Dompet & transaksi',text:'Pisahkan rekening, e-wallet, dan uang tunai. Catat pemasukan, pengeluaran, atau transfer antar dompet.'},
 {icon:ChartNoAxesCombined,title:'Budget bulanan',text:'Beri batas untuk tiap kategori dan lihat sisa budget sebelum transaksi berikutnya.'},
 {icon:Target,title:'Celengan & dana darurat',text:'Sisihkan uang untuk tujuan tertentu dan pantau kesiapan dana daruratmu.'},
 {icon:ReceiptText,title:'Laporan keuangan',text:'Lihat pola pemasukan dan pengeluaran dari transaksi yang sudah kamu catat.'},
];
export default function HomePage(){
 return <div className={styles.page}>
  <a href="#utama" className={styles.skip}>Lewati ke konten</a>
  <header className={styles.header}><Link href="/" className={styles.brand} aria-label="CelenganGenZ beranda"><span className={styles.mark}><ChickenLogo width={25} height={25}/></span>CelenganGenZ</Link><nav aria-label="Navigasi utama"><a href="#fitur" className={styles.navFeature}>Fitur</a><a href="#cara-mulai" className={styles.navHow}>Cara mulai</a><LandingLink className={styles.navLogin}>Masuk <ArrowUpRight size={15}/></LandingLink></nav></header>
  <main id="utama">
   <section className={styles.hero} aria-labelledby="hero-title"><p className={styles.kicker}>DOMPET. BUDGET. TUJUAN.</p><h1 id="hero-title">Satu tempat.<br/><span>Untuk uangmu.</span></h1><p className={styles.intro}>Catat yang masuk, pahami yang keluar.<br/>Siapkan uang untuk hari ini dan rencana berikutnya.</p><div className={styles.actions}><LandingLink register className={styles.primary}>Buat akun <ArrowRight size={17}/></LandingLink><a href="#fitur" className={styles.secondary}>Lihat fiturnya</a></div><p className={styles.heroNote}>Mulai manual. Hubungkan email transaksi saat kamu siap.</p></section>
   <section className={styles.stage} aria-label="Contoh dashboard dengan data ilustrasi">
    <div className={styles.product}>
     <aside className={styles.sidebar} aria-hidden="true"><span className={styles.miniLogo}><ChickenLogo width={22} height={22}/></span><span className={styles.activeSide}><LayoutDashboard size={17}/></span><Wallet size={17}/><ChartNoAxesCombined size={17}/><Target size={17}/></aside>
     <div className={styles.productBody}>
      <div className={styles.productHeader}><div><p>KEUANGAN PRIBADI</p><h2>Ringkasanmu</h2></div><span className={styles.sample}>Data ilustrasi</span></div>
      <div className={styles.board}>
       <div className={styles.balance}><div className={styles.balanceTop}><span>Total saldo dompet</span><Wallet size={20}/></div><strong className={styles.balanceAmount}>Rp4.250.000</strong><div className={styles.cashflow}><div><span><ArrowDownLeft size={13}/> Masuk</span><strong>Rp6.000.000</strong></div><div><span><ArrowUpRight size={13}/> Keluar</span><strong>Rp1.750.000</strong></div></div><div className={styles.balanceFoot}>Dari 3 dompet yang kamu catat</div></div>
       <div className={styles.activity}><div className={styles.panelTitle}><h3>Transaksi terbaru</h3><span>Bulan ini</span></div><div className={styles.transaction}><span className={styles.transactionIcon}><Landmark size={16}/></span><div><strong>Gaji bulanan</strong><span>Rekening · Pemasukan</span></div><b className={styles.income}>+Rp6.000.000</b></div><div className={styles.transaction}><span className={styles.transactionIcon}><ShoppingBag size={16}/></span><div><strong>Belanja kebutuhan</strong><span>Rekening · Belanja</span></div><b>−Rp450.000</b></div><div className={styles.transaction}><span className={styles.transactionIcon}><ReceiptText size={16}/></span><div><strong>Makan siang</strong><span>E-wallet · Makanan</span></div><b>−Rp25.000</b></div></div>
       <div className={styles.budget}><div className={styles.panelTitle}><h3>Pemakaian budget</h3><ChartNoAxesCombined size={16}/></div>{[['Makanan','Rp450rb / 750rb','60%'],['Transportasi','Rp250rb / 500rb','50%'],['Belanja','Rp600rb / 1jt','60%']].map(([name,amount,width])=><div className={styles.budgetRow} key={name}><div><span>{name}</span><b>{amount}</b></div><div className={styles.progress}><span style={{width}}/></div></div>)}<p className={styles.budgetNote}>Sisakan ruang untuk kebutuhan berikutnya.</p></div>
      </div>
      <div className={styles.wallets}><div><Landmark size={17}/><span>Rekening<strong>Rp2.800.000</strong></span></div><div><Wallet size={17}/><span>E-wallet<strong>Rp750.000</strong></span></div><div><ReceiptText size={17}/><span>Uang tunai<strong>Rp700.000</strong></span></div><div className={styles.goal}><Target size={17}/><span>Target liburan<strong>60% terkumpul</strong></span></div></div>
     </div>
    </div><p className={styles.stageCaption}>Gambaran keuanganmu dalam satu layar. Angka di atas hanya contoh.</p>
   </section>
   <section className={styles.features} id="fitur" aria-labelledby="feature-title"><div className={styles.sectionTitle}><p className={styles.kicker}>YANG KAMU BUTUHKAN</p><h2 id="feature-title">Dari transaksi harian<br/>sampai rencana berikutnya.</h2></div><div className={styles.featureGrid}>{features.map(({icon:Icon,title,text})=><article key={title}><span className={styles.featureIcon}><Icon size={22} strokeWidth={1.6}/></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
   <section className={styles.email} aria-labelledby="email-title"><div><span className={styles.emailLabel}>PENCATATAN LEWAT EMAIL</span><h2 id="email-title">Bukti transaksi masuk.<br/>Catatan ikut terisi.</h2><p>Teruskan email notifikasi bank ke alamat penerima milikmu. Detail yang dikenali bisa langsung masuk ke dompet pilihanmu.</p><p className={styles.emailNote}>Perlu pengaturan penerusan dan pemetaan dompet. Format yang belum dikenali tetap perlu diperiksa. Integrasi ini tidak mengakses rekening bank secara langsung.</p></div><div className={styles.emailExample}><div className={styles.emailReceipt}><div><ReceiptText size={20}/><span>EMAIL TRANSAKSI</span></div><strong>Pembayaran berhasil</strong><p>Nominal <b>Rp25.000</b></p></div><div className={styles.connector}><ArrowRight size={17}/><span>Detail dikenali</span></div><div className={styles.emailPosted}><Check size={19}/><div><strong>Tercatat di dompet</strong><span>Pengeluaran · Rp25.000</span></div></div><p>Contoh alur · berdasarkan pengaturanmu</p></div></section>
   <section className={styles.start} id="cara-mulai" aria-labelledby="start-title"><div className={styles.sectionTitle}><p className={styles.kicker}>TIGA LANGKAH PERTAMA</p><h2 id="start-title">Mulai dari dompetmu sendiri.</h2></div><ol><li><span>1</span><h3>Buat akun</h3><p>Siapkan ruang untuk catatan keuanganmu.</p></li><li><span>2</span><h3>Tambahkan dompet</h3><p>Atur sumber uang dan saldo awalnya.</p></li><li><span>3</span><h3>Catat transaksi pertama</h3><p>Lanjutkan dengan budget dan target tabungan.</p></li></ol></section>
   <section className={styles.faq} aria-labelledby="faq-title"><div><h2 id="faq-title">Masih ingin tahu?</h2><p>Beberapa hal sebelum kamu mulai.</p></div><div><details><summary>Harus menghubungkan bank dulu?<ChevronDown size={18}/></summary><p>Tidak. Pencatatan manual bisa langsung digunakan. Penerusan email transaksi bersifat opsional dan bisa kamu atur nanti.</p></details><details><summary>Bisa dipakai dari HP?<ChevronDown size={18}/></summary><p>Bisa. Tampilan menyesuaikan HP maupun komputer. Kamu juga dapat menambahkan situs ke layar utama melalui fitur browser di perangkatmu.</p></details><details><summary>Semua email bank bisa otomatis dicatat?<ChevronDown size={18}/></summary><p>Belum semua format didukung. Pencatatan otomatis membutuhkan detail yang cukup dan pemetaan dompet aktif. Jika ada detail yang belum jelas, email masuk ke daftar pemeriksaan.</p></details></div></section>
   <section className={styles.finalCta}><div><h2>Kenali kondisi uangmu.<br/>Tentukan langkah berikutnya.</h2><p>Mulai dari satu dompet dan satu transaksi.</p></div><LandingLink register className={styles.lightButton}>Mulai sekarang <ArrowRight size={18}/></LandingLink></section>
  </main><footer className={styles.footer}><Link href="/" className={styles.brand}><ChickenLogo width={21} height={21}/>CelenganGenZ</Link><p>Catatan keuangan. Ruang untuk rencana.</p><Link href="/login">Masuk ke akun <ArrowUpRight size={14}/></Link></footer>
 </div>;
}
