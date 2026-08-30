'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Clock } from 'lucide-react';
import { useApp } from '@/lib/store';
import { formatCurrency, formatDate, formatTime } from '@/lib/formatters';
import { CategoryIcon } from '../ui/CategoryIcon';

export function RecentTransactions() {
  const { getEnrichedTransactions, profile, exchangeRates } = useApp();
  const recentList = getEnrichedTransactions().slice(0, 5);
  const currency = profile?.currency || 'IDR';

  return (
    <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-white">
            Transaksi Terkini
          </h3>
          <p className="text-xs text-neutral-400">
            Aktivitas pengeluaran & pemasukan terakhir
          </p>
        </div>
        <Link 
          href="/transactions" 
          className="text-xs font-semibold text-[#38BDF8] hover:underline"
        >
          Lihat Semua →
        </Link>
      </div>

      {recentList.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-500">
          Belum ada transaksi. Klik tombol + untuk mencatat pengeluaran atau pemasukan.
        </div>
      ) : (
        <div className="divide-y divide-[#222]">
          {recentList.map((trx) => {
            const isExpense = trx.type === 'expense';
            const isIncome = trx.type === 'income';
            const isTransfer = trx.type === 'transfer';

            return (
              <div 
                key={trx.id} 
                className="py-3.5 flex items-center justify-between hover:bg-[#1A1A1A] -mx-2 px-2 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Category / Type Vector Icon */}
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[#2A2A2A]"
                    style={{ 
                      backgroundColor: trx.category?.color ? `${trx.category.color}15` : '#222',
                      color: trx.category?.color || '#38BDF8'
                    }}
                  >
                    {isTransfer ? (
                      <ArrowLeftRight className="w-4 h-4 text-[#3ECFFF]" />
                    ) : (
                      <CategoryIcon name={trx.category?.icon || 'receipt'} className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-[#38BDF8] transition-colors">
                      {trx.note || trx.category?.name || (isTransfer ? `Transfer ke ${trx.to_account?.name || 'Akun'}` : 'Transaksi')}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                      <span className="truncate">{trx.account?.name}</span>
                      <span>•</span>
                      <span>{formatDate(trx.date, 'relative')}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <p className={`text-sm font-bold font-mono ${
                    isExpense ? 'text-[#FF4E4E]' : isIncome ? 'text-[#3EFF9A]' : 'text-[#3ECFFF]'
                  }`}>
                    {isExpense ? '-' : isIncome ? '+' : ''}
                    {formatCurrency(trx.amount, currency, false, exchangeRates)}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    {formatTime(trx.date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
