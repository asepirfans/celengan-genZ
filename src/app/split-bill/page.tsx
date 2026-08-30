'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { formatCurrency } from '@/lib/formatters';
import {
  Users,
  Plus,
  Trash2,
  Receipt,
  Share2,
  Copy,
  Check,
  Percent,
  DollarSign,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Friend {
  id: string;
  name: string;
  amount: number;
}

export default function SplitBillPage() {
  const { profile, accounts, exchangeRates } = useApp();
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
  const taxMultiplier = includeTax ? (1 + (parseFloat(taxPercent) || 0) / 100 + (parseFloat(servicePercent) || 0) / 100) : 1;
  const grandTotal = Math.round(rawSubtotal * taxMultiplier);

  // Equal Split per Person
  const equalAmountPerPerson = friends.length > 0 ? Math.round(grandTotal / friends.length) : 0;

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
    let msg = `🧾 *TAGIHAN SPLIT BILL: ${billTitle.toUpperCase()}*\n`;
    msg += `Total Tagihan: *${formatCurrency(grandTotal, currency, false, exchangeRates)}*\n`;
    if (includeTax) {
      msg += `_(Termasuk Tax ${taxPercent}% & Service ${servicePercent}%)_\n`;
    }
    msg += `------------------------------------\n`;

    if (splitMode === 'equal') {
      msg += `Bagi Rata (${friends.length} orang):\n`;
      friends.forEach((f, idx) => {
        msg += `${idx + 1}. ${f.name}: *${formatCurrency(equalAmountPerPerson, currency, false, exchangeRates)}*\n`;
      });
    } else {
      msg += `Rincian Tagihan Per Orang:\n`;
      friends.forEach((f, idx) => {
        const itemWithTax = Math.round(f.amount * taxMultiplier);
        msg += `${idx + 1}. ${f.name}: *${formatCurrency(itemWithTax, currency, false, exchangeRates)}*\n`;
      });
    }

    msg += `------------------------------------\n`;
    msg += `💳 *Transfer Pembayaran ke:*\n${computedPaymentAccount}\n\n_Dibuat otomatis via CelenganGenZ_ 💸`;
    return msg;
  };

  const handleDirectWhatsApp = () => {
    const text = generateWAMessage();
    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 }
    });
    showToast({ message: 'Membuka WhatsApp & menyalin pesan... 📲', type: 'success' });
  };

  const handleCopyOnly = () => {
    const text = generateWAMessage();
    navigator.clipboard.writeText(text);
    showToast({ message: 'Rincian Split Bill berhasil disalin ke clipboard! 📋', type: 'success' });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header Title */}
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Split Bill Patungan Nongkrong
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Bagi tagihan makan / nongkrong bareng teman tanpa ribet, lengkap dengan pajak & direct share ke WhatsApp.
          </p>
        </div>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input Bill & Tax */}
          <div className="p-6 rounded-3xl bg-[#161616] border border-[#262626] space-y-5 lg:col-span-2">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400 font-medium">Judul Acara / Tempat Nongkrong</label>
              <input
                type="text"
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                placeholder="Contoh: Kopi Kenangan, Dinner Ulang Tahun"
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-[#38BDF8]"
              />
            </div>

            {/* Total Bill Input */}
            <div className="p-4 bg-[#0D0D0D] border border-[#2A2A2A] rounded-2xl space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">Subtotal Tagihan</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-mono text-[#38BDF8]">Rp</span>
                <input
                  type="text"
                  placeholder="0"
                  value={totalBill}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setTotalBill(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                  }}
                  className="bg-transparent text-3xl font-mono font-black text-white outline-none w-full"
                />
              </div>
            </div>

            {/* Tax & Service Toggle */}
            <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Hitung Pajak & Service Resto</span>
                <input
                  type="checkbox"
                  checked={includeTax}
                  onChange={(e) => setIncludeTax(e.target.checked)}
                  className="w-4 h-4 accent-[#38BDF8] rounded cursor-pointer"
                />
              </div>

              {includeTax && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-400">PPN / Tax Resto (%)</label>
                    <input
                      type="number"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-400">Service Charge (%)</label>
                    <input
                      type="number"
                      value={servicePercent}
                      onChange={(e) => setServicePercent(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Rekening / E-Wallet Tujuan Transfer Builder */}
            <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Metode Pembayaran Transfer</span>

                {/* Type Tab Selector: Bank | E-Wallet */}
                <div className="flex items-center bg-[#0D0D0D] p-0.5 rounded-xl border border-[#262626] text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('bank');
                      setBankOrWalletName('BCA');
                    }}
                    className={`px-3 py-1 rounded-lg transition-all ${paymentType === 'bank' ? 'bg-[#38BDF8] text-black font-bold' : 'text-neutral-400 hover:text-white'}`}
                  >
                    🏦 Rekening Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('ewallet');
                      setBankOrWalletName('GoPay');
                    }}
                    className={`px-3 py-1 rounded-lg transition-all ${paymentType === 'ewallet' ? 'bg-[#38BDF8] text-black font-bold' : 'text-neutral-400 hover:text-white'}`}
                  >
                    📱 E-Wallet
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Select Bank or E-Wallet Provider */}
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase font-mono">
                    {paymentType === 'bank' ? 'Pilihan Bank' : 'Pilihan E-Wallet'}
                  </label>
                  <select
                    value={bankOrWalletName}
                    onChange={(e) => setBankOrWalletName(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#38BDF8]"
                  >
                    {paymentType === 'bank' ? (
                      <>
                        <option value="BCA">BCA (Bank Central Asia)</option>
                        <option value="Bank Mandiri">Bank Mandiri</option>
                        <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                        <option value="BNI">BNI (Bank Negara Indonesia)</option>
                        <option value="Bank Jago">Bank Jago</option>
                        <option value="SeaBank">SeaBank</option>
                        <option value="BSI">BSI (Syariah)</option>
                        <option value="CIMB Niaga">CIMB Niaga</option>
                      </>
                    ) : (
                      <>
                        <option value="GoPay">GoPay</option>
                        <option value="OVO">OVO</option>
                        <option value="ShopeePay">ShopeePay</option>
                        <option value="DANA">DANA</option>
                        <option value="LinkAja">LinkAja</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Account Number / Phone Number */}
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase font-mono">
                    {paymentType === 'bank' ? 'Nomor Rekening' : 'Nomor HP E-Wallet'}
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder={paymentType === 'bank' ? 'Contoh: 1234567890' : 'Contoh: 08123456789'}
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#38BDF8]"
                  />
                </div>

                {/* Account Owner Name */}
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase font-mono">Atas Nama (A/N)</label>
                  <input
                    type="text"
                    value={accountOwner}
                    onChange={(e) => setAccountOwner(e.target.value)}
                    placeholder="Contoh: Pratama"
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#38BDF8]"
                  />
                </div>
              </div>

              {/* Live Preview Badge */}
              <div className="p-2.5 rounded-xl bg-[#0D141C] border border-[#233547] flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-400">Preview Teks di WhatsApp:</span>
                <span className="font-mono font-bold text-[#38BDF8] text-[11px] truncate max-w-xs">
                  {computedPaymentAccount}
                </span>
              </div>
            </div>

            {/* Friends Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Daftar Teman Patungan ({friends.length} Orang)</h3>

                {/* Mode Selector */}
                <div className="flex items-center bg-[#0D0D0D] p-1 rounded-xl border border-[#262626]">
                  <button
                    type="button"
                    onClick={() => setSplitMode('equal')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${splitMode === 'equal' ? 'bg-[#38BDF8] text-black' : 'text-neutral-400'}`}
                  >
                    Bagi Rata
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('custom')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${splitMode === 'custom' ? 'bg-[#38BDF8] text-black' : 'text-neutral-400'}`}
                  >
                    Custom Pesanan
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {friends.map((f, idx) => (
                  <div key={f.id} className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-xs font-bold text-[#38BDF8]">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-bold text-white">{f.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {splitMode === 'equal' ? (
                        <span className="font-mono font-bold text-xs text-[#3EFF9A]">
                          {formatCurrency(equalAmountPerPerson, currency, false, exchangeRates)}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-2 py-1">
                          <span className="text-[10px] text-neutral-400 font-mono">Rp</span>
                          <input
                            type="text"
                            placeholder="0"
                            value={f.amount ? f.amount.toLocaleString('id-ID') : ''}
                            onChange={(e) => handleCustomAmountChange(f.id, e.target.value)}
                            className="bg-transparent font-mono text-xs text-white outline-none w-24 text-right font-bold"
                          />
                        </div>
                      )}

                      {friends.length > 1 && (
                        <button
                          onClick={() => handleRemoveFriend(f.id)}
                          className="text-neutral-500 hover:text-[#FF4E4E] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Friend Input */}
              <form onSubmit={handleAddFriend} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="+ Tambah nama teman..."
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  className="flex-1 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#38BDF8]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#222] hover:bg-[#2A2A2A] text-white border border-[#333] rounded-xl text-xs font-semibold"
                >
                  Tambah
                </button>
              </form>
            </div>
          </div>

          {/* Right: Live Summary Receipt Preview */}
          <div className="p-6 rounded-3xl bg-[#111822] border border-[#38BDF8]/30 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-[#233547]">
                <Receipt className="w-5 h-5 text-[#38BDF8]" />
                <h3 className="font-bold text-sm text-white">Ringkasan Tagihan Akhir</h3>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal:</span>
                  <span className="text-white">{formatCurrency(rawSubtotal, currency, false, exchangeRates)}</span>
                </div>
                {includeTax && (
                  <>
                    <div className="flex justify-between text-neutral-400">
                      <span>Pajak Resto ({taxPercent}%):</span>
                      <span className="text-white">{formatCurrency(Math.round(rawSubtotal * ((parseFloat(taxPercent) || 0) / 100)), currency, false, exchangeRates)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Service Charge ({servicePercent}%):</span>
                      <span className="text-white">{formatCurrency(Math.round(rawSubtotal * ((parseFloat(servicePercent) || 0) / 100)), currency, false, exchangeRates)}</span>
                    </div>
                  </>
                )}
                <div className="pt-2 border-t border-[#233547] flex justify-between items-baseline">
                  <span className="font-bold text-white">Grand Total:</span>
                  <span className="text-xl font-extrabold text-[#38BDF8]">
                    {formatCurrency(grandTotal, currency, false, exchangeRates)}
                  </span>
                </div>
              </div>

              {/* Per Person Box */}
              <div className="p-4 rounded-2xl bg-[#0D141C] border border-[#233547] text-center space-y-1">
                <span className="text-[10px] text-neutral-400 font-mono uppercase">
                  {splitMode === 'equal' ? 'Rata-rata Per Orang' : 'Tagihan Terbagi'}
                </span>
                <p className="text-2xl font-extrabold font-mono text-[#3EFF9A]">
                  {splitMode === 'equal'
                    ? formatCurrency(equalAmountPerPerson, currency, false, exchangeRates)
                    : `${friends.length} Orang`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyOnly}
                className="flex-1 py-3 bg-[#1C1C1C] hover:bg-[#252525] border border-[#2E2E2E] text-white font-semibold rounded-2xl transition-all text-xs flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>Salin Teks</span>
              </button>

              <button
                onClick={handleDirectWhatsApp}
                className="flex-2 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-black font-bold font-display rounded-2xl transition-all shadow-[0_0_15px_rgba(37,211,102,0.3)] text-xs flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Buka WhatsApp 💬</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
