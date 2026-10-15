'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Plus, Wallet, Target, Users, ShieldCheck } from 'lucide-react';

import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { OverviewCharts } from '@/components/dashboard/OverviewCharts';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { BudgetProgressWidget } from '@/components/dashboard/BudgetProgressWidget';
import { QuickTransactionModal } from '@/components/modals/QuickTransactionModal';
import { useApp } from '@/lib/store';

const shortcuts = [
  { href: '/goals', title: 'Celengan impian', subtitle: 'Sedikit demi sedikit, sampai tujuan.', icon: Target },
  { href: '/split-bill', title: 'Split bill', subtitle: 'Bagi tagihan dengan mudah.', icon: Users },
  { href: '/emergency-fund', title: 'Dana darurat', subtitle: 'Siapkan ruang untuk yang tak terduga.', icon: ShieldCheck },
];

export default function DashboardPage() {
  const { profile, transactions } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const userName = profile?.full_name?.split(' ')[0] || 'Pengguna';
  const month = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <>
      <div className="space-y-6 sm:space-y-8">
        <div className="dashboard-intro flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-secondary)] mb-2">Ringkasan keuangan · {month}</p>
            <h1 className="text-3xl sm:text-4xl font-display text-[var(--text-primary)]">Halo, {userName}.</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2">Lebih kenal uangmu. Lebih tenang menjalani hari.</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="self-start shrink-0 flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] text-[var(--on-accent)] px-4 py-3 text-sm font-medium hover:bg-[var(--accent-hover)]">
            <Plus className="w-4 h-4" /> Catat transaksi
          </button>
        </div>
        <SummaryCards />
        <div className="dashboard-shortcuts grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          {shortcuts.map(({ href, title, subtitle, icon: Icon }) => (
            <Link key={href} href={href}>
              <Icon className="w-5 h-5 shrink-0 text-[var(--accent-primary)]" strokeWidth={1.6} />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
            </Link>
          ))}
        </div>
        {transactions.length === 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-dashed border-[var(--border-active)] rounded-2xl p-5">
            <Wallet className="w-6 h-6 shrink-0 text-[var(--accent-primary)]" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold">Mulai dari saldo yang kamu punya.</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Atur saldo awal wallet, lalu catat transaksi pertamamu.</p>
            </div>
            <Link href="/accounts" className="text-sm font-medium text-[var(--accent-primary)] flex items-center gap-2">Atur wallet <ArrowUpRight className="w-4 h-4" /></Link>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-display font-semibold">Uang masuk & keluar</h2>
          <Link href="/reports" className="text-xs font-medium text-[var(--accent-primary)] shrink-0">Lihat laporan →</Link>
        </div>
        <OverviewCharts />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTransactions />
          <BudgetProgressWidget />
        </div>
        <QuickTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </>
  );
}
