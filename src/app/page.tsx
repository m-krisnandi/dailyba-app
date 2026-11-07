'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useFinanceStore } from '@/lib/storage';
import { useExchangeRates, convertCurrency } from '@/lib/currency';
import { useAuth } from '@/lib/authContext';
import { Header } from '@/components/Header';
import { TabKey, TabsNav } from '@/components/TabsNav';
import { QuickRecordBoard } from '@/components/QuickRecordBoard';
import { DailySpendBoard } from '@/components/DailySpendBoard';
import { MonthlySummaryBoard } from '@/components/MonthlySummaryBoard';
import { YearlySummaryBoard } from '@/components/YearlySummaryBoard';
import { InvestmentBoard } from '@/components/InvestmentBoard';
import { SavingsBoard } from '@/components/SavingsBoard';
import { BackupModal } from '@/components/BackupModal';
import { AuthModal } from '@/components/AuthModal';

const VALID_TABS: TabKey[] = ['record', 'daily', 'monthly', 'yearly', 'investments', 'savings'];

function getInitialTab(): TabKey {
  if (typeof window !== 'undefined') {
    try {
      const hash = window.location.hash.replace('#', '') as TabKey;
      if (VALID_TABS.includes(hash)) return hash;
      const saved = localStorage.getItem('kakeibo_active_tab') as TabKey;
      if (VALID_TABS.includes(saved)) return saved;
    } catch {
      // Ignore storage access errors
    }
  }
  return 'record';
}

