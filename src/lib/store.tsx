'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Account, Budget, Category, Profile, Transaction, FinancialSummary } from './types';
import { DEFAULT_CATEGORIES } from './mock-data';

interface AppState {
  profile: Profile | null;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  isLoaded: boolean;
  isAuthenticated: boolean;
  
  // Real Database Auth Actions
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (profile: Partial<Profile>) => void;
  
  // Database Transactions
  addTransaction: (trx: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
  updateTransaction: (id: string, trx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => Promise<void>;
  bulkDeleteTransactions: (ids: string[]) => Promise<void>;
  
  // Database Accounts
  addAccount: (account: Omit<Account, 'id' | 'created_at' | 'current_balance'>) => Promise<void>;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  
  // Database Categories
  addCategory: (cat: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, cat: Partial<Category>) => void;
  deleteCategory: (id: string) => Promise<void>;
  
  // Database Budgets
  setBudget: (categoryId: string, amount: number, month: number, year: number) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  copyPreviousMonthBudgets: (currentMonth: number, currentYear: number) => void;
  
  // Summaries & Computations
  summary: FinancialSummary;
  exchangeRates: Record<string, number>;
  getEnrichedTransactions: () => Transaction[];
  refreshFromDB: (userId?: string) => Promise<void>;
}

const AUTH_USER_KEY = 'money_tracker_auth_user_obj';

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    IDR: 1,
    USD: 1 / 16800,
    SGD: 1 / 12500,
    MYR: 1 / 3780
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Fetch Live Real-Time Exchange Rates
  useEffect(() => {
    fetch('/api/rates')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.rates) {
          setExchangeRates(json.rates);
        }
      })
      .catch(err => console.warn('Could not load live rates:', err));
  }, []);

  // Synchronize Live Data with PostgreSQL Database via API
  const refreshFromDB = async (userId?: string) => {
    const activeId = userId || profile?.id;
    try {
      const url = activeId ? `/api/init?userId=${activeId}` : '/api/init';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.profile) setProfile(json.data.profile);
          if (json.data.accounts) setAccounts(json.data.accounts);
          if (json.data.categories?.length) setCategories(json.data.categories);
          if (json.data.transactions) setTransactions(json.data.transactions);
          if (json.data.budgets) setBudgets(json.data.budgets);
        }
      }
    } catch (e) {
      console.warn('Could not sync with Supabase PostgreSQL API:', e);
    }
  };

  // Initial Load from Session
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem(AUTH_USER_KEY);
      if (savedUserStr) {
        const user = JSON.parse(savedUserStr);
        if (user && user.id) {
          setProfile(user);
          setIsAuthenticated(true);
          refreshFromDB(user.id).finally(() => setIsLoaded(true));
          return;
        }
      }
    } catch (e) {
      console.warn('Auth session error:', e);
    }
    setIsAuthenticated(false);
    setIsLoaded(true);
  }, []);

  // Recalculate dynamic account balances
  const calculatedAccounts = useMemo(() => {
    return accounts.map(acc => {
      let balance = Number(acc.initial_balance) || 0;
      
      transactions.forEach(t => {
        const amount = Number(t.amount) || 0;
        if (t.account_id === acc.id) {
          if (t.type === 'income') balance += amount;
          else if (t.type === 'expense') balance -= amount;
          else if (t.type === 'transfer') balance -= amount;
        }
        if (t.type === 'transfer' && t.transfer_to_account_id === acc.id) {
          balance += amount;
        }
      });

      return {
        ...acc,
        current_balance: balance
      };
    });
  }, [accounts, transactions]);

  // Financial summary computation
  const summary = useMemo<FinancialSummary>(() => {
    const activeAccounts = calculatedAccounts.filter(a => !a.is_archived);
    const totalBalance = activeAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

    // Emergency Accounts (Akun berlabel Dana Darurat / Tabungan Khusus)
    const emergencyAccounts = activeAccounts.filter(a => 
      a.name.toLowerCase().includes('darurat') || 
      a.name.toLowerCase().includes('emergency') ||
      a.type === 'savings'
    );
    const emergencyBalance = emergencyAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
    const spendableBalance = Math.max(0, totalBalance - emergencyBalance);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyExpense = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netCashflow = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100)) : 0;

    return {
      totalBalance,
      spendableBalance,
      emergencyBalance,
      monthlyIncome,
      monthlyExpense,
      monthlyNet: netCashflow,
      netCashflow,
      savingsRate
    };
  }, [calculatedAccounts, transactions]);

  // Enriched Transactions with resolved relations
  const getEnrichedTransactions = (): Transaction[] => {
    const accMap = new Map(calculatedAccounts.map(a => [a.id, a]));
    const catMap = new Map(categories.map(c => [c.id, c]));

    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(t => ({
        ...t,
        account: accMap.get(t.account_id),
        to_account: t.transfer_to_account_id ? accMap.get(t.transfer_to_account_id) : undefined,
        category: t.category_id ? catMap.get(t.category_id) : undefined,
      }));
  };

  // Real Database Login
  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });
      const data = await res.json();

      if (!data.success) {
        return { success: false, error: data.error };
      }

      setProfile(data.user);
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      await refreshFromDB(data.user.id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'Gagal terhubung ke database.' };
    }
  };

  // Real Database Register
  const register = async (email: string, password: string, fullName?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', email, password, full_name: fullName })
      });
      const data = await res.json();

      if (!data.success) {
        return { success: false, error: data.error };
      }

      setProfile(data.user);
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      await refreshFromDB(data.user.id);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'Gagal melakukan registrasi ke database.' };
    }
  };

  const logout = () => {
    setProfile(null);
    setIsAuthenticated(false);
    setTransactions([]);
    setAccounts([]);
    setBudgets([]);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  const updateProfile = async (fields: Partial<Profile>) => {
    setProfile(prev => {
      const updated = prev ? ({ ...prev, ...fields }) : null;
      if (updated) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
      }
      return updated;
    });

    if (profile?.id) {
      try {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: profile.id, ...fields })
        });
      } catch (e) {
        console.warn('Failed saving profile update to DB:', e);
      }
    }
  };

  // Database Action: Add Transaction
  const addTransaction = async (trx: Omit<Transaction, 'id' | 'created_at'>) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...trx, user_id: profile?.id })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setTransactions(prev => [json.data, ...prev]);
          return;
        }
      }
    } catch (e) {
      console.warn('API error:', e);
    }
  };

  // Database Action: Update Transaction
  const updateTransaction = async (id: string, fields: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
    try {
      await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...fields })
      });
    } catch (e) {
      console.warn('API update error:', e);
    }
  };

  // Database Action: Delete Transaction
  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('API delete error:', e);
    }
  };

  const bulkDeleteTransactions = async (ids: string[]) => {
    const set = new Set(ids);
    setTransactions(prev => prev.filter(t => !set.has(t.id)));
    for (const id of ids) {
      try {
        await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      } catch (e) {}
    }
  };

  // Database Action: Add Account
  const addAccount = async (account: Omit<Account, 'id' | 'created_at' | 'current_balance'>) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...account, user_id: profile?.id })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setAccounts(prev => [...prev, json.data]);
          return;
        }
      }
    } catch (e) {
      console.warn('API error:', e);
    }
  };

  // Database Action: Update Account
  const updateAccount = async (id: string, fields: Partial<Account>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...fields } : a));
    try {
      await fetch('/api/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...fields })
      });
    } catch (e) {
      console.warn('API update error:', e);
    }
  };

  // Database Action: Delete Account
  const deleteAccount = async (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    try {
      await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('API delete error:', e);
    }
  };

  // Database Action: Add Category
  const addCategory = async (cat: Omit<Category, 'id'>) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cat, user_id: profile?.id })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setCategories(prev => [...prev, json.data]);
          return;
        }
      }
    } catch (e) {
      console.warn('API error:', e);
    }
  };

  const updateCategory = (id: string, fields: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
  };

  const deleteCategory = async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    try {
      await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('API delete error:', e);
    }
  };

  // Database Action: Set Budget
  const setBudget = async (categoryId: string, amount: number, month: number, year: number) => {
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile?.id,
          category_id: categoryId,
          month,
          year,
          amount
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setBudgets(prev => {
            const idx = prev.findIndex(b => b.category_id === categoryId && b.month === month && b.year === year);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = json.data;
              return next;
            }
            return [...prev, json.data];
          });
          return;
        }
      }
    } catch (e) {
      console.warn('API error:', e);
    }
  };

  // Database Action: Delete Budget
  const deleteBudget = async (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    try {
      await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('API delete budget error:', e);
    }
  };

  const copyPreviousMonthBudgets = (currentMonth: number, currentYear: number) => {
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const prevBudgets = budgets.filter(b => b.month === prevMonth && b.year === prevYear);
    if (prevBudgets.length === 0) return;

    prevBudgets.forEach(pb => {
      setBudget(pb.category_id, pb.amount, currentMonth, currentYear);
    });
  };

  return (
    <AppContext.Provider
      value={{
        profile,
        accounts: calculatedAccounts,
        categories,
        transactions,
        budgets,
        isLoaded,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        bulkDeleteTransactions,
        addAccount,
        updateAccount,
        deleteAccount,
        addCategory,
        updateCategory,
        deleteCategory,
        setBudget,
        deleteBudget,
        copyPreviousMonthBudgets,
        summary,
        exchangeRates,
        getEnrichedTransactions,
        refreshFromDB
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
