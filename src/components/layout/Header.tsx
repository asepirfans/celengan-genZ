'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Search, 
  ChevronDown,
  LogOut,
  LogIn,
  User,
  Sun,
  Moon
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { CurrencyCode } from '@/lib/types';

interface HeaderProps {
  onSearchClick?: () => void;
}

export function Header({ onSearchClick }: HeaderProps) {
  const router = useRouter();
  const { profile, updateProfile, budgets, transactions, isAuthenticated, logout, exchangeRates } = useApp();
  const { confirmModal, showToast } = useModal();
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Sync theme with html class on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('money_tracker_theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, []);

  // Toggle Theme Mode
  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('money_tracker_theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('money_tracker_theme', 'dark');
      setIsDark(true);
    }
  };

  const currencies: CurrencyCode[] = ['IDR', 'USD', 'SGD', 'MYR'];

  // Smart Live Alerts: Real-Time Category Budget Warnings
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const alerts = budgets.map(b => {
    if (b.month !== currentMonth || b.year !== currentYear) return null;
    const spent = transactions
      .filter(t => {
        const td = new Date(t.date);
        return t.type === 'expense' && 
               t.category_id === b.category_id && 
               (td.getMonth() + 1) === currentMonth && 
               td.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const ratio = b.amount > 0 ? (spent / b.amount) : 0;
    if (ratio >= 1.0) {
      return { type: 'danger', message: `Budget kategori ${b.category?.name || 'terpilih'} telah melebihi 100%!`, ratio: Math.round(ratio * 100) };
    }
    if (ratio >= 0.8) {
      return { type: 'warning', message: `Budget kategori ${b.category?.name || 'terpilih'} mendekati limit (${Math.round(ratio * 100)}%)`, ratio: Math.round(ratio * 100) };
    }
    return null;
  }).filter(Boolean);

  const handleLogout = () => {
    confirmModal({
      title: 'Keluar dari Akun?',
      message: 'Kamu akan keluar dari sesi CelenganGenZ. Kamu bisa masuk kembali kapan saja.',
      confirmText: 'Ya, Logout',
      cancelText: 'Tetap di Sini',
      type: 'danger',
      onConfirm: () => {
        logout();
        setShowUserMenu(false);
        showToast({ message: 'Berhasil keluar dari akun 👋', type: 'info' });
        router.push('/login');
      }
    });
  };

  return (
    <header className="h-20 border-b border-[#222222] bg-[#121212]/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between">
      {/* Mobile Title / Breadcrumb */}
      <div className="flex items-center gap-3 md:hidden">
        <div className="w-8 h-8 rounded-lg bg-[#38BDF8] flex items-center justify-center text-black font-black text-sm">
          💸
        </div>
        <span className="font-display font-extrabold text-sm tracking-tight text-white">
          CELENGAN<span className="text-[#38BDF8]">.</span>GENZ
        </span>
      </div>

      {/* Search Bar / Fast Finder shortcut */}
      <div className="hidden md:flex items-center flex-1 max-w-md">
        <Link
          href="/transactions"
          className="w-full flex items-center gap-2.5 px-3.5 py-2 bg-[#171717] border border-[#262626] rounded-xl text-neutral-400 hover:text-neutral-200 hover:border-[#383838] transition-all text-xs"
        >
          <Search className="w-4 h-4 text-neutral-500" />
          <span>Cari transaksi, kategori, atau catatan...</span>
          <kbd className="ml-auto font-mono text-[10px] bg-[#222] px-1.5 py-0.5 rounded border border-[#333] text-neutral-400">
            ⌘K
          </kbd>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-xl bg-[#1C1C1C] border border-[#2E2E2E] text-neutral-300 hover:text-[#38BDF8] hover:border-[#444] transition-all flex items-center justify-center"
          title={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFD700]" />
          ) : (
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6366F1]" />
          )}
        </button>

        {/* Currency Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl text-xs font-mono font-bold text-white hover:border-[#38BDF8] transition-all"
          >
            <span>{profile?.currency || 'IDR'}</span>
            <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-400" />
          </button>

          {showCurrencyMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-[#181818] border border-[#2E2E2E] rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 border-b border-[#262626] text-[10px] font-mono text-neutral-400">
                Kurs Real-Time Pasar (Live)
              </div>
              {currencies.map(curr => {
                const rateVal = exchangeRates?.[curr] || 1;
                const liveIdrValue = curr === 'IDR' 
                  ? 'Base (Rp 1)' 
                  : `1 ${curr} ≈ Rp ${Math.round(1 / rateVal).toLocaleString('id-ID')}`;

                return (
                  <button
                    key={curr}
                    onClick={() => {
                      updateProfile({ currency: curr });
                      setShowCurrencyMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                      profile?.currency === curr ? 'bg-[#222] text-[#38BDF8] font-bold' : 'text-neutral-300 hover:bg-[#242424] hover:text-white'
                    }`}
                  >
                    <span className="font-mono">{curr}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {liveIdrValue}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications & Budget Alerts Drawer (Hidden on very small screens, integrated or compact) */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 sm:p-2 rounded-xl bg-[#1C1C1C] border border-[#2E2E2E] text-neutral-300 hover:text-white hover:border-[#444] transition-all"
            title="Notifikasi & Alerts"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#FF4E4E] rounded-full animate-pulse shadow-[0_0_8px_#FF4E4E]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#181818] border border-[#2E2E2E] rounded-2xl shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono">
                  Notifikasi & Alerts ({alerts.length})
                </h4>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-[10px] text-neutral-500 hover:text-white"
                >
                  Tutup
                </button>
              </div>

              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-neutral-500">
                    🎉 Semua budget kamu masih dalam batas aman!
                  </div>
                ) : (
                  alerts.map((alt: any, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                        alt.type === 'danger' 
                          ? 'bg-[#FF4E4E]/10 border-[#FF4E4E]/40 text-[#FF8E8E]' 
                          : 'bg-[#FFB800]/10 border-[#FFB800]/40 text-[#FFD580]'
                      }`}
                    >
                      {alt.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account / Profile Dropdown with Logout */}
        <div className="relative">
          {isAuthenticated ? (
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 p-1 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl hover:border-[#444] transition-all"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#2A2A2A] flex items-center justify-center font-bold text-[11px] sm:text-xs text-[#38BDF8] overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.substring(0, 2).toUpperCase() || 'US'
                )}
              </div>
              <ChevronDown className="w-3 h-3 text-neutral-400 mr-1 hidden sm:block" />
            </button>
          ) : (
            <Link
              href="/login"
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 bg-[#38BDF8] text-black font-bold text-xs rounded-xl flex items-center gap-1 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
            >
              <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}

          {showUserMenu && isAuthenticated && (
            <div className="absolute right-0 mt-2 w-48 bg-[#181818] border border-[#2E2E2E] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3.5 py-2 border-b border-[#262626]">
                <p className="text-xs font-bold text-white truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-neutral-500 font-mono truncate">{profile?.currency} Account</p>
              </div>

              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-300 hover:bg-[#242424] hover:text-white transition-colors"
              >
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <span>Pengaturan Profil</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#FF6B6B] hover:bg-[#FF4E4E]/10 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar (Logout)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
