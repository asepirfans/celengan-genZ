'use client';
import { useEffect, useRef, useState } from 'react';
import { apiRequest, errorMessage, newRequestId } from '@/lib/client-api';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { SplitBill } from '@/lib/types';
interface Draft {
    title: string;
    subtotal: number;
    tax_percent: number;
    service_percent: number;
    split_mode: 'equal' | 'custom';
    payment_account: string;
    participants: {
        name: string;
        subtotal: number;
    }[];
}
export function SplitBillHistory({ draft }: {
    draft: Draft;
}) {
    const { profile, exchangeRates } = useApp(), { showToast, confirmModal } = useModal();
    const [bills, setBills] = useState<SplitBill[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const saving = useRef(false), request = useRef({ signature: '', id: '' });
    const load = async () => { setLoading(true); try {
        setBills(await apiRequest<SplitBill[]>('/api/split-bills'));
        setError('');
    }
    catch (error) {
        setError(errorMessage(error));
    }
    finally {
        setLoading(false);
    } };
    useEffect(() => { if (!profile?.id)
        return; let cancelled = false; apiRequest<SplitBill[]>('/api/split-bills').then(data => { if (!cancelled) {
        setBills(data);
        setError('');
    } }).catch(error => { if (!cancelled)
        setError(errorMessage(error)); }).finally(() => { if (!cancelled)
        setLoading(false); }); return () => { cancelled = true; }; }, [profile?.id]);
    const save = async () => {
        if (saving.current)
            return;
        saving.current = true;
        setBusy(true);
        const signature = JSON.stringify(draft);
        if (request.current.signature !== signature)
            request.current = { signature, id: newRequestId() };
        try {
            const saved = await apiRequest<SplitBill>('/api/split-bills', 'POST', { ...draft, request_id: request.current.id });
            setBills(prev => [saved, ...prev.filter(b => b.id !== saved.id)]);
            showToast({ message: 'Tagihan tersimpan dalam riwayat.', type: 'success' });
        }
        catch (error) {
            showToast({ message: errorMessage(error), type: 'danger' });
        }
        finally {
            saving.current = false;
            setBusy(false);
        }
    };
    const markPaid = async (bill: SplitBill, participantId: string, paid: boolean) => { if (busy)
        return; setBusy(true); try {
        const saved = await apiRequest<SplitBill>('/api/split-bills', 'PATCH', { id: bill.id, participant_id: participantId, paid });
        setBills(prev => prev.map(b => b.id === saved.id ? saved : b));
    }
    catch (error) {
        showToast({ message: errorMessage(error), type: 'danger' });
    }
    finally {
        setBusy(false);
    } };
    const money = (amount: number) => formatCurrency(amount, profile?.currency || 'IDR', false, exchangeRates);
    return <section className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Riwayat</h2><button type="button" onClick={save} disabled={busy || draft.subtotal <= 0} className="px-4 py-3 rounded-xl bg-[var(--accent-primary)] text-[var(--on-accent)] text-sm disabled:opacity-50">{busy ? 'Menyimpan…' : 'Simpan tagihan'}</button></div>
  <p className="text-xs text-[var(--text-secondary)]">Status lunas tidak mengubah saldo dompet.</p>
  {error && <div role="alert" className="text-sm text-[var(--accent-danger)]">{error} <button onClick={load} className="underline">Coba lagi</button></div>}
  {loading ? <p className="text-sm text-[var(--text-muted)]">Memuat riwayat…</p> : bills.length === 0 ? <p className="text-sm text-[var(--text-muted)]">Belum ada tagihan tersimpan.</p> : bills.map(bill => {
            const settled = bill.participants.every(person => person.paid), paid = bill.participants.filter(person => person.paid).reduce((sum, person) => sum + Number(person.amount), 0);
            return <article key={bill.id} className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] space-y-3">
    <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold break-words">{bill.title}</h3><p className="text-xs text-[var(--text-muted)]">{formatDate(bill.created_at, 'short')} · {settled ? 'Lunas' : 'Belum lunas'}</p></div><p className="font-semibold">{money(Number(bill.total))}</p></div>
    <p className="text-xs text-[var(--text-secondary)]">Diterima {money(paid)} · Sisa {money(Number(bill.total) - paid)}</p>
    <div className="divide-y divide-[var(--border-subtle)]">{bill.participants.map(person => <label key={person.id} className="flex items-center gap-3 py-3 min-w-0"><input type="checkbox" checked={person.paid} disabled={busy} onChange={event => markPaid(bill, person.id, event.target.checked)} aria-label={'Sudah dibayar oleh ' + person.name} className="w-5 h-5 shrink-0 accent-[var(--accent-primary)]"/><span className="flex-1 min-w-0 break-words text-sm">{person.name}</span><span className="text-sm shrink-0">{money(Number(person.amount))}</span></label>)}</div>
    <button type="button" className="text-xs text-[var(--accent-danger)] underline" onClick={() => confirmModal({ title: 'Hapus riwayat tagihan?', message: 'Riwayat dan status pembayaran tagihan ini akan dihapus.', type: 'danger', onConfirm: async () => { await apiRequest('/api/split-bills?id=' + bill.id, 'DELETE'); setBills(prev => prev.filter(b => b.id !== bill.id)); } })}>Hapus riwayat</button>
   </article>;
        })}
 </section>;
}
