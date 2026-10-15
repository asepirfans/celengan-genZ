'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { CurrencyCode } from '@/lib/types';
import { ArrowRight, Check } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

export default function OnboardingPage() {
  const router = useRouter();
  const {showToast}=useModal();
  const { profile, updateProfile, categories, setBudget } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Profil & Currency
  const [name, setName] = useState(profile?.full_name || 'Pengguna Baru');
  const [currency, setCurrency] = useState<CurrencyCode>('IDR');

  // Step 2: Initial Monthly Budget
  const [monthlyBudget, setMonthlyBudget] = useState('5.000.000');

  // Step 3: Preferred Categories
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);

  const handleNextStep1 = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    await updateProfile({ full_name: name, currency });
    setStep(2);

    } catch(error) { showToast({message:error instanceof Error?error.message:'Permintaan belum berhasil. Coba lagi.',type:'danger'}); }
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleFinishOnboarding = async () => {
    try {
    const budgetNum = parseFloat(monthlyBudget.replace(/[^0-9]/g, '')) || 5000000;
    const now = new Date();
    // Distribute budget to selected categories
    const amountPerCat = Math.round(budgetNum / Math.max(1, selectedCatIds.length));
    for (const id of selectedCatIds) await setBudget(id, amountPerCat, now.getMonth() + 1, now.getFullYear());

    router.push('/dashboard');

    } catch(error) { showToast({message:error instanceof Error?error.message:'Permintaan belum berhasil. Coba lagi.',type:'danger'}); }
  };

  const toggleCategory = (id: string) => {
    setSelectedCatIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-center items-center p-4 relative">
      <div className="w-full max-w-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)]"></span>
            <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">
              LANGKAH {step} DARI 3
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-6 bg-[var(--accent-primary)]' : s < step ? 'w-3 bg-[var(--accent-success)]' : 'w-3 bg-[#262626]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Profil & Currency */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold font-display text-[var(--text-primary)]">
                Selamat Datang! Siapa nama Anda?
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Atur profil dasar dan mata uang default untuk pencatatan keuangan.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Nama Panggilan / Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Mata Uang Utama</label>
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

            <button
              type="submit"
              className="w-full py-3 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold font-display rounded-xl hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2 text-xs"
            >
              Lanjutkan ke Budget
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2: Target Budget */}
        {step === 2 && (
          <form onSubmit={handleNextStep2} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold font-display text-[var(--text-primary)]">
                Berapa target budget pengeluaran bulanan Anda?
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Estimasi target ini akan membantu menjaga pengeluaran Anda tetap terkontrol.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Target Budget Bulanan</label>
              <div className="relative flex items-center bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 focus-within:border-[var(--accent-primary)]">
                <span className="text-[var(--text-muted)] font-mono mr-2">Rp</span>
                <input
                  type="text"
                      inputMode="numeric"
                      enterKeyHint="done"
                  value={monthlyBudget}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setMonthlyBudget(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                  }}
                  required
                  className="w-full bg-transparent font-mono font-bold text-[var(--text-primary)] outline-none text-xl"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-xl text-xs font-semibold"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="flex-2 py-3 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold font-display rounded-xl hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2 text-xs"
              >
                Lanjutkan ke Kategori
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Preferred Categories */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold font-display text-[var(--text-primary)]">
                Pilih kategori yang paling sering Anda pakai
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Pilih minimal 2 kategori pengeluaran favorit Anda.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-1">
              {categories.filter(c => c.type === 'expense').map(cat => {
                const isSelected = selectedCatIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs text-left transition-all ${
                      isSelected
                        ? 'bg-[var(--surface-elevated)] border-[var(--accent-primary)] text-[var(--text-primary)]'
                        : 'bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold truncate">{cat.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-xl text-xs font-semibold"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="flex-2 py-3 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold font-display rounded-xl hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2 text-xs "
              >
                Mulai Gunakan Money Tracker
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
