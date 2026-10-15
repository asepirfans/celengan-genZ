'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { QuickTransactionModal } from '../modals/QuickTransactionModal';
import { useApp } from '@/lib/store';
import { cn } from '@/lib/utils';
import { overBudget } from '@/lib/financial';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const { budgets, transactions, isAuthenticated, isLoaded, loadError, refreshFromDB } = useApp();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isLoaded && !isAuthenticated && !loadError) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoaded, loadError, router]);

  // Check if any budget is over 100%
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const hasOverBudget = overBudget(budgets, transactions, currentMonth, currentYear);

  if (loadError) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6"><p role="alert">{loadError}</p><button onClick={() => refreshFromDB().catch(() => {})} className="px-4 py-3 bg-[var(--accent-primary)] text-[var(--on-accent)] rounded-xl">Coba lagi</button></div>;
  if (!isLoaded || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center text-xs font-mono text-[var(--text-muted)]">
        Memverifikasi sesi akun...
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-primary)] flex">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "app-content flex-1 flex flex-col min-w-0 transition-all duration-300 pb-20 md:pb-8",
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        )}
      >
        <Header />

        <main className="app-main flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
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
