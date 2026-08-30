'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { CurrencyCode } from '@/lib/types';
import { ArrowRight, Check } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, updateProfile, categories, setBudget } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Profil & Currency
  const [name, setName] = useState(profile?.full_name || 'Pengguna Baru');
  const [currency, setCurrency] = useState<CurrencyCode>('IDR');

  // Step 2: Initial Monthly Budget
  const [monthlyBudget, setMonthlyBudget] = useState('5.000.000');

  // Step 3: Preferred Categories
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>(['cat-1', 'cat-2', 'cat-4']);

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ full_name: name, currency });
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleFinishOnboarding = () => {
    const budgetNum = parseFloat(monthlyBudget.replace(/[^0-9]/g, '')) || 5000000;
    const now = new Date();
    // Distribute budget to selected categories
    const amountPerCat = Math.round(budgetNum / Math.max(1, selectedCatIds.length));
    selectedCatIds.forEach(id => {
      setBudget(id, amountPerCat, now.getMonth() + 1, now.getFullYear());
    });

    router.push('/dashboard');
  };

  const toggleCategory = (id: string) => {
    setSelectedCatIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col justify-center items-center p-4 relative">
      <div className="w-full max-w-lg bg-[#141414] border border-[#262626] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-[#222] pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]"></span>
            <span className="text-xs font-mono font-bold text-neutral-400">
              LANGKAH {step} DARI 3
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-6 bg-[#38BDF8]' : s < step ? 'w-3 bg-[#3EFF9A]' : 'w-3 bg-[#262626]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Profil & Currency */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold font-display text-white">
                Selamat Datang! Siapa nama Anda?
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Atur profil dasar dan mata uang default untuk pencatatan keuangan.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-400">Nama Panggilan / Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-400">Mata Uang Utama</label>
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

            <button
              type="submit"
              className="w-full py-3 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all flex items-center justify-center gap-2 text-xs"
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
              <h2 className="text-xl font-bold font-display text-white">
                Berapa target budget pengeluaran bulanan Anda?
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Estimasi target ini akan membantu menjaga pengeluaran Anda tetap terkontrol.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-400">Target Budget Bulanan</label>
              <div className="relative flex items-center bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 focus-within:border-[#38BDF8]">
                <span className="text-neutral-500 font-mono mr-2">Rp</span>
                <input
                  type="text"
                  value={monthlyBudget}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setMonthlyBudget(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                  }}
                  required
                  className="w-full bg-transparent font-mono font-bold text-white outline-none text-xl"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-[#222] text-neutral-300 rounded-xl text-xs font-semibold"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="flex-2 py-3 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all flex items-center justify-center gap-2 text-xs"
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
              <h2 className="text-xl font-bold font-display text-white">
                Pilih kategori yang paling sering Anda pakai
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
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
                        ? 'bg-[#1C2412] border-[#38BDF8] text-white' 
                        : 'bg-[#141414] border-[#262626] text-neutral-400 hover:bg-[#1A1A1A]'
                    }`}
                  >
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold truncate">{cat.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#38BDF8] ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-[#222] text-neutral-300 rounded-xl text-xs font-semibold"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="flex-2 py-3 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all flex items-center justify-center gap-2 text-xs shadow-[0_0_20px_rgba(56,189,248,0.3)]"
              >
                Mulai Gunakan Money Tracker 🚀
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
