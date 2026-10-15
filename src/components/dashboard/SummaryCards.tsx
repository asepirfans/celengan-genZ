'use client';

import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useApp } from '@/lib/store';

export function SummaryCards() {
  const { summary, profile, exchangeRates } = useApp();
  const currency = profile?.currency || 'IDR';
  const money = (amount: number, sign = false) => formatCurrency(amount, currency, sign, exchangeRates);
  const cards = [
    { label: 'Pemasukan', value: summary.monthlyIncome, detail: 'Bulan ini', icon: ArrowDownLeft, color: 'var(--accent-success)' },
    { label: 'Pengeluaran', value: summary.monthlyExpense, detail: 'Bulan ini', icon: ArrowUpRight, color: 'var(--accent-danger)' },
    { label: 'Selisih arus kas', value: summary.netCashflow, detail: summary.netCashflow >= 0 ? 'Pemasukan melebihi pengeluaran' : 'Pengeluaran melebihi pemasukan', icon: ArrowLeftRight, color: 'var(--text-primary)' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <div className="balance-card p-5 sm:p-6 rounded-2xl min-w-0">
        <div className="flex items-center justify-between gap-2"><p className="text-sm opacity-90">Saldo siap pakai</p><Wallet className="w-5 h-5 opacity-80" strokeWidth={1.5} /></div>
        <h3 className="summary-value font-semibold mt-5">{money(summary.spendableBalance)}</h3>
        <p className="text-xs mt-4 opacity-80">Dana darurat {money(summary.emergencyBalance)}</p>
      </div>
      {cards.map(({ label, value, detail, icon: Icon, color }) => (
        <div key={label} className="p-5 sm:p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] min-w-0">
          <div className="flex items-center justify-between gap-2"><p className="text-sm text-[var(--text-secondary)]">{label}</p><Icon className="w-5 h-5 text-[var(--text-muted)]" strokeWidth={1.5} /></div>
          <h3 className="summary-value font-semibold mt-5" style={{ color }}>{money(value, label === 'Selisih arus kas')}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-4">{detail}</p>
        </div>
      ))}
    </div>
  );
}
