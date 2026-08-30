'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Info, Plus, Check, Calendar } from 'lucide-react';
import { useApp } from '@/lib/store';
import { Transaction, TransactionType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoryIcon, ICON_MAP } from '../ui/CategoryIcon';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  editingTransaction?: Transaction | null;
}

export function QuickTransactionModal({ 
  isOpen, 
  onClose, 
  defaultType = 'expense',
  editingTransaction = null 
}: QuickTransactionModalProps) {
  const { accounts, categories, addTransaction, updateTransaction, addCategory, profile } = useApp();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amountStr, setAmountStr] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Inline Category Creator State
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('shopping-bag');
  const [newCatColor, setNewCatColor] = useState('#38BDF8');

  // Set default category according to type
  const availableCategories = categories.filter(c => c.type === (type === 'income' ? 'income' : 'expense'));

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(Number(editingTransaction.amount).toLocaleString('id-ID'));
      setAccountId(editingTransaction.account_id);
      setToAccountId(editingTransaction.transfer_to_account_id || accounts[1]?.id || '');
      setCategoryId(editingTransaction.category_id || '');
      setNote(editingTransaction.note || '');
      setDate(editingTransaction.date ? editingTransaction.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    } else {
      setType(defaultType);
      setAmountStr('');
      setAccountId(accounts[0]?.id || '');
      setToAccountId(accounts[1]?.id || '');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [editingTransaction, isOpen, defaultType, accounts]);

  useEffect(() => {
    if (!editingTransaction && availableCategories.length > 0 && (!categoryId || !availableCategories.find(c => c.id === categoryId))) {
      setCategoryId(availableCategories[0].id);
    }
  }, [type, availableCategories, categoryId, editingTransaction]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amountStr.replace(/[^0-9]/g, ''));
    if (!amountNum || amountNum <= 0) return;

    const now = new Date();
    const [year, month, day] = date.split('-').map(Number);
    const combinedDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, {
        account_id: accountId || accounts[0]?.id,
        category_id: type === 'transfer' ? undefined : categoryId,
        type,
        amount: amountNum,
        note: note.trim() || undefined,
        date: combinedDate.toISOString(),
        transfer_to_account_id: type === 'transfer' ? toAccountId : undefined,
      });
    } else {
      await addTransaction({
        user_id: profile?.id,
        account_id: accountId || accounts[0]?.id,
        category_id: type === 'transfer' ? undefined : categoryId,
        type,
        amount: amountNum,
        note: note.trim() || undefined,
        date: combinedDate.toISOString(),
        transfer_to_account_id: type === 'transfer' ? toAccountId : undefined,
      });
    }

    setAmountStr('');
    setNote('');
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setAmountStr('');
      return;
    }
    const num = parseInt(raw, 10);
    setAmountStr(num.toLocaleString('id-ID'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#141414] border-t md:border border-[#282828] rounded-t-[32px] md:rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 max-h-[92vh] md:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 md:slide-in-from-bottom-0 duration-200">
        
        {/* Mobile Pull Indicator */}
        <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto md:hidden -mt-1 mb-1" />

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-white">
              {editingTransaction ? 'Edit Transaksi' : 'Catat Transaksi'}
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-400">
              {editingTransaction ? 'Perbaiki nominal, tanggal, atau catatan' : 'Pemasukan, pengeluaran, atau transfer akun'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-[#222] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector (Tabs) */}
        <div className="grid grid-cols-3 p-1 bg-[#0D0D0D] border border-[#222] rounded-2xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all",
              type === 'expense' 
                ? "bg-[#FF4E4E] text-white shadow-lg font-bold" 
                : "text-neutral-400 hover:text-white"
            )}
          >
            <ArrowDownRight className="w-4 h-4" />
            Pengeluaran
          </button>

          <button
            type="button"
            onClick={() => setType('income')}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all",
              type === 'income' 
                ? "bg-[#3EFF9A] text-black shadow-lg font-bold" 
                : "text-neutral-400 hover:text-white"
            )}
          >
            <ArrowUpRight className="w-4 h-4" />
            Pemasukan
          </button>

          <button
            type="button"
            onClick={() => setType('transfer')}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all",
              type === 'transfer' 
                ? "bg-[#3ECFFF] text-black shadow-lg font-bold" 
                : "text-neutral-400 hover:text-white"
            )}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transfer
          </button>
        </div>

        {/* Helper Hint */}
        <div className="p-2.5 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center gap-2 text-[11px] text-neutral-300">
          <Info className="w-4 h-4 text-[#38BDF8] shrink-0" />
          {type === 'expense' && (
            <span>Uang keluar untuk belanja, tagihan, makanan, atau kebutuhan sehari-hari.</span>
          )}
          {type === 'income' && (
            <span>Uang masuk baru yang Anda peroleh (Gaji, Bonus, Freelance).</span>
          )}
          {type === 'transfer' && (
            <span>Pindah saldo antar akun (misal: Tarik ATM atau Top-up E-Wallet).</span>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Display Input */}
          <div className="p-4 bg-[#0D0D0D] border border-[#262626] rounded-2xl text-center space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">Nominal Transaksi</span>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-neutral-400 font-mono">Rp</span>
              <input
                type="text"
                value={amountStr}
                onChange={handleAmountChange}
                placeholder="0"
                autoFocus
                className="w-full text-center text-3xl sm:text-4xl font-extrabold font-mono bg-transparent text-white outline-none placeholder:text-neutral-700"
                required
              />
            </div>
          </div>

          {/* Wallet / Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-400">
                {type === 'transfer' ? 'Dari Akun (Sumber Uang)' : 'Akun / Dompet'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#38BDF8]"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-400">Ke Akun (Tujuan Transfer)</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#3ECFFF]"
                >
                  {accounts.filter(a => a.id !== accountId).map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
                    Tanggal Transaksi
                  </label>
                  <span className="text-[10px] font-mono text-[#38BDF8] font-semibold">
                    {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                      if (date === today) return 'Hari Ini';
                      if (date === yesterday) return 'Kemarin';
                      const [y, m, d] = date.split('-');
                      return `${d}/${m}/${y}`;
                    })()}
                  </span>
                </div>

                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#38BDF8]"
                />

                {/* Instant Date Quick Shortcuts */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setDate(new Date().toISOString().split('T')[0])}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                      date === new Date().toISOString().split('T')[0]
                        ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8] font-bold'
                        : 'bg-[#181818] border-[#2E2E2E] text-neutral-400 hover:text-white'
                    }`}
                  >
                    Hari Ini
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                      setDate(d);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                      date === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                        ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8] font-bold'
                        : 'bg-[#181818] border-[#2E2E2E] text-neutral-400 hover:text-white'
                    }`}
                  >
                    Kemarin
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];
                      setDate(d);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                      date === new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0]
                        ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8] font-bold'
                        : 'bg-[#181818] border-[#2E2E2E] text-neutral-400 hover:text-white'
                    }`}
                  >
                    2 Hari Lalu
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Category Selector with Inline Category Creator (if not transfer) */}
          {type !== 'transfer' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-400">Pilih Kategori</label>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                  className="text-[11px] text-[#38BDF8] hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {isCreatingCategory ? 'Tutup Input' : '+ Buat Kategori Baru'}
                </button>
              </div>

              {/* Inline Quick Category Input Drawer */}
              {isCreatingCategory && (
                <div className="p-3 bg-[#1A1A1A] border border-[#38BDF8]/40 rounded-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nama kategori baru (misal: Skincare, Gym, Kopi)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#38BDF8]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newCatName.trim()) return;
                        await addCategory({
                          name: newCatName.trim(),
                          icon: newCatIcon,
                          color: newCatColor,
                          type: type === 'income' ? 'income' : 'expense',
                          is_default: false
                        });
                        setNewCatName('');
                        setIsCreatingCategory(false);
                      }}
                      className="px-3 py-1.5 bg-[#38BDF8] hover:bg-[#60a5fa] text-black font-bold text-xs rounded-lg flex items-center gap-1 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Simpan
                    </button>
                  </div>

                  {/* Quick Color Palette */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400">Warna:</span>
                    <div className="flex items-center gap-1.5">
                      {['#38BDF8', '#3EFF9A', '#FF4E4E', '#FFB800', '#A78BFA', '#F472B6'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewCatColor(c)}
                          className={`w-4 h-4 rounded-full transition-transform ${newCatColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 bg-[#0D0D0D] border border-[#222] rounded-xl">
                {availableCategories.map(cat => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-left transition-all border",
                        isSelected 
                          ? "bg-[#242424] border-[#38BDF8] text-white" 
                          : "bg-transparent border-transparent text-neutral-400 hover:bg-[#181818]"
                      )}
                    >
                      <div 
                        className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0"
                        style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-400">Catatan / Keterangan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Makan siang bareng tim, Beli bensin, Topup e-toll"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="w-full py-3.5 bg-[#38BDF8] text-black font-bold font-display rounded-2xl hover:bg-[#60a5fa] transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)] text-sm active:scale-[0.99]"
          >
            {editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}
          </button>
        </form>
      </div>
    </div>
  );
}
