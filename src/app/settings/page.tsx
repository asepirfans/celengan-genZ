'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
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
  const [catColor, setCatColor] = useState('#38BDF8');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');

  React.useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setCurrency(profile.currency || 'IDR');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      full_name: fullName,
      avatar_url: avatarUrl,
      currency: currency,
    });
    showToast({ message: 'Profil & avatar berhasil diperbarui! ✨', type: 'success' });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    await addCategory({
      name: catName.trim(),
      icon: catIcon,
      color: catColor,
      type: catType,
      is_default: false,
    });

    setCatName('');
    setIsAddCatOpen(false);
  };

  const iconOptions = Object.keys(ICON_MAP);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Pengaturan & Konfigurasi
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Kelola profil pengguna, preferensi mata uang, dan kategori transaksi.
          </p>
        </div>

        {/* Simplified Settings Tabs: Profil & Kategori only */}
        <div className="flex items-center gap-2 border-b border-[#222] pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'profile' 
                ? 'bg-[#222] text-[#38BDF8] border border-[#333]' 
                : 'text-neutral-400 hover:text-white hover:bg-[#181818]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Profil & Akun
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'categories' 
                ? 'bg-[#222] text-[#38BDF8] border border-[#333]' 
                : 'text-neutral-400 hover:text-white hover:bg-[#181818]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Manajemen Kategori
          </button>
        </div>

        {/* Tab 1: Profil */}
        {activeTab === 'profile' && (
          <div className="max-w-xl p-6 rounded-2xl bg-[#161616] border border-[#262626]">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-[#222]">
                <div className="w-16 h-16 rounded-full bg-[#222] border border-[#333] flex items-center justify-center overflow-hidden font-bold text-xl text-[#38BDF8]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    fullName.substring(0, 2).toUpperCase() || 'US'
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{fullName || 'Pengguna'}</h3>
                  <p className="text-xs text-neutral-400 font-mono">{profile?.email || 'Registered User'}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 font-medium">Nama Lengkap</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-neutral-400 font-medium">Pilih Preset Avatar Karakter</label>
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
                          ? 'border-[#38BDF8] bg-[#38BDF8]/15 ring-2 ring-[#38BDF8]/30' 
                          : 'border-[#2E2E2E] bg-[#1E1E1E] hover:border-[#444]'
                      }`}
                    >
                      <img src={preset} alt={`Avatar ${idx + 1}`} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 font-medium">Atau Masukkan Custom URL Foto / Link Avatar</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 font-medium">Mata Uang Default</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
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
                  className="px-5 py-2.5 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all text-xs"
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
                <h3 className="font-bold text-base text-white">Daftar Kategori Transaksi</h3>
                <p className="text-xs text-neutral-400">Kelola dan sesuaikan icon vector serta warna kategori pengeluaran & pemasukan.</p>
              </div>
              <button
                onClick={() => setIsAddCatOpen(true)}
                className="px-3.5 py-2 bg-[#38BDF8] text-black font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Tambah Kategori
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map(cat => (
                <div 
                  key={cat.id}
                  className="p-3.5 rounded-xl bg-[#161616] border border-[#262626] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{cat.name}</p>
                      <span className="text-[10px] font-mono uppercase text-neutral-500">{cat.type}</span>
                    </div>
                  </div>

                  {!cat.is_default && (
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="p-1.5 text-neutral-500 hover:text-[#FF4E4E] hover:bg-[#222] rounded-lg transition-colors"
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
                <div className="w-full max-w-md bg-[#141414] border border-[#282828] rounded-2xl p-6 shadow-2xl space-y-4">
                  <h3 className="text-lg font-bold font-display text-white">Tambah Kategori Baru</h3>
                  <form onSubmit={handleAddCategory} className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400 font-medium">Nama Kategori</label>
                      <input
                        type="text"
                        placeholder="Contoh: Langganan SaaS, Fitness, Kopi"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        required
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-400 font-medium">Tipe Kategori</label>
                        <select
                          value={catType}
                          onChange={(e) => setCatType(e.target.value as any)}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-400 font-medium">Pilih Icon Vector</label>
                        <select
                          value={catIcon}
                          onChange={(e) => setCatIcon(e.target.value)}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
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
                        className="flex-1 py-2.5 bg-[#222] text-neutral-300 rounded-xl text-xs font-semibold"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-[#38BDF8] text-black font-bold rounded-xl text-xs"
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
    </AppShell>
  );
}
