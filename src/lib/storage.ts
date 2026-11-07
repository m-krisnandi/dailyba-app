'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Currency, ExpenseCategory, FinanceState, InvestmentAsset, Language, RecurringBill, Transaction } from '@/types/finance';
import { DEFAULT_RECURRING_BILLS, INITIAL_SAMPLE_INVESTMENTS, INITIAL_SAMPLE_TRANSACTIONS } from './constants';

const STORAGE_KEY = 'kakeibo_finance_v1';

export const DEFAULT_STATE: FinanceState = {
  transactions: INITIAL_SAMPLE_TRANSACTIONS,
  investments: INITIAL_SAMPLE_INVESTMENTS,
  language: 'en',
  currency: 'JPY',
  savingsGoalMonthly: 50000,
  dailySpendTarget: 3000,
  hiddenCategories: [],
  recurringBills: DEFAULT_RECURRING_BILLS,
};

export function getStoredState(): FinanceState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : INITIAL_SAMPLE_TRANSACTIONS,
        investments: Array.isArray(parsed.investments) ? parsed.investments : INITIAL_SAMPLE_INVESTMENTS,
        language: parsed.language || 'en',
        currency: parsed.currency || 'JPY',
        savingsGoalMonthly: typeof parsed.savingsGoalMonthly === 'number' ? parsed.savingsGoalMonthly : 50000,
        dailySpendTarget: typeof parsed.dailySpendTarget === 'number' ? parsed.dailySpendTarget : 3000,
        hiddenCategories: Array.isArray(parsed.hiddenCategories) ? parsed.hiddenCategories : [],
        recurringBills: Array.isArray(parsed.recurringBills) && parsed.recurringBills.length > 0
          ? parsed.recurringBills
          : DEFAULT_RECURRING_BILLS,
      };
    }
  } catch (e) {
    console.error('Failed to parse storage:', e);
  }

  return DEFAULT_STATE;
}

export function saveState(state: FinanceState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save storage:', e);
  }
}

