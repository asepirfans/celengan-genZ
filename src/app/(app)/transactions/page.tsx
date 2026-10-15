'use client';

import React, { useState, useMemo } from 'react';

import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { formatCurrency, formatDate, formatTime } from '@/lib/formatters';
import { TransactionType } from '@/lib/types';
import {
  Search,
  Trash2,
  Download,
  Plus,
  CheckSquare,
  Square,
  X,
  ArrowLeftRight,
  Receipt,
  Edit3
} from 'lucide-react';
import { QuickTransactionModal } from '@/components/modals/QuickTransactionModal';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Transaction } from '@/lib/types';

import * as XLSX from 'xlsx';

export default function TransactionsPage() {
  const { getEnrichedTransactions, categories, accounts, deleteTransaction, bulkDeleteTransactions, profile, exchangeRates, goalAccountIds } = useApp();
  const { confirmModal, showToast } = useModal();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest'>('newest');

  // Bulk selection & Edit
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const transactions = getEnrichedTransactions();

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(trx => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const noteMatch = trx.note?.toLowerCase().includes(q);
        const catMatch = trx.category?.name.toLowerCase().includes(q);
        const accMatch = trx.account?.name.toLowerCase().includes(q);
        if (!noteMatch && !catMatch && !accMatch) return false;
      }

      // Type
      if (selectedType !== 'all' && trx.type !== selectedType) return false;

      // Category
      if (selectedCategory !== 'all' && trx.category_id !== selectedCategory) return false;

      // Account
      if (selectedAccount !== 'all' && trx.account_id !== selectedAccount && trx.transfer_to_account_id !== selectedAccount) return false;

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortOrder === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortOrder === 'highest') return b.amount - a.amount;
      return 0;
    });
  }, [transactions, searchQuery, selectedType, selectedCategory, selectedAccount, sortOrder]);

  const selectable=filteredTransactions.filter(t=>!goalAccountIds.includes(t.account_id)&&!goalAccountIds.includes(t.transfer_to_account_id||''));
  const toggleSelectAll = () => {
    if (selectedIds.length === selectable.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectable.map(t => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    confirmModal({
      title: 'Hapus Transaksi Terpilih?',
      message: `Yakin ingin menghapus ${selectedIds.length} transaksi yang dipilih secara permanen?`,
      confirmText: 'Ya, Hapus Semua',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        await bulkDeleteTransactions(selectedIds);
        setSelectedIds([]);
        showToast({ message: `${selectedIds.length} transaksi berhasil dihapus.`, type: 'info' });
      }
    });
  };

  // Export to Native Microsoft Excel (.xlsx)
  const handleExportExcel = () => {
    const excelData = filteredTransactions.map((t, idx) => ({
      'No': idx + 1,
      'Tanggal': formatDate(t.date, 'long'),
      'Waktu': formatTime(t.date),
      'Tipe': t.type.toUpperCase(),
      'Akun / Dompet': t.account?.name || '-',
      'Kategori': t.category?.name || (t.type === 'transfer' ? `Transfer -> ${t.to_account?.name}` : '-'),
      'Nominal (IDR)': Number(t.amount),
      'Catatan': t.note || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for beautiful spreadsheet formatting
    worksheet['!cols'] = [
      { wch: 6 },   // No
      { wch: 28 },  // Tanggal
      { wch: 10 },  // Waktu
      { wch: 12 },  // Tipe
      { wch: 20 },  // Akun
      { wch: 22 },  // Kategori
      { wch: 18 },  // Nominal
      { wch: 35 }   // Catatan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Transaksi');

    const fileName = `Laporan_Transaksi_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--text-primary)] tracking-tight">
              Daftar Transaksi
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Kelola, cari, filter, dan ekspor riwayat pengeluaran & pemasukan.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent-success)]" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold font-display rounded-xl hover:bg-[var(--accent-hover)] transition-all flex items-center gap-1.5  text-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Transaksi</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & Controls */}
        <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi, kategori, atau catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type Selector */}
            <div className="transaction-filters flex flex-wrap items-center gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="all">Semua Tipe</option>
                <option value="expense">Expense (Pengeluaran)</option>
                <option value="income">Income (Pemasukan)</option>
                <option value="transfer">Transfer Antar Akun</option>
              </select>

              {/* Category Selector */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="all">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Account Selector */}
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="all">Semua Akun / Dompet</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              {/* Sort Order */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="highest">Nominal Terbesar</option>
              </select>
            </div>
          </div>

          {/* Bulk Selection Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-2.5 bg-[var(--surface-elevated)] border border-[var(--accent-danger)]/30 rounded-xl animate-in fade-in">
              <span className="text-xs text-[var(--accent-danger)] font-medium pl-1">
                {selectedIds.length} transaksi dipilih
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-[var(--accent-danger)] text-[var(--on-accent)] text-xs font-bold rounded-lg hover:bg-[var(--accent-danger)] transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Terpilih
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transactions Table / List View */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)]">
              Tidak ada transaksi yang cocok dengan filter atau pencarian Anda.
            </div>
          ) : (
            <div className="min-w-0 overflow-x-auto">
              <table className="transaction-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] font-mono">
                    <th className="p-4 w-10">
                      <button onClick={toggleSelectAll} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        {selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[var(--accent-primary)]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-4 font-semibold">Transaksi & Catatan</th>
                    <th className="p-4 font-semibold">Kategori</th>
                    <th className="p-4 font-semibold">Akun / Wallet</th>
                    <th className="p-4 font-semibold">Tanggal</th>
                    <th className="p-4 font-semibold text-right">Nominal</th>
                    <th className="p-4 font-semibold text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredTransactions.map((trx) => {
                    const isSelected = selectedIds.includes(trx.id);
                    const isExpense = trx.type === 'expense';
                    const isIncome = trx.type === 'income';
                    const isTransfer = trx.type === 'transfer';
                    const isGoalTransfer=goalAccountIds.includes(trx.account_id)||goalAccountIds.includes(trx.transfer_to_account_id||'');

                    return (
                      <tr
                        key={trx.id}
                        className={`hover:bg-[var(--surface-elevated)] transition-colors ${isSelected ? 'bg-[var(--surface-elevated)]' : ''}`}
                      >
                        <td className="p-4">
                          <button disabled={isGoalTransfer} onClick={() => toggleSelectOne(trx.id)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[var(--accent-primary)]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-[var(--border-subtle)]"
                              style={{
                                backgroundColor: trx.category?.color ? `${trx.category.color}15` : '#222',
                                color: trx.category?.color || '#76834E'
                              }}
                            >
                              {isTransfer ? (
                                <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                              ) : (
                                <CategoryIcon name={trx.category?.icon || 'receipt'} className="w-4 h-4" />
                              )}
                            </div>
                            <span className="font-semibold text-[var(--text-primary)] truncate max-w-xs">
                              {trx.note || trx.category?.name || (isTransfer ? `Transfer ke ${trx.to_account?.name}` : 'Transaksi')}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {trx.category ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                              style={{
                                backgroundColor: `${trx.category.color}15`,
                                color: trx.category.color,
                                border: `1px solid ${trx.category.color}30`
                              }}
                            >
                              <CategoryIcon name={trx.category.icon} className="w-3 h-3" />
                              <span>{trx.category.name}</span>
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] font-mono text-[11px]">
                              {isTransfer ? 'Transfer' : '-'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-[var(--text-primary)]">
                          <span className="flex items-center gap-1.5">
                            <CategoryIcon name={trx.account?.icon || 'landmark'} className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                            <span>{trx.account?.name}</span>
                            {isTransfer && (
                              <span className="text-[var(--text-muted)]">→ {trx.to_account?.name}</span>
                            )}
                          </span>
                        </td>
                        <td className="p-4 text-[var(--text-secondary)] font-mono">
                          {formatDate(trx.date, 'short')}, {formatTime(trx.date)}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`font-mono font-bold text-sm ${
                            isExpense ? 'text-[var(--accent-danger)]' : isIncome ? 'text-[var(--accent-success)]' : 'text-[var(--accent-primary)]'
                          }`}>
                            {isExpense ? '-' : isIncome ? '+' : ''}
                            {formatCurrency(trx.amount, profile?.currency || 'IDR', false, exchangeRates)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditingTx(trx);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
                              disabled={isGoalTransfer}
                              title={isGoalTransfer?'Dikelola melalui Celengan Impian':'Edit Transaksi'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                confirmModal({
                                  title: 'Hapus Transaksi?',
                                  message: `Yakin ingin menghapus transaksi "${trx.category?.name || trx.note || 'ini'}"?`,
                                  confirmText: 'Hapus',
                                  cancelText: 'Batal',
                                  type: 'danger',
                                  onConfirm: async () => {
                                    await deleteTransaction(trx.id);
                                    showToast({ message: 'Transaksi berhasil dihapus.', type: 'info' });
                                  }
                                });
                              }}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--surface-elevated)] transition-colors"
                              disabled={isGoalTransfer}
                              title={isGoalTransfer?'Dikelola melalui Celengan Impian':'Hapus'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Global Quick Add / Edit Transaction Modal */}
        <QuickTransactionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTx(null);
          }}
          editingTransaction={editingTx}
        />
      </div>
    </>
  );
}
