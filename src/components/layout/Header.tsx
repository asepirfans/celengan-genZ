'use client';

import React, { useState, useEffect } from 'react';
import { ChickenLogo } from '@/components/ui/ChickenLogo';
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
  const [isDark, setIsDark] = useState(false);

  // Sync theme with html class on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('money_tracker_theme');
    if (savedTheme !== 'dark') {
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
      onConfirm: async () => {
        await logout();
        setShowUserMenu(false);
        showToast({ message: 'Berhasil keluar dari akun ', type: 'info' });
        router.push('/login');
      }
    });
  };

  return (
    <header className="app-header h-20 gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between">
      {/* Mobile Title / Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 md:hidden">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-[var(--on-accent)] font-black text-sm">
          <ChickenLogo className="w-5 h-5" strokeWidth={1.6} />
        </div>
        <span className="brand-name text-sm tracking-tight text-[var(--text-primary)]">
          <span className="hidden min-[380px]:inline">Celengan</span><span className="min-[380px]:hidden">C.</span><span className="text-[var(--accent-primary)]">GenZ</span>
        </span>
      </div>

      {/* Search Bar / Fast Finder shortcut */}
      <div className="hidden md:flex items-center flex-1 max-w-md">
        <Link
          href="/transactions"
          className="w-full flex items-center gap-2.5 px-3.5 py-2 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-all text-xs"
        >
          <Search className="w-4 h-4 text-[var(--text-muted)]" />
          <span>Cari transaksi, kategori, atau catatan...</span>
          <kbd className="ml-auto font-mono text-[10px] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            ⌘K
          </kbd>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 ml-auto shrink-0">
        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:text-[var(--accent-primary)] hover:border-[var(--border-subtle)] transition-all flex items-center justify-center"
          title={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--accent-warning)]" />
          ) : (
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--accent-primary)]" />
          )}
        </button>

        {/* Currency Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl text-xs font-mono font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-all"
          >
            <span>{profile?.currency || 'IDR'}</span>
            <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--text-secondary)]" />
          </button>

          {showCurrencyMenu && (
            <div className="header-popover absolute right-0 mt-2 w-52 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-secondary)]">
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
                    onClick={async () => {
                      try { await updateProfile({ currency: curr }); setShowCurrencyMenu(false); } catch(error) { showToast({message:error instanceof Error?error.message:'Mata uang belum tersimpan.',type:'danger'}); }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                      profile?.currency === curr ? 'bg-[var(--surface-elevated)] text-[var(--accent-primary)] font-bold' : 'text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="font-mono">{curr}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">
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
            className="relative p-1.5 sm:p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-all"
            title="Notifikasi & Alerts"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[var(--accent-danger)] rounded-full  " />
            )}
          </button>

          {showNotifications && (
            <div className="header-popover fixed right-4 top-[76px] md:absolute md:top-auto md:right-0 mt-2 w-72 sm:w-80 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
                  Notifikasi & Alerts ({alerts.length})
                </h4>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Tutup
                </button>
              </div>

              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                     Semua budget kamu masih dalam batas aman!
                  </div>
                ) : (
                  alerts.map((alt: any, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                        alt.type === 'danger'
                          ? 'bg-[var(--accent-danger)]/10 border-[var(--accent-danger)]/40 text-[var(--accent-danger)]'
                          : 'bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/40 text-[var(--accent-warning)]'
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
              className="flex items-center gap-1.5 p-1 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl hover:border-[var(--border-subtle)] transition-all"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[var(--surface-elevated)] flex items-center justify-center font-bold text-[11px] sm:text-xs text-[var(--accent-primary)] overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.substring(0, 2).toUpperCase() || 'US'
                )}
              </div>
              <ChevronDown className="w-3 h-3 text-[var(--text-secondary)] mr-1 hidden sm:block" />
            </button>
          ) : (
            <Link
              href="/login"
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold text-xs rounded-xl flex items-center gap-1 "
            >
              <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}

          {showUserMenu && isAuthenticated && (
            <div className="header-popover absolute right-0 mt-2 w-48 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3.5 py-2 border-b border-[var(--border-subtle)]">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">{profile?.currency} Account</p>
              </div>

              <Link
                href="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>Pengaturan Profil</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10 transition-colors text-left"
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
