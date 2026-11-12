import { Currency, Transaction, TransactionSortOption } from '@/types/finance';
import { Translations } from '@/lib/i18n';
import { convertCurrency, DEFAULT_RATES, ExchangeRates } from '@/lib/currency';
import { CustomSelectOption } from '@/components/CustomSelect';
import { Calendar, Clock, ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';

export function getTransactionSortOptions(t: Translations): CustomSelectOption<TransactionSortOption>[] {
  return [
    {
      value: 'date-desc',
      label: t.record.sortNewestDate,
      icon: Calendar,
    },
    {
      value: 'date-asc',
      label: t.record.sortOldestDate,
      icon: Calendar,
    },
    {
      value: 'recent-added',
      label: t.record.sortRecentAdded,
      icon: Clock,
    },
    {
      value: 'amount-desc',
      label: t.record.sortHighestAmount,
      icon: ArrowDownWideNarrow,
    },
    {
      value: 'amount-asc',
      label: t.record.sortLowestAmount,
      icon: ArrowUpNarrowWide,
    },
  ];
}

export function sortTransactions(
  transactions: Transaction[],
  sortBy: TransactionSortOption = 'date-desc',
  activeCurrency: Currency = 'JPY',
  rates: ExchangeRates = DEFAULT_RATES
): Transaction[] {
  // Preserve original addition order via originalIndex
  const indexed = transactions.map((tx, originalIndex) => ({ tx, originalIndex }));

  indexed.sort((a, b) => {
    if (sortBy === 'date-desc') {
      const dateCompare = b.tx.date.localeCompare(a.tx.date);
      if (dateCompare !== 0) return dateCompare;
      return a.originalIndex - b.originalIndex;
    }

    if (sortBy === 'date-asc') {
      const dateCompare = a.tx.date.localeCompare(b.tx.date);
      if (dateCompare !== 0) return dateCompare;
      return a.originalIndex - b.originalIndex;
    }

    if (sortBy === 'recent-added') {
      return a.originalIndex - b.originalIndex;
    }

    if (sortBy === 'amount-desc') {
      const amtA = convertCurrency(a.tx.amount, a.tx.currency || 'JPY', activeCurrency, rates);
      const amtB = convertCurrency(b.tx.amount, b.tx.currency || 'JPY', activeCurrency, rates);
      const diff = amtB - amtA;
      if (Math.abs(diff) > 0.0001) return diff;
      const dateCompare = b.tx.date.localeCompare(a.tx.date);
      if (dateCompare !== 0) return dateCompare;
      return a.originalIndex - b.originalIndex;
    }

    if (sortBy === 'amount-asc') {
      const amtA = convertCurrency(a.tx.amount, a.tx.currency || 'JPY', activeCurrency, rates);
      const amtB = convertCurrency(b.tx.amount, b.tx.currency || 'JPY', activeCurrency, rates);
      const diff = amtA - amtB;
      if (Math.abs(diff) > 0.0001) return diff;
      const dateCompare = b.tx.date.localeCompare(a.tx.date);
      if (dateCompare !== 0) return dateCompare;
      return a.originalIndex - b.originalIndex;
    }

    return 0;
  });

  return indexed.map((item) => item.tx);
}
