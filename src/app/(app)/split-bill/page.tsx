'use client';

import React, { useState } from 'react';

import { useApp } from '@/lib/store';
import { SplitBillHistory } from '@/components/split-bill/SplitBillHistory';
import { splitAmounts,splitTotal } from '@/lib/split-math';
import { useModal } from '@/components/ui/CustomModal';
import { formatCurrency } from '@/lib/formatters';
import styles from './split-bill.module.css';
import {
  Users,
  Plus,
  Trash2,
  Receipt,
  Share2,
  Copy,
  Landmark,
  ChevronDown
} from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  amount: number;
}

export default function SplitBillPage() {
  const { profile, exchangeRates } = useApp();
  const { showToast } = useModal();
  const currency = profile?.currency || 'IDR';

  // Bill Details
  const [billTitle, setBillTitle] = useState('Nongkrong Bareng Tim');
  const [totalBill, setTotalBill] = useState('');
  const [taxPercent, setTaxPercent] = useState('10');
  const [servicePercent, setServicePercent] = useState('5');
  const [includeTax, setIncludeTax] = useState(true);

  // Payment Method Builder (Bank vs E-Wallet)
  const [paymentType, setPaymentType] = useState<'bank' | 'ewallet'>('bank');
  const [bankOrWalletName, setBankOrWalletName] = useState('BCA');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountOwner, setAccountOwner] = useState(profile?.full_name || '');

  // Computed paymentAccount string
  const computedPaymentAccount = `${bankOrWalletName}: ${accountNumber ? accountNumber : '(Nomor Rekening/HP)'} (A/N ${accountOwner || profile?.full_name || 'Saya'})`;

  // Friends List
  const [friends, setFriends] = useState<Friend[]>([
    { id: '1', name: 'Saya (Host)', amount: 0 },
    { id: '2', name: 'Alex', amount: 0 },
    { id: '3', name: 'Rian', amount: 0 },
  ]);

  const [newFriendName, setNewFriendName] = useState('');

  // Mode Split: 'equal' (Bagi Rata) | 'custom' (Sesuai Pesanan)
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');

  // Calculations
  const rawSubtotal = parseFloat(totalBill.replace(/[^0-9]/g, '')) || 0;
  const grandTotal = splitTotal(rawSubtotal,includeTax?Number(taxPercent)||0:0,includeTax?Number(servicePercent)||0:0);

  // Equal Split per Person
  const shares=rawSubtotal>0&&friends.length>0?splitAmounts(rawSubtotal,grandTotal,friends.map(f=>({name:f.name,subtotal:f.amount})),splitMode):friends.map(()=>0);
  const equalAmountPerPerson=shares[0]||0;
  const shareRange=Math.min(...shares)===Math.max(...shares)?formatCurrency(equalAmountPerPerson,currency,false,exchangeRates):formatCurrency(Math.min(...shares),currency,false,exchangeRates)+' – '+formatCurrency(Math.max(...shares),currency,false,exchangeRates);

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    setFriends(prev => [
      ...prev,
      { id: Date.now().toString(), name: newFriendName.trim(), amount: 0 }
    ]);
    setNewFriendName('');
  };

  const handleRemoveFriend = (id: string) => {
    if (friends.length <= 1) {
      showToast({ message: 'Minimal harus ada 1 orang!', type: 'danger' });
      return;
    }
    setFriends(prev => prev.filter(f => f.id !== id));
  };

  const handleCustomAmountChange = (id: string, val: string) => {
    const num = parseFloat(val.replace(/[^0-9]/g, '')) || 0;
    setFriends(prev => prev.map(f => f.id === id ? { ...f, amount: num } : f));
  };

  // Generate WhatsApp Share Message
  const generateWAMessage = () => {
    let msg = ` *TAGIHAN SPLIT BILL: ${billTitle.toUpperCase()}*\n`;
    msg += `Total Tagihan: *${formatCurrency(grandTotal, currency, false, exchangeRates)}*\n`;
    if (includeTax) {
      msg += `_(Termasuk Tax ${taxPercent}% & Service ${servicePercent}%)_\n`;
    }
    msg += `------------------------------------\n`;

    if (splitMode === 'equal') {
      msg += `Bagi Rata (${friends.length} orang):\n`;
      friends.forEach((f, idx) => {
        msg += `${idx + 1}. ${f.name}: *${formatCurrency(shares[idx], currency, false, exchangeRates)}*\n`;
      });
    } else {
      msg += `Rincian Tagihan Per Orang:\n`;
      friends.forEach((f, idx) => {
        const itemWithTax = shares[idx];
        msg += `${idx + 1}. ${f.name}: *${formatCurrency(itemWithTax, currency, false, exchangeRates)}*\n`;
      });
    }

    msg += `------------------------------------\n`;
    msg += ` *Transfer Pembayaran ke:*\n${computedPaymentAccount}\n\n_Dibuat otomatis via CelenganGenZ_ `;
    return msg;
  };

  const handleDirectWhatsApp = () => {
    const text = generateWAMessage();
    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
    showToast({ message: 'Membuka WhatsApp...', type: 'info' });
  };

  const handleCopyOnly = async () => {
    const text = generateWAMessage();
    try {
      await navigator.clipboard.writeText(text);
      showToast({ message: 'Rincian disalin.', type: 'success' });
    } catch {
      showToast({ message: 'Gagal menyalin. Coba bagikan lewat WhatsApp.', type: 'danger' });
    }
  };

  const customRemainder = rawSubtotal - friends.reduce((sum, friend) => sum + friend.amount, 0);
  const money = (amount: number) => formatCurrency(amount, currency, false, exchangeRates);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerIcon}><Users size={22} /></span>
        <div><h1>Split bill</h1><p>Bagi tagihan, beres bareng.</p></div>
      </header>

      <div className={styles.layout}>
        <div className={styles.form}>
          <section className={styles.bill} aria-label="Detail tagihan">
            <label className={styles.field} htmlFor="bill-title">Nama patungan
              <input id="bill-title" className={styles.input} value={billTitle} onChange={e => setBillTitle(e.target.value)} placeholder="Makan bareng" />
            </label>
            <div className={styles.amount}>
              <div className={styles.amountTop}><label htmlFor="bill-amount">Subtotal</label><span>{friends.length} orang</span></div>
              <div className={styles.amountInput}><span>Rp</span><input id="bill-amount" type="text" inputMode="numeric" enterKeyHint="done" placeholder="0" value={totalBill} onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setTotalBill(raw ? parseInt(raw, 10).toLocaleString('id-ID') : ''); }} /></div>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="people-title">
            <div className={styles.sectionTop}>
              <h2 id="people-title">Peserta</h2>
              <div className={styles.tabs} aria-label="Cara membagi tagihan">
                <button type="button" aria-pressed={splitMode === 'equal'} onClick={() => setSplitMode('equal')}>Bagi rata</button>
                <button type="button" aria-pressed={splitMode === 'custom'} onClick={() => setSplitMode('custom')}>Per pesanan</button>
              </div>
            </div>
            <div>{friends.map((friend, index) => (
              <div key={friend.id} className={styles.person}>
                <span className={styles.avatar} aria-hidden="true">{friend.name.slice(0, 1).toUpperCase()}</span>
                <span className={styles.personName}>{friend.name}</span>
                {splitMode === 'equal' ? <span className={styles.personAmount}>{money(shares[index])}</span> : (
                  <div className={styles.customAmount}><span>Rp</span><input aria-label={'Pesanan ' + friend.name} inputMode="numeric" enterKeyHint="done" placeholder="0" value={friend.amount ? friend.amount.toLocaleString('id-ID') : ''} onChange={e => handleCustomAmountChange(friend.id, e.target.value)} /></div>
                )}
                {friends.length > 1 && <button type="button" aria-label={'Hapus ' + friend.name} className={styles.remove} onClick={() => handleRemoveFriend(friend.id)}><Trash2 size={15} /></button>}
              </div>
            ))}</div>
            <form onSubmit={handleAddFriend} className={styles.addPerson}>
              <input className={styles.input} aria-label="Nama peserta baru" placeholder="Nama teman" value={newFriendName} onChange={e => setNewFriendName(e.target.value)} />
              <button type="submit" aria-label="Tambah peserta"><Plus size={19} /></button>
            </form>
            {splitMode === 'custom' && customRemainder !== 0 && <p className={styles.notice} role="status">{customRemainder > 0 ? 'Belum dibagi' : 'Melebihi subtotal'}: {money(Math.abs(customRemainder))}</p>}
          </section>

          <section className={styles.card} aria-label="Biaya tambahan">
            <label className={styles.taxToggle} htmlFor="include-tax">Pajak & layanan<input id="include-tax" type="checkbox" checked={includeTax} onChange={e => setIncludeTax(e.target.checked)} /></label>
            {includeTax && <div className={styles.twoFields}>
              <label className={styles.field} htmlFor="tax-percent">Pajak (%)<input id="tax-percent" className={styles.input} type="number" inputMode="decimal" min="0" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} /></label>
              <label className={styles.field} htmlFor="service-percent">Layanan (%)<input id="service-percent" className={styles.input} type="number" inputMode="decimal" min="0" value={servicePercent} onChange={e => setServicePercent(e.target.value)} /></label>
            </div>}
          </section>

          <details className={styles.card + ' ' + styles.payment}>
            <summary><Landmark size={17} /><span>Tujuan transfer</span><small>Opsional</small><ChevronDown size={16} /></summary>
            <div className={styles.paymentBody}>
              <div className={styles.tabs} aria-label="Jenis tujuan transfer">
                <button type="button" aria-pressed={paymentType === 'bank'} onClick={() => { setPaymentType('bank'); setBankOrWalletName('BCA'); }}>Bank</button>
                <button type="button" aria-pressed={paymentType === 'ewallet'} onClick={() => { setPaymentType('ewallet'); setBankOrWalletName('GoPay'); }}>E-wallet</button>
              </div>
              <label className={styles.field} htmlFor="payment-provider">{paymentType === 'bank' ? 'Bank' : 'E-wallet'}
                <select id="payment-provider" className={styles.input} value={bankOrWalletName} onChange={e => setBankOrWalletName(e.target.value)}>
                  {(paymentType === 'bank' ? ['BCA', 'Bank Mandiri', 'BRI', 'BNI', 'Bank Jago', 'SeaBank', 'BSI', 'CIMB Niaga'] : ['GoPay', 'OVO', 'ShopeePay', 'DANA', 'LinkAja']).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <label className={styles.field} htmlFor="payment-number">{paymentType === 'bank' ? 'Nomor rekening' : 'Nomor HP'}<input id="payment-number" className={styles.input} inputMode="numeric" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder={paymentType === 'bank' ? '1234567890' : '08xxxxxxxxxx'} /></label>
              <label className={styles.field} htmlFor="payment-owner">Atas nama<input id="payment-owner" className={styles.input} value={accountOwner} onChange={e => setAccountOwner(e.target.value)} placeholder="Nama pemilik" /></label>
            </div>
          </details>
        </div>

        <aside className={styles.card + ' ' + styles.summary} aria-labelledby="summary-title">
          <div className={styles.summaryTitle}><Receipt size={17} /><h2 id="summary-title">Ringkasan</h2></div>
          <dl className={styles.totals}>
            <div><dt>Subtotal</dt><dd>{money(rawSubtotal)}</dd></div>
            {includeTax && <>
              <div><dt>Pajak {taxPercent || 0}%</dt><dd>{money(Math.round(rawSubtotal * ((parseFloat(taxPercent) || 0) / 100)))}</dd></div>
              <div><dt>Layanan {servicePercent || 0}%</dt><dd>{money(Math.round(rawSubtotal * ((parseFloat(servicePercent) || 0) / 100)))}</dd></div>
            </>}
            <div className={styles.grandTotal}><dt>Total</dt><dd>{money(grandTotal)}</dd></div>
          </dl>
          <div className={styles.perPerson}><span>{splitMode === 'equal' ? 'Per orang' : 'Dibagi ke'}</span><p>{splitMode === 'equal' ? shareRange : `${friends.length} orang`}</p></div>
          <div className={styles.actions}>
            <button type="button" aria-label="Salin rincian" title="Salin rincian" onClick={handleCopyOnly}><Copy size={17} /></button>
            <button type="button" onClick={handleDirectWhatsApp}><Share2 size={17} />Bagikan tagihan</button>
          </div>
        </aside>
      </div>
      <SplitBillHistory draft={{title:billTitle,subtotal:rawSubtotal,tax_percent:includeTax?Number(taxPercent)||0:0,service_percent:includeTax?Number(servicePercent)||0:0,split_mode:splitMode,payment_account:computedPaymentAccount,participants:friends.map(f=>({name:f.name,subtotal:f.amount}))}} />
    </div>
  );
}
