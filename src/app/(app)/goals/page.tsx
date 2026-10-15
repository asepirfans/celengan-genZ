'use client';

import React, { useState, useEffect, useRef } from 'react';

import { useApp } from '@/lib/store';
import { apiRequest, checkedFetch, newRequestId, errorMessage } from '@/lib/client-api';
import { useModal } from '@/components/ui/CustomModal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { SavingsGoal } from '@/lib/types';
import {
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

export default function WishlistGoalsPage() {
  const { profile, exchangeRates, accounts, goalAccountIds, refreshFromDB } = useApp();
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
  const [selectedColor, setSelectedColor] = useState('#76834E');
  const [selectedIcon, setSelectedIcon] = useState('gift');

  // Topup State Modal
  const [topupGoal, setTopupGoal] = useState<SavingsGoal | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupAccount,setTopupAccount]=useState('');
  const [topupDirection,setTopupDirection]=useState<'deposit'|'withdraw'|'link_legacy'>('deposit');
  const [topupSaving,setTopupSaving]=useState(false);
  const topupKey=useRef('');
  const regularAccounts=accounts.filter(a=>!a.is_archived&&!goalAccountIds.includes(a.id));

  // Fetch Goals from DB
  const fetchGoals = async () => {
    if (!profile?.id) return;
    try {
      const res = await checkedFetch('/api/goals');
      const json = await res.json();
      if (json.success) {
        setGoals(json.data || []);
      }
    } catch (e) {
      showToast({message:errorMessage(e),type:'danger'});
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
    setCurrentAmount('0');
    setTargetDate('');
    setSelectedColor('#76834E');
    setSelectedIcon('gift');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: SavingsGoal) => {
    setEditingGoal(g);
    setTitle(g.title);
    setTargetAmount(Number(g.target_amount).toLocaleString('id-ID'));
    setCurrentAmount(Number(g.current_amount).toLocaleString('id-ID'));
    setTargetDate(g.target_date ? g.target_date.split('T')[0] : '');
    setSelectedColor(g.color || '#76834E');
    setSelectedIcon(g.icon || 'gift');
    setIsModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    const targetNum = parseFloat(targetAmount.replace(/[^0-9]/g, ''));
    const currentNum = parseFloat(currentAmount.replace(/[^0-9]/g, '')) || 0;
    if (!title.trim() || !targetNum) return;

    if (editingGoal) {
      const res = await checkedFetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGoal.id,
          title: title.trim(),
          target_amount: targetNum,
          current_amount: editingGoal ? currentNum : 0,
          target_date: targetDate || null,
          color: selectedColor,
          icon: selectedIcon
        })
      });
      if (res.ok) {
        showToast({ message: 'Target impian berhasil diperbarui! ', type: 'success' });
      }
    } else {
      const res = await checkedFetch('/api/goals', {
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
        showToast({ message: 'Celengan impian baru berhasil dibuat! ', type: 'success' });
      }
    }

    setIsModalOpen(false);
    await fetchGoals();
    await refreshFromDB();
  
    } catch(error) { showToast({message:error instanceof Error?error.message:'Permintaan belum berhasil. Coba lagi.',type:'danger'}); }
  };

  const handleDeleteGoal = (g: SavingsGoal) => {
    confirmModal({
      title: 'Hapus Celengan Impian?',
      message: `Target "${g.title}" akan dihapus dari daftar wishlist.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        await checkedFetch(`/api/goals?id=${g.id}`, { method: 'DELETE' });
        showToast({ message: 'Target berhasil dihapus.', type: 'info' });
        await fetchGoals();
        await refreshFromDB();
      }
    });
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!topupGoal||topupSaving)return;
    const amount=Number(topupAmount.replace(/[^0-9]/g,''));if(!amount)return;
    if(!topupKey.current)topupKey.current=newRequestId();
    setTopupSaving(true);
    try {
      await apiRequest('/api/goals','POST',{action:'contribute',id:topupGoal.id,amount,account_id:topupAccount||regularAccounts[0]?.id,direction:topupDirection,request_id:topupKey.current});
      setTopupGoal(null);setTopupAmount('');topupKey.current='';
      showToast({message:'Transfer celengan tersimpan.',type:'success'});
      await fetchGoals();
      await refreshFromDB();
    } catch(error) {showToast({message:errorMessage(error),type:'danger'});}
    finally {setTopupSaving(false);}
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
    <>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                <Target className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[var(--text-primary)] tracking-tight">
                Wishlist & Celengan Impian
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Kumpulkan tabungan untuk barang impian, liburan, konser, atau gadget baru impianmu!
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold font-display rounded-xl hover:bg-[var(--accent-hover)] transition-all flex items-center gap-1.5  text-xs shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Buat Target Impian</span>
          </button>
        </div>

        {/* Global Progress Banner */}
        <div className="p-6 rounded-3xl bg-[var(--surface-card)]    border border-[var(--accent-primary)]/25 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> TOTAL PROGRESS CELENGAN
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-mono text-[var(--text-primary)] mt-0.5">
                {formatCurrency(totalSavedAll, currency, false, exchangeRates)}
                <span className="text-xs sm:text-sm font-normal text-[var(--text-secondary)] ml-2">
                  dari target {formatCurrency(totalTargetAll, currency, false, exchangeRates)}
                </span>
              </h2>
            </div>
            <div className="text-right">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-[var(--accent-primary)]">
                {overallProgress}%
              </span>
            </div>
          </div>

          <div className="h-3 w-full bg-[var(--surface-elevated)] rounded-full overflow-hidden p-0.5 border border-[var(--border-subtle)]">
            <div
              className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-700 "
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Goals Cards Grid */}
        {goals.length === 0 ? (
          <div className="p-10 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-subtle)] text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mx-auto flex items-center justify-center text-[var(--accent-primary)]">
              <Gift className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-display">Belum Ada Wishlist Impian</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                Mulai pasang target impian pertamamu (misal: Beli iPhone 16, Tiket Konser, atau Liburan Bali)!
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold font-display rounded-xl hover:bg-[var(--accent-hover)] transition-all text-xs inline-flex items-center gap-1.5"
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
                  className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-primary)] shrink-0"
                        style={{ backgroundColor: `${g.color}20`, color: g.color }}
                      >
                        {renderIcon(g.icon, "w-5 h-5")}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(g)}
                          className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
                          title="Edit Target"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(g)}
                          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--surface-elevated)] transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base text-[var(--text-primary)] truncate">{g.title}</h3>
                        {isCompleted && (
                          <span className="text-[10px] font-bold font-mono text-[var(--accent-success)] bg-[var(--accent-success)]/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> TERCAPAI
                          </span>
                        )}
                      </div>
                      {g.target_date && (
                        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                          Target: {formatDate(g.target_date, 'long')}
                        </p>
                      )}
                    </div>

                    {/* Progress Bar & Amount */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-baseline justify-between text-xs font-mono">
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatCurrency(current, currency, false, exchangeRates)}
                        </span>
                        <span className="text-[var(--text-secondary)] text-[11px]">
                          Target: {formatCurrency(target, currency, false, exchangeRates)}
                        </span>
                      </div>

                      <div className="h-2.5 w-full bg-[var(--surface-elevated)] rounded-full overflow-hidden p-0.5 border border-[var(--border-subtle)]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: isCompleted ? '#66816A' : (g.color || '#76834E')
                          }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-secondary)] pt-0.5">
                        <span>{percent}% Terkumpul</span>
                        <span>
                          {isCompleted
                            ? 'Goal Selesai! '
                            : `Kurang ${formatCurrency(target - current, currency, false, exchangeRates)}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {Number(g.legacy_amount)>0&&<p className="text-xs text-[var(--text-muted)]">Saldo lama {formatCurrency(Number(g.legacy_amount),currency,false,exchangeRates)} belum terhubung ke wallet. Pilih Hubungkan saldo lama melalui menu transfer.</p>}
                  {/* Topup Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setTopupGoal(g); topupKey.current=''; setTopupDirection('deposit'); setTopupAccount('');
                      setTopupAmount('');
                    }}
                    className="w-full py-2 bg-[var(--surface-elevated)] hover:bg-[var(--surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-[var(--text-primary)] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Coins className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span>Transfer celengan</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Buat / Edit Target Impian */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  {editingGoal ? 'Edit Target Impian' : 'Buat Celengan Impian Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  ✕ Tutup
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-secondary)] font-medium">Nama Barang / Impian</label>
                  <input
                    type="text"
                    placeholder="Contoh: Beli iPhone 16 Pro, Liburan Jepang"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--text-secondary)] font-medium">Target Nominal</label>
                    <input
                      type="text"
                      placeholder="0"
                      inputMode="numeric"
                      enterKeyHint="done"
                      value={targetAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setTargetAmount(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                      }}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-primary)]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-[var(--text-secondary)] font-medium">Saldo tercatat</label>
                    <input
                      type="text"
                      placeholder="0"
                      inputMode="numeric"
                      enterKeyHint="done"
                      value={currentAmount}
                      readOnly
                      aria-label="Saldo celengan, berubah melalui transfer wallet"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setCurrentAmount(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                      }}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-secondary)] font-medium">Target Tanggal Tercapai (Opsional)</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>

                {/* Icon Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-secondary)] font-medium">Pilih Ikon</label>
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
                        className={`p-2 rounded-xl border transition-all ${selectedIcon === ic.id ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}
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
                    className="flex-1 py-2 bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold font-display rounded-xl text-xs"
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
            <div className="w-full max-w-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mx-auto flex items-center justify-center">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Nabung ke {topupGoal.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Masukkan nominal yang ingin kamu masukkan ke celengan ini.
                </p>
              </div>

              <form onSubmit={handleTopup} className="space-y-4">
                <div className="transaction-field"><label htmlFor="goal-direction">Jenis transfer</label><select id="goal-direction" value={topupDirection} onChange={e=>setTopupDirection(e.target.value as 'deposit'|'withdraw'|'link_legacy')}><option value="deposit">Menabung ke celengan</option><option value="withdraw">Tarik tabungan ke wallet</option>{Number(topupGoal.legacy_amount)>0&&<option value="link_legacy">Hubungkan saldo lama (progres tetap)</option>}</select></div>
                <div className="transaction-field"><label htmlFor="goal-wallet">{topupDirection==='withdraw'?'Wallet tujuan':'Wallet sumber'}</label><select id="goal-wallet" value={topupAccount||regularAccounts[0]?.id||''} onChange={e=>setTopupAccount(e.target.value)} required>{regularAccounts.length===0&&<option value="">Buat wallet terlebih dahulu</option>}{regularAccounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                <div className="p-3.5 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl text-center">
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">NOMINAL MENABUNG</span>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="text-sm font-bold text-[var(--text-secondary)] font-mono">Rp</span>
                    <input
                      type="text"
                      placeholder="0"
                      inputMode="numeric"
                      enterKeyHint="done"
                      value={topupAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setTopupAmount(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                      }}
                      className="bg-transparent text-xl font-mono font-bold text-[var(--text-primary)] outline-none w-full text-center"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTopupGoal(null)}
                    className="flex-1 py-2.5 bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={topupSaving || !regularAccounts.length}
                    className="flex-1 py-2.5 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold font-display rounded-xl text-xs"
                  >
                    {topupSaving ? 'Menyimpan…' : 'Simpan transfer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
