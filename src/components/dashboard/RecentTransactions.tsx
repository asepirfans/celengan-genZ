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
    <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
            Transaksi Terkini
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Aktivitas pengeluaran & pemasukan terakhir
          </p>
        </div>
        <Link
          href="/transactions"
          className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
        >
          Lihat Semua →
        </Link>
      </div>

      {recentList.length === 0 ? (
        <div className="py-12 text-center text-xs text-[var(--text-muted)]">
          Belum ada transaksi. Klik tombol + untuk mencatat pengeluaran atau pemasukan.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {recentList.map((trx) => {
            const isExpense = trx.type === 'expense';
            const isIncome = trx.type === 'income';
            const isTransfer = trx.type === 'transfer';

            return (
              <div
                key={trx.id}
                className="recent-row py-3.5 flex items-center justify-between hover:bg-[var(--surface-elevated)] -mx-2 px-2 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Category / Type Vector Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border-subtle)]"
                    style={{
                      backgroundColor: trx.category?.color ? `${trx.category.color}15` : '#222',
                      color: trx.category?.color || '#76834E'
                    }}
                  >
                    {isTransfer ? (
                      <ArrowLeftRight className="w-4 h-4 text-[var(--accent-primary)]" />
                    ) : (
                      <CategoryIcon name={trx.category?.icon || 'receipt'} className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                      {trx.note || trx.category?.name || (isTransfer ? `Transfer ke ${trx.to_account?.name || 'Akun'}` : 'Transaksi')}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
                      <span className="truncate">{trx.account?.name}</span>
                      <span>•</span>
                      <span>{formatDate(trx.date, 'relative')}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <p className={`text-sm font-bold font-mono ${
                    isExpense ? 'text-[var(--accent-danger)]' : isIncome ? 'text-[var(--accent-success)]' : 'text-[var(--accent-primary)]'
                  }`}>
                    {isExpense ? '-' : isIncome ? '+' : ''}
                    {formatCurrency(trx.amount, currency, false, exchangeRates)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">
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
