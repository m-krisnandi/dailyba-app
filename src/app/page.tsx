'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useFinanceStore } from '@/lib/storage';
import { useExchangeRates, convertCurrency } from '@/lib/currency';
import { useAuth } from '@/lib/authContext';
import { Header } from '@/components/Header';
import { TabKey, TabsNav } from '@/components/TabsNav';
import { HomeBoard } from '@/components/HomeBoard';
import { QuickRecordBoard } from '@/components/QuickRecordBoard';
import { DailySpendBoard } from '@/components/DailySpendBoard';
import { MonthlySummaryBoard } from '@/components/MonthlySummaryBoard';
import { YearlySummaryBoard } from '@/components/YearlySummaryBoard';
import { InvestmentBoard } from '@/components/InvestmentBoard';
import { SavingsBoard } from '@/components/SavingsBoard';
import { BackupModal } from '@/components/BackupModal';
import { ChangelogModal } from '@/components/ChangelogModal';
import { APP_VERSION } from '@/lib/version';
import { AuthModal } from '@/components/AuthModal';
import { BankEmailSyncModal } from '@/components/BankEmailSyncModal';
import { AppLockOverlay } from '@/components/AppLockOverlay';
import { WelcomeOnboardingModal } from '@/components/WelcomeOnboardingModal';
import { AppReviewPromptModal } from '@/components/AppReviewPromptModal';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { ReceiptScannerModal } from '@/components/ReceiptScannerModal';
import { Currency, Language } from '@/types/finance';
import { isAppLockEnabled, isBiometricAuthenticating, isRecentlyUnlocked } from '@/lib/biometricAuth';
import { scheduleBillDueReminders, scheduleDailyReminder } from '@/lib/localNotifications';
import { dailybaApi } from '@/lib/api';
import { Transaction } from '@/types/finance';
import { getTodayLocalDate } from '@/lib/dateUtils';

const VALID_TABS: TabKey[] = ['home', 'record', 'daily', 'monthly', 'yearly', 'investments', 'savings'];

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
  return 'home';
}

