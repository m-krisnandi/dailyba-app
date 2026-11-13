import { ExpenseCategory, FundingSource, IncomeCategory, RecurringBill, Transaction, InvestmentAsset, TransactionType } from '@/types/finance';
import {
  UtensilsCrossed,
  ShoppingBag,
  Train,
  Bike,
  Shirt,
  Home,
  HeartHandshake,
  Gift,
  Server,
  Smartphone,
  MoreHorizontal,
  Coins,
  Landmark,
  CreditCard,
  Wallet,
  Briefcase,
  Laptop,
  Award,
  TrendingUp,
  History,
  LucideIcon,
} from 'lucide-react';

export const EXPENSE_CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  food_drinks: UtensilsCrossed,
  shopping: ShoppingBag,
  train: Train,
  ride: Bike,
  laundry: Shirt,
  rent: Home,
  family: HeartHandshake,
  gifts: Gift,
  vps: Server,
  mobile: Smartphone,
  others: MoreHorizontal,
};

export const INCOME_CATEGORY_ICONS: Record<IncomeCategory, LucideIcon> = {
  salary: Briefcase,
  freelance: Laptop,
  bonus: Award,
  dividend: TrendingUp,
  carryover: History,
  others: MoreHorizontal,
};

export const FUNDING_SOURCE_ICONS: Record<FundingSource, LucideIcon> = {
  cash: Coins,
  bank: Landmark,
  ewallet: Wallet,
  credit_card: CreditCard,
};

export interface CategoryStyle {
  bg: string;
  text: string;
  border: string;
}

export function getInvestmentAssetBadgeStyle(category: InvestmentAsset["category"] | string): CategoryStyle {
  switch (category) {
    case "gold":
      return { bg: "bg-amber-500/15", text: "text-amber-500 dark:text-amber-400", border: "border-amber-500/30" };
    case "crypto":
      return { bg: "bg-violet-500/15", text: "text-violet-500 dark:text-violet-400", border: "border-violet-500/30" };
    case "stock":
      return { bg: "bg-blue-500/15", text: "text-blue-500 dark:text-blue-400", border: "border-blue-500/30" };
    case "mutual_fund":
      return { bg: "bg-cyan-500/15", text: "text-cyan-500 dark:text-cyan-400", border: "border-cyan-500/30" };
    case "deposit":
      return { bg: "bg-emerald-500/15", text: "text-emerald-500 dark:text-emerald-400", border: "border-emerald-500/30" };
    default:
      return { bg: "bg-zinc-500/15", text: "text-zinc-400 dark:text-zinc-400", border: "border-zinc-500/30" };
  }
}

export function getFundingSourceBadgeStyle(source: FundingSource | string): CategoryStyle {
  switch (source) {
    case "cash":
      return { bg: "bg-emerald-500/15", text: "text-emerald-500 dark:text-emerald-400", border: "border-emerald-500/30" };
    case "bank":
      return { bg: "bg-sky-500/15", text: "text-sky-500 dark:text-sky-400", border: "border-sky-500/30" };
    case "credit_card":
      return { bg: "bg-indigo-500/15", text: "text-indigo-500 dark:text-indigo-400", border: "border-indigo-500/30" };
    case "ewallet":
      return { bg: "bg-amber-500/15", text: "text-amber-500 dark:text-amber-400", border: "border-amber-500/30" };
    default:
      return { bg: "bg-zinc-500/15", text: "text-zinc-400 dark:text-zinc-400", border: "border-zinc-500/30" };
  }
}

export function getCategoryBadgeStyle(type: TransactionType | string, category?: string): CategoryStyle {
  if (type === 'transfer') {
    return {
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-400 dark:text-indigo-400',
      border: 'border-indigo-500/30',
    };
  }
  if (type === 'savings') {
    return {
      bg: 'bg-amber-500/15',
      text: 'text-amber-500 dark:text-amber-400',
      border: 'border-amber-500/30',
    };
  }
  if (type === 'investment') {
    return {
      bg: 'bg-violet-500/15',
      text: 'text-violet-500 dark:text-violet-400',
      border: 'border-violet-500/30',
    };
  }
  if (type === 'income') {
    switch (category) {
      case 'salary':
        return { bg: 'bg-emerald-500/15', text: 'text-emerald-500 dark:text-emerald-400', border: 'border-emerald-500/30' };
      case 'freelance':
        return { bg: 'bg-cyan-500/15', text: 'text-cyan-500 dark:text-cyan-400', border: 'border-cyan-500/30' };
      case 'bonus':
        return { bg: 'bg-amber-500/15', text: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/30' };
      case 'dividend':
        return { bg: 'bg-teal-500/15', text: 'text-teal-500 dark:text-teal-400', border: 'border-teal-500/30' };
      case 'carryover':
        return { bg: 'bg-blue-500/15', text: 'text-blue-500 dark:text-blue-400', border: 'border-blue-500/30' };
      default:
        return { bg: 'bg-emerald-500/15', text: 'text-emerald-500 dark:text-emerald-400', border: 'border-emerald-500/30' };
    }
  }

  // Expense categories
  switch (category) {
    case 'food_drinks':
      return { bg: 'bg-amber-500/15', text: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/30' };
    case 'shopping':
      return { bg: 'bg-purple-500/15', text: 'text-purple-500 dark:text-purple-400', border: 'border-purple-500/30' };
    case 'train':
      return { bg: 'bg-teal-500/15', text: 'text-teal-500 dark:text-teal-400', border: 'border-teal-500/30' };
    case 'ride':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-500 dark:text-emerald-400', border: 'border-emerald-500/30' };
    case 'laundry':
      return { bg: 'bg-indigo-500/15', text: 'text-indigo-500 dark:text-indigo-400', border: 'border-indigo-500/30' };
    case 'rent':
      return { bg: 'bg-sky-500/15', text: 'text-sky-500 dark:text-sky-400', border: 'border-sky-500/30' };
    case 'mobile':
      return { bg: 'bg-blue-500/15', text: 'text-blue-500 dark:text-blue-400', border: 'border-blue-500/30' };
    case 'vps':
      return { bg: 'bg-slate-500/15', text: 'text-slate-400 dark:text-slate-300', border: 'border-slate-500/30' };
    case 'family':
      return { bg: 'bg-rose-500/15', text: 'text-rose-500 dark:text-rose-400', border: 'border-rose-500/30' };
    case 'gifts':
      return { bg: 'bg-pink-500/15', text: 'text-pink-500 dark:text-pink-400', border: 'border-pink-500/30' };
    case 'others':
    default:
      return { bg: 'bg-zinc-500/15', text: 'text-zinc-400 dark:text-zinc-400', border: 'border-zinc-500/30' };
  }
}

// No mock data - brand new users start clean with 0 items
export const DEFAULT_RECURRING_BILLS: RecurringBill[] = [];

export const INITIAL_SAMPLE_INVESTMENTS: InvestmentAsset[] = [];

export const INITIAL_SAMPLE_TRANSACTIONS: Transaction[] = [];
