'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { QuickTransactionModal } from '../modals/QuickTransactionModal';
import { useApp } from '@/lib/store';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const { budgets, transactions, isAuthenticated, isLoaded } = useApp();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoaded, router]);

  // Check if any budget is over 100%
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const hasOverBudget = budgets.some(b => {
    if (b.month !== currentMonth || b.year !== currentYear) return false;
    const spent = transactions
      .filter(t => t.type === 'expense' && t.category_id === b.category_id)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return spent > b.amount;
  });

  if (!isLoaded || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-xs font-mono text-neutral-500">
        Memverifikasi sesi akun...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
      />

      {/* Main Content Area */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 pb-20 md:pb-8",
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        )}
      >
        <Header />
        
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>

      {/* Mobile Floating Bottom Bar */}
      <BottomNav 
        onOpenNewTransaction={() => setIsNewTxModalOpen(true)} 
        hasOverBudget={hasOverBudget}
      />

      {/* Global Quick Transaction Modal / Bottom-Sheet */}
      <QuickTransactionModal 
        isOpen={isNewTxModalOpen} 
        onClose={() => setIsNewTxModalOpen(false)} 
      />
    </div>
  );
}
