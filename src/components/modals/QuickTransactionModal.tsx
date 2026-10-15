'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, LoaderCircle } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { errorMessage } from '@/lib/client-api';
import { Transaction, TransactionType } from '@/lib/types';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  editingTransaction?: Transaction | null;
}

function localDate(value = new Date()) {
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
}

export function QuickTransactionModal({ isOpen, ...props }: QuickTransactionModalProps) {
  if (!isOpen || typeof document === 'undefined') return null;
  return createPortal(<TransactionForm {...props} />, document.body);
}

function TransactionForm({ onClose, defaultType = 'expense', editingTransaction = null }: Omit<QuickTransactionModalProps, 'isOpen'>) {
  const { accounts, categories, addTransaction, updateTransaction, addCategory, profile, goalAccountIds } = useApp();
  const { showToast } = useModal();
  const activeAccounts = accounts.filter(account => !account.is_archived && !goalAccountIds.includes(account.id));
  const initialType = editingTransaction?.type || defaultType;
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(editingTransaction ? String(Number(editingTransaction.amount)) : '');
  const [accountId, setAccountId] = useState(editingTransaction?.account_id || activeAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(editingTransaction?.transfer_to_account_id || activeAccounts.find(account => account.id !== accountId)?.id || '');
  const [categoryId, setCategoryId] = useState(editingTransaction?.category_id || categories.find(category => category.type === initialType && !category.is_hidden)?.id || '');
  const [note, setNote] = useState(editingTransaction?.note || '');
  const [date, setDate] = useState(editingTransaction ? localDate(new Date(editingTransaction.date)) : localDate());
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const savingRef = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const availableCategories = categories.filter(category => category.type === type && !category.is_hidden);
  const destinationAccounts = activeAccounts.filter(account => account.id !== accountId);
  const selectedCategoryId = availableCategories.some(category => category.id === categoryId) ? categoryId : availableCategories[0]?.id || '';
  const selectedDestinationId = destinationAccounts.some(account => account.id === toAccountId) ? toAccountId : destinationAccounts[0]?.id || '';
  const validAmount = Number(amount) > 0 && Number.isSafeInteger(Number(amount));

  useEffect(() => {
    const scrollY = window.scrollY;
    const previousFocus = document.activeElement as HTMLElement | null;
    const body = document.body;
    const root = document.documentElement;
    const previousRoot = { overflow: root.style.overflow, height: root.style.height, overscrollBehavior: root.style.overscrollBehavior, scrollBehavior: root.style.scrollBehavior };
    Object.assign(root.style, { overflow: 'hidden', height: '100%', overscrollBehavior: 'none', scrollBehavior: 'auto' });
    root.setAttribute('data-transaction-open', '');
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow, height: body.style.height };
    Object.assign(body.style, { position: 'fixed', top: '-' + scrollY + 'px', width: '100%', height: '100%', overflow: 'hidden' });
    const background = [...document.querySelectorAll<HTMLElement>('.app-shell')].map(element => ({ element, inert: element.inert }));
    background.forEach(({ element }) => { element.inert = true; });
    const viewport = window.visualViewport;
    const resize = () => {
      overlayRef.current?.style.setProperty('--dialog-height', (viewport?.height || window.innerHeight) + 'px');
      overlayRef.current?.style.setProperty('--dialog-top', (viewport?.offsetTop || 0) + 'px');
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    headingRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingRef.current) closeRef.current();
      if (event.key !== 'Tab') return;
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]') || [])].filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    let touchX = 0, touchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchX = event.touches[0]?.clientX || 0;
      touchY = event.touches[0]?.clientY || 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const target = event.target instanceof Element ? event.target : null;
      const scroller = target?.closest<HTMLElement>('.transaction-form-body');
      const deltaY = event.touches[0].clientY - touchY;
      const deltaX = event.touches[0].clientX - touchX;
      touchX = event.touches[0].clientX;
      touchY = event.touches[0].clientY;
      const atTop = !scroller || scroller.scrollTop <= 0;
      const atBottom = !scroller || scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      if (!scroller || Math.abs(deltaX) > Math.abs(deltaY) || (deltaY > 0 && atTop) || (deltaY < 0 && atBottom)) event.preventDefault();
    };
    const keepPageLocked = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('scroll', keepPageLocked);
    return () => {
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      window.removeEventListener('resize', resize);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('scroll', keepPageLocked);
      root.removeAttribute('data-transaction-open');
      Object.assign(root.style, previousRoot);
      background.forEach(({ element, inert }) => { element.inert = inert; });
      Object.assign(body.style, previous);
      window.scrollTo(0, scrollY);
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  const changeType = (value: TransactionType) => {
    setType(value);
    setCreatingCategory(false);
    setError('');
  };

  const saveCategory = async () => {
    if (!newCategoryName.trim() || categorySaving) return;
    setCategorySaving(true);
    setError('');
    try {
      const category = await addCategory({ name: newCategoryName.trim(), icon: 'receipt', color: '#76834E', type: type === 'income' ? 'income' : 'expense', is_default: false });
      setCategoryId(category.id);
      setCreatingCategory(false);
      setNewCategoryName('');
    } catch {
      setError('Kategori belum tersimpan. Coba lagi.');
    } finally { setCategorySaving(false); }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current) return;
    if (!validAmount) { setError('Masukkan nominal lebih dari 0.'); return; }
    if (!accountId || !activeAccounts.some(account => account.id === accountId)) { setError('Pilih wallet untuk transaksi ini.'); return; }
    if (type === 'transfer' && (!selectedDestinationId || selectedDestinationId === accountId)) { setError('Pilih wallet tujuan yang berbeda.'); return; }
    if (type !== 'transfer' && !selectedCategoryId) { setError('Pilih atau buat kategori terlebih dahulu.'); return; }
    const now = new Date();
    const [year, month, day] = date.split('-').map(Number);
    const transactionDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    if (Number.isNaN(transactionDate.getTime())) { setError('Pilih tanggal transaksi yang valid.'); return; }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const transaction = { account_id: accountId, category_id: type === 'transfer' ? undefined : selectedCategoryId, type, amount: Number(amount), note: note.trim() || undefined, date: transactionDate.toISOString(), transfer_to_account_id: type === 'transfer' ? selectedDestinationId : undefined };
      if (editingTransaction) await updateTransaction(editingTransaction.id, transaction);
      else await addTransaction({ ...transaction, user_id: profile?.id });
      onClose();
      showToast({ message: editingTransaction ? 'Perubahan transaksi tersimpan.' : 'Transaksi tersimpan.', type: 'success' });
    } catch (error) {
      setError(errorMessage(error));
    } finally { savingRef.current = false; setSaving(false); }
  };

  return (
    <div ref={overlayRef} className="transaction-overlay">
      <div ref={dialogRef} className="transaction-dialog" role="dialog" aria-modal="true" aria-labelledby="transaction-title">
        <header className="transaction-dialog-header">
          <h2 id="transaction-title" ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">{editingTransaction ? 'Edit transaksi' : 'Catat transaksi'}</h2>
          <button type="button" aria-label="Tutup form transaksi" onClick={onClose} disabled={saving} className="transaction-close"><X className="w-5 h-5" /></button>
        </header>
        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="transaction-form-body">
            <fieldset disabled={saving} className="transaction-fields">
              <legend className="sr-only">Detail transaksi</legend>
              <div role="group" aria-label="Jenis transaksi" className="transaction-types">
                {([{ value: 'expense', label: 'Pengeluaran' }, { value: 'income', label: 'Pemasukan' }, { value: 'transfer', label: 'Transfer' }] as const).map(item => <button key={item.value} type="button" aria-pressed={type === item.value} onClick={() => changeType(item.value)}>{item.label}</button>)}
              </div>
              <div className="transaction-amount">
                <label htmlFor="transaction-amount" className="text-xs text-[var(--text-secondary)]">Nominal transaksi</label>
                <div className="flex items-center gap-3 mt-1">
                  <span aria-hidden="true" className="text-lg text-[var(--text-secondary)]">Rp</span>
                  <input id="transaction-amount" type="text" inputMode="numeric" pattern="[0-9.]*" enterKeyHint="next" autoComplete="off" spellCheck={false} placeholder="0" value={amount ? Number(amount).toLocaleString('id-ID') : ''} onChange={event => { setAmount(event.target.value.replace(/[^0-9]/g, '').slice(0, 15)); setError(''); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); document.getElementById('transaction-account')?.focus(); } }} className="transaction-amount-input" aria-describedby={error ? 'transaction-error' : undefined} required />
                </div>
              </div>
              <div className="transaction-field">
                <label htmlFor="transaction-account">{type === 'transfer' ? 'Dari wallet' : 'Wallet'}</label>
                <select id="transaction-account" value={accountId} onChange={event => setAccountId(event.target.value)} required>
                  {activeAccounts.length === 0 && <option value="">Belum ada wallet</option>}
                  {activeAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
                {activeAccounts.length === 0 && <Link href="/accounts" onClick={onClose} className="text-sm text-[var(--accent-primary)] underline">Buat wallet terlebih dahulu</Link>}
              </div>
              {type === 'transfer' ? <div className="transaction-field">
                <label htmlFor="transaction-destination">Ke wallet</label>
                <select id="transaction-destination" value={selectedDestinationId} onChange={event => setToAccountId(event.target.value)} required>
                  {destinationAccounts.length === 0 && <option value="">Perlu wallet lain untuk transfer</option>}
                  {destinationAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </div> : <div className="transaction-field">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="transaction-category">Kategori</label>
                  <button type="button" className="transaction-text-button" aria-expanded={creatingCategory} onClick={() => setCreatingCategory(value => !value)}>{creatingCategory ? 'Batal' : 'Kategori baru'}</button>
                </div>
                <select id="transaction-category" value={selectedCategoryId} onChange={event => setCategoryId(event.target.value)} required>
                  {availableCategories.length === 0 && <option value="">Pilih kategori</option>}
                  {availableCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                {creatingCategory && <div className="transaction-new-category">
                  <label htmlFor="transaction-new-category">Nama kategori baru</label>
                  <input id="transaction-new-category" value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} placeholder="Contoh: Makan siang" maxLength={80} enterKeyHint="done" />
                  <button type="button" onClick={saveCategory} disabled={!newCategoryName.trim() || categorySaving} className="transaction-secondary-button">{categorySaving ? 'Menyimpan…' : 'Simpan kategori'}</button>
                </div>}
              </div>}
              <div id="transaction-details" className="transaction-fields">
                <div className="transaction-field transaction-date-field"><label htmlFor="transaction-date">Tanggal</label><input id="transaction-date" type="date" value={date} onChange={event => setDate(event.target.value)} required /></div>
                <div className="transaction-field"><label htmlFor="transaction-note">Catatan <span className="text-[var(--text-muted)]">(opsional)</span></label><input id="transaction-note" type="text" value={note} onChange={event => setNote(event.target.value)} placeholder="Untuk apa transaksi ini?" enterKeyHint="done" maxLength={500} /></div>
              </div>
            </fieldset>
          </div>
          <footer className="transaction-dialog-footer">
            {error && <p id="transaction-error" role="alert" className="text-sm text-[var(--accent-danger)] mb-3">{error}</p>}
            <button type="submit" className="transaction-save" disabled={!validAmount || !accountId || saving || categorySaving || (type === 'transfer' ? !selectedDestinationId : !selectedCategoryId)}>{saving && <LoaderCircle className="w-4 h-4 animate-spin" />}{saving ? 'Menyimpan…' : editingTransaction ? 'Simpan perubahan' : 'Simpan transaksi'}</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
