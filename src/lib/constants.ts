import { ExpenseCategory, FundingSource, IncomeCategory, RecurringBill, Transaction, InvestmentAsset } from '@/types/finance';
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
  others: MoreHorizontal,
};

export const FUNDING_SOURCE_ICONS: Record<FundingSource, LucideIcon> = {
  cash: Coins,
  bank: Landmark,
  ewallet: Wallet,
  credit_card: CreditCard,
};

// No mock data - brand new users start clean with 0 items
export const DEFAULT_RECURRING_BILLS: RecurringBill[] = [];

export const INITIAL_SAMPLE_INVESTMENTS: InvestmentAsset[] = [];

export const INITIAL_SAMPLE_TRANSACTIONS: Transaction[] = [];
