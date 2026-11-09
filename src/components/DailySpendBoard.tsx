'use client';

import React, { useMemo, useState } from 'react';
import { Currency, ExpenseCategory, Language, Transaction } from '@/types/finance';
import { formatCurrency, translations } from '@/lib/i18n';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { TransactionDetailModal } from '@/components/TransactionDetailModal';
import { Edit3 } from 'lucide-react';
import { convertCurrency, DEFAULT_RATES, ExchangeRates, formatNumberWithCommas, parseRawNumber } from '@/lib/currency';
import { EXPENSE_CATEGORY_ICONS } from '@/lib/constants';
import {
  Plus,
  CalendarDays,
  SlidersHorizontal,
  Check,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

interface DailySpendBoardProps {
  language: Language;
  currency: Currency;
  rates?: ExchangeRates;
  transactions: Transaction[];
  dailySpendTarget?: number;
  dailySpendCurrency?: Currency;
  onUpdateDailyTarget: (target: number, currency?: Currency) => void;
  onDeleteTransaction?: (id: string) => void;
  onUpdateTransaction?: (tx: Transaction) => void;
  onAddTransaction?: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

export function DailySpendBoard({
  language,
  currency,
  rates = DEFAULT_RATES,
  transactions,
  dailySpendTarget = 3000,
  dailySpendCurrency,
  onUpdateDailyTarget,
  onDeleteTransaction,
  onUpdateTransaction,
  onAddTransaction,
}: DailySpendBoardProps) {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [addExpenseDate, setAddExpenseDate] = useState<string>('');
  const t = translations[language];

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Target converted to active currency with exact base-currency preservation
  const targetInCurrency = useMemo(() => {
    const baseCurr = dailySpendCurrency || 'JPY';
    if (baseCurr === currency) {
      return dailySpendTarget;
    }
    return Math.round(convertCurrency(dailySpendTarget, baseCurr, currency, rates));
  }, [dailySpendTarget, dailySpendCurrency, currency, rates]);

  // Target input state
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInputStr, setTargetInputStr] = useState(formatNumberWithCommas(targetInCurrency));
  const [filterMode, setFilterMode] = useState<'month' | 'week' | 'custom' | 'all'>('month');
  const [customFrom, setCustomFrom] = useState<string>(() => `${currentMonthStr}-01`);
  const [customTo, setCustomTo] = useState<string>(() => todayStr);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({ [todayStr]: true });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync target input when currency or target changes
  React.useEffect(() => {
    setTargetInputStr(formatNumberWithCommas(targetInCurrency));
  }, [targetInCurrency]);

  // Filter only expense transactions
  const expenseTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.type === 'expense');
  }, [transactions]);

  // Group expenses by date (YYYY-MM-DD)
  const expensesByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of expenseTransactions) {
      const list = map.get(tx.date) || [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return map;
  }, [expenseTransactions]);

  // Today's total spent
  const todayTransactions = useMemo(() => {
    return expensesByDate.get(todayStr) || [];
  }, [expensesByDate, todayStr]);

  const todaySpentInCurrency = useMemo(() => {
    return todayTransactions.reduce((sum, tx) => {
      return sum + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
    }, 0);
  }, [todayTransactions, currency, rates]);

  const todayRemaining = targetInCurrency - todaySpentInCurrency;
  const todayUsagePct =
    targetInCurrency > 0 ? Math.round((todaySpentInCurrency / targetInCurrency) * 100) : 0;
  const isTodayOver = todaySpentInCurrency > targetInCurrency;

  // Monthly stats & daily breakdown
  const monthlyExpenses = useMemo(() => {
    return expenseTransactions.filter((tx) => tx.date.startsWith(currentMonthStr));
  }, [expenseTransactions, currentMonthStr]);

  const monthlyTotalSpent = useMemo(() => {
    return monthlyExpenses.reduce((sum, tx) => {
      return sum + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
    }, 0);
  }, [monthlyExpenses, currency, rates]);

  // Days tracked this month
  const daysWithExpensesCount = useMemo(() => {
    const uniqueDates = new Set(monthlyExpenses.map((tx) => tx.date));
    return uniqueDates.size;
  }, [monthlyExpenses]);

  // Days in month that exceeded target
  const monthlyDaysStats = useMemo(() => {
    const dailySums = new Map<string, number>();
    for (const tx of monthlyExpenses) {
      const current = dailySums.get(tx.date) || 0;
      dailySums.set(tx.date, current + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates));
    }
    let safeDays = 0;
    let overDays = 0;
    dailySums.forEach((amount) => {
      if (amount <= targetInCurrency) {
        safeDays++;
      } else {
        overDays++;
      }
    });
    return { safeDays, overDays, totalDaysRecorded: dailySums.size };
  }, [monthlyExpenses, targetInCurrency, currency, rates]);

  const averageDailySpend = useMemo(() => {
    if (daysWithExpensesCount === 0) return 0;
    return Math.round(monthlyTotalSpent / daysWithExpensesCount);
  }, [monthlyTotalSpent, daysWithExpensesCount]);

  // Chart data: current month day-by-day (e.g. days 1..today or all days in month)
  const chartData = useMemo(() => {
    const year = parseInt(currentMonthStr.split('-')[0], 10);
    const month = parseInt(currentMonthStr.split('-')[1], 10);
    const todayDay = parseInt(todayStr.split('-')[2], 10);

    // Show up to current day (or at least 7 days)
    const totalDaysToShow = Math.max(todayDay, 7);
    const result: { dayLabel: string; date: string; amount: number; isOver: boolean }[] = [];

    for (let day = 1; day <= totalDaysToShow; day++) {
      const dayFormatted = String(day).padStart(2, '0');
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${dayFormatted}`;
      const dayTxs = expensesByDate.get(dateKey) || [];
      const total = dayTxs.reduce((sum, tx) => {
        return sum + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
      }, 0);

      result.push({
        dayLabel: `${month}/${day}`,
        date: dateKey,
        amount: total,
        isOver: total > targetInCurrency,
      });
    }
    return result;
  }, [currentMonthStr, todayStr, expensesByDate, currency, rates, targetInCurrency]);

  // List of unique dates sorted descending (newest first)
  const sortedDates = useMemo(() => {
    // Collect all dates from transactions plus today
    const dateSet = new Set<string>();
    dateSet.add(todayStr);
    expenseTransactions.forEach((tx) => dateSet.add(tx.date));

    let array = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

    if (filterMode === 'month') {
      array = array.filter((d) => d.startsWith(currentMonthStr));
    } else if (filterMode === 'week') {
      const todayDate = new Date(todayStr);
      const sevenDaysAgo = new Date(todayDate);
      sevenDaysAgo.setDate(todayDate.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      array = array.filter((d) => d >= sevenDaysAgoStr && d <= todayStr);
    } else if (filterMode === 'custom') {
      if (customFrom && customTo) {
        const start = customFrom <= customTo ? customFrom : customTo;
        const end = customFrom <= customTo ? customTo : customFrom;
        array = array.filter((d) => d >= start && d <= end);
      } else if (customFrom) {
        array = array.filter((d) => d >= customFrom);
      } else if (customTo) {
        array = array.filter((d) => d <= customTo);
      }
    }
    return array;
  }, [expenseTransactions, todayStr, currentMonthStr, filterMode, customFrom, customTo]);

  // Quick preset targets
  const targetPresets = useMemo(() => {
    if (currency === 'JPY') return [1500, 2500, 3000, 5000, 10000];
    if (currency === 'IDR') return [50000, 100000, 150000, 250000, 500000];
    if (currency === 'MMK') return [10000, 20000, 40000, 70000, 150000];
    return [15, 25, 40, 60, 100];
  }, [currency]);

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseRawNumber(targetInputStr);
    if (!isNaN(val) && val > 0) {
      onUpdateDailyTarget(val, currency);
      setIsEditingTarget(false);
      setStatusMessage(language === "ja" ? "日次支出目標を更新しました！" : "Daily target updated successfully!");
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  const handleSelectPreset = (val: number) => {
    setTargetInputStr(formatNumberWithCommas(val));
    onUpdateDailyTarget(val, currency);
    setIsEditingTarget(false);
    setStatusMessage(language === "ja" ? "日次支出目標を更新しました！" : "Daily target updated successfully!");
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const toggleDateExpanded = (date: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Hero Stats Card (Apple Liquid Glass) */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  p-6 sm:p-8 shadow-[var(--card-shadow)] relative overflow-hidden transition-all duration-200 space-y-6">

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t.dailySpend.title}
              </span>
              <span className="text-xs text-[var(--text-faint)] font-mono">
                • {todayStr}
              </span>
            </div>
            <div className="flex items-baseline space-x-3 mt-1.5 flex-wrap">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)] tabular-numbers font-mono">
                {formatCurrency(todaySpentInCurrency, currency)}
              </h2>
              <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] font-mono">
                / {formatCurrency(targetInCurrency, currency)} {t.dailySpend.todayTarget.toLowerCase()}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {t.dailySpend.subtitle}
            </p>
          </div>

          {/* Action Buttons: Responsive 2-column on mobile, inline on desktop */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:space-x-2 shrink-0 mt-1 sm:mt-0">
            {onAddTransaction && (
              <button
                type="button"
                onClick={() => {
                  setAddExpenseDate(todayStr);
                  setIsAddExpenseModalOpen(true);
                }}
                className="flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2.5 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] hover:opacity-90 active:scale-95 text-xs sm:text-sm font-bold transition-all cursor-pointer min-w-0"
                title={language === "ja" ? "今日の支出を記録" : "Record Today's Spend"}
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  <span className="sm:hidden">{t.dailySpend.addSpend}</span>
                  <span className="hidden sm:inline">{t.record.recordTodayExpense || "Record Today's Spend"}</span>
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsEditingTarget(!isEditingTarget)}
              className={`flex items-center justify-center space-x-1.5 px-3 sm:px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer min-w-0 ${
                isEditingTarget
                  ? 'bg-[var(--bg-surface-solid)] border-[var(--border-strong)] text-[var(--text-main)] ring-1 ring-[var(--border-strong)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] hover:border-[var(--border-strong)] text-[var(--text-main)]'
              }`}
            >
              {isEditingTarget ? (
                <>
                  <X className="w-4 h-4 shrink-0" />
                  <span>{t.actions.cancel}</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">{t.dailySpend.setTarget}</span>
                    <span className="hidden sm:inline">{t.dailySpend.adjustDailyTarget}</span>
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Adjust Daily Target Form (Glass Accordion) */}
        {isEditingTarget && (
          <form
            onSubmit={handleSaveTarget}
            className="relative z-10 p-4 sm:p-5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {t.dailySpend.adjustDailyTarget} ({currency})
              </label>
              <span className="text-[11px] text-[var(--text-faint)] font-mono">
                {language === 'ja' ? '無理のない1日の限度額を設定' : 'Set comfortable everyday limit'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetInputStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                    setTargetInputStr(formatNumberWithCommas(raw));
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
                {t.dailySpend.updateDailyTarget}
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-[var(--text-muted)] mr-1 font-mono">
                {language === "ja" ? "プリセット:" : "Presets:"}
              </span>
              {targetPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelectPreset(val)}
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
                  isTodayOver
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    : todayUsagePct > 75
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isTodayOver ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{t.dailySpend.overBudgetStatus} (+{formatCurrency(Math.abs(todayRemaining), currency)})</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t.dailySpend.safeStatus} ({formatCurrency(todayRemaining, currency)} left)</span>
                  </>
                )}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-[var(--text-muted)] font-mono">
                {t.dailySpend.targetProgress}: {todayUsagePct}%
              </span>
            </div>
          </div>

          {/* Liquid Glass Progress Bar */}
          <div className="w-full h-3.5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                isTodayOver
                  ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                  : todayUsagePct > 75
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                  : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              }`}
              style={{ width: `${Math.min(100, todayUsagePct)}%` }}
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

      {/* 3 KPI Stats Sub-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Average Daily Spend */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-xs space-y-1">
          <span className="text-xs text-[var(--text-muted)] font-medium block">
            {t.dailySpend.averageDaily}
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[var(--text-main)] tabular-numbers font-mono">
            {formatCurrency(averageDailySpend, currency)}
          </p>
          <p className="text-[10px] text-[var(--text-faint)]">
            {language === 'ja' ? '今月の活動日数に基づく' : 'Based on active days this month'}
          </p>
        </div>

        {/* Target Discipline */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-xs space-y-1">
          <span className="text-xs text-[var(--text-muted)] font-medium block">
            {t.dailySpend.targetAdherence}
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[var(--text-main)] tabular-numbers font-mono flex items-center space-x-1.5">
            <span className="text-emerald-500">{monthlyDaysStats.safeDays} {t.dailySpend.safeDays}</span>
            <span className="text-[var(--text-faint)] text-sm">/</span>
            <span className={monthlyDaysStats.overDays > 0 ? 'text-rose-500 text-sm' : 'text-[var(--text-muted)] text-sm'}>
              {monthlyDaysStats.overDays} {t.dailySpend.overDays}
            </span>
          </p>
          <p className="text-[10px] text-[var(--text-faint)]">
            {monthlyDaysStats.totalDaysRecorded} {t.dailySpend.daysTracked.toLowerCase()}
          </p>
        </div>

        {/* Monthly Running Total */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-xs space-y-1">
          <span className="text-xs text-[var(--text-muted)] font-medium block">
            {t.dailySpend.monthToDateSpend}
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[var(--text-main)] tabular-numbers font-mono">
            {formatCurrency(monthlyTotalSpent, currency)}
          </p>
          <p className="text-[10px] text-[var(--text-faint)]">
            {language === 'ja' ? `${currentMonthStr}の総支出` : `Total expenses in ${currentMonthStr}`}
          </p>
        </div>
      </div>

      {/* Visual Daily Spending Bar Chart (with Target Reference Line) */}
      <div className="p-5 sm:p-7 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-[var(--card-shadow)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 text-[var(--accent-emerald)]" />
              <span>{t.dailySpend.dailyTrendTitle}</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {language === 'ja' ? '緑 = 目標内 • 赤 = 目標超過' : 'Green = within daily budget • Red = exceeded target'}
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="flex items-center space-x-1 text-emerald-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              <span>{t.dailySpend.withinTargetLegend}</span>
            </span>
            <span className="flex items-center space-x-1 text-rose-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
              <span>{t.dailySpend.exceededLegend}</span>
            </span>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="dayLabel"
                stroke="var(--text-muted)"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-subtle)' }}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-subtle)' }}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                  if (val >= 1000) return `${Math.round(val / 1000)}k`;
                  return String(val);
                }}
              />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: 'var(--bg-surface-solid)',
                  borderColor: 'var(--border-strong)',
                  borderRadius: '16px',
                  fontSize: '12px',
                  boxShadow: 'var(--modal-shadow)',
                  backdropFilter: 'blur(30px)',
                  padding: '10px 14px',
                }}
                itemStyle={{
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
                labelStyle={{
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '11px',
                  marginBottom: '2px',
                }}
                formatter={(val) => [formatCurrency(Number(val) || 0, currency), language === 'ja' ? '日次支出' : 'Daily Spend']}
              />
              {/* Daily Target Reference Line */}
              <ReferenceLine
                y={targetInCurrency}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `${language === 'ja' ? '目標' : 'Target'}: ${formatCurrency(targetInCurrency, currency)}`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopRight',
                  fontFamily: 'monospace',
                }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.amount === 0 ? 'var(--bg-subtle)' : entry.isOver ? '#f43f5e' : '#10b981'}
                    opacity={entry.amount === 0 ? 0.3 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Day-by-Day Detailed History Feed */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  p-5 sm:p-7 shadow-[var(--card-shadow)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              {t.dailySpend.dailyHistoryTitle}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {language === 'ja' ? '日ごとの支出明細一覧' : 'Detailed list of transactions per day'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)] overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === 'month'
                  ? 'bg-[var(--bg-surface-solid)] text-[var(--text-main)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t.dailySpend.filterThisMonth}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('week')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === 'week'
                  ? 'bg-[var(--bg-surface-solid)] text-[var(--text-main)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t.dailySpend.filterThisWeek}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('custom')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === 'custom'
                  ? 'bg-[var(--bg-surface-solid)] text-[var(--text-main)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t.dailySpend.filterCustom}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === 'all'
                  ? 'bg-[var(--bg-surface-solid)] text-[var(--text-main)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t.dailySpend.filterAll}
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker Accordion */}
        {filterMode === 'custom' && (
          <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 animate-fade-in text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {t.dailySpend.from}:
              </span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] text-[var(--text-main)] font-mono text-xs focus:border-[var(--border-strong)] outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {t.dailySpend.to}:
              </span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] text-[var(--text-main)] font-mono text-xs focus:border-[var(--border-strong)] outline-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Date cards */}
        {sortedDates.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-faint)]">
            {t.dailySpend.noExpenses}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDates.map((dateKey) => {
              const dayTxs = expensesByDate.get(dateKey) || [];
              const dayTotalInCurrency = dayTxs.reduce((sum, tx) => {
                return sum + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
              }, 0);
              const isToday = dateKey === todayStr;
              const isOver = dayTotalInCurrency > targetInCurrency;
              const isExpanded = Boolean(expandedDates[dateKey]);

              return (
                <div
                  key={dateKey}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isToday
                      ? 'border-[var(--border-strong)] bg-[var(--bg-surface-solid)] shadow-xs ring-1 ring-[var(--border-subtle)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {/* Date Card Header (Clickable Accordion) */}
                  <div
                    onClick={() => toggleDateExpanded(dateKey)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none space-x-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border-subtle)] ${
                          isOver
                            ? 'bg-rose-500/10 text-rose-500'
                            : dayTotalInCurrency > 0
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-faint)]'
                        }`}
                      >
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)] font-mono whitespace-nowrap shrink-0">
                            {dateKey}
                          </h4>
                          {isToday && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[var(--accent-emerald)] text-white text-[10px] font-bold shrink-0">
                              {language === 'ja' ? '今日' : 'Today'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                          {dayTxs.length} {t.record.items}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <p
                          className={`text-xs sm:text-sm font-bold tabular-numbers font-mono ${
                            isOver
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-[var(--text-main)]'
                          }`}
                        >
                          {formatCurrency(dayTotalInCurrency, currency)}
                        </p>
                        <span
                          className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border inline-block mt-0.5 whitespace-nowrap ${
                            dayTotalInCurrency === 0
                              ? 'border-[var(--border-subtle)] text-[var(--text-faint)]'
                              : isOver
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {dayTotalInCurrency === 0
                            ? (language === 'ja' ? '支出なし' : '0 Spent')
                            : isOver
                            ? (language === 'ja' ? `+${formatCurrency(dayTotalInCurrency - targetInCurrency, currency)} 超過` : `Over +${formatCurrency(dayTotalInCurrency - targetInCurrency, currency)}`)
                            : (language === 'ja' ? '目標内' : 'Within Target')}
                        </span>
                      </div>
                      <div className="text-[var(--text-muted)]">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Transaction Items for this day */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[var(--border-subtle)] space-y-2 bg-[var(--bg-subtle)]">
                      {dayTxs.length === 0 ? (
                        <div className="py-3 text-center space-y-2">
                          <p className="text-xs text-[var(--text-faint)]">
                            {t.dailySpend.noExpenses}
                          </p>
                          {onAddTransaction && (
                            <button
                              type="button"
                              onClick={() => {
                                setAddExpenseDate(dateKey);
                                setIsAddExpenseModalOpen(true);
                              }}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-solid)] border border-[var(--border-strong)] text-xs font-bold text-[var(--text-main)] hover:border-[var(--border-specular)] transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{isToday ? (t.record.recordTodayExpense || (language === "ja" ? "今日の支出を記録" : "Record Today's Spend")) : (language === "ja" ? "この日の支出を追加" : "Add Expense for this Day")}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        dayTxs.map((tx) => {
                          const Icon =
                            EXPENSE_CATEGORY_ICONS[tx.category as ExpenseCategory] || AlertCircle;
                          const catLabel =
                            t.expenseCategories[tx.category as ExpenseCategory] || tx.category;
                          const convertedAmount = convertCurrency(
                            tx.amount,
                            tx.currency || 'JPY',
                            currency,
                            rates
                          );

                          return (
                            <div
                              key={tx.id}
                              onClick={() => setSelectedDetailTx(tx)}
                              className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] flex items-center justify-between space-x-2 group transition-all cursor-pointer"
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-main)] shrink-0">
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[var(--text-main)] truncate">
                                    {catLabel}
                                  </p>
                                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                                    {t.sources[tx.source]}
                                    {tx.note ? ` • ${tx.note}` : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2.5 shrink-0">
                                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-numbers font-mono">
                                  -{formatCurrency(convertedAmount, currency)}
                                </span>
                                {onUpdateTransaction && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setEditingTx(tx); }}
                                    className="p-1 rounded text-[var(--text-faint)] hover:text-[var(--text-main)] transition-all cursor-pointer opacity-70 hover:opacity-100"
                                    title={t.actions.edit}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {onDeleteTransaction && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDeleteTransaction(tx.id); }}
                                    className="p-1 rounded text-[var(--text-faint)] hover:text-rose-500 transition-all cursor-pointer opacity-70 hover:opacity-100"
                                    title={t.actions.delete}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
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
      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={!!selectedDetailTx}
        transaction={selectedDetailTx}
        language={language}
        currency={currency}
        rates={rates}
        onClose={() => setSelectedDetailTx(null)}
        onEdit={(tx) => {
          setSelectedDetailTx(null);
          setEditingTx(tx);
        }}
        onDelete={
          onDeleteTransaction
            ? (id) => {
                setSelectedDetailTx(null);
                onDeleteTransaction(id);
              }
            : undefined
        }
      />
      {/* Add Transaction Modal */}
      {onAddTransaction && (
        <AddTransactionModal
          isOpen={isAddExpenseModalOpen}
          initialType="expense"
          initialDate={addExpenseDate || todayStr}
          currency={currency}
          language={language}
          onClose={() => setIsAddExpenseModalOpen(false)}
          onAddTransaction={onAddTransaction}
          title={addExpenseDate === todayStr ? (t.record.recordTodayExpense || "Record Today's Spend") : `Record Expense (${addExpenseDate})`}
        />
      )}
    </div>
  );
}
