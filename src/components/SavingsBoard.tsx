'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Currency, Language, Transaction } from '@/types/finance';
import { formatCurrency, translations } from '@/lib/i18n';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { Edit3 } from 'lucide-react';
import { convertCurrency, DEFAULT_RATES, ExchangeRates, formatNumberWithCommas, parseRawNumber } from '@/lib/currency';
import {
  Wallet,
  ShieldCheck,
  Check,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';

interface SavingsBoardProps {
  language: Language;
  currency: Currency;
  rates?: ExchangeRates;
  transactions: Transaction[];
  savingsGoalMonthly: number;
  savingsGoalCurrency?: Currency;
  onUpdateGoal: (goal: number, goalCurrency?: Currency) => void;
  onAddSavings: (amount: number, note?: string) => void;
  onDeleteTransaction?: (id: string) => void;
  onUpdateTransaction?: (tx: Transaction) => void;
}

export function SavingsBoard({
  language,
  currency,
  rates = DEFAULT_RATES,
  transactions,
  savingsGoalMonthly,
  savingsGoalCurrency,
  onUpdateGoal,
  onAddSavings,
  onDeleteTransaction,
  onUpdateTransaction,
}: SavingsBoardProps) {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const t = translations[language];

  const [customAmountStr, setCustomAmountStr] = useState('');
  const [savingsNote, setSavingsNote] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [currentMonthStr, setCurrentMonthStr] = useState<string>('2026-11');

  useEffect(() => {
    const now = new Date();
    setCurrentMonthStr(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  // Goal converted to current currency with exact base-currency preservation
  const currentGoalInCurrency = useMemo(() => {
    const baseCurr = savingsGoalCurrency || 'JPY';
    if (baseCurr === currency) {
      return savingsGoalMonthly;
    }
    return Math.round(convertCurrency(savingsGoalMonthly, baseCurr, currency, rates));
  }, [savingsGoalMonthly, savingsGoalCurrency, currency, rates]);

  const [goalInput, setGoalInput] = useState(formatNumberWithCommas(currentGoalInCurrency));

  useEffect(() => {
    setGoalInput(formatNumberWithCommas(currentGoalInCurrency));
  }, [currentGoalInCurrency]);

  // Total saved this month converted to active currency
  const actualSavedThisMonth = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'savings' && tx.date.startsWith(currentMonthStr))
      .reduce((sum, tx) => {
        return sum + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
      }, 0);
  }, [transactions, currentMonthStr, currency, rates]);

  // Total accumulated lifetime cash savings converted to active currency
  const totalAccumulatedSavings = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'savings')
      .reduce((sum, tx) => {
        return sum + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
      }, 0);
  }, [transactions, currency, rates]);

  // Total income this month for savings rate calculation
  const monthlyIncome = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'income' && tx.date.startsWith(currentMonthStr))
      .reduce((sum, tx) => {
        return sum + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
      }, 0);
  }, [transactions, currentMonthStr, currency, rates]);

  // Target progress & remaining based on total accumulated savings (Emergency Reserve / Vault Goal)
  const targetProgress = useMemo(() => {
    if (currentGoalInCurrency <= 0) return 0;
    return Math.min(100, Math.round((totalAccumulatedSavings / currentGoalInCurrency) * 100));
  }, [totalAccumulatedSavings, currentGoalInCurrency]);

  const savingsRate = useMemo(() => {
    if (monthlyIncome <= 0) return 0;
    return Math.min(100, Math.round((actualSavedThisMonth / monthlyIncome) * 100));
  }, [monthlyIncome, actualSavedThisMonth]);

  const remainingToGoal = Math.max(0, currentGoalInCurrency - totalAccumulatedSavings);
  const isGoalAchieved = currentGoalInCurrency > 0 && totalAccumulatedSavings >= currentGoalInCurrency;

  const handleSaveQuick = (amount: number) => {
    onAddSavings(amount, language === "ja" ? "クイック貯金振替" : "Quick Savings Allocation");
    setStatusMessage(language === "ja" ? `${formatCurrency(amount, currency)} を貯蓄へ振替しました！` : `Saved ${formatCurrency(amount, currency)} to reserves! (Can be deleted below if clicked by mistake)`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseRawNumber(customAmountStr);
    if (!val || val <= 0) return;
    onAddSavings(val, savingsNote.trim() || undefined);
    setCustomAmountStr('');
    setSavingsNote('');
    setStatusMessage(language === "ja" ? `${formatCurrency(val, currency)} を貯蓄へ振替しました！` : `Saved ${formatCurrency(val, currency)} to reserves!`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseRawNumber(goalInput);
    if (!isNaN(val) && val >= 0) {
      onUpdateGoal(val, currency);
      setIsEditingGoal(false);
      setStatusMessage('Monthly savings target updated!');
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  const handleSelectGoalPreset = (val: number) => {
    setGoalInput(formatNumberWithCommas(val));
    onUpdateGoal(val, currency);
    setIsEditingGoal(false);
    setStatusMessage('Monthly savings target updated!');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleDeleteItem = (id: string) => {
    if (onDeleteTransaction) {
      onDeleteTransaction(id);
      setStatusMessage('Savings entry removed.');
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  // Quick preset deposit amounts
  const quickPresets = useMemo(() => {
    if (currency === 'JPY') return [10000, 30000, 50000, 100000];
    if (currency === 'IDR') return [500000, 1000000, 2000000, 5000000];
    if (currency === 'MMK') return [50000, 100000, 250000, 500000];
    return [50, 100, 250, 500];
  }, [currency]);

  // Target preset amounts
  const goalPresets = useMemo(() => {
    if (currency === 'JPY') return [30000, 50000, 80000, 100000, 200000];
    if (currency === 'IDR') return [1000000, 2000000, 5000000, 10000000];
    if (currency === 'MMK') return [200000, 500000, 1000000, 2000000];
    return [200, 350, 500, 1000];
  }, [currency]);

  return (
    <div className="space-y-6">
      {/* Hero Stats Card (Consistent Executive Liquid Glass Design) */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  p-6 sm:p-8 shadow-[var(--card-shadow)] relative overflow-hidden transition-all duration-200 space-y-6">
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t.savings.title}
              </span>
              <span className="text-xs text-[var(--text-faint)] font-mono">
                • {currentMonthStr}
              </span>
            </div>
            <div className="flex items-baseline space-x-3 mt-1.5 flex-wrap">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)] tabular-numbers font-mono">
                {formatCurrency(totalAccumulatedSavings, currency)}
              </h2>
              <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] font-mono">
                / {formatCurrency(currentGoalInCurrency, currency)} {language === 'ja' ? '目標貯蓄額' : 'savings target'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {t.savings.emergencyFundHint}
            </p>
          </div>

          {/* Interactive Adjust Target Button */}
          <button
            type="button"
            onClick={() => setIsEditingGoal(!isEditingGoal)}
            className={`inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer ${
              isEditingGoal
                ? 'bg-[var(--bg-surface-solid)] border-[var(--border-strong)] text-[var(--text-main)] ring-1 ring-[var(--border-strong)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] hover:border-[var(--border-strong)] text-[var(--text-main)]'
            }`}
          >
            {isEditingGoal ? (
              <>
                <X className="w-4 h-4" />
                <span>{t.actions.cancel}</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="w-4 h-4" />
                <span>{t.savings.adjustTarget}</span>
              </>
            )}
          </button>
        </div>

        {/* Adjust Goal Form (Glass Accordion) */}
        {isEditingGoal && (
          <form
            onSubmit={handleSaveGoal}
            className="relative z-10 p-4 sm:p-5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {t.savings.adjustTarget} ({currency})
              </label>
              <span className="text-[11px] text-[var(--text-faint)] font-mono">
                {language === 'ja' ? '生活防衛資金・目標額' : 'Total reserve goal'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={goalInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                    setGoalInput(formatNumberWithCommas(raw));
                  }}
                  placeholder="0"
                  className="w-full bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl pl-4 pr-16 py-3 sm:py-2.5 text-base sm:text-sm font-bold text-[var(--text-main)] outline-none tabular-numbers font-mono"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[var(--text-muted)] pointer-events-none select-none">
                  {currency}
                </span>
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] hover:opacity-90 px-6 py-3 sm:py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer shrink-0 text-center"
              >
                {t.savings.updateTarget}
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-[var(--text-muted)] mr-1 font-mono">
                {language === "ja" ? "プリセット:" : "Presets:"}
              </span>
              {goalPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelectGoalPreset(val)}
                  className="px-3 py-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-solid)] hover:border-[var(--border-strong)] text-xs font-semibold text-[var(--text-main)] tabular-numbers font-mono transition-all cursor-pointer"
                >
                  {formatCurrency(val, currency)}
                </button>
              ))}
            </div>
          </form>
        )}

        {/* Progress & Target Awareness Indicator */}
        <div className="relative z-10 space-y-3 pt-2">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-xs font-bold font-mono ${
                  isGoalAchieved
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                }`}
              >
                {isGoalAchieved ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{language === 'ja' ? `目標達成 (${formatCurrency(totalAccumulatedSavings, currency)} 蓄積済)` : `Target Achieved (${formatCurrency(totalAccumulatedSavings, currency)} saved)`}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{language === 'ja' ? `順調 (残り ${formatCurrency(remainingToGoal, currency)})` : `On Track (${formatCurrency(remainingToGoal, currency)} remaining)`}</span>
                  </>
                )}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-[var(--text-muted)] font-mono">
                {t.savings.targetProgress}: {targetProgress}%
              </span>
            </div>
          </div>

          {/* Liquid Glass Progress Bar */}
          <div className="w-full h-3.5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                isGoalAchieved
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500'
              }`}
              style={{ width: `${Math.min(100, targetProgress)}%` }}
            />
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-fade-in shadow-xs">
            <Check className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* 3 KPI Stats Sub-cards (Consistent with Daily Spend & Executive Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Accumulated Lifetime Cash Reserves */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-xs space-y-1">
          <span className="text-xs text-[var(--text-muted)] font-medium block">
            {t.savings.accumulatedReserves}
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[var(--text-main)] tabular-numbers font-mono">
            {formatCurrency(totalAccumulatedSavings, currency)}
          </p>
          <p className="text-[10px] text-[var(--text-faint)]">
            {language === 'ja' ? '手元に確保された累計防衛資金' : 'Lifetime liquid buffer across all time'}
          </p>
        </div>

        {/* {language === 'ja' ? '今月の貯蓄率' : 'Monthly Savings Rate'} */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-xs space-y-1">
          <span className="text-xs text-[var(--text-muted)] font-medium block">
            {language === 'ja' ? '今月の貯蓄率' : 'Monthly Savings Rate'}
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[var(--text-main)] tabular-numbers font-mono flex items-center space-x-1.5">
            <span className="text-[var(--accent-amber)]">{savingsRate}%</span>
            <span className="text-[var(--text-faint)] text-xs font-normal">{language === 'ja' ? '収入比' : 'of income'}</span>
          </p>
          <p className="text-[10px] text-[var(--text-faint)]">
            {language === 'ja' ? `今月振替済: ${formatCurrency(actualSavedThisMonth, currency)}` : `${formatCurrency(actualSavedThisMonth, currency)} allocated this month`}
          </p>
        </div>

        {/* Remaining to Goal */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-xs space-y-1">
          <span className="text-xs text-[var(--text-muted)] font-medium block">
            {language === 'ja' ? '目標達成まであと' : 'Remaining to Target'}
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[var(--text-main)] tabular-numbers font-mono">
            {remainingToGoal === 0 ? (
              <span className="text-emerald-500">{language === 'ja' ? '達成！' : 'Achieved!'}</span>
            ) : (
              formatCurrency(remainingToGoal, currency)
            )}
          </p>
          <p className="text-[10px] text-[var(--text-faint)]">
            {remainingToGoal === 0 ? (language === 'ja' ? '貯蓄目標を達成しました' : 'Target reached') : (language === 'ja' ? '目標額に到達するために必要' : 'Needed to reach target')}
          </p>
        </div>
      </div>

      {/* Fast Deposit Panel */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  p-6 sm:p-7 shadow-[var(--card-shadow)] space-y-4 transition-all duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[var(--accent-amber)]" />
            <span>{t.savings.quickTransferTitle}</span>
          </h3>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {language === 'ja' ? 'ワンタップ振替' : '1-Tap Allocation'}
          </span>
        </div>

        {/* 1-Tap Preset Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {quickPresets.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleSaveQuick(val)}
              className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] hover:border-[var(--accent-amber)] transition-all text-center group cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold group-hover:text-[var(--accent-amber)]">
                {t.actions.add}
              </span>
              <span className="text-sm font-bold text-[var(--text-main)] tabular-numbers font-mono block mt-0.5">
                +{formatCurrency(val, currency)}
              </span>
            </button>
          ))}
        </div>

        {/* Custom Save Form (Live Comma Formatted) */}
        <form onSubmit={handleCustomSubmit} className="pt-2 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              inputMode="decimal"
              value={customAmountStr}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, '');
                setCustomAmountStr(formatNumberWithCommas(raw));
              }}
              placeholder={language === 'ja' ? '任意の貯蓄金額を入力...' : 'Custom savings amount...'}
              className="bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--accent-amber)] rounded-xl px-4 py-3 text-xs sm:text-sm text-[var(--text-main)] placeholder-[var(--text-faint)] outline-none tabular-numbers font-mono transition-all"
            />
            <input
              type="text"
              value={savingsNote}
              onChange={(e) => setSavingsNote(e.target.value)}
              placeholder={language === 'ja' ? 'メモ（例: ボーナス分、生活防衛資金など）...' : 'Note (e.g. bonus portion, emergency buffer)...'}
              className="bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-3 text-xs sm:text-sm text-[var(--text-main)] placeholder-[var(--text-faint)] outline-none transition-all"
            />
          </div>
          {/* Executive Monochrome Button */}
          <button
            type="submit"
            disabled={!customAmountStr || parseRawNumber(customAmountStr) <= 0}
            className="w-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] hover:opacity-90 py-3.5 rounded-xl text-xs sm:text-sm font-bold disabled:opacity-30 transition-all active:scale-[0.99] cursor-pointer"
          >
            {t.savings.addSavingsRecord}
          </button>
        </form>
      </div>

      {/* Savings Allocation History (with Delete Action) */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  p-6 sm:p-7 shadow-[var(--card-shadow)] space-y-3 transition-all duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-[var(--accent-amber)]" />
            <span>{t.savings.activityFeed}</span>
          </h3>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {transactions.filter((tx) => tx.type === 'savings').length} {t.record.items}
          </span>
        </div>

        {transactions.filter((tx) => tx.type === 'savings').length === 0 ? (
          <p className="text-xs text-[var(--text-faint)] py-8 text-center">
            {t.record.noTransactions}
          </p>
        ) : (
          <div className="space-y-2">
            {transactions
              .filter((tx) => tx.type === 'savings')
              .map((tx) => {
                const convertedAmount = convertCurrency(
                  tx.amount,
                  tx.currency || 'JPY',
                  currency,
                  rates
                );

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] flex items-center justify-between text-xs transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-[var(--accent-amber-soft)] border border-[var(--accent-amber-soft)] text-[var(--accent-amber)] flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-main)]">
                          {tx.note || (language === 'ja' ? '貯金振替' : 'Savings Transfer')}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">{tx.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <span className="font-bold text-[var(--accent-amber)] tabular-numbers font-mono">
                        +{formatCurrency(convertedAmount, currency)}
                      </span>
                      {onUpdateTransaction && (
                        <button
                          type="button"
                          onClick={() => setEditingTx(tx)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                          title={t.actions.edit}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteTransaction && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(tx.id)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title={t.actions.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={!!editingTx}
        transaction={editingTx}
        language={language}
        currency={currency}
        onClose={() => setEditingTx(null)}
        onSave={(updated) => {
          if (onUpdateTransaction) onUpdateTransaction(updated);
        }}
      />
    </div>
  );
}
