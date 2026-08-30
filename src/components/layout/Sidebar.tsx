'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  PiggyBank, 
  WalletCards, 
  BarChart3, 
  Settings, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  LogIn,
  Sparkles,
  ShieldCheck,
  Target,
  Users
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { useModal } from '@/components/ui/CustomModal';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

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
    { label: 'Budget', href: '/budget', icon: PiggyBank },
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
      onConfirm: () => {
        logout();
        showToast({ message: 'Sampai jumpa lagi! 👋', type: 'info' });
        router.push('/login');
      }
    });
  };

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-30 bg-[#121212] border-r border-[#222222] transition-all duration-300 select-none",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-[#1E1E1E]">
        {!isCollapsed ? (
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#38BDF8] flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(56,189,248,0.3)]">
              💸
            </div>
            <div>
              <span className="font-display font-extrabold text-lg tracking-tight text-white block">
                CELENGAN<span className="text-[#38BDF8]">.</span>GENZ
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-10 h-10 rounded-xl bg-[#38BDF8] flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(56,189,248,0.3)]">
              💸
            </div>
          </Link>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1F1F1F] transition-colors",
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
            "w-full flex items-center justify-center gap-2 py-3 bg-[#38BDF8] text-black font-bold font-display rounded-xl hover:bg-[#60a5fa] transition-all shadow-[0_0_20px_rgba(56,189,248,0.25)] active:scale-[0.98]",
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
              className={cn(
                "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all group relative",
                isActive 
                  ? "bg-[#1C1C1C] text-white border border-[#2E2E2E]" 
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-[#181818]"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#38BDF8] rounded-r-full shadow-[0_0_8px_#38BDF8]" />
              )}
              <Icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-[#38BDF8]" : "text-neutral-400 group-hover:text-white"
              )} />
              {!isCollapsed && (
                <span className={cn(isActive && "font-semibold text-white")}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Live Spendable Balance Widget on Desktop */}
      {!isCollapsed && (
        <div className="p-4 mx-3 mb-3 bg-[#171717] border border-[#242424] rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#38BDF8]" />
              Saldo Siap Pakai
            </span>
            <span className="text-[#3EFF9A] font-mono text-[10px] font-bold">READY</span>
          </div>
          <p className="text-base font-bold font-mono text-white tracking-tight">
            {formatCurrency(summary.spendableBalance, profile?.currency || 'IDR', false, exchangeRates)}
          </p>
          {summary.emergencyBalance > 0 && (
            <p className="text-[10px] text-neutral-500 font-mono">
              🔒 Vault: {formatCurrency(summary.emergencyBalance, profile?.currency || 'IDR', false, exchangeRates)}
            </p>
          )}
        </div>
      )}

      {/* User Profile & Auth Footer */}
      <div className="p-3 border-t border-[#1E1E1E]">
        {isAuthenticated ? (
          <div className="space-y-1">
            <div 
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl bg-[#171717] border border-[#262626] group",
                isCollapsed && "justify-center p-1"
              )}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#2A2A2A] to-[#404040] border border-[#333] flex items-center justify-center overflow-hidden font-bold text-xs text-[#38BDF8] shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.substring(0, 2).toUpperCase() || 'US'
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {profile?.full_name || 'Pengguna'}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono truncate">
                    {profile?.currency || 'IDR'} Account
                  </p>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#FF6B6B] hover:bg-[#FF4E4E]/10 hover:border-[#FF4E4E]/30 border border-transparent rounded-xl transition-all",
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
              "w-full flex items-center gap-2.5 px-3 py-2.5 bg-[#38BDF8] text-black font-bold text-xs rounded-xl hover:bg-[#60a5fa] transition-all justify-center shadow-[0_0_15px_rgba(56,189,248,0.2)]",
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
