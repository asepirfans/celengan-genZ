'use client';

import React from 'react';
import { ChickenLogo } from '@/components/ui/ChickenLogo';
import { Transaction, Profile, Category, Account } from '@/lib/types';
import { formatCurrency, formatDate, formatTime } from '@/lib/formatters';

interface BookingStyleStatementProps {
  monthName: string;
  month: number;
  year: number;
  profile: Profile | null;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  monthIncome: number;
  monthExpense: number;
  monthNet: number;
  exchangeRates: Record<string, number>;
}

export function BookingStyleStatement({
  monthName,
  month,
  year,
  profile,
  transactions,
  categories,
  accounts,
  monthIncome,
  monthExpense,
  monthNet,
  exchangeRates
}: BookingStyleStatementProps) {
  const currency = profile?.currency || 'IDR';
  const [bookingCode, setBookingCode] = React.useState(`MT-${year}${String(month).padStart(2, '0')}-OFFICIAL`);
  const [generatedDate, setGeneratedDate] = React.useState('');

  React.useEffect(() => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    setBookingCode(`MT-${year}${String(month).padStart(2, '0')}-${randomSuffix}`);
    setGeneratedDate(new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
  }, [month, year]);

  return (
    <div id="booking-invoice-print" className="hidden print:block font-sans text-black bg-white p-8 max-w-4xl mx-auto">
      {/* Header / Brand & Booking Voucher Banner */}
      <div className="border-b-2 border-dashed border-neutral-300 pb-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0284C7] text-white flex items-center justify-center text-2xl font-black shadow-sm">
              <ChickenLogo className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-neutral-900">
                CELENGAN<span className="text-[#0284C7]">.</span>GENZ
              </h1>
              <p className="text-xs text-neutral-500 font-medium tracking-wide uppercase">
                Official E-Receipt & Financial Statement
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block bg-emerald-100 text-emerald-800 text-[11px] font-bold font-mono px-3 py-1 rounded-full border border-emerald-300 uppercase tracking-wider mb-1">
              ✓ Verified & Balanced
            </span>
            <p className="text-xs font-mono text-neutral-500">Issued: {generatedDate} WIB</p>
          </div>
        </div>
      </div>

      {/* Booking / Statement Metadata Grid */}
      <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-neutral-400 font-medium block text-[10px] uppercase font-mono">Nomor E-Receipt / ID</span>
            <span className="font-mono font-bold text-neutral-900 text-sm tracking-wide">{bookingCode}</span>
          </div>

          <div>
            <span className="text-neutral-400 font-medium block text-[10px] uppercase font-mono">Nama Pemilik Akun</span>
            <span className="font-bold text-neutral-900 text-sm">{profile?.full_name || 'Personal Account'}</span>
          </div>

          <div>
            <span className="text-neutral-400 font-medium block text-[10px] uppercase font-mono">Periode Laporan</span>
            <span className="font-bold text-neutral-900 text-sm">{monthName} {year}</span>
          </div>

          <div>
            <span className="text-neutral-400 font-medium block text-[10px] uppercase font-mono">Mata Uang Acuan</span>
            <span className="font-mono font-bold text-neutral-900 text-sm">{currency}</span>
          </div>
        </div>
      </div>

      {/* Financial Summary Highlight Card (Ticket Summary Style) */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">Total Pemasukan</span>
          <p className="text-lg font-black font-mono text-emerald-700 mt-1">
            +{formatCurrency(monthIncome, currency, false, exchangeRates)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block">Total Pengeluaran</span>
          <p className="text-lg font-black font-mono text-rose-700 mt-1">
            -{formatCurrency(monthExpense, currency, false, exchangeRates)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 block">Net Surplus / Tabungan</span>
          <p className="text-lg font-black font-mono text-sky-800 mt-1">
            {formatCurrency(monthNet, currency, true, exchangeRates)}
          </p>
        </div>
      </div>

      {/* Itemized Transactions Table (Booking Breakdown Style) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-neutral-700">
            Rincian Item Transaksi ({transactions.length} Mutasi)
          </h3>
          <span className="text-[10px] text-neutral-400 font-mono">Data Terenkripsi & Valid</span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-300 bg-neutral-100 text-neutral-600 font-mono text-[11px]">
              <th className="py-2.5 px-3">No</th>
              <th className="py-2.5 px-3">Waktu & Tanggal</th>
              <th className="py-2.5 px-3">Kategori & Catatan</th>
              <th className="py-2.5 px-3">Metode / Akun</th>
              <th className="py-2.5 px-3 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 font-mono text-[11px]">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-neutral-400">
                  Tidak ada data mutasi pada periode ini.
                </td>
              </tr>
            ) : (
              transactions.map((t, idx) => {
                const isExpense = t.type === 'expense';
                const isIncome = t.type === 'income';
                const cat = categories.find(c => c.id === t.category_id);
                const acc = accounts.find(a => a.id === t.account_id);

                return (
                  <tr key={t.id || idx} className="hover:bg-neutral-50">
                    <td className="py-2 px-3 text-neutral-400">{idx + 1}</td>
                    <td className="py-2 px-3 text-neutral-600 whitespace-nowrap">
                      {formatDate(t.date, 'short')} <span className="text-neutral-400">{formatTime(t.date)}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-neutral-900 font-sans">{t.note || cat?.name || 'Transaksi'}</div>
                      <div className="text-[10px] text-neutral-500">{cat?.name || 'Umum'}</div>
                    </td>
                    <td className="py-2 px-3 text-neutral-600 whitespace-nowrap">
                      {acc?.name || 'Dompet'}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold whitespace-nowrap ${
                      isExpense ? 'text-rose-600' : isIncome ? 'text-emerald-600' : 'text-sky-600'
                    }`}>
                      {isExpense ? '-' : isIncome ? '+' : ''}
                      {formatCurrency(t.amount, currency, false, exchangeRates)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Ticket Footer / Security QR Code Style Stamp */}
      <div className="border-t-2 border-dashed border-neutral-300 pt-6 mt-8 flex items-center justify-between text-xs text-neutral-500">
        <div className="space-y-1">
          <p className="font-bold text-neutral-800">Money Tracker Smart Financial Platform</p>
          <p className="text-[10px] text-neutral-400 leading-relaxed max-w-md">
            Dokumen ini merupakan ringkasan resmi mutasi keuangan otomatis yang dihasilkan secara digital. Tidak memerlukan tanda tangan basah.
          </p>
        </div>

        <div className="text-right font-mono">
          <div className="w-16 h-16 bg-neutral-900 text-white rounded-lg flex flex-col items-center justify-center p-1 ml-auto text-[9px] font-bold">
            <span>[ QR-PASS ]</span>
            <span className="text-[7px] text-neutral-400">AUTHENTIC</span>
          </div>
          <span className="text-[9px] text-neutral-400 block mt-1">STATUS: APPROVED</span>
        </div>
      </div>
    </div>
  );
}
