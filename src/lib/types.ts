export type CurrencyCode = 'IDR' | 'USD' | 'SGD' | 'MYR';

export interface Profile {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  currency: CurrencyCode;
  created_at: string;
}

export type AccountType = 'cash' | 'bank' | 'ewallet' | 'savings';

export interface Account {
  id: string;
  user_id?: string;
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  initial_balance: number;
  current_balance: number;
  is_archived: boolean;
  created_at: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  is_default?: boolean;
  is_hidden?: boolean;
}

export interface Transaction {
  id: string;
  user_id?: string;
  account_id: string;
  category_id?: string;
  type: TransactionType;
  amount: number;
  note?: string;
  date: string; // ISO format YYYY-MM-DDTHH:mm:ssZ
  transfer_to_account_id?: string;
  created_at: string;
  
  // Joined / computed fields for UI convenience
  account?: Account;
  to_account?: Account;
  category?: Category;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: number; // 1 - 12
  year: number;
  amount: number;
  created_at: string;
  category?: Category;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  icon: string;
  color: string;
  image_url?: string;
  created_at: string;
}

export interface FinancialSummary {
  totalBalance: number;       // Total Net Worth (Semua Aset)
  spendableBalance: number;   // Saldo Siap Belanja (Di luar Dana Darurat)
  emergencyBalance: number;   // Saldo Dana Darurat (Terkunci)
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  monthlyExpenseLimit?: number;
  netCashflow: number;
  savingsRate: number;
}
