'use client';

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { useApp } from '@/lib/store';
import { formatCurrency } from '@/lib/formatters';

export function OverviewCharts() {
  const { transactions, categories, profile, exchangeRates } = useApp();
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');

  // Compute 6-Month Income vs Expense
  const now = new Date();
  const monthlyData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthName = d.toLocaleDateString('id-ID', { month: 'short' });

    const monthTrxs = transactions.filter(t => {
      const td = new Date(t.date);
      return td.getMonth() === m && td.getFullYear() === y;
    });

    const income = monthTrxs
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = monthTrxs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    monthlyData.push({
      name: `${monthName}`,
      Income: income,
      Expense: expense,
    });
  }

  // Compute Category Distribution for current month
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthExpenses = transactions.filter(t => {
    const td = new Date(t.date);
    return t.type === 'expense' && td.getMonth() === currentMonth && td.getFullYear() === currentYear;
  });

  const categoryTotals: { [key: string]: number } = {};
  currentMonthExpenses.forEach(t => {
    if (t.category_id) {
      categoryTotals[t.category_id] = (categoryTotals[t.category_id] || 0) + Number(t.amount);
    }
  });

  const pieData = Object.keys(categoryTotals).map(catId => {
    const cat = categories.find(c => c.id === catId);
    return {
      name: cat ? cat.name : 'Lainnya',
      value: categoryTotals[catId],
      color: cat ? cat.color : '#888888',
    };
  }).sort((a, b) => b.value - a.value);

  const currency = profile?.currency || 'IDR';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 6-Month Income vs Expense Bar Chart */}
      <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626] lg:col-span-2 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Arus Kas Bulanan (6 Bulan Terakhir)
            </h3>
            <p className="text-xs text-neutral-400">
              Perbandingan pemasukan vs pengeluaran
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#3EFF9A]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3EFF9A]" />
              Pemasukan
            </span>
            <span className="flex items-center gap-1.5 text-[#FF4E4E]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FF4E4E]" />
              Pengeluaran
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                stroke="#666" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#222' }} 
              />
              <YAxis 
                stroke="#666" 
                fontSize={10} 
                tickLine={false}
                axisLine={{ stroke: '#222' }}
                tickFormatter={(val) => `${val >= 1000000 ? `${(val/1000000).toFixed(0)}jt` : val}`} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1C1C1C', 
                  border: '1px solid #333', 
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}
                formatter={(value: any) => formatCurrency(Number(value), currency, false, exchangeRates)}
              />
              <Bar dataKey="Income" fill="#3EFF9A" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Expense" fill="#FF4E4E" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Donut Distribution */}
      <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626] flex flex-col">
        <div>
          <h3 className="font-display font-bold text-base text-white">
            Distribusi Pengeluaran
          </h3>
          <p className="text-xs text-neutral-400">
            Kategori pengeluaran bulan ini
          </p>
        </div>

        <div className="h-56 w-full my-auto">
          {pieData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-neutral-500">
              Belum ada pengeluaran bulan ini
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#161616" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1C1C1C', 
                    border: '1px solid #333', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                  formatter={(value: any) => formatCurrency(Number(value), currency, false, exchangeRates)}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 3 Breakdown List */}
        <div className="space-y-1.5 pt-2 border-t border-[#222]">
          {pieData.slice(0, 3).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-neutral-300 truncate">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <span className="font-mono text-neutral-400 font-medium">
                {formatCurrency(item.value, currency, false, exchangeRates)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
