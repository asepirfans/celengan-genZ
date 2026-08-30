'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { OverviewCharts } from '@/components/dashboard/OverviewCharts';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { BudgetProgressWidget } from '@/components/dashboard/BudgetProgressWidget';
import { QuickTransactionModal } from '@/components/modals/QuickTransactionModal';
import { useApp } from '@/lib/store';
import { Sparkles, ArrowRight, PlusCircle, Wallet, PiggyBank, CheckCircle2, ShieldCheck, Target, Users } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile, transactions, accounts } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const userName = profile?.full_name?.split(' ')[0] || 'Pengguna';
  const isFirstTimeUser = transactions.length === 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#171717] via-[#141414] to-[#171717] border border-[#262626] p-6 rounded-2xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#38BDF8] mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>FINANCIAL OVERVIEW</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Halo, {userName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Berikut ringkasan kondisi keuangan & cashflow kamu bulan ini.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/reports"
              className="px-4 py-2.5 bg-[#222222] border border-[#333333] hover:border-[#444] text-xs font-semibold rounded-xl text-white flex items-center gap-2 transition-all hover:bg-[#282828]"
            >
              Lihat Laporan Lengkap
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <SummaryCards />

        {/* Smart Gen Z Feature Row: Celengan Impian, Split Bill, Dana Darurat */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/goals"
            className="p-4 rounded-2xl bg-gradient-to-br from-[#1A1828] via-[#161616] to-[#141414] border border-[#A78BFA]/30 hover:border-[#A78BFA] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 border border-[#A78BFA]/20 flex items-center justify-center text-[#A78BFA]">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-[#A78BFA] transition-colors">Celengan Impian 🎯</h4>
                <p className="text-[11px] text-neutral-400">Nabung gadget & liburan</p>
              </div>
            </div>
            <span className="text-xs text-neutral-500 group-hover:text-white">→</span>
          </Link>

          <Link
            href="/split-bill"
            className="p-4 rounded-2xl bg-gradient-to-br from-[#122329] via-[#161616] to-[#141414] border border-[#38BDF8]/30 hover:border-[#38BDF8] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center text-[#38BDF8]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-[#38BDF8] transition-colors">Split Bill Nongkrong 🧾</h4>
                <p className="text-[11px] text-neutral-400">Bagi bill & share ke WA</p>
              </div>
            </div>
            <span className="text-xs text-neutral-500 group-hover:text-white">→</span>
          </Link>

          <Link
            href="/emergency-fund"
            className="p-4 rounded-2xl bg-gradient-to-br from-[#12291E] via-[#161616] to-[#141414] border border-[#3EFF9A]/30 hover:border-[#3EFF9A] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3EFF9A]/10 border border-[#3EFF9A]/20 flex items-center justify-center text-[#3EFF9A]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-[#3EFF9A] transition-colors">Dana Darurat 🛡️</h4>
                <p className="text-[11px] text-neutral-400">Cek runway ketahanan hidup</p>
              </div>
            </div>
            <span className="text-xs text-neutral-500 group-hover:text-white">→</span>
          </Link>
        </div>

        {/* Smart Getting Started Checklist for Beginners / First-Time Users */}
        {isFirstTimeUser && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#1A2212] via-[#141812] to-[#161616] border border-[#38BDF8]/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] animate-pulse" />
                <h3 className="text-sm font-bold text-white">Panduan Memulai Cepat untuk Anda</h3>
              </div>
              <span className="text-[11px] font-mono text-[#38BDF8]">Langkah Awal</span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Selamat datang di Money Tracker! Ikuti 3 langkah mudah ini untuk mulai mengatur keuangan Anda dengan rapi:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <Link 
                href="/accounts"
                className="p-3.5 rounded-xl bg-[#0E0E0E]/80 border border-[#282828] hover:border-[#38BDF8]/50 transition-all flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 flex items-center justify-center text-[#38BDF8] shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#38BDF8] transition-colors">1. Atur Saldo Awal</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Sesuaikan nominal uang yang Anda miliki di bank/dompet saat ini.</p>
                </div>
              </Link>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="p-3.5 rounded-xl bg-[#0E0E0E]/80 border border-[#282828] hover:border-[#38BDF8]/50 transition-all flex items-start gap-3 text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#3EFF9A]/10 flex items-center justify-center text-[#3EFF9A] shrink-0">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#3EFF9A] transition-colors">2. Catat Transaksi</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Catat pengeluaran makan, bensin, atau pemasukan pertama Anda.</p>
                </div>
              </button>

              <Link 
                href="/budget"
                className="p-3.5 rounded-xl bg-[#0E0E0E]/80 border border-[#282828] hover:border-[#38BDF8]/50 transition-all flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#3ECFFF]/10 flex items-center justify-center text-[#3ECFFF] shrink-0">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#3ECFFF] transition-colors">3. Pasang Target Budget</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Batasi pengeluaran per kategori agar tidak boros di akhir bulan.</p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Overview Charts (Tren Arus Kas & Donut Distribusi) */}
        <OverviewCharts />

        {/* Bottom Section: Recent Transactions + Budget Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTransactions />
          <BudgetProgressWidget />
        </div>

        {/* Quick Transaction Modal */}
        <QuickTransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </AppShell>
  );
}
