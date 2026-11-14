'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Currency, ExpenseCategory, FinanceState, InvestmentAsset, Language, MonthlyBudgetPlan, RecurringBill, Transaction } from '@/types/finance';

const STORAGE_KEY = 'dailyba_finance_v1';

export const DEFAULT_STATE: FinanceState = {
  transactions: [],
  investments: [],
  language: 'en',
  currency: 'JPY',
  savingsGoalMonthly: 50000,
  savingsGoalCurrency: 'JPY',
  dailySpendTarget: 3000,
  dailySpendCurrency: 'JPY',
  hiddenCategories: [],
  recurringBills: [],
  monthlyBudgets: {},
  monthStartDay: 1,
  dailyReminderEnabled: false,
  dailyReminderTime: '20:00',
  autoBackupFrequency: 'daily',
  lastAutoBackupAt: undefined,
};

// Known mock identifiers to purge permanently
const MOCK_TX_IDS = new Set([
  'tx_inc_1', 'tx_sav_1', 'tx_rent_1', 'tx_fam_1', 'tx_vps_1',
  'tx_mob_1', 'tx_food_1', 'tx_train_1', 'tx_laundry_1', 'tx_shop_1'
]);
const MOCK_INV_IDS = new Set(['inv_1', 'inv_2', 'inv_3', 'inv_4']);
const MOCK_BILL_IDS = new Set(['rec_rent', 'rec_vps', 'rec_mobile', 'rec_family']);

export function filterOutMockData(state: Partial<FinanceState>): Partial<FinanceState> {
  return {
    ...state,
    transactions: Array.isArray(state.transactions)
      ? state.transactions.filter((tx) => !MOCK_TX_IDS.has(tx.id))
      : [],
    investments: Array.isArray(state.investments)
      ? state.investments.filter((inv) => !MOCK_INV_IDS.has(inv.id))
      : [],
    recurringBills: Array.isArray(state.recurringBills)
      ? state.recurringBills.filter((bill) => !MOCK_BILL_IDS.has(bill.id))
      : [],
  };
}

export function getStoredState(): FinanceState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const cleaned = filterOutMockData(parsed);
      return {
        transactions: cleaned.transactions || [],
        investments: cleaned.investments || [],
        language: parsed.language || 'en',
        currency: parsed.currency || 'JPY',
        savingsGoalMonthly: typeof parsed.savingsGoalMonthly === 'number' ? parsed.savingsGoalMonthly : 50000,
        savingsGoalCurrency: parsed.savingsGoalCurrency || parsed.currency || 'JPY',
        dailySpendTarget: typeof parsed.dailySpendTarget === 'number' ? parsed.dailySpendTarget : 3000,
        dailySpendCurrency: parsed.dailySpendCurrency || parsed.currency || 'JPY',
        hiddenCategories: Array.isArray(parsed.hiddenCategories) ? parsed.hiddenCategories : [],
        recurringBills: cleaned.recurringBills || [],
        monthlyBudgets: parsed.monthlyBudgets && typeof parsed.monthlyBudgets === 'object' ? parsed.monthlyBudgets : {},
        monthStartDay: typeof parsed.monthStartDay === 'number' && parsed.monthStartDay >= 1 && parsed.monthStartDay <= 31 ? parsed.monthStartDay : 1,
        dailyReminderEnabled: typeof parsed.dailyReminderEnabled === 'boolean' ? parsed.dailyReminderEnabled : false,
        dailyReminderTime: typeof parsed.dailyReminderTime === 'string' ? parsed.dailyReminderTime : '20:00',
        autoBackupFrequency: parsed.autoBackupFrequency || 'daily',
        lastAutoBackupAt: parsed.lastAutoBackupAt,
        deletedTxIds: Array.isArray(parsed.deletedTxIds) ? parsed.deletedTxIds.slice(0, 500) : [],
      };
    }
  } catch (e) {
    console.error('Failed to parse storage:', e);
  }

  return DEFAULT_STATE;
}

export function saveState(state: FinanceState): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = filterOutMockData(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.error('Failed to save storage:', e);
  }
}

