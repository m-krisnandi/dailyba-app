export type TransactionType = 'expense' | 'income' | 'savings' | 'investment';

export type ExpenseCategory =
  | 'food_drinks'
  | 'shopping'
  | 'train'
  | 'ride'
  | 'laundry'
  | 'rent'
  | 'family'
  | 'gifts'
  | 'vps'
  | 'mobile'
  | 'others';

export type IncomeCategory =
  | 'salary'
  | 'freelance'
  | 'bonus'
  | 'dividend'
  | 'others';

export type FundingSource = 'cash' | 'bank' | 'ewallet' | 'credit_card';

export type Currency = 'JPY' | 'IDR' | 'USD' | 'MMK';

export type Language = 'en' | 'ja';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: ExpenseCategory | IncomeCategory | string;
  source: FundingSource;
  currency: Currency;
  date: string; // YYYY-MM-DD
  note?: string;
  isRecurring?: boolean;
  recurringBillId?: string;
}

export interface InvestmentAsset {
  id: string;
  name: string;
  category: 'stock' | 'crypto' | 'mutual_fund' | 'gold' | 'deposit';
  costBasis: number; // Total modal beli
  currentValue: number; // Nilai pasar sekarang
  currency: Currency;
  updatedAt: string;
  notes?: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  titleKey?: string;
  defaultAmount: number;
  category: string;
  currency: Currency;
  source: FundingSource;
  dayOfMonth?: number;
}

export interface FinanceState {
  transactions: Transaction[];
  investments: InvestmentAsset[];
  hiddenCategories: (ExpenseCategory | string)[];
  recurringBills: RecurringBill[];
  savingsGoalMonthly: number;
  dailySpendTarget: number;
  currency: Currency;
  language: Language;
}