export default function Home() {
  const rates = useExchangeRates();
  const {
    state,
    isHydrated,
    addTransaction,
    addTransactionWithId,
    updateTransaction,
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
    updateMonthStartDay,
    addCustomCategory,
    deleteCustomCategory,
    clearAllData,
    importData,
    setDailyReminder,
    setAutoBackupFrequency,
    updateLastAutoBackupAt,
  } = useFinanceStore();

  const {
    isAuthenticated,
    user,
    pushStateToCloud,
    pullStateFromCloud,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('record');
  const [autoOpenScanner, setAutoOpenScanner] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [isEmailSyncModalOpen, setIsEmailSyncModalOpen] = useState(false);
  const [pendingEmailSyncCount, setPendingEmailSyncCount] = useState(0);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isReviewPromptOpen, setIsReviewPromptOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && isHydrated) {
      const hasCompleted = localStorage.getItem("dailyba_onboarding_completed_v1");
      if (!hasCompleted && state.transactions.length === 0) {
        setIsOnboardingOpen(true);
      }
    }
  }, [isHydrated, state.transactions.length]);

  const handleCompleteOnboarding = (opts: {
    language: Language;
    currency: Currency;
    dailySpendTarget?: number;
  }) => {
    setLanguage(opts.language);
    setCurrency(opts.currency);
    if (opts.dailySpendTarget) {
      setDailySpendTarget(opts.dailySpendTarget);
    }
    setDailyReminder(true, "20:00");
    scheduleDailyReminder(true, "20:00", opts.language);
    try {
      localStorage.setItem("dailyba_onboarding_completed_v1", "true");
    } catch {}
    setIsOnboardingOpen(false);
  };

  // Schedule daily 20:00 local reminder
  useEffect(() => {
    if (!isHydrated) return;
    if (state.dailyReminderEnabled) {
      scheduleDailyReminder(true, state.dailyReminderTime || "20:00", state.language);
    }
  }, [isHydrated, state.dailyReminderEnabled, state.dailyReminderTime, state.language]);

  const checkReviewMilestone = useCallback((txCount: number) => {
    if (typeof window === "undefined") return;
    try {
      const dismissed = localStorage.getItem("dailyba_review_dismissed_v1");
      if (dismissed === "forever") return;
      const snoozeUntil = Number(localStorage.getItem("dailyba_review_snooze_until") || 0);
      if (Date.now() < snoozeUntil) return;

      if (txCount >= 7) {
        setIsReviewPromptOpen(true);
      }
    } catch {}
  }, []);

  const handleAddTransactionWithReview = useCallback((tx: Parameters<typeof addTransaction>[0]) => {
    addTransaction(tx);
    checkReviewMilestone(state.transactions.length + 1);
  }, [addTransaction, checkReviewMilestone, state.transactions.length]);

  const refreshEmailSyncCount = useCallback(() => {
    if (typeof window !== 'undefined' && isAuthenticated) {
      dailybaApi.getEmailSyncStatus().then(async res => {
        const data = res.data || (res as any);
        if (data && typeof data.pendingCount !== 'undefined') {
          setPendingEmailSyncCount(data.pendingCount);
          // If Gmail is linked, automatically trigger background sync and pull new verified transactions
          if (data.isConnected) {
            const syncRes = await dailybaApi.triggerEmailSync().catch(() => null);
            if (syncRes && syncRes.success) {
              if ((syncRes as any).autoRecordedCount > 0) {
                const cloudState = await pullStateFromCloud();
                if (cloudState) {
                  importData(cloudState);
                }
              }
            }
          }
        }
      }).catch(() => {});
    }
  }, [isAuthenticated, pullStateFromCloud, importData]);

  // Initial tab hydration & biometric check
  useEffect(() => {
    setIsMounted(true);
    const initial = getInitialTab();
    setActiveTab(initial);

    // Schedule 1-day advance recurring bill notifications
    if (state.recurringBills && state.recurringBills.length > 0) {
      scheduleBillDueReminders(state.recurringBills, state.language);
    }

    // Check Biometric lock
    if (isAppLockEnabled() && !isRecentlyUnlocked() && !isBiometricAuthenticating()) {
      setIsAppLocked(true);
    }

    // Check version changelog
    try {
      const lastSeenVer = localStorage.getItem('dailyba_last_seen_version');
      if (lastSeenVer && lastSeenVer !== APP_VERSION) {
        setIsChangelogModalOpen(true);
      }
      localStorage.setItem('dailyba_last_seen_version', APP_VERSION);
    } catch {}
  }, [state.recurringBills, state.language]);

  // Sync email pending count on mount & every 5 minutes if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    refreshEmailSyncCount();
    const interval = setInterval(refreshEmailSyncCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshEmailSyncCount]);

  // Handle URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as TabKey;
      if (VALID_TABS.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kakeibo_active_tab', tab);
        window.location.hash = tab;
      } catch {
        // Ignore storage access errors
      }
    }
  };

  // Auto-backup handler (debounced on cloud sync)
  const handleManualSync = async (): Promise<void> => {
    if (!isAuthenticated) return;
    const ok = await pushStateToCloud(state);
    if (ok) {
      updateLastAutoBackupAt(new Date().toISOString());
    }
  };

  // Add savings directly into transactions
  const handleAddSavings = (amount: number, note?: string) => {
    handleAddTransactionWithReview({
      type: 'savings',
      amount,
      category: 'savings',
      source: 'bank',
      currency: state.currency,
      date: getTodayLocalDate(),
      note: note || undefined,
    });
  };

  // Handle approved transactions from Email Sync
  const handleApproveBankTransactions = (approved: Transaction[]) => {
    approved.forEach((tx) => {
      handleAddTransactionWithReview({
        ...tx,
        type: 'expense',
        currency: tx.currency || state.currency,
      });
    });
    if (isAuthenticated) {
      setTimeout(handleManualSync, 1000);
    }
  };

  // Calculate liquid savings for investments
  const totalLiquidSavings = useMemo(() => {
    return state.transactions
      .filter((t) => t.type === 'savings')
      .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency || 'JPY', state.currency, rates), 0);
  }, [state.transactions, state.currency, rates]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-main)] transition-colors duration-200">
      {/* Top Header & Navigation - Only shown on traditional tabs */}
      {activeTab !== 'home' && (
        <>
          <Header
            language={state.language}
            currency={state.currency}
            rates={rates}
            onLanguageChange={setLanguage}
            onCurrencyChange={setCurrency}
            onOpenBackup={() => setIsBackupModalOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenEmailSync={() => setIsEmailSyncModalOpen(true)}
            pendingEmailSyncCount={pendingEmailSyncCount}
            onManualSync={handleManualSync}
          />
          <TabsNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            language={state.language}
            isMounted={isMounted}
          />
        </>
      )}

      {/* Main Content */}
      {activeTab === 'home' ? (
        <HomeBoard
          state={state}
          rates={rates}
          user={user}
          pendingEmailSyncCount={pendingEmailSyncCount}
          onNavigateTab={handleTabChange}
          onOpenEmailSync={() => setIsEmailSyncModalOpen(true)}
          onOpenScanner={() => setIsReceiptScannerOpen(true)}
          onOpenAddTransaction={() => setIsAddTxModalOpen(true)}
          onOpenMenu={() => {
            if (isAuthenticated) {
              setIsBackupModalOpen(true);
            } else {
              setIsAuthModalOpen(true);
            }
          }}
          onAddTransaction={handleAddTransactionWithReview}
          onDeleteTransaction={deleteTransaction}
          onAddRecurringBill={addRecurringBill}
          onUpdateRecurringBill={updateRecurringBill}
          onDeleteRecurringBill={deleteRecurringBill}
        />
      ) : (
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
            initialScanOpen={autoOpenScanner}
            language={state.language}
            currency={state.currency}
            rates={rates}
            transactions={state.transactions}
            hiddenCategories={state.hiddenCategories || []}
            customCategories={state.customCategories || []}
            onAddCustomCategory={addCustomCategory}
            onDeleteCustomCategory={deleteCustomCategory}
            recurringBills={state.recurringBills}
            dailySpendTarget={state.dailySpendTarget}
            pendingEmailSyncCount={pendingEmailSyncCount}
            onOpenEmailSync={() => setIsEmailSyncModalOpen(true)}
            onAddTransaction={handleAddTransactionWithReview}
            onDeleteTransaction={deleteTransaction}
            onUpdateTransaction={updateTransaction}
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
            hiddenCategories={state.hiddenCategories || []}
            customCategories={state.customCategories || []}
            dailySpendTarget={state.dailySpendTarget}
            dailySpendCurrency={state.dailySpendCurrency}
            onUpdateDailyTarget={setDailySpendTarget}
            onDeleteTransaction={deleteTransaction}
            onUpdateTransaction={updateTransaction}
            onAddTransaction={addTransaction}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlySummaryBoard
            language={state.language}
            currency={state.currency}
            rates={rates}
            transactions={state.transactions}
            hiddenCategories={state.hiddenCategories || []}
            customCategories={state.customCategories || []}
            monthlyBudgets={state.monthlyBudgets || {}}
            monthStartDay={state.monthStartDay || 1}
            onUpdateMonthStartDay={updateMonthStartDay}
            onUpdateMonthlyBudget={updateMonthlyBudget}
            onAddTransaction={addTransaction}
          />
        )}

        {activeTab === 'yearly' && (
          <YearlySummaryBoard
            language={state.language}
            currency={state.currency}
            rates={rates}
            transactions={state.transactions}
            hiddenCategories={state.hiddenCategories || []}
            customCategories={state.customCategories || []}
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
            savingsGoalCurrency={state.savingsGoalCurrency}
            onUpdateGoal={setSavingsGoal}
            onAddSavings={handleAddSavings}
            onDeleteTransaction={deleteTransaction}
            onUpdateTransaction={updateTransaction}
          />
        )}
          </>
        )}
      </main>
      )}

      {/* Full Quick Add Bottom Sheet Modal */}
      <AddTransactionModal
        isOpen={isAddTxModalOpen}
        onClose={() => setIsAddTxModalOpen(false)}
        onAddTransaction={handleAddTransactionWithReview}
        language={state.language}
        currency={state.currency}
        hiddenCategories={state.hiddenCategories || []}
        customCategories={state.customCategories || []}
      />

      {/* Direct Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onAddTransaction={handleAddTransactionWithReview}
        language={state.language}
        currency={state.currency}
        hiddenCategories={state.hiddenCategories || []}
        customCategories={state.customCategories || []}
      />

      {/* Settings / Cloud Backup Modal (Unified Settings via Avatar) */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        language={state.language}
        state={state}
        onImportData={importData}
        onClearAll={clearAllData}
        onToggleReminder={setDailyReminder}
        onSetAutoBackupFrequency={setAutoBackupFrequency}
        onManualSync={handleManualSync}
      />

      {/* Cloud Authentication & Sync Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={state.language}
        onSuccess={() => {
          handleManualSync();
        }}
      />

      {/* Version Changelog Modal */}
      <ChangelogModal language={state.language}
        isOpen={isChangelogModalOpen}
        onClose={() => setIsChangelogModalOpen(false)}
      />

      {/* Bank & Email Sync Modal */}
      <BankEmailSyncModal
        isOpen={isEmailSyncModalOpen}
        onClose={() => {
          setIsEmailSyncModalOpen(false);
          refreshEmailSyncCount();
        }}
        language={state.language}
        hiddenCategories={state.hiddenCategories || []}
        customCategories={state.customCategories || []}
        onApproveTransactions={handleApproveBankTransactions}
        onPendingCountChange={setPendingEmailSyncCount}
        existingTransactions={state.transactions}
      />

      {/* First-time Welcome Onboarding Modal */}
      <WelcomeOnboardingModal
        isOpen={isOnboardingOpen}
        currentLanguage={state.language}
        currentCurrency={state.currency}
        onComplete={handleCompleteOnboarding}
      />

      {/* Google Play In-App Review Prompt Modal */}
      <AppReviewPromptModal
        isOpen={isReviewPromptOpen}
        language={state.language}
        onClose={() => {
          try {
            localStorage.setItem("dailyba_review_snooze_until", String(Date.now() + 14 * 86400000));
          } catch {}
          setIsReviewPromptOpen(false);
        }}
        onDismissForever={() => {
          try {
            localStorage.setItem("dailyba_review_dismissed_v1", "forever");
          } catch {}
          setIsReviewPromptOpen(false);
        }}
      />

      {/* Biometric & PIN Security App Lock Overlay */}
      <AppLockOverlay
        isLocked={isAppLocked}
        onUnlock={() => setIsAppLocked(false)}
        language={state.language}
      />

    </div>
  );
}
