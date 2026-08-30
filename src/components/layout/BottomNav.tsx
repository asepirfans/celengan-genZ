'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  Plus, 
  PiggyBank, 
  WalletCards 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  onOpenNewTransaction: () => void;
  hasOverBudget?: boolean;
}

export function BottomNav({ onOpenNewTransaction, hasOverBudget = false }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/95 backdrop-blur-lg border-t border-[#222222] px-3 py-2 pb-safe">
      <div className="flex items-center justify-around relative max-w-md mx-auto">
        {/* Home */}
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all",
            pathname === '/dashboard' ? "text-[#38BDF8]" : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* Transactions */}
        <Link
          href="/transactions"
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all",
            pathname?.startsWith('/transactions') ? "text-[#38BDF8]" : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-medium">Transaksi</span>
        </Link>

        {/* Center Floating Action Button (FAB) */}
        <div className="-mt-7">
          <button
            onClick={onOpenNewTransaction}
            className="w-13 h-13 rounded-full bg-[#38BDF8] flex items-center justify-center text-black shadow-[0_0_20px_rgba(56,189,248,0.45)] active:scale-95 transition-transform border-4 border-[#121212]"
            aria-label="Tambah Transaksi"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Budget */}
        <Link
          href="/budget"
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all relative",
            pathname?.startsWith('/budget') ? "text-[#38BDF8]" : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          {hasOverBudget && (
            <span className="absolute top-1 right-3 w-2 h-2 bg-[#FF4E4E] rounded-full animate-pulse shadow-[0_0_6px_#FF4E4E]" />
          )}
          <PiggyBank className="w-5 h-5" />
          <span className="text-[10px] font-medium">Budget</span>
        </Link>

        {/* Accounts / Wallets */}
        <Link
          href="/accounts"
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all",
            pathname?.startsWith('/accounts') ? "text-[#38BDF8]" : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          <WalletCards className="w-5 h-5" />
          <span className="text-[10px] font-medium">Akun</span>
        </Link>
      </div>
    </nav>
  );
}
