'use client';
import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import type { Account, Budget, Category, Profile, Transaction, FinancialSummary, EmergencyFund } from './types';
import { apiRequest, checkedFetch, RequestError, errorMessage } from './client-api';
import { accountBalances, reservedBalances } from './financial';
interface InitData {
    profile: Profile;
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
    budgets: Budget[];
    emergencyFund: EmergencyFund;
    goalAccountIds: string[];
}
const AppContext = createContext<ReturnType<typeof useAppState> | null>(null);
function useAppState() {
    const epoch = useRef(0);
    const [profile, setProfile] = useState<Profile | null>(null), [accounts, setAccounts] = useState<Account[]>([]), [categories, setCategories] = useState<Category[]>([]), [transactions, setTransactions] = useState<Transaction[]>([]), [budgets, setBudgets] = useState<Budget[]>([]), [emergencyFund, setEmergencyFund] = useState<EmergencyFund>({ profile_type: 'single', monthly_expense: 3000000, target_months: 3, selected_account_ids: [] }), [goalAccountIds, setGoalAccountIds] = useState<string[]>([]);
    const [isLoaded, setIsLoaded] = useState(false), [isAuthenticated, setIsAuthenticated] = useState(false), [loadError, setLoadError] = useState('');
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ IDR: 1, USD: 1 / 16800, SGD: 1 / 12500, MYR: 1 / 3780 });
    const clear = useCallback(() => { epoch.current++; setProfile(null); setAccounts([]); setCategories([]); setTransactions([]); setBudgets([]); setGoalAccountIds([]); setEmergencyFund({ profile_type: 'single', monthly_expense: 3000000, target_months: 3, selected_account_ids: [] }); setIsAuthenticated(false); }, []);
    const sync = useCallback((data: InitData) => { setProfile(data.profile); setAccounts(data.accounts); setCategories(data.categories); setTransactions(data.transactions); setBudgets(data.budgets); setEmergencyFund(data.emergencyFund); setGoalAccountIds(data.goalAccountIds); setIsAuthenticated(true); setLoadError(''); }, []);
    const refreshFromDB = useCallback(async () => { const version = epoch.current; try {
        const data = await apiRequest<InitData>('/api/init');
        if (version === epoch.current)
            sync(data);
    }
    catch (error) {
        if (version === epoch.current && error instanceof RequestError && error.status === 401)
            clear();
        throw error;
    } }, [clear, sync]);
    const mutate = async <T,>(url: string, method: string, body?: unknown): Promise<T> => { const version = epoch.current; const data = await apiRequest<T>(url, method, body); if (version !== epoch.current)
        throw new RequestError('Sesi berubah. Muat ulang halaman.', 401); return data; };
    useEffect(() => {
        localStorage.removeItem('money_tracker_auth_user_obj');
        const expire = () => { clear(); setLoadError(''); };
        window.addEventListener('celengan-session-expired', expire);
        refreshFromDB().catch(error => { if (!(error instanceof RequestError && error.status === 401))
            setLoadError(errorMessage(error)); }).finally(() => setIsLoaded(true));
        fetch('/api/rates').then(r => r.json()).then(data => { if (data.success && data.rates)
            setExchangeRates(data.rates); }).catch(() => { });
        return () => window.removeEventListener('celengan-session-expired', expire);
    }, [refreshFromDB, clear]);
    const authenticate = async (action: string, email: string, password?: string, full_name?: string) => {
        const version = ++epoch.current;
        try {
            await checkedFetch('/api/auth', { method: 'POST', body: JSON.stringify({ action, email, password, full_name }) });
            if (version !== epoch.current)
                return { success: false, error: 'Sesi berubah. Coba masuk lagi.' };
            await refreshFromDB();
            return { success: true };
        }
        catch (error) {
            return { success: false, error: errorMessage(error) };
        }
    };
    const login = (email: string, password?: string) => authenticate('login', email, password);
    const register = (email: string, password: string, fullName?: string) => authenticate('register', email, password, fullName);
    const logout = async () => { await mutate('/api/auth', 'DELETE'); clear(); };
    const updateProfile = async (fields: Partial<Profile>) => { setProfile(await mutate<Profile>('/api/profile', 'PUT', fields)); };
    const addTransaction = async (data: Omit<Transaction, 'id' | 'created_at'>) => { const saved = await mutate<Transaction>('/api/transactions', 'POST', data); setTransactions(prev => [saved, ...prev]); };
    const updateTransaction = async (id: string, data: Partial<Transaction>) => { const saved = await mutate<Transaction>('/api/transactions', 'PUT', { ...data, id }); setTransactions(prev => prev.map(t => t.id === id ? saved : t)); };
    const deleteTransaction = async (id: string) => { await mutate('/api/transactions?id=' + encodeURIComponent(id), 'DELETE'); setTransactions(prev => prev.filter(t => t.id !== id)); };
    const bulkDeleteTransactions = async (ids: string[]) => { await mutate('/api/transactions', 'DELETE', { ids }); setTransactions(prev => prev.filter(t => !ids.includes(t.id))); };
    const addAccount = async (data: Omit<Account, 'id' | 'created_at' | 'current_balance'>) => { const saved = await mutate<Account>('/api/accounts', 'POST', data); setAccounts(prev => [...prev, saved]); };
    const updateAccount = async (id: string, data: Partial<Account>) => { const saved = await mutate<Account>('/api/accounts', 'PUT', { ...data, id }); setAccounts(prev => prev.map(a => a.id === id ? saved : a)); };
    const deleteAccount = async (id: string) => { await mutate('/api/accounts?id=' + encodeURIComponent(id), 'DELETE'); setAccounts(prev => prev.filter(a => a.id !== id)); };
    const addCategory = async (data: Omit<Category, 'id'>) => { const saved = await mutate<Category>('/api/categories', 'POST', data); setCategories(prev => [...prev, saved]); return saved; };
    const updateCategory = async (id: string, data: Partial<Category>) => { const saved = await mutate<Category>('/api/categories', 'PUT', { ...data, id }); setCategories(prev => prev.map(c => c.id === id ? saved : c)); };
    const deleteCategory = async (id: string) => { await mutate('/api/categories?id=' + encodeURIComponent(id), 'DELETE'); setCategories(prev => prev.filter(c => c.id !== id)); };
    const setBudget = async (categoryId: string, amount: number, month: number, year: number) => { const saved = await mutate<Budget>('/api/budgets', 'POST', { category_id: categoryId, amount, month, year }); setBudgets(prev => [...prev.filter(b => !(b.category_id === categoryId && b.month === month && b.year === year)), saved]); };
    const deleteBudget = async (id: string) => { await mutate('/api/budgets?id=' + encodeURIComponent(id), 'DELETE'); setBudgets(prev => prev.filter(b => b.id !== id)); };
    const copyPreviousMonthBudgets = async (month: number, year: number) => { const saved = await mutate<Budget[]>('/api/budgets', 'POST', { action: 'copy', month, year }); setBudgets(prev => [...prev.filter(b => !saved.some(s => s.id === b.id)), ...saved]); };
    const updateEmergencyFund = async (data: EmergencyFund) => { const saved = await mutate<EmergencyFund>('/api/emergency-fund', 'POST', data); setEmergencyFund(saved); return saved; };
    const calculatedAccounts = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
    const summary = useMemo<FinancialSummary>(() => {
        const active = calculatedAccounts.filter(a => !a.is_archived), totalBalance = active.reduce((sum, a) => sum + a.current_balance, 0), { emergencyBalance, goalBalance } = reservedBalances(active, emergencyFund.selected_account_ids, goalAccountIds);
        const now = new Date(), monthly = transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
        const monthlyIncome = monthly.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0), monthlyExpense = monthly.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
        const netCashflow = monthlyIncome - monthlyExpense;
        return { totalBalance, emergencyBalance, spendableBalance: Math.max(0, totalBalance - emergencyBalance - goalBalance), monthlyIncome, monthlyExpense, monthlyNet: netCashflow, netCashflow, savingsRate: monthlyIncome > 0 ? Math.max(0, Math.round(netCashflow / monthlyIncome * 100)) : 0 };
    }, [calculatedAccounts, transactions, emergencyFund, goalAccountIds]);
    const getEnrichedTransactions = (): Transaction[] => [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => ({ ...t, account: calculatedAccounts.find(a => a.id === t.account_id), to_account: calculatedAccounts.find(a => a.id === t.transfer_to_account_id), category: categories.find(c => c.id === t.category_id) }));
    return { profile, accounts: calculatedAccounts, categories, transactions, budgets, emergencyFund, goalAccountIds, isLoaded, isAuthenticated, loadError, exchangeRates, summary, login, register, logout, updateProfile, refreshFromDB, addTransaction, updateTransaction, deleteTransaction, bulkDeleteTransactions, addAccount, updateAccount, deleteAccount, addCategory, updateCategory, deleteCategory, setBudget, deleteBudget, copyPreviousMonthBudgets, updateEmergencyFund, getEnrichedTransactions };
}
export function AppProvider({ children }: {
    children: React.ReactNode;
}) { const value = useAppState(); return <AppContext.Provider value={value}>{children}</AppContext.Provider>; }
export function useApp() { const value = useContext(AppContext); if (!value)
    throw new Error('useApp must be used within AppProvider'); return value; }
