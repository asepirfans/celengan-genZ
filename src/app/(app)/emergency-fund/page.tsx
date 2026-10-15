'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, CalendarDays, Wallet, Check } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { errorMessage } from '@/lib/client-api';
import { formatCurrency } from '@/lib/formatters';
import styles from './emergency-fund.module.css';

type ProfileType = 'single' | 'married' | 'freelance';
const profiles: { type: ProfileType; label: string; months: number }[] = [
  { type: 'single', label: 'Lajang', months: 3 },
  { type: 'married', label: 'Keluarga', months: 6 },
  { type: 'freelance', label: 'Freelance', months: 12 },
];

export default function EmergencyFundPage() {
  const { summary, accounts, profile, exchangeRates, emergencyFund, updateEmergencyFund } = useApp();
  const { showToast } = useModal();
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const money = (amount: number) => formatCurrency(amount, profile?.currency || 'IDR', false, exchangeRates);
  const monthlyExpense = Number(emergencyFund.monthly_expense) || summary.monthlyExpense || 3000000;
  const profileType = emergencyFund.profile_type;
  const selectedIds = emergencyFund.selected_account_ids;
  const targetMonths = profiles.find(item => item.type === profileType)?.months || 3;
  const target = monthlyExpense * targetMonths;
  const collected = summary.emergencyBalance;
  const remaining = Math.max(0, target - collected);
  const runway = Math.round(collected / monthlyExpense * 10) / 10;
  const percent = target > 0 ? Math.max(0, Math.min(Math.round(collected / target * 100), 100)) : 0;
  const status = runway >= targetMonths ? 'Target tercapai' : collected > 0 ? 'Sedang terkumpul' : 'Mulai kumpulkan';

  const save = async (nextType = profileType, nextExpense = monthlyExpense, nextIds = selectedIds) => {
    if (saving.current) return false;
    saving.current = true;
    setIsSaving(true);
    try {
      await updateEmergencyFund({ profile_type: nextType, monthly_expense: nextExpense, target_months: profiles.find(item => item.type === nextType)?.months || 3, selected_account_ids: nextIds });
      return true;
    } catch (error) {
      showToast({ message: errorMessage(error), type: 'danger' });
      return false;
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };
  const saveExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(expenseDraft.replace(/[^0-9]/g, ''));
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      showToast({ message: 'Isi biaya bulanan lebih dari 0.', type: 'danger' });
      return;
    }
    if (await save(undefined, amount)) setIsEditingExpense(false);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerIcon}><ShieldCheck size={23} /></span>
        <div><h1>Dana darurat</h1><p>Siap untuk yang tak terduga.</p></div>
      </header>

      <div className={styles.overview}>
        <section className={styles.hero} aria-label="Progres dana darurat">
          <div className={styles.heroTop}>
            <div className={styles.balance}>
              <span className={styles.status}>{remaining === 0 && <Check size={13} />}{status}</span>
              <p>Terkumpul</p>
              <h2>{money(collected)}</h2>
            </div>
            <div className={styles.ring} role="progressbar" aria-label="Target terkumpul" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} style={{ background: `conic-gradient(var(--on-accent) ${percent}%, color-mix(in srgb, var(--on-accent) 20%, transparent) 0)` }}>
              <div className={styles.ringInner} aria-hidden="true"><strong>{percent}%</strong><span>dari target</span></div>
            </div>
          </div>
          <dl className={styles.heroMetrics}>
            <div><dt>Target {targetMonths} bulan</dt><dd>{money(target)}</dd></div>
            <div><dt>{remaining > 0 ? 'Perlu ditambah' : 'Sisa target'}</dt><dd>{money(remaining)}</dd></div>
          </dl>
        </section>

        <div className={styles.overviewSide}>
          <div className={styles.runway}><CalendarDays size={21} /><p>Biaya hidup terlindungi</p><strong>{runway} <span>bulan</span></strong></div>
          <section className={styles.card} aria-labelledby="monthly-cost-title">
            <div className={styles.costTop}>
              <h2 id="monthly-cost-title">Biaya hidup / bulan</h2>
              {!isEditingExpense && <button type="button" disabled={isSaving} className={styles.textButton} onClick={() => { setExpenseDraft(monthlyExpense.toLocaleString('id-ID')); setIsEditingExpense(true); }}>Ubah</button>}
            </div>
            {isEditingExpense ? <form className={styles.costForm} onSubmit={saveExpense}>
              <div className={styles.costInput}><span>Rp</span><input aria-label="Biaya bulanan" inputMode="numeric" enterKeyHint="done" autoFocus disabled={isSaving} value={expenseDraft} onChange={event => { const raw = event.target.value.replace(/[^0-9]/g, ''); setExpenseDraft(raw ? Number(raw).toLocaleString('id-ID') : ''); }} /></div>
              <div className={styles.costActions}><button type="button" disabled={isSaving} onClick={() => setIsEditingExpense(false)}>Batal</button><button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan'}</button></div>
            </form> : <p className={styles.costValue}>{money(monthlyExpense)}</p>}
          </section>
        </div>
      </div>

      <div className={styles.settings}>
        <section className={styles.card} aria-labelledby="profile-title">
          <div className={styles.sectionTop}><h2 id="profile-title">Profilmu</h2><span>Target cadangan</span></div>
          <div className={styles.profiles}>
            {profiles.map(item => <button type="button" key={item.type} disabled={isSaving} className={styles.profile} aria-pressed={profileType === item.type} onClick={() => { if (profileType !== item.type) void save(item.type); }}>
              <span><span className={styles.check} aria-hidden="true">{profileType === item.type && <Check size={10} />}</span>{item.label}</span><strong>{item.months} bulan</strong>
            </button>)}
          </div>
        </section>

        <section className={styles.card} aria-labelledby="wallet-title" aria-busy={isSaving}>
          <div className={styles.sectionTop}><h2 id="wallet-title">Dompet cadangan</h2><span>{selectedIds.length} dipilih</span></div>
          <div className={styles.accountList}>
            {accounts.map(account => <label className={styles.account} key={account.id}>
              <span className={styles.accountIcon}><Wallet size={17} /></span>
              <span className={styles.accountText}><strong>{account.name}</strong><small>{money(account.current_balance)}</small></span>
              <input type="checkbox" aria-label={account.name} checked={selectedIds.includes(account.id)} disabled={isSaving} onChange={() => { const nextIds = selectedIds.includes(account.id) ? selectedIds.filter(id => id !== account.id) : [...selectedIds, account.id]; void save(undefined, undefined, nextIds); }} />
            </label>)}
          </div>
          <p className={styles.hint}>{accounts.length === 0 ? <Link href="/accounts">Tambahkan dompet</Link> : 'Pilih dompet khusus, terpisah dari uang harian.'}</p>
        </section>
      </div>
    </div>
  );
}