'use client';

import React, { useState } from 'react';
import Link from 'next/link';

import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { CurrencyCode } from '@/lib/types';
import {
  User,
  Tag,
  Plus,
  Trash2
} from 'lucide-react';
import { CategoryIcon, ICON_MAP } from '@/components/ui/CategoryIcon';

export default function SettingsPage() {
  const { profile, updateProfile, categories, addCategory, deleteCategory } = useApp();
  const { showToast } = useModal();

  const [activeTab, setActiveTab] = useState<'profile' | 'categories'>('profile');

  // Profile Form
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [currency, setCurrency] = useState<CurrencyCode>(profile?.currency || 'IDR');

  // Category Form
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('shopping-bag');
  const [catColor, setCatColor] = useState('#76834E');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');

  React.useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setCurrency(profile.currency || 'IDR');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    await updateProfile({
      full_name: fullName,
      avatar_url: avatarUrl,
      currency: currency,
    });
    showToast({ message: 'Profil & avatar berhasil diperbarui! ', type: 'success' });

    } catch(error) { showToast({message:error instanceof Error?error.message:'Permintaan belum berhasil. Coba lagi.',type:'danger'}); }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    try {
      await addCategory({
        name: catName.trim(),
        icon: catIcon,
        color: catColor,
        type: catType,
        is_default: false,
      });

      setCatName('');
      setIsAddCatOpen(false);
    } catch {
      showToast({ message: 'Kategori belum tersimpan. Coba lagi.', type: 'danger' });
      return;
    }
  };

  const iconOptions = Object.keys(ICON_MAP);

  return (
    <>
      <div className="space-y-6">
        <Link href="/email-integration" className="block rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 text-sm font-semibold">Kelola transaksi dari email</Link>
        {/* Top Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--text-primary)] tracking-tight">
            Pengaturan & Konfigurasi
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Kelola profil pengguna, preferensi mata uang, dan kategori transaksi.
          </p>
        </div>

        {/* Simplified Settings Tabs: Profil & Kategori only */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'profile'
                ? 'bg-[var(--surface-elevated)] text-[var(--accent-primary)] border border-[var(--border-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Profil & Akun
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'categories'
                ? 'bg-[var(--surface-elevated)] text-[var(--accent-primary)] border border-[var(--border-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Manajemen Kategori
          </button>
        </div>

        {/* Tab 1: Profil */}
        {activeTab === 'profile' && (
          <div className="max-w-xl p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-subtle)]">
                <div className="w-16 h-16 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden font-bold text-xl text-[var(--accent-primary)]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    fullName.substring(0, 2).toUpperCase() || 'US'
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">{fullName || 'Pengguna'}</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">{profile?.email || 'Registered User'}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-secondary)] font-medium">Nama Lengkap</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-[var(--text-secondary)] font-medium">Pilih Preset Avatar Karakter</label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    'https://api.dicebear.com/7.x/bottts/svg?seed=Awan',
                    'https://api.dicebear.com/7.x/adventurer/svg?seed=Samjin',
                    'https://api.dicebear.com/7.x/personas/svg?seed=Felix',
                    'https://api.dicebear.com/7.x/lorelei/svg?seed=Aneka',
                    'https://api.dicebear.com/7.x/notionists/svg?seed=Milo',
                    'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(preset)}
                      className={`w-12 h-12 rounded-xl p-1 border transition-all overflow-hidden flex items-center justify-center ${
                        avatarUrl === preset
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 ring-2 ring-[var(--accent-primary)]/30'
                          : 'border-[var(--border-subtle)] bg-[#1E1E1E] hover:border-[var(--border-subtle)]'
                      }`}
                    >
                      <img src={preset} alt={`Avatar ${idx + 1}`} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-secondary)] font-medium">Atau Masukkan Custom URL Foto / Link Avatar</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-secondary)] font-medium">Mata Uang Default</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  <option value="IDR">IDR (Rupiah Indonesia)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="SGD">SGD (Singapore Dollar)</option>
                  <option value="MYR">MYR (Malaysian Ringgit)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold font-display rounded-xl hover:bg-[var(--accent-hover)] transition-all text-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Kategori */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">Daftar Kategori Transaksi</h3>
                <p className="text-xs text-[var(--text-secondary)]">Kelola dan sesuaikan icon vector serta warna kategori pengeluaran & pemasukan.</p>
              </div>
              <button
                onClick={() => setIsAddCatOpen(true)}
                className="px-3.5 py-2 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Tambah Kategori
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{cat.name}</p>
                      <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">{cat.type}</span>
                    </div>
                  </div>

                  {!cat.is_default && cat.user_id && (
                    <button
                      onClick={async () => { try { await deleteCategory(cat.id); } catch(error) { showToast({message:error instanceof Error?error.message:'Kategori belum dihapus.',type:'danger'}); } }}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--surface-elevated)] rounded-lg transition-colors"
                      title="Hapus Kategori Kustom"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Tambah Kategori */}
            {isAddCatOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                <div className="w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-2xl space-y-4">
                  <h3 className="text-lg font-bold font-display text-[var(--text-primary)]">Tambah Kategori Baru</h3>
                  <form onSubmit={handleAddCategory} className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs text-[var(--text-secondary)] font-medium">Nama Kategori</label>
                      <input
                        type="text"
                        placeholder="Contoh: Langganan SaaS, Fitness, Kopi"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        required
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-[var(--text-secondary)] font-medium">Tipe Kategori</label>
                        <select
                          value={catType}
                          onChange={(e) => setCatType(e.target.value as any)}
                          className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-[var(--text-secondary)] font-medium">Pilih Icon Vector</label>
                        <select
                          value={catIcon}
                          onChange={(e) => setCatIcon(e.target.value)}
                          className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                          {iconOptions.map(iconKey => (
                            <option key={iconKey} value={iconKey}>
                              {iconKey}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddCatOpen(false)}
                        className="flex-1 py-2.5 bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-xl text-xs font-semibold"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold rounded-xl text-xs"
                      >
                        Simpan Kategori
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
