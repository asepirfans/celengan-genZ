'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Account, AccountType } from '@/lib/types';
import { 
  WalletCards, 
  Wallet,
  Plus, 
  ArrowLeftRight, 
  CreditCard, 
  Smartphone, 
  Banknote,
  TrendingUp,
  Landmark,
  Edit3,
  Trash2
} from 'lucide-react';
import { QuickTransactionModal } from '@/components/modals/QuickTransactionModal';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

export default function AccountsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount, getEnrichedTransactions, profile, exchangeRates } = useApp();
  const { confirmModal, showToast } = useModal();

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [icon, setIcon] = useState('landmark');
  const [color, setColor] = useState('#00529C');
  const [initialBalance, setInitialBalance] = useState('');

  const transactions = getEnrichedTransactions();

  // Open modal for editing
  const openEditModal = (acc: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setIcon(acc.icon || 'landmark');
    setColor(acc.color || '#00529C');
    setInitialBalance(Number(acc.initial_balance || 0).toLocaleString('id-ID'));
    setIsAddAccountOpen(true);
  };

  // Open modal for adding
  const openAddModal = () => {
    setEditingAccount(null);
    setName('');
    setType('bank');
    setIcon('landmark');
    setColor('#00529C');
    setInitialBalance('');
    setIsAddAccountOpen(true);
  };

  // Active account for filter
  const activeAccount = selectedAccountId ? accounts.find(a => a.id === selectedAccountId) : null;
  const accountTransactions = selectedAccountId 
    ? transactions.filter(t => t.account_id === selectedAccountId || t.transfer_to_account_id === selectedAccountId)
    : [];

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(initialBalance.replace(/[^0-9]/g, '')) || 0;
    if (!name.trim()) return;

    if (editingAccount) {
      await updateAccount(editingAccount.id, {
        name: name.trim(),
        type,
        icon,
        color,
        initial_balance: balanceNum,
      });
      showToast({ message: 'Akun berhasil diperbarui!', type: 'success' });
    } else {
      await addAccount({
        user_id: profile?.id,
        name: name.trim(),
        type,
        icon,
        color,
        initial_balance: balanceNum,
        is_archived: false,
      });
      showToast({ message: 'Akun berhasil ditambahkan!', type: 'success' });
    }

    setName('');
    setInitialBalance('');
    setEditingAccount(null);
    setIsAddAccountOpen(false);
  };

  const handleDeleteAccount = (accId: string, accName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmModal({
      title: 'Hapus Dompet / Rekening?',
      message: `Yakin ingin menghapus dompet/akun "${accName}"?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: () => {
        if (selectedAccountId === accId) setSelectedAccountId(null);
        deleteAccount(accId);
        showToast({ message: `Dompet "${accName}" berhasil dihapus.`, type: 'info' });
      }
    });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Akun & Dompet Keuangan
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Kelola rekening bank, e-wallet, uang tunai, dan transfer saldo antar akun.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="px-3.5 py-2 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:border-[#444] transition-all flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#3ECFFF]" />
              <span>Transfer Saldo</span>
            </button>

            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.2)] text-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Akun</span>
            </button>
          </div>
        </div>

        {/* Account Cards Grid or Starter Template Presets */}
        {accounts.length === 0 ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-[#141414] border border-[#282828] text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 mx-auto flex items-center justify-center text-[#38BDF8]">
              <Wallet className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-display">Belum Ada Dompet Keuangan</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Pasang dompet starter berikut agar kamu bisa langsung mulai mencatat pemasukan dan pengeluaran:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto pt-2 text-left">
              {[
                { name: 'Rekening Bank', type: 'bank', icon: 'landmark', color: '#00529C', desc: 'BCA, Mandiri, BRI, BNI' },
                { name: 'E-Wallet / GoPay', type: 'ewallet', icon: 'smartphone', color: '#00AED6', desc: 'GoPay, OVO, ShopeePay' },
                { name: 'Dompet Tunai (Cash)', type: 'cash', icon: 'banknote', color: '#38BDF8', desc: 'Uang fisik di saku/dompet' },
                { name: 'Dana Darurat (Vault)', type: 'bank', icon: 'shield-check', color: '#3EFF9A', desc: 'Simpanan darurat terkunci' },
              ].map((template, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#38BDF8]/40 transition-all space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{template.name}</span>
                      <span className="text-[10px] uppercase font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded">
                        {template.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400">{template.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await addAccount({
                        user_id: profile?.id,
                        name: template.name,
                        type: template.type as any,
                        icon: template.icon,
                        color: template.color,
                        initial_balance: 0,
                        is_archived: false
                      });
                      showToast({ message: `Dompet "${template.name}" berhasil dibuat! 💳`, type: 'success' });
                    }}
                    className="w-full py-2 bg-[#38BDF8] hover:bg-[#60a5fa] text-black font-bold font-display text-xs rounded-xl transition-all shadow-[0_0_12px_rgba(56,189,248,0.2)] text-center"
                  >
                    + Pasang Dompet Ini
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map(acc => {
              const isSelected = selectedAccountId === acc.id;

              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(isSelected ? null : acc.id)}
                  className={`p-5 rounded-2xl bg-[#161616] border cursor-pointer transition-all relative overflow-hidden group ${
                    isSelected 
                      ? 'border-[#38BDF8] ring-1 ring-[#38BDF8]/50 shadow-[0_0_20px_rgba(56,189,248,0.15)]' 
                      : 'border-[#262626] hover:border-[#383838]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#222] border border-[#333] flex items-center justify-center text-white">
                      <CategoryIcon name={acc.icon || 'landmark'} className="w-5 h-5 text-[#38BDF8]" />
                    </div>
                    
                    {/* Action buttons (Edit & Delete) */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => openEditModal(acc, e)}
                        className="p-1 rounded-lg text-neutral-400 hover:text-[#38BDF8] hover:bg-[#2A2A2A] transition-colors"
                        title="Edit Akun"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {accounts.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteAccount(acc.id, acc.name, e)}
                          className="p-1 rounded-lg text-neutral-500 hover:text-[#FF4E4E] hover:bg-[#2A2A2A] transition-colors"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {acc.name}
                      </h3>
                      <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider bg-[#222] px-1.5 py-0.5 rounded">
                        {acc.type}
                      </span>
                    </div>
                    <p className="text-xl font-bold font-mono text-white mt-1">
                      {formatCurrency(acc.current_balance, profile?.currency || 'IDR', false, exchangeRates)}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono mt-1">
                      Saldo awal: {formatCurrency(acc.initial_balance, profile?.currency || 'IDR', false, exchangeRates)}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#222] flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">
                      {isSelected ? 'Sedang difilter' : 'Klik untuk filter riwayat'}
                    </span>
                    <span className="text-[#38BDF8] font-bold">
                      {isSelected ? '✕ Reset' : 'Lihat →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filtered Account Detail & Transactions */}
        {activeAccount && (
          <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#222] flex items-center justify-center text-[#38BDF8]">
                  <CategoryIcon name={activeAccount.icon || 'landmark'} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Riwayat Transaksi: {activeAccount.name}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    Total {accountTransactions.length} transaksi tercatat pada akun ini
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAccountId(null)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Tutup Detail
              </button>
            </div>

            {accountTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                Belum ada mutasi transaksi pada akun ini.
              </div>
            ) : (
              <div className="divide-y divide-[#222]">
                {accountTransactions.map(trx => (
                  <div key={trx.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#222] flex items-center justify-center">
                        <CategoryIcon name={trx.category?.icon || 'receipt'} className="w-3.5 h-3.5 text-[#38BDF8]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {trx.note || trx.category?.name || 'Transaksi'}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-mono">
                          {formatDate(trx.date, 'short')}
                        </p>
                      </div>
                    </div>

                    <span className={`font-mono font-bold ${
                      trx.type === 'expense' ? 'text-[#FF4E4E]' : trx.type === 'income' ? 'text-[#3EFF9A]' : 'text-[#3ECFFF]'
                    }`}>
                      {trx.type === 'expense' ? '-' : trx.type === 'income' ? '+' : ''}
                      {formatCurrency(trx.amount, profile?.currency || 'IDR', false, exchangeRates)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Tambah / Edit Akun */}
        {isAddAccountOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md bg-[#141414] border border-[#282828] rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold font-display text-white">
                {editingAccount ? 'Edit Akun / Dompet' : 'Tambah Akun / Dompet Baru'}
              </h3>

              <form onSubmit={handleSaveAccount} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Nama Akun / Bank / E-Wallet</label>
                  <input
                    type="text"
                    placeholder="Contoh: BCA Payroll, Mandiri, Cash, OVO"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-medium">Tipe Akun</label>
                    <select
                      value={type}
                      onChange={(e) => {
                        const val = e.target.value as AccountType;
                        setType(val);
                        if (val === 'bank') setIcon('landmark');
                        else if (val === 'ewallet') setIcon('smartphone');
                        else setIcon('banknote');
                      }}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                    >
                      <option value="bank">Bank (Rekening)</option>
                      <option value="ewallet">E-Wallet (Digital)</option>
                      <option value="cash">Cash / Tunai</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-medium">Icon Vector</label>
                    <select
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                    >
                      <option value="landmark">Bank / Landmark</option>
                      <option value="smartphone">Smartphone / E-Wallet</option>
                      <option value="banknote">Banknote / Uang Tunai</option>
                      <option value="trending-up">Trending / Investasi</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-neutral-400 font-medium">Saldo Awal</label>
                    <span className="text-[10px] text-neutral-500 font-mono">Uang yang sudah Anda miliki</span>
                  </div>
                  <div className="relative flex items-center bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-2 focus-within:border-[#38BDF8]">
                    <span className="text-neutral-500 font-mono mr-2 text-xs">Rp</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={initialBalance}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setInitialBalance(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                      }}
                      className="w-full bg-transparent font-mono font-bold text-white outline-none text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-tight">
                    💡 Saldo awal <strong>tidak akan dihitung</strong> sebagai pemasukan bulan ini, hanya sebagai modal dasar akun Anda.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddAccountOpen(false);
                      setEditingAccount(null);
                    }}
                    className="flex-1 py-2.5 bg-[#222] text-neutral-300 hover:text-white rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all text-xs"
                  >
                    {editingAccount ? 'Simpan Perubahan' : 'Tambah Akun'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        <QuickTransactionModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          defaultType="transfer"
        />
      </div>
    </AppShell>
  );
}