export function useFinanceStore() {
  const [state, setState] = useState<FinanceState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const stateRef = useRef<FinanceState>(DEFAULT_STATE);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const initial = getStoredState();
    setState(initial);
    setIsHydrated(true);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const cleaned = filterOutMockData(parsed) as FinanceState;
          setState(cleaned);
        } catch (err) {
          console.error('Failed to sync storage event:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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

  const updateTransaction = useCallback((updatedTx: Transaction) => {
    updateState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => (t.id === updatedTx.id ? updatedTx : t)),
    }));
  }, [updateState]);

  const deleteTransaction = useCallback((id: string) => {
    updateState((prev) => {
      const nextDeleted = [id, ...(prev.deletedTxIds || [])].slice(0, 500);
      return {
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
        deletedTxIds: nextDeleted,
      };
    });
  }, [updateState]);

  const addTransactionWithId = useCallback((tx: Transaction) => {
    updateState((prev) => {
      if (prev.transactions.some((t) => t.id === tx.id)) {
        return prev;
      }
      return {
        ...prev,
        transactions: [tx, ...prev.transactions],
      };
    });
  }, [updateState]);

  const addOrUpdateInvestment = useCallback((asset: InvestmentAsset) => {
    updateState((prev) => {
      const exists = prev.investments.some((inv) => inv.id === asset.id);
      let nextInvestments: InvestmentAsset[];
      if (exists) {
        nextInvestments = prev.investments.map((inv) => (inv.id === asset.id ? asset : inv));
      } else {
        nextInvestments = [asset, ...prev.investments];
      }
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

  const toggleHideCategory = useCallback((category: ExpenseCategory | string) => {
    updateState((prev) => {
      const isHidden = prev.hiddenCategories.includes(category);
      const nextHidden = isHidden
        ? prev.hiddenCategories.filter((c) => c !== category)
        : [...prev.hiddenCategories, category];
      return {
        ...prev,
        hiddenCategories: nextHidden,
      };
    });
  }, [updateState]);

  const setHiddenCategories = useCallback((categories: (ExpenseCategory | string)[]) => {
    updateState((prev) => ({
      ...prev,
      hiddenCategories: categories,
    }));
  }, [updateState]);

  const addRecurringBill = useCallback((bill: Omit<RecurringBill, 'id'>) => {
    updateState((prev) => {
      const newBill: RecurringBill = {
        ...bill,
        id: `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      return {
        ...prev,
        recurringBills: [...prev.recurringBills, newBill],
      };
    });
  }, [updateState]);

  const updateRecurringBill = useCallback((updatedBill: RecurringBill) => {
    updateState((prev) => ({
      ...prev,
      recurringBills: prev.recurringBills.map((b) => (b.id === updatedBill.id ? updatedBill : b)),
    }));
  }, [updateState]);

  const deleteRecurringBill = useCallback((id: string) => {
    updateState((prev) => ({
      ...prev,
      recurringBills: prev.recurringBills.filter((b) => b.id !== id),
    }));
  }, [updateState]);

  const setLanguage = useCallback((language: Language) => {
    updateState((prev) => ({ ...prev, language }));
  }, [updateState]);

  const setCurrency = useCallback((currency: Currency) => {
    updateState((prev) => ({ ...prev, currency }));
  }, [updateState]);

  const setSavingsGoal = useCallback((goal: number, currency?: Currency) => {
    updateState((prev) => ({
      ...prev,
      savingsGoalMonthly: goal,
      ...(currency ? { savingsGoalCurrency: currency } : {}),
    }));
  }, [updateState]);

  const setDailySpendTarget = useCallback((target: number, currency?: Currency) => {
    updateState((prev) => ({
      ...prev,
      dailySpendTarget: target,
      ...(currency ? { dailySpendCurrency: currency } : {}),
    }));
  }, [updateState]);

  const updateMonthlyBudget = useCallback((monthKey: string, budget: MonthlyBudgetPlan) => {
    updateState((prev) => ({
      ...prev,
      monthlyBudgets: {
        ...(prev.monthlyBudgets || {}),
        [monthKey]: budget,
      },
    }));
  }, [updateState]);

  const setDailyReminder = useCallback(
    (enabled: boolean, time?: string) => {
      updateState((prev) => ({
        ...prev,
        dailyReminderEnabled: enabled,
        dailyReminderTime: time || prev.dailyReminderTime || '20:00',
      }));
    },
    [updateState]
  );

  const updateMonthStartDay = useCallback((day: number) => {
    const safeDay = Math.max(1, Math.min(31, Math.round(day) || 1));
    updateState((prev) => ({
      ...prev,
      monthStartDay: safeDay,
    }));
  }, [updateState]);

  const setAutoBackupFrequency = useCallback((frequency: 'off' | 'daily' | 'weekly') => {
    updateState((prev) => ({
      ...prev,
      autoBackupFrequency: frequency,
    }));
  }, [updateState]);

  const updateLastAutoBackupAt = useCallback((timestamp: string) => {
    updateState((prev) => ({
      ...prev,
      lastAutoBackupAt: timestamp,
    }));
  }, [updateState]);

  const resetToSampleData = useCallback(() => {
    const next: FinanceState = {
      transactions: [],
      investments: [],
      language: 'en',
      currency: 'JPY',
      savingsGoalMonthly: 50000,
      savingsGoalCurrency: 'JPY',
      dailySpendTarget: 3000,
      dailySpendCurrency: 'JPY',
      hiddenCategories: [],
      recurringBills: [],
      monthlyBudgets: {},
      autoBackupFrequency: 'daily',
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
      savingsGoalCurrency: 'JPY',
      dailySpendTarget: 3000,
      dailySpendCurrency: 'JPY',
      hiddenCategories: [],
      recurringBills: [],
      monthlyBudgets: {},
      autoBackupFrequency: 'daily',
    };
    saveState(next);
    setState(next);
  }, []);

  const importData = useCallback((importedState: Partial<FinanceState>) => {
    const cleaned = filterOutMockData(importedState);
    updateState((prev) => ({
      transactions: Array.isArray(cleaned.transactions) ? cleaned.transactions : prev.transactions,
      investments: Array.isArray(cleaned.investments) ? cleaned.investments : prev.investments,
      language: importedState.language || prev.language,
      currency: importedState.currency || prev.currency,
      savingsGoalMonthly: typeof importedState.savingsGoalMonthly === 'number' ? importedState.savingsGoalMonthly : prev.savingsGoalMonthly,
      savingsGoalCurrency: importedState.savingsGoalCurrency || prev.savingsGoalCurrency || importedState.currency || prev.currency,
      dailySpendTarget: typeof importedState.dailySpendTarget === 'number' ? importedState.dailySpendTarget : prev.dailySpendTarget,
      dailySpendCurrency: importedState.dailySpendCurrency || prev.dailySpendCurrency || importedState.currency || prev.currency,
      hiddenCategories: Array.isArray(importedState.hiddenCategories) ? importedState.hiddenCategories : (prev.hiddenCategories || []),
      recurringBills: Array.isArray(cleaned.recurringBills) ? cleaned.recurringBills : (Array.isArray(prev.recurringBills) ? prev.recurringBills : []),
      monthlyBudgets: importedState.monthlyBudgets && typeof importedState.monthlyBudgets === 'object' ? importedState.monthlyBudgets : (prev.monthlyBudgets || {}),
      monthStartDay: typeof importedState.monthStartDay === 'number' ? importedState.monthStartDay : (prev.monthStartDay || 1),
      autoBackupFrequency: importedState.autoBackupFrequency || prev.autoBackupFrequency || 'daily',
      lastAutoBackupAt: importedState.lastAutoBackupAt || prev.lastAutoBackupAt,
      deletedTxIds: Array.isArray(importedState.deletedTxIds)
        ? Array.from(new Set([...(importedState.deletedTxIds || []), ...(prev.deletedTxIds || [])])).slice(0, 500)
        : (prev.deletedTxIds || []),
    }));
  }, [updateState]);

  return {
    state,
    isHydrated,
    addTransaction,
    addTransactionWithId,
    updateTransaction,
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
    updateMonthlyBudget,
    updateMonthStartDay,
    setDailyReminder,
    setAutoBackupFrequency,
    updateLastAutoBackupAt,
    resetToSampleData,
    clearAllData,
    importData,
  };
}

export function exportDataAsJSON(state: FinanceState): string {
  const cleaned = filterOutMockData(state) as FinanceState;
  return JSON.stringify(cleaned, null, 2);
}

export function exportTransactionsAsCSV(transactions: Transaction[]): string {
  const cleanedTx = transactions.filter((t) => !MOCK_TX_IDS.has(t.id));
  const header = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Currency', 'Source', 'Note', 'IsRecurring'];
  const rows = cleanedTx.map((t) => [
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
