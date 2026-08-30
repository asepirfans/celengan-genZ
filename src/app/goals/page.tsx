'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { SavingsGoal } from '@/lib/types';
import {
  Sparkles,
  Plus,
  Target,
  TrendingUp,
  Trash2,
  Edit3,
  CheckCircle2,
  ArrowUpRight,
  Gift,
  Flame,
  Coins,
  Plane,
  Smartphone,
  Laptop,
  Car,
  Heart
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function WishlistGoalsPage() {
  const { profile, exchangeRates } = useApp();
  const { confirmModal, showToast } = useModal();
  const currency = profile?.currency || 'IDR';

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedColor, setSelectedColor] = useState('#38BDF8');
  const [selectedIcon, setSelectedIcon] = useState('gift');

  // Topup State Modal
  const [topupGoal, setTopupGoal] = useState<SavingsGoal | null>(null);
  const [topupAmount, setTopupAmount] = useState('');

  // Fetch Goals from DB
  const fetchGoals = async () => {
    if (!profile?.id) return;
    try {
      const res = await fetch(`/api/goals?userId=${profile.id}`);
      const json = await res.json();
      if (json.success) {
        setGoals(json.data || []);
      }
    } catch (e) {
      console.warn('Failed loading goals:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [profile?.id]);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setTargetDate('');
    setSelectedColor('#38BDF8');
    setSelectedIcon('gift');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: SavingsGoal) => {
    setEditingGoal(g);
    setTitle(g.title);
    setTargetAmount(Number(g.target_amount).toLocaleString('id-ID'));
    setCurrentAmount(Number(g.current_amount).toLocaleString('id-ID'));
    setTargetDate(g.target_date ? g.target_date.split('T')[0] : '');
    setSelectedColor(g.color || '#38BDF8');
    setSelectedIcon(g.icon || 'gift');
    setIsModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(targetAmount.replace(/[^0-9]/g, ''));
    const currentNum = parseFloat(currentAmount.replace(/[^0-9]/g, '')) || 0;
    if (!title.trim() || !targetNum) return;

    if (editingGoal) {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGoal.id,
          title: title.trim(),
          target_amount: targetNum,
          current_amount: currentNum,
          target_date: targetDate || null,
          color: selectedColor,
          icon: selectedIcon
        })
      });
      if (res.ok) {
        showToast({ message: 'Target impian berhasil diperbarui! ✨', type: 'success' });
      }
    } else {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile?.id,
          title: title.trim(),
          target_amount: targetNum,
          current_amount: currentNum,
          target_date: targetDate || null,
          color: selectedColor,
          icon: selectedIcon
        })
      });
      if (res.ok) {
        showToast({ message: 'Celengan impian baru berhasil dibuat! 🎯', type: 'success' });
      }
    }

    setIsModalOpen(false);
    fetchGoals();
  };

  const handleDeleteGoal = (g: SavingsGoal) => {
    confirmModal({
      title: 'Hapus Celengan Impian?',
      message: `Target "${g.title}" akan dihapus dari daftar wishlist.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        await fetch(`/api/goals?id=${g.id}`, { method: 'DELETE' });
        showToast({ message: 'Target berhasil dihapus.', type: 'info' });
        fetchGoals();
      }
    });
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupGoal) return;
    const addNum = parseFloat(topupAmount.replace(/[^0-9]/g, ''));
    if (!addNum || addNum <= 0) return;

    const newCurrent = Number(topupGoal.current_amount || 0) + addNum;

    await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: topupGoal.id,
        current_amount: newCurrent
      })
    });

    if (newCurrent >= Number(topupGoal.target_amount)) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
      showToast({ message: `SELAMAT! Target "${topupGoal.title}" SUDAH TERCAPAI 100%! 🎉🥳`, type: 'success' });
    } else {
      showToast({ message: `Berhasil menabung ${formatCurrency(addNum, currency, false, exchangeRates)} ke ${topupGoal.title}! 💸`, type: 'success' });
    }

    setTopupGoal(null);
    setTopupAmount('');
    fetchGoals();
  };

  const totalTargetAll = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const totalSavedAll = goals.reduce((sum, g) => sum + Number(g.current_amount), 0);
  const overallProgress = totalTargetAll > 0 ? Math.min(100, Math.round((totalSavedAll / totalTargetAll) * 100)) : 0;

  const renderIcon = (name: string, className: string = "w-5 h-5") => {
    switch (name) {
      case 'smartphone': return <Smartphone className={className} />;
      case 'laptop': return <Laptop className={className} />;
      case 'plane': return <Plane className={className} />;
      case 'car': return <Car className={className} />;
      case 'heart': return <Heart className={className} />;
      default: return <Gift className={className} />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">
                <Target className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                Wishlist & Celengan Impian
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Kumpulkan tabungan untuk barang impian, liburan, konser, atau gadget baru impianmu!
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.25)] text-xs shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Buat Target Impian</span>
          </button>
        </div>

        {/* Global Progress Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#171717] via-[#141E28] to-[#171717] border border-[#38BDF8]/25 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#38BDF8] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> TOTAL PROGRESS CELENGAN
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-mono text-white mt-0.5">
                {formatCurrency(totalSavedAll, currency, false, exchangeRates)}
                <span className="text-xs sm:text-sm font-normal text-neutral-400 ml-2">
                  dari target {formatCurrency(totalTargetAll, currency, false, exchangeRates)}
                </span>
              </h2>
            </div>
            <div className="text-right">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-[#38BDF8]">
                {overallProgress}%
              </span>
            </div>
          </div>

          <div className="h-3 w-full bg-[#1C1C1C] rounded-full overflow-hidden p-0.5 border border-[#2E2E2E]">
            <div
              className="h-full bg-gradient-to-r from-[#38BDF8] to-[#3EFF9A] rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Goals Cards Grid */}
        {goals.length === 0 ? (
          <div className="p-10 rounded-3xl bg-[#141414] border border-[#282828] text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 mx-auto flex items-center justify-center text-[#38BDF8]">
              <Gift className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Belum Ada Wishlist Impian</h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                Mulai pasang target impian pertamamu (misal: Beli iPhone 16, Tiket Konser, atau Liburan Bali)!
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Buat Impian Pertamaku
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {goals.map(g => {
              const current = Number(g.current_amount || 0);
              const target = Number(g.target_amount || 1);
              const percent = Math.min(100, Math.round((current / target) * 100));
              const isCompleted = current >= target;

              return (
                <div
                  key={g.id}
                  className="p-5 rounded-2xl bg-[#161616] border border-[#262626] hover:border-[#383838] transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: `${g.color}20`, color: g.color }}
                      >
                        {renderIcon(g.icon, "w-5 h-5")}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(g)}
                          className="p-1 rounded-lg text-neutral-400 hover:text-[#38BDF8] hover:bg-[#222] transition-colors"
                          title="Edit Target"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(g)}
                          className="p-1 rounded-lg text-neutral-500 hover:text-[#FF4E4E] hover:bg-[#222] transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base text-white truncate">{g.title}</h3>
                        {isCompleted && (
                          <span className="text-[10px] font-bold font-mono text-[#3EFF9A] bg-[#3EFF9A]/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> TERCAPAI
                          </span>
                        )}
                      </div>
                      {g.target_date && (
                        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                          Target: {formatDate(g.target_date, 'long')}
                        </p>
                      )}
                    </div>

                    {/* Progress Bar & Amount */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-baseline justify-between text-xs font-mono">
                        <span className="font-bold text-white">
                          {formatCurrency(current, currency, false, exchangeRates)}
                        </span>
                        <span className="text-neutral-400 text-[11px]">
                          Target: {formatCurrency(target, currency, false, exchangeRates)}
                        </span>
                      </div>

                      <div className="h-2.5 w-full bg-[#222] rounded-full overflow-hidden p-0.5 border border-[#333]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: isCompleted ? '#3EFF9A' : (g.color || '#38BDF8')
                          }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 pt-0.5">
                        <span>{percent}% Terkumpul</span>
                        <span>
                          {isCompleted
                            ? 'Goal Selesai! 🎉'
                            : `Kurang ${formatCurrency(target - current, currency, false, exchangeRates)}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Topup Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setTopupGoal(g);
                      setTopupAmount('');
                    }}
                    className="w-full py-2 bg-[#1F1F1F] hover:bg-[#282828] border border-[#2E2E2E] hover:border-[#38BDF8] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Coins className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>+ Tabung ke Celengan Ini</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Buat / Edit Target Impian */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md bg-[#141414] border border-[#282828] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white">
                  {editingGoal ? 'Edit Target Impian' : 'Buat Celengan Impian Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-xs text-neutral-400 hover:text-white">
                  ✕ Tutup
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-medium">Nama Barang / Impian</label>
                  <input
                    type="text"
                    placeholder="Contoh: Beli iPhone 16 Pro, Liburan Jepang"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#38BDF8]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-medium">Target Nominal</label>
                    <input
                      type="text"
                      placeholder="0"
                      value={targetAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setTargetAmount(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                      }}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-[#38BDF8]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 font-medium">Saldo Terkumpul Awal</label>
                    <input
                      type="text"
                      placeholder="0"
                      value={currentAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setCurrentAmount(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                      }}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-[#38BDF8]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-medium">Target Tanggal Tercapai (Opsional)</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#38BDF8]"
                  />
                </div>

                {/* Icon Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Pilih Ikon</label>
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'gift', label: 'Gift' },
                      { id: 'smartphone', label: 'HP' },
                      { id: 'laptop', label: 'Laptop' },
                      { id: 'plane', label: 'Liburan' },
                      { id: 'car', label: 'Kendaraan' },
                      { id: 'heart', label: 'Cinta' }
                    ].map(ic => (
                      <button
                        key={ic.id}
                        type="button"
                        onClick={() => setSelectedIcon(ic.id)}
                        className={`p-2 rounded-xl border transition-all ${selectedIcon === ic.id ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]' : 'bg-[#181818] border-[#2A2A2A] text-neutral-400'}`}
                      >
                        {renderIcon(ic.id, "w-4 h-4")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 bg-[#222] text-neutral-300 rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#38BDF8] text-black font-bold font-display rounded-xl text-xs"
                  >
                    {editingGoal ? 'Simpan Perubahan' : 'Buat Celengan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Topup Tabungan ke Celengan */}
        {topupGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-sm bg-[#141414] border border-[#282828] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-[#38BDF8]/10 text-[#38BDF8] mx-auto flex items-center justify-center">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-white">
                  Nabung ke {topupGoal.title}
                </h3>
                <p className="text-xs text-neutral-400">
                  Masukkan nominal yang ingin kamu masukkan ke celengan ini.
                </p>
              </div>

              <form onSubmit={handleTopup} className="space-y-4">
                <div className="p-3.5 bg-[#0D0D0D] border border-[#2A2A2A] rounded-2xl text-center">
                  <span className="text-[10px] text-neutral-500 font-mono">NOMINAL MENABUNG</span>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="text-sm font-bold text-neutral-400 font-mono">Rp</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={topupAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setTopupAmount(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                      }}
                      className="bg-transparent text-xl font-mono font-bold text-white outline-none w-full text-center"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTopupGoal(null)}
                    className="flex-1 py-2.5 bg-[#1F1F1F] text-neutral-300 rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#38BDF8] text-black font-bold font-display rounded-xl text-xs"
                  >
                    Masukkan Celengan 💸
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
