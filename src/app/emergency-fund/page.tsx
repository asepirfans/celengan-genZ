'use client';

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { formatCurrency } from '@/lib/formatters';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  Lock, 
  Unlock, 
  Plus, 
  ArrowRight, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  HeartHandshake,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function EmergencyFundPage() {
  const { summary, accounts, transactions, profile, exchangeRates } = useApp();
  const currency = profile?.currency || 'IDR';

  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married' | 'freelance'>('single');
  const [customMonths, setCustomMonths] = useState<number>(6);
  const [selectedEmergencyAccountIds, setSelectedEmergencyAccountIds] = useState<string[]>([]);
  const [customMonthlyExpense, setCustomMonthlyExpense] = useState<string>('3.000.000');
  const [isEditingExpense, setIsEditingExpense] = useState<boolean>(false);
  const [isSavingToDB, setIsSavingToDB] = useState<boolean>(false);

  // Load from DB on Mount
  React.useEffect(() => {
    if (!profile?.id) return;
    fetch(`/api/emergency-fund?userId=${profile.id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const d = json.data;
          if (d.profile_type) setMaritalStatus(d.profile_type);
          if (d.monthly_expense) setCustomMonthlyExpense(Number(d.monthly_expense).toLocaleString('id-ID'));
          if (d.selected_account_ids) setSelectedEmergencyAccountIds(d.selected_account_ids);
        }
      })
      .catch(err => console.warn('Could not load emergency fund from DB:', err));
  }, [profile?.id]);

  // Save to DB Helper
  const saveToDatabase = async (newProfileType?: string, newExpense?: number, newAccounts?: string[]) => {
    if (!profile?.id) return;
    setIsSavingToDB(true);
    try {
      const expenseVal = newExpense !== undefined 
        ? newExpense 
        : parseFloat(customMonthlyExpense.replace(/[^0-9]/g, '')) || 3000000;

      await fetch('/api/emergency-fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          profile_type: newProfileType || maritalStatus,
          monthly_expense: expenseVal,
          target_months: targetMonthsMultiplier,
          selected_account_ids: newAccounts !== undefined ? newAccounts : selectedEmergencyAccountIds
        })
      });
    } catch (e) {
      console.warn('Failed saving emergency fund to DB:', e);
    } finally {
      setIsSavingToDB(false);
    }
  };

  // 1. Hitung pengeluaran bulanan (bisa dari input manual user atau riwayat belanja aktual)
  const averageMonthlyExpense = useMemo(() => {
    const parsedCustom = parseFloat(customMonthlyExpense.replace(/[^0-9]/g, ''));
    if (parsedCustom && parsedCustom > 0) return parsedCustom;
    if (summary.monthlyExpense > 0) return summary.monthlyExpense;
    return 3000000; // Default biaya hidup standar 3jt/bulan
  }, [customMonthlyExpense, summary.monthlyExpense]);

  // 2. Tentukan target bulan aman berdasarkan profil risiko
  const targetMonthsMultiplier = useMemo(() => {
    if (maritalStatus === 'single') return 3; // 3 - 6 bulan
    if (maritalStatus === 'married') return 6; // 6 - 9 bulan
    if (maritalStatus === 'freelance') return 12; // 12 bulan untuk pendapatan fluktuatif
    return customMonths;
  }, [maritalStatus, customMonths]);

  // 3. Target Nominal Dana Darurat Ideal
  const targetEmergencyFund = averageMonthlyExpense * targetMonthsMultiplier;

  // 4. Saldo Dana Darurat Saat Ini (bisa dipilih akun mana saja yang didedikasikan sbg dana darurat)
  const currentEmergencyFund = useMemo(() => {
    if (selectedEmergencyAccountIds.length > 0) {
      return accounts
        .filter(a => selectedEmergencyAccountIds.includes(a.id))
        .reduce((sum, a) => sum + Number(a.current_balance || 0), 0);
    }
    // Jika belum memilih dompet spesifik, pakai dompet tipe 'savings' atau total saldo
    const savingsAccounts = accounts.filter(a => a.type === 'savings' || a.name.toLowerCase().includes('darurat') || a.name.toLowerCase().includes('tabungan'));
    if (savingsAccounts.length > 0) {
      return savingsAccounts.reduce((sum, a) => sum + Number(a.current_balance || 0), 0);
    }
    return Math.min(summary.totalBalance, targetEmergencyFund * 0.4);
  }, [accounts, selectedEmergencyAccountIds, summary.totalBalance, targetEmergencyFund]);

  // 5. Hitung Runway (Berapa bulan bisa bertahan hidup jika tidak ada income sama sekali)
  const runwayMonths = averageMonthlyExpense > 0 
    ? Math.round((currentEmergencyFund / averageMonthlyExpense) * 10) / 10 
    : 0;

  // 6. Progress Persentase
  const progressPercent = targetEmergencyFund > 0 
    ? Math.min(Math.round((currentEmergencyFund / targetEmergencyFund) * 100), 100) 
    : 0;

  // Health Status Badge
  const safetyStatus = useMemo(() => {
    if (runwayMonths >= targetMonthsMultiplier) return { label: 'AMAT KUAT (SUPER SAFE)', color: 'text-[#3EFF9A] bg-[#3EFF9A]/10 border-[#3EFF9A]/30', desc: 'Bantalan finansial Anda sangat solid untuk menghadapi krisis tak terduga.' };
    if (runwayMonths >= 3) return { label: 'CUKUP AMAN (MODERATE)', color: 'text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/30', desc: 'Dana darurat sudah mulai terbentuk, lanjutkan hingga mencapai target ideal.' };
    return { label: 'PERLU DITINGKATKAN (AT RISK)', color: 'text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/30', desc: 'Ketahanan finansial Anda masih di bawah 3 bulan pengeluaran. Prioritaskan alokasi tabungan.' };
  }, [runwayMonths, targetMonthsMultiplier]);

  const toggleAccountSelection = (id: string) => {
    let next: string[];
    if (selectedEmergencyAccountIds.includes(id)) {
      next = selectedEmergencyAccountIds.filter(a => a !== id);
    } else {
      next = [...selectedEmergencyAccountIds, id];
    }
    setSelectedEmergencyAccountIds(next);
    saveToDatabase(undefined, undefined, next);
  };

  const handleCelebrate = () => {
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#38BDF8', '#3EFF9A', '#60A5FA']
    });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                Dana Darurat & Safety Net
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Bantalan ketahanan finansial untuk melindungi hidup Anda dari risiko tak terduga (PHK, medis, atau krisis).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCelebrate}
              className="px-4 py-2 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl text-xs font-semibold text-neutral-300 hover:text-white hover:border-[#38BDF8] transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Simulasi Aman</span>
            </button>
          </div>
        </div>

        {/* Big Health Banner & Runway Gauge */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#131E29] via-[#161616] to-[#121212] border border-[#38BDF8]/30 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Left: Runway Counter */}
            <div className="space-y-2 lg:col-span-2">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${safetyStatus.color}`}>
                  {safetyStatus.label}
                </span>
                <span className="text-xs text-neutral-400 font-mono">Target: {targetMonthsMultiplier} Bulan</span>
              </div>

              <div className="pt-2">
                <span className="text-xs uppercase font-mono tracking-wider text-neutral-400 block">
                  Runway Ketahanan Hidup Anda:
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <h2 className="text-4xl sm:text-6xl font-black font-mono text-white tracking-tight">
                    {runwayMonths} <span className="text-xl sm:text-2xl font-bold text-[#38BDF8]">Bulan</span>
                  </h2>
                  <span className="text-xs text-neutral-400">
                    ({progressPercent}% dari target {targetMonthsMultiplier} bulan)
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed pt-1">
                {safetyStatus.desc} Jika hari ini tidak ada pemasukan sama sekali, Anda dapat bertahan hidup selama <strong className="text-[#38BDF8]">{runwayMonths} bulan</strong> dengan standar pengeluaran saat ini.
              </p>

              {/* Runway Progress Bar */}
              <div className="pt-4 space-y-1.5">
                <div className="h-3 w-full bg-[#222] rounded-full overflow-hidden p-0.5 border border-[#333]">
                  <div 
                    className="h-full bg-gradient-to-r from-[#38BDF8] to-[#3EFF9A] rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                  <span>Terkumpul: <strong className="text-white">{formatCurrency(currentEmergencyFund, currency, false, exchangeRates)}</strong></span>
                  <span>Target: <strong className="text-[#38BDF8]">{formatCurrency(targetEmergencyFund, currency, false, exchangeRates)}</strong></span>
                </div>
              </div>
            </div>

            {/* Right: Quick Metrics Mini Card with Editable Monthly Cost */}
            <div className="p-5 rounded-2xl bg-[#0D141C]/90 border border-[#233547] space-y-4">
              <div className="space-y-1.5 pb-3 border-b border-[#233547]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-medium">Biaya Hidup Pokok / Bulan</span>
                  <button 
                    onClick={() => setIsEditingExpense(!isEditingExpense)}
                    className="text-[10px] text-[#38BDF8] hover:underline font-bold"
                  >
                    {isEditingExpense ? 'Selesai' : 'Ubah Biaya'}
                  </button>
                </div>

                {isEditingExpense ? (
                  <div className="flex items-center gap-1.5 bg-[#0A0F14] border border-[#38BDF8] rounded-xl px-2.5 py-1">
                    <span className="text-xs text-neutral-400 font-mono">Rp</span>
                    <input 
                      type="text"
                      value={customMonthlyExpense}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setCustomMonthlyExpense(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                      }}
                      onBlur={() => {
                        setIsEditingExpense(false);
                        saveToDatabase();
                      }}
                      className="bg-transparent text-sm font-bold text-white outline-none w-full font-mono"
                      placeholder="Contoh: 3.000.000"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="font-mono font-bold text-white text-base">
                    {formatCurrency(averageMonthlyExpense, currency, false, exchangeRates)}
                  </div>
                )}
                <span className="text-[10px] text-neutral-500 block">Kebutuhan makan, tempat tinggal, & tagihan</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-[#233547]">
                <span className="text-xs text-neutral-400 font-medium">Kekurangan Dana</span>
                <span className="font-mono font-bold text-[#3EFF9A] text-xs">
                  {currentEmergencyFund >= targetEmergencyFund ? 'LENGKAP 🎉' : `-${formatCurrency(targetEmergencyFund - currentEmergencyFund, currency, false, exchangeRates)}`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium">Profil Tanggungan</span>
                <span className="font-bold text-[#38BDF8] text-xs uppercase">
                  {maritalStatus === 'single' ? 'Lajang (3x)' : maritalStatus === 'married' ? 'Menikah (6x)' : 'Freelancer (12x)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Customizer Profile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Pilih Profil & Faktor Pengali */}
          <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626] space-y-4">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[#38BDF8]" />
              <h3 className="font-bold text-sm text-white">1. Pilih Profil Tanggungan</h3>
            </div>
            <p className="text-xs text-neutral-400">
              Kebutuhan dana darurat bertambah sesuai tanggungan keluarga & kestabilan karir.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setMaritalStatus('single');
                  saveToDatabase('single');
                }}
                className={`w-full p-3 rounded-xl border text-left text-xs transition-all ${
                  maritalStatus === 'single' 
                    ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-white font-bold' 
                    : 'bg-[#1D1D1D] border-[#2A2A2A] text-neutral-300 hover:border-[#383838]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>👤 Lajang / Belum Menikah</span>
                  <span className="font-mono text-[#38BDF8]">3 Bulan</span>
                </div>
                <p className="text-[10px] text-neutral-400 font-normal mt-1">Risiko rendah, fleksibilitas tinggi.</p>
              </button>

              <button
                onClick={() => {
                  setMaritalStatus('married');
                  saveToDatabase('married');
                }}
                className={`w-full p-3 rounded-xl border text-left text-xs transition-all ${
                  maritalStatus === 'married' 
                    ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-white font-bold' 
                    : 'bg-[#1D1D1D] border-[#2A2A2A] text-neutral-300 hover:border-[#383838]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>👨‍👩‍👧 Menikah / Ada Tanggungan</span>
                  <span className="font-mono text-[#38BDF8]">6 Bulan</span>
                </div>
                <p className="text-[10px] text-neutral-400 font-normal mt-1">Proteksi keluarga & biaya tak terduga rumah tangga.</p>
              </button>

              <button
                onClick={() => {
                  setMaritalStatus('freelance');
                  saveToDatabase('freelance');
                }}
                className={`w-full p-3 rounded-xl border text-left text-xs transition-all ${
                  maritalStatus === 'freelance' 
                    ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-white font-bold' 
                    : 'bg-[#1D1D1D] border-[#2A2A2A] text-neutral-300 hover:border-[#383838]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>💼 Freelancer / Pebisnis</span>
                  <span className="font-mono text-[#38BDF8]">12 Bulan</span>
                </div>
                <p className="text-[10px] text-neutral-400 font-normal mt-1">Menjaga cashflow saat siklus proyek sepi.</p>
              </button>
            </div>
          </div>

          {/* Card 2: Alokasikan Dompet / Rekening Khusus */}
          <div className="p-5 rounded-2xl bg-[#161616] border border-[#262626] space-y-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="font-bold text-sm text-white">2. Sambungkan Dompet / Rekening Dana Darurat</h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">
                {selectedEmergencyAccountIds.length} dompet tersambung
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Centang rekening atau e-wallet yang khusus kamu dedikasikan untuk menyimpan dana darurat agar terpisah dari uang belanja harian.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {accounts.map(acc => {
                const isSelected = selectedEmergencyAccountIds.includes(acc.id);

                return (
                  <div
                    key={acc.id}
                    onClick={() => toggleAccountSelection(acc.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'bg-[#38BDF8]/10 border-[#38BDF8] text-white' 
                        : 'bg-[#1A1A1A] border-[#2E2E2E] text-neutral-300 hover:border-[#444]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#222] flex items-center justify-center text-[#38BDF8] text-sm">
                        {isSelected ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4 text-neutral-500" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{acc.name}</h4>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {formatCurrency(acc.current_balance, currency, false, exchangeRates)}
                        </span>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-[#38BDF8] text-black border-[#38BDF8] font-bold' : 'border-neutral-600'
                    }`}>
                      {isSelected && '✓'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Smart Advice Box */}
            <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-start gap-2.5 text-xs text-neutral-300">
              <AlertCircle className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong>Tips Perencana Keuangan:</strong> Simpan dana darurat di instrumen likuid & aman (Tabungan Bank Bunga Tinggi, Reksadana Pasar Uang, atau Emas Digital) agar mudah dicairkan dalam 1x24 jam saat genting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
