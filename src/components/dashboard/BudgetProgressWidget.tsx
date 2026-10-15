'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/store';
import { formatCurrency } from '@/lib/formatters';
import { CategoryIcon } from '../ui/CategoryIcon';

export function BudgetProgressWidget() {
  const { budgets, categories, transactions, profile, exchangeRates } = useApp();
  const currency = profile?.currency || 'IDR';

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Find active budgets for current month
  const activeBudgets = budgets
    .filter(b => b.month === currentMonth && b.year === currentYear)
    .map(b => {
      const cat = categories.find(c => c.id === b.category_id);
      const spent = transactions
        .filter(t => {
          const td = new Date(t.date);
          return t.type === 'expense' &&
                 t.category_id === b.category_id &&
                 (td.getMonth() + 1) === currentMonth &&
                 td.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const percent = Math.round((spent / b.amount) * 100);
      return {
        ...b,
        category: cat,
        spent,
        percent,
      };
    })
    .sort((a, b) => b.percent - a.percent);

  return (
    <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
            Status Budget Bulan Ini
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Monitoring pemakaian per kategori
          </p>
        </div>
        <Link
          href="/budget"
          className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
        >
          Kelola Budget →
        </Link>
      </div>

      {activeBudgets.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--text-muted)]">
          Belum ada budget yang diset untuk bulan ini.
        </div>
      ) : (
        <div className="space-y-4">
          {activeBudgets.slice(0, 4).map((b) => {
            let progressColor = 'bg-[var(--accent-success)]';
            let badgeBg = 'bg-[var(--accent-success)]/10 text-[var(--accent-success)]';

            if (b.percent >= 100) {
              progressColor = 'bg-[var(--accent-danger)]';
              badgeBg = 'bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]';
            } else if (b.percent >= 70) {
              progressColor = 'bg-[var(--accent-warning)]';
              badgeBg = 'bg-[var(--accent-warning)]/10 text-[var(--accent-warning)]';
            }

            return (
              <div key={b.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${b.category?.color}20`, color: b.category?.color }}
                    >
                      <CategoryIcon name={b.category?.icon || 'receipt'} className="w-3.5 h-3.5" />
                    </span>
                    <span>{b.category?.name || 'Kategori'}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[var(--text-secondary)]">
                      {formatCurrency(b.spent, currency, false, exchangeRates)} / {formatCurrency(b.amount, currency, false, exchangeRates)}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${badgeBg}`}>
                      {b.percent}%
                    </span>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="h-2 w-full bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                    style={{ width: `${Math.min(b.percent, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
