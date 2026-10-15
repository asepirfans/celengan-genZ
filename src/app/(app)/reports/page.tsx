'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Download, Printer, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, ReceiptText, Tag } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { errorMessage } from '@/lib/client-api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Category } from '@/lib/types';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { BookingStyleStatement } from '@/components/reports/BookingStyleStatement';
import styles from './reports.module.css';

const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function ReportsPage() {
  const { transactions, categories, accounts, profile, exchangeRates } = useApp();
  const { showToast } = useModal();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [isExporting, setIsExporting] = useState(false);
  const exporting = useRef(false);
  const money = (amount: number, sign = false) => formatCurrency(amount, profile?.currency || 'IDR', sign, exchangeRates);
  const years = [...new Set([now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, selectedYear, ...transactions.map(item => new Date(item.date).getFullYear())])].filter(Number.isFinite).sort((a, b) => b - a);
  const monthName = months[selectedMonth - 1];
  const monthTransactions = transactions.filter(item => {
    const date = new Date(item.date);
    return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
  });
  const incomes = monthTransactions.filter(item => item.type === 'income');
  const expenses = monthTransactions.filter(item => item.type === 'expense');
  const monthIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const monthExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const monthNet = monthIncome - monthExpense;
  const categoryMap = new Map<string, { id: string; category?: Category; amount: number; count: number }>();
  for (const item of expenses) {
    const id = item.category_id || 'uncategorized';
    const group = categoryMap.get(id) || { id, category: categories.find(category => category.id === item.category_id), amount: 0, count: 0 };
    group.amount += Number(item.amount);
    group.count += 1;
    categoryMap.set(id, group);
  }
  const categoryList = [...categoryMap.values()].sort((a, b) => b.amount - a.amount);
  const topExpenses = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5);
  const changeMonth = (direction: number) => {
    const date = new Date(selectedYear, selectedMonth - 1 + direction, 1);
    setSelectedYear(date.getFullYear());
    setSelectedMonth(date.getMonth() + 1);
  };
  const exportExcel = async () => {
    if (exporting.current) return;
    exporting.current = true;
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(monthTransactions.map((item, index) => ({
        'No': index + 1,
        'Tanggal': formatDate(item.date, 'long'),
        'Tipe': item.type.toUpperCase(),
        'Nominal (IDR)': Number(item.amount),
        'Catatan': item.note || '-',
      })));
      worksheet['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 12 }, { wch: 20 }, { wch: 35 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Laporan ${monthName} ${selectedYear}`);
      XLSX.writeFile(workbook, `Laporan_Keuangan_${selectedMonth}_${selectedYear}.xlsx`);
    } catch (error) {
      showToast({ message: errorMessage(error), type: 'danger' });
    } finally {
      exporting.current = false;
      setIsExporting(false);
    }
  };

  return (
    <>
      <BookingStyleStatement monthName={monthName} month={selectedMonth} year={selectedYear} profile={profile} transactions={monthTransactions} categories={categories} accounts={accounts} monthIncome={monthIncome} monthExpense={monthExpense} monthNet={monthNet} exchangeRates={exchangeRates} />
      <div className={styles.page + ' print:hidden'}>
        <header className={styles.header}>
          <span className={styles.headerIcon}><BarChart3 size={23} /></span>
          <div><h1>Laporan</h1><p>Lihat arus uangmu.</p></div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.period} role="group" aria-label="Periode laporan">
            <button type="button" aria-label="Bulan sebelumnya" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
            <label><span className="sr-only">Bulan laporan</span><select value={selectedMonth} onChange={event => setSelectedMonth(Number(event.target.value))}>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
            <label><span className="sr-only">Tahun laporan</span><select value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
            <button type="button" aria-label="Bulan berikutnya" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => window.print()}><Printer size={16} />Cetak PDF</button>
            <button type="button" disabled={isExporting} onClick={exportExcel}><Download size={16} />{isExporting ? 'Menyiapkan...' : 'Unduh Excel'}</button>
          </div>
        </div>

        <section className={styles.hero} aria-label="Ringkasan bulanan">
          <div className={styles.heroTop}><span>{monthName} {selectedYear}</span><strong>{incomes.length + expenses.length} transaksi</strong></div>
          <div className={styles.net}>
            <p>Selisih masuk & keluar</p><h2>{money(monthNet, true)}</h2>
            <span>{monthNet < 0 ? 'Pengeluaran lebih besar dari pemasukan.' : monthNet > 0 ? 'Pemasukan masih melebihi pengeluaran.' : monthIncome === 0 ? 'Belum ada uang masuk atau keluar.' : 'Pemasukan dan pengeluaran seimbang.'}</span>
          </div>
          <div className={styles.cashflow}>
            <div><div className={styles.cashflowLabel}><ArrowDownLeft size={15} />Masuk</div><h3>{money(monthIncome)}</h3><small>{incomes.length} transaksi</small></div>
            <div><div className={styles.cashflowLabel}><ArrowUpRight size={15} />Keluar</div><h3>{money(monthExpense)}</h3><small>{expenses.length} transaksi</small></div>
          </div>
        </section>

        <div className={styles.details}>
          <section className={styles.card} aria-labelledby="category-title">
            <div className={styles.sectionTop}><h2 id="category-title">Pengeluaran per kategori</h2><span>{categoryList.length} kategori</span></div>
            {categoryList.length === 0 ? <div className={styles.empty}><Tag size={28} /><p>Belum ada pengeluaran</p><span>Pilih periode lain untuk melihat rinciannya.</span></div> : <>
              <div>{categoryList.map(item => {
                const percent = monthExpense > 0 ? item.amount / monthExpense * 100 : 0;
                return <div className={styles.category} key={item.id}>
                  <div className={styles.categoryTop}><span className={styles.categoryName}><CategoryIcon name={item.category?.icon || 'receipt'} /><span>{item.category?.name || 'Belum dikategorikan'}</span></span><span className={styles.categoryValue}><strong>{money(item.amount)}</strong><small>{Math.round(percent)}%</small></span></div>
                  <div className={styles.track} aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
                </div>;
              })}</div>
              {categoryList.some(item => !item.category || item.category.name === 'Belum dikategorikan') && <p className={styles.tip}><Tag size={14} /><span>Biar lebih jelas, <Link href="/transactions">lengkapi kategori transaksi</Link>.</span></p>}
            </>}
          </section>

          <section className={styles.card} aria-labelledby="largest-title">
            <div className={styles.sectionTop}><h2 id="largest-title">Pengeluaran terbesar</h2><span>Top 5</span></div>
            {topExpenses.length === 0 ? <div className={styles.empty}><ReceiptText size={28} /><p>Belum ada transaksi</p><span>Pengeluaran di periode ini akan tampil di sini.</span></div> : <div>{topExpenses.map((item, index) => {
              const category = categories.find(category => category.id === item.category_id);
              const account = accounts.find(account => account.id === item.account_id);
              const title = item.note?.replace(/^(?:Sinkron email|Email):\s*(?:Fwd:\s*)?/i, '') || category?.name || 'Pengeluaran';
              return <div className={styles.expense} key={item.id}><span className={styles.rank} aria-hidden="true">{index + 1}</span><div className={styles.expenseInfo}><p title={title}>{title}</p><small>{formatDate(item.date, 'short')}{account ? ` · ${account.name}` : ''}</small></div><strong>{money(-Number(item.amount))}</strong></div>;
            })}</div>}
          </section>
        </div>
      </div>
    </>
  );
}
