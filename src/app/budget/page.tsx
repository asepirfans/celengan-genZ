'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { formatCurrency } from '@/lib/formatters';
import { 
  PiggyBank, 
  Plus, 
  Copy, 
  AlertTriangle, 
  Calendar,
  Edit3,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

export default function BudgetPage() {
  const { budgets, categories, transactions, setBudget, deleteBudget, copyPreviousMonthBudgets, profile, exchangeRates } = useApp();
  const { confirmModal, showToast } = useModal();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [isSettingBudgetOpen, setIsSettingBudgetOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');

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

  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Compute budget list for selected period
  const monthBudgets = budgets
    .filter(b => b.month === selectedMonth && b.year === selectedYear)
    .map(b => {
      const cat = categories.find(c => c.id === b.category_id);
      const spent = transactions
        .filter(t => {
          const td = new Date(t.date);
          return t.type === 'expense' && 
                 t.category_id === b.category_id && 
                 (td.getMonth() + 1) === selectedMonth && 
                 td.getFullYear() === selectedYear;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const percent = Math.round((spent / b.amount) * 100);
      return {
        ...b,
        category: cat,
        spent,
        remaining: Math.max(0, b.amount - spent),
        overspend: spent > b.amount ? spent - b.amount : 0,
        percent,
      };
    });

  const totalBudget = monthBudgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = monthBudgets.reduce((sum, b) => sum + Number(b.spent), 0);
  const totalRemaining = Math.max(0, totalBudget - totalSpent);
  const overallPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const handleOpenAdd = () => {
    setEditingBudgetId(null);
    setFormCategory(expenseCategories[0]?.id || '');
    setFormAmount('');
    setIsSettingBudgetOpen(true);
  };

  const handleOpenEdit = (b: any) => {
    setEditingBudgetId(b.id);
    setFormCategory(b.category_id);
    setFormAmount(Number(b.amount).toLocaleString('id-ID'));
    setIsSettingBudgetOpen(true);
  };

  const handleDeleteBudget = (b: any) => {
    confirmModal({
      title: 'Hapus Target Budget?',
      message: `Batas pengeluaran untuk kategori "${b.category?.name || 'terpilih'}" akan dihapus.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        await deleteBudget(b.id);
        showToast({ message: 'Target budget berhasil dihapus.', type: 'info' });
      }
    });
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(formAmount.replace(/[^0-9]/g, ''));
    if (!formCategory || !cleanAmount || cleanAmount <= 0) return;

    await setBudget(formCategory, cleanAmount, selectedMonth, selectedYear);
    setIsSettingBudgetOpen(false);
    setFormAmount('');
    setEditingBudgetId(null);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#38BDF8', '#3EFF9A', '#3ECFFF']
    });
  };

  const handleCopyPrev = () => {
    copyPreviousMonthBudgets(selectedMonth, selectedYear);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Manajemen Budget & Anggaran
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Pantau pengeluaran agar tidak melewati batas rencana keuangan Anda.
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
                <option value={2027} className="bg-[#181818]">2027</option>
              </select>
            </div>

            <button
              onClick={handleCopyPrev}
              className="px-3.5 py-2 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:border-[#444] transition-all flex items-center gap-1.5"
              title="Salin budget dari bulan sebelumnya"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salin Bulan Lalu</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.2)] text-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Set Budget</span>
            </button>
          </div>
        </div>

        {/* Budget Overview Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626]">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Total Budget Rencana
            </span>
            <h3 className="text-2xl font-bold font-mono text-white mt-1">
              {formatCurrency(totalBudget, profile?.currency || 'IDR', false, exchangeRates)}
            </h3>
            <p className="text-xs text-neutral-500 mt-2">
              Terdiri dari {monthBudgets.length} kategori aktif
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626]">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Total Telah Dipakai
            </span>
            <h3 className="text-2xl font-bold font-mono text-[#FF4E4E] mt-1">
              {formatCurrency(totalSpent, profile?.currency || 'IDR', false, exchangeRates)}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-2 flex-1 bg-[#222] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${overallPercent > 90 ? 'bg-[#FF4E4E]' : overallPercent > 70 ? 'bg-[#FFB800]' : 'bg-[#3EFF9A]'}`}
                  style={{ width: `${Math.min(overallPercent, 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-neutral-300">{overallPercent}%</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626]">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Sisa Saldo Budget
            </span>
            <h3 className="text-2xl font-bold font-mono text-[#3EFF9A] mt-1">
              {formatCurrency(totalRemaining, profile?.currency || 'IDR', false, exchangeRates)}
            </h3>
            <p className="text-xs text-neutral-500 mt-2">
              Batas aman pengeluaran tersisa
            </p>
          </div>
        </div>

        {/* Budget Item Cards List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-display">
              Rencana Anggaran per Kategori ({monthBudgets.length})
            </h3>
          </div>

          {monthBudgets.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#161616] border border-[#262626] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#222] text-[#38BDF8] flex items-center justify-center mx-auto text-xl">
                🎯
              </div>
              <h4 className="text-sm font-bold text-white">Belum Ada Target Budget Bulan Ini</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Pasang target pengeluaran untuk kategori makanan, transportasi, dll agar pengeluaran tetap terkontrol.
              </p>
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-[#38BDF8] text-black font-bold text-xs rounded-xl hover:bg-[#60a5fa] transition-all"
              >
                + Buat Target Budget Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {monthBudgets.map(b => {
                const isOver = b.spent > b.amount;
                const isWarning = b.percent >= 80 && !isOver;

                return (
                  <div 
                    key={b.id}
                    className="p-5 rounded-2xl bg-[#161616] border border-[#262626] space-y-4 hover:border-[#383838] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[#2A2A2A]"
                          style={{ 
                            backgroundColor: b.category?.color ? `${b.category.color}15` : '#222',
                            color: b.category?.color || '#38BDF8'
                          }}
                        >
                          <CategoryIcon name={b.category?.icon || 'receipt'} className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">
                            {b.category?.name || 'Kategori'}
                          </h4>
                          <span className="text-xs text-neutral-400 font-mono">
                            Target: {formatCurrency(b.amount, profile?.currency || 'IDR', false, exchangeRates)}
                          </span>
                        </div>
                      </div>

                      {/* Actions & Status Badge */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-[#38BDF8] hover:bg-[#222] transition-colors"
                          title="Edit Target Budget"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(b)}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-[#FF4E4E] hover:bg-[#222] transition-colors"
                          title="Hapus Budget"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <span className={`text-xs font-mono font-bold px-2 py-1 rounded-lg border ${
                          isOver 
                            ? 'bg-[#FF4E4E]/20 text-[#FF6B6B] border-[#FF4E4E]/30' 
                            : isWarning 
                            ? 'bg-[#FFB800]/20 text-[#FFD580] border-[#FFB800]/30' 
                            : 'bg-[#3EFF9A]/15 text-[#3EFF9A] border-[#3EFF9A]/30'
                        }`}>
                          {b.percent}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="h-2.5 w-full bg-[#222] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? 'bg-[#FF4E4E]' : isWarning ? 'bg-[#FFB800]' : 'bg-[#3EFF9A]'
                          }`}
                          style={{ width: `${Math.min(b.percent, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-neutral-400">
                          Terpakai: <strong className="text-white">{formatCurrency(b.spent, profile?.currency || 'IDR', false, exchangeRates)}</strong>
                        </span>
                        {isOver ? (
                          <span className="text-[#FF4E4E] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Over {formatCurrency(b.overspend, profile?.currency || 'IDR', false, exchangeRates)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">
                            Sisa: <strong className="text-[#3EFF9A]">{formatCurrency(b.remaining, profile?.currency || 'IDR', false, exchangeRates)}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Set / Edit Budget */}
        {isSettingBudgetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md bg-[#141414] border border-[#282828] rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold font-display text-white">
                {editingBudgetId ? 'Edit Target Budget' : 'Set Target Budget'}
              </h3>
              <p className="text-xs text-neutral-400">
                Tentukan batas maksimal pengeluaran bulanan untuk kategori tertentu.
              </p>

              <form onSubmit={handleSaveBudget} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Pilih Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    disabled={!!editingBudgetId}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#38BDF8] disabled:opacity-60"
                  >
                    {expenseCategories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Batas Nominal Target (Budget)</label>
                  <div className="relative flex items-center bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-2.5 focus-within:border-[#38BDF8]">
                    <span className="text-neutral-500 font-mono mr-2">Rp</span>
                    <input
                      type="text"
                      placeholder="Contoh: 2.000.000"
                      value={formAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setFormAmount(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                      }}
                      required
                      autoFocus
                      className="w-full bg-transparent font-mono font-bold text-white outline-none text-base"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingBudgetOpen(false);
                      setEditingBudgetId(null);
                    }}
                    className="flex-1 py-2.5 bg-[#222] text-neutral-300 hover:text-white rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all text-xs"
                  >
                    {editingBudgetId ? 'Simpan Perubahan' : 'Simpan Budget'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
