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
  | 'carryover'
  | 'others';

export type FundingSource = 'cash' | 'bank' | 'ewallet' | 'credit_card';

export type Currency = 'JPY' | 'IDR' | 'USD' | 'MMK';

export type Language = 'en' | 'ja';

export type InvestmentSortOption =
  | 'value-desc'
  | 'value-asc'
  | 'return-desc'
  | 'return-asc'
  | 'name-asc'
  | 'recent-added';

export type TransactionSortOption =
  | 'date-desc'
  | 'date-asc'
  | 'recent-added'
  | 'amount-desc'
  | 'amount-asc';

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
  dueDayEnd?: number;
}

export interface MonthlyBudgetPlan {
  totalTarget?: number;
  categoryTargets?: Partial<Record<ExpenseCategory | string, number>>;
}

export interface FinanceState {
  transactions: Transaction[];
  investments: InvestmentAsset[];
  hiddenCategories: (ExpenseCategory | string)[];
  recurringBills: RecurringBill[];
  savingsGoalMonthly: number;
  savingsGoalCurrency?: Currency;
  dailySpendTarget: number;
  dailySpendCurrency?: Currency;
  currency: Currency;
  language: Language;
  monthlyBudgets?: Record<string, MonthlyBudgetPlan>; // Keyed by "YYYY-MM"
  monthStartDay?: number; // 1 to 31, default 1
  dailyReminderEnabled?: boolean;
  dailyReminderTime?: string; // "HH:MM", default "20:00"
}