export default function Home() {
  const {
    state,
    isHydrated,
    addTransaction,
    deleteTransaction,
    addOrUpdateInvestment,
    deleteInvestment,
    toggleHideCategory,
    addRecurringBill,
    updateRecurringBill,
    deleteRecurringBill,
    setLanguage,
    setCurrency,
    setSavingsGoal,
    setDailySpendTarget,
    updateMonthlyBudget,
    clearAllData,
    importData,
  } = useFinanceStore();

  const {
    isAuthenticated,
    user,
    pushStateToCloud,
    pullStateFromCloud,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('record');
  const [isMounted, setIsMounted] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Cloud Sync Coordination
  const hasInitialSyncedRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  // Sync activeTab with URL hash and localStorage after client hydration
  useEffect(() => {
    const current = getInitialTab();
    if (current) {
      setActiveTab(current);
    }
    setIsMounted(true);
    if (typeof window !== 'undefined' && window.location.hash !== `#${current}`) {
      window.history.replaceState(null, '', `#${current}`);
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabKey;
      if (VALID_TABS.includes(hash)) {
        setActiveTab(hash);
        try {
          localStorage.setItem('kakeibo_active_tab', hash);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // When user logs in or mounts with authenticated session:
  useEffect(() => {
    if (!isHydrated) return;

    if (isAuthenticated && user?.id) {
      // Detect fresh login
      if (prevUserIdRef.current !== user.id) {
        prevUserIdRef.current = user.id;
        pullStateFromCloud().then((cloudData) => {
          if (cloudData && (cloudData.transactions || cloudData.recurringBills || cloudData.investments)) {
            importData(cloudData);
          } else {
            // Brand new account: start fresh with clean empty data
            clearAllData();
          }
          hasInitialSyncedRef.current = true;
        });
      }
    } else {
      if (prevUserIdRef.current) {
        // User logged out: clear private data from screen so next person starts clean
        clearAllData();
      }
      prevUserIdRef.current = null;
      hasInitialSyncedRef.current = false;
    }
  }, [isAuthenticated, user?.id, isHydrated, clearAllData, importData, pullStateFromCloud]);

  // Reactive Auto-Save to Cloud when local state changes
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !hasInitialSyncedRef.current) return;
    pushStateToCloud(state);
  }, [state, isHydrated, isAuthenticated, pushStateToCloud]);

  const handleManualSync = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    // Pull latest and push local
    const remote = await pullStateFromCloud();
    if (remote) {
      importData(remote);
    } else {
      await pushStateToCloud(state);
    }
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kakeibo_active_tab', tab);
        window.history.replaceState(null, '', `#${tab}`);
      } catch {
        // ignore
      }
    }
  };

  // Live Exchange Rates reactive hook
  const rates = useExchangeRates();

  // Total liquid cash savings calculation converted into current active currency
  const totalLiquidSavings = useMemo(() => {
    return state.transactions
      .filter((tx) => tx.type === 'savings')
      .reduce((sum, tx) => {
        return sum + convertCurrency(tx.amount, tx.currency || 'JPY', state.currency, rates);
      }, 0);
  }, [state.transactions, state.currency, rates]);

  const handleAddSavings = (amount: number, note?: string) => {
    addTransaction({
      type: 'savings',
      amount,
      category: 'savings',
      source: 'bank',
      currency: state.currency,
      date: new Date().toISOString().split('T')[0],
      note: note || 'Savings Allocation',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-main)] selection:bg-emerald-500/30 transition-colors duration-200">
      {/* Top Header */}
      <Header
        language={state.language}
        currency={state.currency}
        rates={rates}
        onLanguageChange={setLanguage}
        onCurrencyChange={setCurrency}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onManualSync={handleManualSync}
      />

      {/* Tabs Navigation (Floating iOS Liquid Glass Dock) */}
      <TabsNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        language={state.language}
        isMounted={isMounted}
      />

      {/* Main Container without stacking context trap */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 relative">
        {!isMounted ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-44 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur-xl p-6 flex flex-col justify-between">
              <div className="h-4 w-32 rounded-lg bg-[var(--bg-subtle)]" />
              <div className="h-10 w-48 rounded-xl bg-[var(--bg-subtle)]" />
              <div className="h-3 w-64 rounded-lg bg-[var(--bg-subtle)]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-36 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/40" />
              <div className="h-36 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/40" />
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'record' && (
          <QuickRecordBoard
            language={state.language}
            currency={state.currency}
            rates={rates}
            transactions={state.transactions}
            hiddenCategories={state.hiddenCategories || []}
            recurringBills={state.recurringBills}
            onAddTransaction={addTransaction}
            onDeleteTransaction={deleteTransaction}
            onToggleHideCategory={toggleHideCategory}
            onAddRecurringBill={addRecurringBill}
            onUpdateRecurringBill={updateRecurringBill}
            onDeleteRecurringBill={deleteRecurringBill}
          />
        )}

        {activeTab === 'daily' && (
          <DailySpendBoard
            language={state.language}
            currency={state.currency}
            rates={rates}
            transactions={state.transactions}
            dailySpendTarget={state.dailySpendTarget}
            onUpdateDailyTarget={setDailySpendTarget}
            onDeleteTransaction={deleteTransaction}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlySummaryBoard
            language={state.language}
            currency={state.currency}
            rates={rates}
            transactions={state.transactions}
            hiddenCategories={state.hiddenCategories || []}
            monthlyBudgets={state.monthlyBudgets || {}}
            onUpdateMonthlyBudget={updateMonthlyBudget}
          />
        )}

        {activeTab === 'yearly' && (
          <YearlySummaryBoard
            language={state.language}
            currency={state.currency}
            rates={rates}
            transactions={state.transactions}
            hiddenCategories={state.hiddenCategories || []}
          />
        )}

        {activeTab === 'investments' && (
          <InvestmentBoard
            language={state.language}
            currency={state.currency}
            rates={rates}
            investments={state.investments}
            totalLiquidSavings={totalLiquidSavings}
            onAddOrUpdateInvestment={addOrUpdateInvestment}
            onDeleteInvestment={deleteInvestment}
          />
        )}

        {activeTab === 'savings' && (
          <SavingsBoard
            language={state.language}
            currency={state.currency}
            rates={rates}
            transactions={state.transactions}
            savingsGoalMonthly={state.savingsGoalMonthly}
            onUpdateGoal={setSavingsGoal}
            onAddSavings={handleAddSavings}
            onDeleteTransaction={deleteTransaction}
          />
        )}
          </>
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-[var(--border-subtle)] py-5 text-center text-xs text-[var(--text-muted)] font-mono transition-colors duration-200">
        <p>Dailyba • Daily Balance & Wealth Tracker</p>
      </footer>

      {/* Backup & Import Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        language={state.language}
        state={state}
        onImportData={importData}
        onClearAll={clearAllData}
      />

      {/* Cloud Authentication & Sync Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          handleManualSync();
        }}
      />
    </div>
  );
}