export function useFinanceStore() {
  const [state, setState] = useState<FinanceState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const isInternalUpdateRef = useRef(false);

  useEffect(() => {
    // Initial sync from localStorage AFTER initial client mount
    setState(getStoredState());
    setIsHydrated(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setState(getStoredState());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateState = useCallback((updater: (prev: FinanceState) => FinanceState) => {
    setState((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    updateState((prev) => {
      // Rapid duplicate guard (within 1500ms)
      const lastTx = prev.transactions[0];
      if (
        lastTx &&
        lastTx.type === tx.type &&
        lastTx.amount === tx.amount &&
        lastTx.category === tx.category &&
        lastTx.source === tx.source &&
        lastTx.note === tx.note
      ) {
        const lastTxTime = parseInt(lastTx.id.split('_')[1] || '0', 10);
        if (Date.now() - lastTxTime < 1500) {
          return prev;
        }
      }

      const newTx: Transaction = {
        ...tx,
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      return {
        ...prev,
        transactions: [newTx, ...prev.transactions],
      };
    });
  }, [updateState]);

  const deleteTransaction = useCallback((id: string) => {
    updateState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  }, [updateState]);

  const addOrUpdateInvestment = useCallback((asset: InvestmentAsset) => {
    updateState((prev) => {
      const exists = prev.investments.some((inv) => inv.id === asset.id);
      const nextInvestments = exists
        ? prev.investments.map((inv) => (inv.id === asset.id ? asset : inv))
        : [...prev.investments, asset];
      return {
        ...prev,
        investments: nextInvestments,
      };
    });
  }, [updateState]);

  const deleteInvestment = useCallback((id: string) => {
    updateState((prev) => ({
      ...prev,
      investments: prev.investments.filter((inv) => inv.id !== id),
    }));
  }, [updateState]);

  const toggleHideCategory = useCallback((catKey: string) => {
    updateState((prev) => {
      const currentHidden = prev.hiddenCategories || [];
      const isAlreadyHidden = currentHidden.includes(catKey);
      const nextHidden = isAlreadyHidden
        ? currentHidden.filter((k) => k !== catKey)
        : [...currentHidden, catKey];
      return {
        ...prev,
        hiddenCategories: nextHidden,
      };
    });
  }, [updateState]);

  const setHiddenCategories = useCallback((cats: string[]) => {
    updateState((prev) => ({
      ...prev,
      hiddenCategories: cats,
    }));
  }, [updateState]);

  const addRecurringBill = useCallback((bill: Omit<RecurringBill, 'id'>) => {
    updateState((prev) => {
      const newBill: RecurringBill = {
        ...bill,
        id: `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      const currentBills = prev.recurringBills && prev.recurringBills.length > 0
        ? prev.recurringBills
        : DEFAULT_RECURRING_BILLS;
      return {
        ...prev,
        recurringBills: [...currentBills, newBill],
      };
    });
  }, [updateState]);

  const updateRecurringBill = useCallback((bill: RecurringBill) => {
    updateState((prev) => {
      const currentBills = prev.recurringBills && prev.recurringBills.length > 0
        ? prev.recurringBills
        : DEFAULT_RECURRING_BILLS;
      const nextBills = currentBills.map((b) => (b.id === bill.id ? bill : b));
      return {
        ...prev,
        recurringBills: nextBills,
      };
    });
  }, [updateState]);

  const deleteRecurringBill = useCallback((id: string) => {
    updateState((prev) => {
      const currentBills = prev.recurringBills && prev.recurringBills.length > 0
        ? prev.recurringBills
        : DEFAULT_RECURRING_BILLS;
      const nextBills = currentBills.filter((b) => b.id !== id);
      return {
        ...prev,
        recurringBills: nextBills,
      };
    });
  }, [updateState]);

  const setLanguage = useCallback((language: Language) => {
    updateState((prev) => ({ ...prev, language }));
  }, [updateState]);

  const setCurrency = useCallback((currency: Currency) => {
    updateState((prev) => ({ ...prev, currency }));
  }, [updateState]);

  const setSavingsGoal = useCallback((savingsGoalMonthly: number) => {
    updateState((prev) => ({ ...prev, savingsGoalMonthly }));
  }, [updateState]);

  const setDailySpendTarget = useCallback((dailySpendTarget: number) => {
    updateState((prev) => ({ ...prev, dailySpendTarget }));
  }, [updateState]);

  const resetToSampleData = useCallback(() => {
    const next: FinanceState = {
      transactions: INITIAL_SAMPLE_TRANSACTIONS,
      investments: INITIAL_SAMPLE_INVESTMENTS,
      language: 'en',
      currency: 'JPY',
      savingsGoalMonthly: 50000,
  dailySpendTarget: 3000,
      hiddenCategories: [],
      recurringBills: DEFAULT_RECURRING_BILLS,
    };
    saveState(next);
    setState(next);
  }, []);

  const clearAllData = useCallback(() => {
    const next: FinanceState = {
      transactions: [],
      investments: [],
      language: 'en',
      currency: 'JPY',
      savingsGoalMonthly: 50000,
  dailySpendTarget: 3000,
      hiddenCategories: [],
      recurringBills: [],
    };
    saveState(next);
    setState(next);
  }, []);

  const importData = useCallback((importedState: Partial<FinanceState>) => {
    updateState((prev) => ({
      transactions: Array.isArray(importedState.transactions) ? importedState.transactions : prev.transactions,
      investments: Array.isArray(importedState.investments) ? importedState.investments : prev.investments,
      language: importedState.language || prev.language,
      currency: importedState.currency || prev.currency,
      savingsGoalMonthly: typeof importedState.savingsGoalMonthly === 'number' ? importedState.savingsGoalMonthly : prev.savingsGoalMonthly,
      dailySpendTarget: typeof importedState.dailySpendTarget === 'number' ? importedState.dailySpendTarget : prev.dailySpendTarget,
      hiddenCategories: Array.isArray(importedState.hiddenCategories) ? importedState.hiddenCategories : (prev.hiddenCategories || []),
      recurringBills: Array.isArray(importedState.recurringBills) ? importedState.recurringBills : (prev.recurringBills || DEFAULT_RECURRING_BILLS),
    }));
  }, [updateState]);

  return {
    state,
    isHydrated,
    addTransaction,
    deleteTransaction,
    addOrUpdateInvestment,
    deleteInvestment,
    toggleHideCategory,
    setHiddenCategories,
    addRecurringBill,
    updateRecurringBill,
    deleteRecurringBill,
    setLanguage,
    setCurrency,
    setSavingsGoal,
    setDailySpendTarget,
    resetToSampleData,
    clearAllData,
    importData,
  };
}

export function exportDataAsJSON(state: FinanceState): string {
  return JSON.stringify(state, null, 2);
}

export function exportTransactionsAsCSV(transactions: Transaction[]): string {
  const header = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Currency', 'Source', 'Note', 'IsRecurring'];
  const rows = transactions.map((t) => [
    t.id,
    t.date,
    t.type,
    t.category,
    t.amount,
    t.currency,
    t.source,
    `"${(t.note || '').replace(/"/g, '""')}"`,
    t.isRecurring ? 'true' : 'false',
  ]);

  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
