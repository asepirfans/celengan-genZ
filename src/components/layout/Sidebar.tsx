'use client';

import React from 'react';
import { ChickenLogo } from '@/components/ui/ChickenLogo';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  ChartPie,
  WalletCards,
  BarChart3,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  ShieldCheck,
  Target,
  Users
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { NavigationPending } from './NavigationPending';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenNewTransaction: () => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed, onOpenNewTransaction }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, summary, isAuthenticated, logout, exchangeRates } = useApp();
  const { confirmModal, showToast } = useModal();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Transaksi', href: '/transactions', icon: Receipt },
    { label: 'Celengan Impian', href: '/goals', icon: Target },
    { label: 'Split Bill', href: '/split-bill', icon: Users },
    { label: 'Budget', href: '/budget', icon: ChartPie },
    { label: 'Dana Darurat', href: '/emergency-fund', icon: ShieldCheck },
    { label: 'Akun & Wallet', href: '/accounts', icon: WalletCards },
    { label: 'Laporan', href: '/reports', icon: BarChart3 },
    { label: 'Pengaturan', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    confirmModal({
      title: 'Keluar dari Akun?',
      message: 'Kamu akan keluar dari akun CelenganGenZ. Data keuanganmu tetap tersimpan aman.',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: async () => {
        await logout();
        showToast({ message: 'Sampai jumpa lagi! ', type: 'info' });
        router.push('/login');
      }
    });
  };

  return (
    <aside
      className={cn(
        "app-sidebar hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-30 bg-[var(--surface-card)] border-r border-[var(--border-subtle)] transition-all duration-300 select-none",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-[var(--border-subtle)]">
        {!isCollapsed ? (
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-[var(--on-accent)] font-semibold text-xl ">
              <ChickenLogo className="w-6 h-6" strokeWidth={1.6} />
            </div>
            <div>
              <span className="brand-name text-lg tracking-tight text-[var(--text-primary)] block">
                Celengan<span className="text-[var(--accent-primary)]">GenZ</span>
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-[var(--on-accent)] font-black text-xl ">
              <ChickenLogo className="w-6 h-6" strokeWidth={1.6} />
            </div>
          </Link>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors",
            isCollapsed && "mx-auto mt-2"
          )}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick Add Action Button */}
      <div className="p-4">
        <button
          onClick={onOpenNewTransaction}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold font-display rounded-xl hover:bg-[var(--accent-hover)] transition-all  active:scale-[0.98]",
            isCollapsed && "p-3 rounded-xl"
          )}
          title="Tambah Transaksi Baru"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          {!isCollapsed && <span>Tambah Transaksi</span>}
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto pt-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all group relative",
                isActive
                  ? "bg-[var(--nav-active-bg)] text-[var(--accent-primary)] border border-transparent"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)]"
              )}
            >
              <NavigationPending />
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-[var(--accent-primary)] rounded-r-full " />
              )}
              <Icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
              )} />
              {!isCollapsed && (
                <span className={cn(isActive && "font-semibold text-[var(--text-primary)]")}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Live Spendable Balance Widget on Desktop */}
      {!isCollapsed && (
        <div className="p-4 mx-3 mb-3 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">

              Saldo Siap Pakai
            </span>
            <span className="text-[var(--accent-success)] font-mono text-[10px] font-bold">Tersedia</span>
          </div>
          <p className="text-base font-bold font-mono text-[var(--text-primary)] tracking-tight">
            {formatCurrency(summary.spendableBalance, profile?.currency || 'IDR', false, exchangeRates)}
          </p>
          {summary.emergencyBalance > 0 && (
            <p className="text-[10px] text-[var(--text-muted)] font-mono">
              Dana darurat: {formatCurrency(summary.emergencyBalance, profile?.currency || 'IDR', false, exchangeRates)}
            </p>
          )}
        </div>
      )}

      {/* User Profile & Auth Footer */}
      <div className="p-3 border-t border-[var(--border-subtle)]">
        {isAuthenticated ? (
          <div className="space-y-1">
            <div
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] group",
                isCollapsed && "justify-center p-1"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-[var(--surface-card)]   border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden font-bold text-xs text-[var(--accent-primary)] shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.substring(0, 2).toUpperCase() || 'US'
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {profile?.full_name || 'Pengguna'}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                    {profile?.currency || 'IDR'} Account
                  </p>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10 hover:border-[var(--accent-danger)]/30 border border-transparent rounded-xl transition-all",
                isCollapsed ? "justify-center px-0" : ""
              )}
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Keluar (Logout)</span>}
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 bg-[var(--accent-primary)] text-[var(--on-accent)] font-bold text-xs rounded-xl hover:bg-[var(--accent-hover)] transition-all justify-center ",
              isCollapsed && "px-0"
            )}
            title="Masuk / Login"
          >
            <LogIn className="w-4 h-4 shrink-0 stroke-[2.5]" />
            {!isCollapsed && <span>Masuk (Login)</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}
