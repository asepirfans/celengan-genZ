'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Plus, ChartPie, WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavigationPending } from './NavigationPending';

interface BottomNavProps { onOpenNewTransaction: () => void; hasOverBudget?: boolean; }
const items = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transaksi', icon: Receipt },
  { href: '/budget', label: 'Budget', icon: ChartPie },
  { href: '/accounts', label: 'Wallet', icon: WalletCards },
];
export function BottomNav({ onOpenNewTransaction, hasOverBudget = false }: BottomNavProps) {
  const pathname = usePathname();
  const renderItem = (item: typeof items[number]) => {
    const active = pathname.startsWith(item.href);
    return <Link key={item.href} href={item.href} prefetch={true} aria-current={active ? 'page' : undefined} className={cn('mobile-nav-item relative min-w-0 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium', active ? 'text-[var(--on-accent)]' : 'text-[var(--text-muted)]')}>
      <NavigationPending />
      <item.icon className="w-5 h-5" strokeWidth={active ? 2 : 1.6} />
      <span className="mobile-nav-label">{item.label}</span>
      {item.href === '/budget' && hasOverBudget && <span className="absolute top-1 right-1/4 w-1.5 h-1.5 rounded-full bg-[var(--accent-danger)]" />}
    </Link>;
  };
  return <nav aria-label="Navigasi utama" className="mobile-nav md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 pt-1">
    <div className="grid grid-cols-5 items-center gap-1 max-w-lg mx-auto">
      {items.slice(0, 2).map(renderItem)}
      <button onClick={onOpenNewTransaction} aria-label="Catat transaksi" className="w-11 h-11 mx-auto rounded-xl bg-[var(--accent-primary)] text-[var(--on-accent)] flex items-center justify-center"><Plus className="w-5 h-5" /></button>
      {items.slice(2).map(renderItem)}
    </div>
  </nav>;
}
