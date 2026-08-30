'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Lightbulb, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';

import * as XLSX from 'xlsx';
import { BookingStyleStatement } from '@/components/reports/BookingStyleStatement';

export default function ReportsPage() {
  const { transactions, categories, accounts, summary, profile, exchangeRates } = useApp();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  // Transactions filtered by selected month/year
  const monthTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
  });

  const monthIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthNet = monthIncome - monthExpense;

  // Category breakdown
  const categoryMap: { [id: string]: { cat: any; amount: number; count: number } } = {};
  monthTransactions.filter(t => t.type === 'expense').forEach(t => {
    if (t.category_id) {
      if (!categoryMap[t.category_id]) {
        categoryMap[t.category_id] = {
          cat: categories.find(c => c.id === t.category_id),
          amount: 0,
          count: 0,
        };
      }
      categoryMap[t.category_id].amount += Number(t.amount);
      categoryMap[t.category_id].count += 1;
    }
  });

  const categoryList = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);
  const pieData = categoryList.map(item => ({
    name: item.cat ? `${item.cat.icon} ${item.cat.name}` : 'Lainnya',
    value: item.amount,
    color: item.cat?.color || '#888888',
  }));

  // Top 5 largest expenses
  const topExpenses = [...monthTransactions]
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const excelData = monthTransactions.map((t, idx) => ({
      'No': idx + 1,
      'Tanggal': formatDate(t.date, 'long'),
      'Tipe': t.type.toUpperCase(),
      'Nominal (IDR)': Number(t.amount),
      'Catatan': t.note || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 12 },
      { wch: 20 },
      { wch: 35 }
    ];

    const workbook = XLSX.utils.book_new();
    const monthName = months.find(m => m.value === selectedMonth)?.label || 'Bulan';
    XLSX.utils.book_append_sheet(workbook, worksheet, `Laporan ${monthName} ${selectedYear}`);

    const fileName = `Laporan_Keuangan_${selectedMonth}_${selectedYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <>
      <BookingStyleStatement
        monthName={months.find(m => m.value === selectedMonth)?.label || 'Bulan'}
        month={selectedMonth}
        year={selectedYear}
        profile={profile}
        transactions={monthTransactions}
        categories={categories}
        accounts={accounts}
        monthIncome={monthIncome}
        monthExpense={monthExpense}
        monthNet={monthNet}
        exchangeRates={exchangeRates}
      />

      <div className="print:hidden">
        <AppShell>
          <div className="space-y-6">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                  Laporan Keuangan & Analisis
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Analisis performa cashflow, kategori pengeluaran terbesar, dan smart insight.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Month / Year Selector */}
                <div className="flex items-center gap-1.5 bg-[#171717] border border-[#2A2A2A] rounded-xl px-2.5 py-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent text-xs text-white focus:outline-none"
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value} className="bg-[#181818]">{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent text-xs text-white focus:outline-none"
                  >
                    <option value={2025} className="bg-[#181818]">2025</option>
                    <option value={2026} className="bg-[#181818]">2026</option>
                  </select>
                </div>

                <button
                  onClick={handlePrint}
                  className="px-3.5 py-2 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:border-[#444] transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak E-Receipt / PDF</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  className="px-3.5 py-2 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:border-[#444] transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#3EFF9A]" />
                  <span>Ekspor Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Smart Financial Insights Banner (FR-RPT-03) */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#171A13] via-[#141812] to-[#171A13] border border-[#38BDF8]/30 relative overflow-hidden">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[#38BDF8] mt-0.5">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#38BDF8]">
                    Smart Financial Insight
                  </span>
                  <p className="text-sm font-medium text-white leading-relaxed">
                    {categoryList[0] ? (
                      <>Pengeluaran terbesarmu bulan ini terkonsentrasi pada <strong className="text-[#38BDF8]">{categoryList[0].cat?.name}</strong> sebesar {formatCurrency(categoryList[0].amount, profile?.currency || 'IDR', false, exchangeRates)} ({monthExpense > 0 ? Math.round((categoryList[0].amount / monthExpense) * 100) : 0}% dari total belanja).</>
                    ) : (
                      'Belum ada cukup data pengeluaran untuk menghasilkan insight pengeluaran.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Month Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626]">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Pemasukan Bulan Ini
                </span>
                <h3 className="text-2xl font-bold font-mono text-[#3EFF9A] mt-1">
                  {formatCurrency(monthIncome, profile?.currency || 'IDR', false, exchangeRates)}
                </h3>
                <span className="text-xs text-neutral-500 mt-2 block">
                  {monthTransactions.filter(t => t.type === 'income').length} transaksi
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626]">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Pengeluaran Bulan Ini
                </span>
                <h3 className="text-2xl font-bold font-mono text-[#FF4E4E] mt-1">
                  {formatCurrency(monthExpense, profile?.currency || 'IDR', false, exchangeRates)}
                </h3>
                <span className="text-xs text-neutral-500 mt-2 block">
                  {monthTransactions.filter(t => t.type === 'expense').length} transaksi
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626]">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  Net Tabungan (Cashflow)
                </span>
                <h3 className={`text-2xl font-bold font-mono mt-1 ${monthNet >= 0 ? 'text-[#38BDF8]' : 'text-[#FF4E4E]'}`}>
                  {formatCurrency(monthNet, profile?.currency || 'IDR', true, exchangeRates)}
                </h3>
                <span className="text-xs text-neutral-500 mt-2 block">
                  Tingkat tabungan: {monthIncome > 0 ? Math.max(0, Math.round((monthNet / monthIncome) * 100)) : 0}%
                </span>
              </div>
            </div>

            {/* Charts & Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown Table */}
              <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626] space-y-4">
                <h3 className="font-bold text-base text-white">Distribusi Pengeluaran Kategori</h3>
                {categoryList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-500">
                    Tidak ada pengeluaran di periode ini.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryList.map(item => (
                      <div key={item.cat?.id || 'other'} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-white flex items-center gap-2">
                            <span>{item.cat?.icon}</span>
                            <span>{item.cat?.name}</span>
                          </span>
                          <div className="text-right font-mono">
                            <span className="text-white font-bold">
                              {formatCurrency(item.amount, profile?.currency || 'IDR', false, exchangeRates)}
                            </span>
                            <span className="text-neutral-500 text-[11px] ml-2">
                              ({monthExpense > 0 ? Math.round((item.amount / monthExpense) * 100) : 0}%)
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-[#222] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#38BDF8] rounded-full" 
                            style={{ width: `${monthExpense > 0 ? (item.amount / monthExpense) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top 5 Expenses */}
              <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626] space-y-4">
                <h3 className="font-bold text-base text-white">Top 5 Pengeluaran Terbesar</h3>
                {topExpenses.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-500">
                    Tidak ada transaksi pengeluaran.
                  </div>
                ) : (
                  <div className="divide-y divide-[#222]">
                    {topExpenses.map(trx => (
                      <div key={trx.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-white">{trx.note || trx.category?.name || 'Pengeluaran'}</p>
                          <p className="text-[11px] text-neutral-500 font-mono">{formatDate(trx.date, 'short')}</p>
                        </div>
                        <span className="font-mono font-bold text-[#FF4E4E]">
                          -{formatCurrency(trx.amount, profile?.currency || 'IDR', false, exchangeRates)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </AppShell>
      </div>
    </>
  );
}
