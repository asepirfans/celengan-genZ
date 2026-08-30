'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useApp } from '@/lib/store';

export function SummaryCards() {
  const { summary, profile, exchangeRates } = useApp();
  const currency = profile?.currency || 'IDR';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Spendable vs Total Balance Card */}
      <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626] relative overflow-hidden group hover:border-[#383838] transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400 font-mono uppercase tracking-wider">
            Saldo Siap Pakai
          </span>
          <div className="w-8 h-8 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center text-[#38BDF8]">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold font-mono text-white tracking-tight">
            {formatCurrency(summary.spendableBalance, currency, false, exchangeRates)}
          </h3>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[11px] text-neutral-400 font-mono">
              🔒 Dana Darurat: <strong className="text-[#38BDF8]">{formatCurrency(summary.emergencyBalance, currency, false, exchangeRates)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Income Bulan Ini */}
      <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626] relative overflow-hidden group hover:border-[#383838] transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400 font-mono uppercase tracking-wider">
            Pemasukan Bulan Ini
          </span>
          <div className="w-8 h-8 rounded-xl bg-[#3EFF9A]/10 border border-[#3EFF9A]/20 flex items-center justify-center text-[#3EFF9A]">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold font-mono text-[#3EFF9A] tracking-tight">
            {formatCurrency(summary.monthlyIncome, currency, false, exchangeRates)}
          </h3>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[11px] text-neutral-500 font-mono">
              Tabungan rate: <strong className="text-neutral-300">{summary.savingsRate}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Expense Bulan Ini */}
      <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626] relative overflow-hidden group hover:border-[#383838] transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400 font-mono uppercase tracking-wider">
            Pengeluaran Bulan Ini
          </span>
          <div className="w-8 h-8 rounded-xl bg-[#FF4E4E]/10 border border-[#FF4E4E]/20 flex items-center justify-center text-[#FF4E4E]">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold font-mono text-[#FF4E4E] tracking-tight">
            {formatCurrency(summary.monthlyExpense, currency, false, exchangeRates)}
          </h3>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[11px] text-neutral-500">Total belanja & tagihan</span>
          </div>
        </div>
      </div>

      {/* Net Cashflow Card */}
      <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626] relative overflow-hidden group hover:border-[#383838] transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400 font-mono uppercase tracking-wider">
            Net Cashflow
          </span>
          <div className="w-8 h-8 rounded-xl bg-[#3ECFFF]/10 border border-[#3ECFFF]/20 flex items-center justify-center text-[#3ECFFF]">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className={`text-2xl font-bold font-mono tracking-tight ${summary.netCashflow >= 0 ? 'text-[#3ECFFF]' : 'text-[#FF4E4E]'}`}>
            {formatCurrency(summary.netCashflow, currency, true, exchangeRates)}
          </h3>
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${summary.netCashflow >= 0 ? 'bg-[#3ECFFF]/10 text-[#3ECFFF]' : 'bg-[#FF4E4E]/10 text-[#FF4E4E]'}`}>
              {summary.netCashflow >= 0 ? 'Surplus (Aman)' : 'Defisit (Perhatian)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
