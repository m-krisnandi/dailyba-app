'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Currency, ExpenseCategory, Language, MonthlyBudgetPlan, Transaction } from '@/types/finance';
import { formatCurrency, translations } from '@/lib/i18n';
import { EXPENSE_CATEGORY_ICONS } from '@/lib/constants';
import { convertCurrency, DEFAULT_RATES, ExchangeRates, formatNumberWithCommas, parseRawNumber } from '@/lib/currency';
import {
  ArrowDownRight,
  ArrowUpRight,
  Vault,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Flame,
  Percent,
  Calendar,
  Target,
  Edit3,
  X,
  Check,
  ChevronDown,
  AlertCircle,
  Plus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';

interface MonthlySummaryBoardProps {
  language: Language;
  currency: Currency;
  rates?: ExchangeRates;
  transactions: Transaction[];
  hiddenCategories?: string[];
  monthlyBudgets?: Record<string, MonthlyBudgetPlan>;
  onUpdateMonthlyBudget?: (month: string, plan: MonthlyBudgetPlan) => void;
}

const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_JA = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export function MonthlySummaryBoard({
  language,
  currency,
  rates = DEFAULT_RATES,
  transactions,
  hiddenCategories = [],
  monthlyBudgets = {},
  onUpdateMonthlyBudget,
}: MonthlySummaryBoardProps) {
  const t = translations[language];

  // Selected month YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(2026);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // Budget Modal State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [modalTotalTarget, setModalTotalTarget] = useState<string>('');
  const [modalCategoryTargets, setModalCategoryTargets] = useState<Record<string, string>>({});

  useEffect(() => {
    const current = new Date().toISOString().slice(0, 7);
    setSelectedMonth(current);
    setPickerYear(parseInt(current.split('-')[0], 10));
  }, []);

  // Sync pickerYear when selectedMonth changes
  useEffect(() => {
    const [y] = selectedMonth.split('-').map(Number);
    if (y) setPickerYear(y);
  }, [selectedMonth]);

  // Click outside to close month picker popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    };
    if (isMonthPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMonthPickerOpen]);

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  // Filter transactions for selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Previous month for comparison
  const prevMonthStr = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    return date.toISOString().slice(0, 7);
  }, [selectedMonth]);

  const prevMonthTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date.startsWith(prevMonthStr));
  }, [transactions, prevMonthStr]);

  // Totals converted to active currency
  const { totalIncome, totalExpense, totalSaved } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let sav = 0;

    monthTransactions.forEach((tx) => {
      const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
      if (tx.type === 'income') inc += converted;
      else if (tx.type === 'expense') exp += converted;
      else if (tx.type === 'savings') sav += converted;
    });

    return { totalIncome: inc, totalExpense: exp, totalSaved: sav };
  }, [monthTransactions, currency, rates]);

  const prevTotalExpense = useMemo(() => {
    return prevMonthTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((acc, curr) => {
        return acc + convertCurrency(curr.amount, curr.currency || 'JPY', currency, rates);
      }, 0);
  }, [prevMonthTransactions, currency, rates]);

  const netFreeCashFlow = totalIncome - totalExpense - totalSaved;

  const savingsRate = useMemo(() => {
    if (totalIncome <= 0) return 0;
    return Math.min(100, Math.round((totalSaved / totalIncome) * 100));
  }, [totalIncome, totalSaved]);

  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }, [selectedMonth]);

  const dailyBurnRate = useMemo(() => {
    return Math.round(totalExpense / (daysInMonth || 30));
  }, [totalExpense, daysInMonth]);

  const expenseDiff = useMemo(() => {
    if (prevTotalExpense <= 0) return 0;
    return Math.round(((totalExpense - prevTotalExpense) / prevTotalExpense) * 100);
  }, [totalExpense, prevTotalExpense]);

  // Breakdown per Category converted to active currency
  const { categoryBreakdown, categorySpentMap } = useMemo(() => {
    const map: Record<string, number> = {};
    monthTransactions
      .filter((tx) => tx.type === 'expense' && !hiddenCategories.includes(tx.category))
      .forEach((tx) => {
        const cat = tx.category || 'others';
        const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
        map[cat] = (map[cat] || 0) + converted;
      });

    const list = Object.entries(map).map(([category, amount]) => {
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return {
        category,
        amount,
        percentage,
        label: t.expenseCategories[category as ExpenseCategory] || category,
      };
    });

    return {
      categoryBreakdown: list.sort((a, b) => b.amount - a.amount),
      categorySpentMap: map,
    };
  }, [monthTransactions, totalExpense, t.expenseCategories, currency, rates, hiddenCategories]);

  // Chart data
  const chartData = useMemo(() => {
    return categoryBreakdown.slice(0, 6).map((item) => ({
      name: item.label,
      amount: item.amount,
    }));
  }, [categoryBreakdown]);

  // Active Monthly Budget Plan
  const activePlan = monthlyBudgets[selectedMonth];
  const budgetTotalTarget = activePlan?.totalTarget || 0;
  const categoryTargets = activePlan?.categoryTargets || {};

  const budgetUsagePercent = budgetTotalTarget > 0 ? Math.round((totalExpense / budgetTotalTarget) * 100) : 0;
  const isOverBudget = budgetTotalTarget > 0 && totalExpense > budgetTotalTarget;
  const budgetRemaining = Math.max(0, budgetTotalTarget - totalExpense);
  const budgetOverAmount = Math.max(0, totalExpense - budgetTotalTarget);

  const hasBudgetPlan = budgetTotalTarget > 0 || Object.keys(categoryTargets).length > 0;

  // Active categories eligible for budgeting
  const activeCategories = useMemo(() => {
    return (Object.keys(EXPENSE_CATEGORY_ICONS) as ExpenseCategory[]).filter(
      (cat) => !hiddenCategories.includes(cat)
    );
  }, [hiddenCategories]);

  // Target presets according to active currency
  const totalBudgetPresets = useMemo(() => {
    switch (currency) {
      case 'IDR':
        return [3000000, 5000000, 10000000, 15000000, 20000000];
      case 'USD':
        return [500, 1000, 1500, 2000, 3000];
      case 'MMK':
        return [500000, 1000000, 1500000, 2000000, 3000000];
      case 'JPY':
      default:
        return [50000, 100000, 150000, 200000, 300000];
    }
  }, [currency]);

  const handleOpenBudgetModal = () => {
    if (activePlan) {
      setModalTotalTarget(activePlan.totalTarget ? formatNumberWithCommas(activePlan.totalTarget) : '');
      const cats: Record<string, string> = {};
      if (activePlan.categoryTargets) {
        Object.entries(activePlan.categoryTargets).forEach(([k, v]) => {
          if (v && v > 0) cats[k] = formatNumberWithCommas(v);
        });
      }
      setModalCategoryTargets(cats);
    } else {
      setModalTotalTarget('');
      setModalCategoryTargets({});
    }
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudgetPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const totalNum = parseRawNumber(modalTotalTarget);
    const catMap: Partial<Record<ExpenseCategory | string, number>> = {};
    Object.entries(modalCategoryTargets).forEach(([k, v]) => {
      const val = parseRawNumber(v);
      if (val > 0) {
        catMap[k] = val;
      }
    });

    if (onUpdateMonthlyBudget) {
      onUpdateMonthlyBudget(selectedMonth, {
        totalTarget: totalNum > 0 ? totalNum : undefined,
        categoryTargets: Object.keys(catMap).length > 0 ? catMap : undefined,
      });
    }
    setIsBudgetModalOpen(false);
  };

  const currentYear = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const currentMonthPadded = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const monthNames = language === 'ja' ? MONTH_NAMES_JA : MONTH_NAMES_EN;

  return (
    <div className="space-y-6">
      {/* Month Navigator Header (iOS Liquid Glass with Quick-Jump Month Picker) */}
      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg-surface)] p-4 sm:p-5 rounded-3xl border border-[var(--border-subtle)] shadow-[var(--card-shadow)]">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
              {t.summary.monthlyTitle}
            </span>

            {/* Clickable Month Pill Trigger */}
            <div className="relative mt-1" ref={monthPickerRef}>
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="group flex items-center space-x-2 px-3 py-1.5 -ml-1 rounded-2xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-subtle)] transition-all cursor-pointer shadow-xs"
                title={t.summary.selectMonth}
              >
                <Calendar className="w-4 h-4 text-[var(--accent-emerald)]" />
                <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tabular-numbers font-mono tracking-tight">
                  {selectedMonth}
                </h2>
                <ChevronDown
                  className={`w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-transform duration-200 ${
                    isMonthPickerOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Quick Jump Month Picker Popover */}
              {isMonthPickerOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-4 z-50 animate-fade-in space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      {t.summary.selectMonth}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedMonth(currentMonthPadded)}
                      className="px-2.5 py-1 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[11px] font-bold text-[var(--text-main)] border border-[var(--border-subtle)] transition-all cursor-pointer font-mono"
                    >
                      {t.summary.currentMonth}
                    </button>
                  </div>

                  {/* Year Stepper */}
                  <div className="flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => y - 1)}
                      className="p-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)] transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-black text-[var(--text-main)] font-mono tabular-numbers">
                      {pickerYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => y + 1)}
                      className="p-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)] transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 12-Month Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {monthNames.map((name, idx) => {
                      const mStr = `${pickerYear}-${String(idx + 1).padStart(2, '0')}`;
                      const isSelected = selectedMonth === mStr;
                      const isCurrent = currentMonthPadded === mStr;

                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSelectedMonth(mStr);
                            setIsMonthPickerOpen(false);
                          }}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border relative ${
                            isSelected
                              ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--btn-primary-border)] shadow-md'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)]'
                          }`}
                        >
                          {name}
                          {isCurrent && !isSelected && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--accent-emerald)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Native input month fallback / quick trigger */}
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      Native wheel:
                    </span>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedMonth(e.target.value);
                          setIsMonthPickerOpen(false);
                        }
                      }}
                      className="text-xs font-mono font-bold bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1 text-[var(--text-main)] cursor-pointer outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stepper Buttons */}
        <div className="flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)] transition-all cursor-pointer shadow-xs"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedMonth(currentMonthPadded)}
            className="px-4 py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer shadow-xs font-mono"
          >
            {t.summary.currentMonth}
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)] transition-all cursor-pointer shadow-xs"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MONTHLY BUDGET & SPENDING PLAN CARD */}
      <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-main)] flex items-center space-x-2">
                <span>{t.summary.monthlyBudgetPlan}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-bold">
                  {selectedMonth}
                </span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {t.summary.monthlyBudgetPlanDesc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenBudgetModal}
            className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] hover:opacity-90 text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{hasBudgetPlan ? t.summary.editBudgetPlan : t.summary.setBudgetPlan}</span>
          </button>
        </div>

        {!hasBudgetPlan ? (
          <div className="py-6 px-4 rounded-2xl bg-[var(--bg-subtle)] border border-dashed border-[var(--border-strong)] text-center space-y-3">
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mx-auto">
              {t.summary.noBudgetPlanSet}
            </p>
            <button
              type="button"
              onClick={handleOpenBudgetModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[var(--bg-surface-solid)] border border-[var(--border-strong)] text-xs font-bold text-[var(--text-main)] hover:border-[var(--border-specular)] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--accent-emerald)]" />
              <span>{t.summary.setBudgetPlan}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Overall Monthly Spending Target vs Actual */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                    {t.summary.targetVsActual}
                  </span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-black text-[var(--text-main)] font-mono tabular-numbers">
                      {formatCurrency(totalExpense, currency)}
                    </span>
                    {budgetTotalTarget > 0 && (
                      <span className="text-xs sm:text-sm text-[var(--text-muted)] font-mono font-bold">
                        / {formatCurrency(budgetTotalTarget, currency)} {t.summary.plannedBudget}
                      </span>
                    )}
                  </div>
                </div>

                {budgetTotalTarget > 0 && (
                  <div className="self-start sm:self-auto">
                    {isOverBudget ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold font-mono">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>
                          {t.summary.overBudget} (+{formatCurrency(budgetOverAmount, currency)})
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold font-mono">
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {t.summary.withinBudget} ({formatCurrency(budgetRemaining, currency)} {t.summary.budgetRemaining})
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Master Budget Progress Bar */}
              {budgetTotalTarget > 0 && (
                <div className="space-y-1.5">
                  <div className="w-full h-3 rounded-full bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverBudget
                          ? 'bg-rose-500'
                          : budgetUsagePercent > 85
                          ? 'bg-amber-500'
                          : 'bg-[var(--accent-emerald)]'
                      }`}
                      style={{ width: `${Math.min(100, budgetUsagePercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <span>
                      {budgetUsagePercent}% {t.summary.plannedBudget.toLowerCase()} used
                    </span>
                    <span>
                      {daysInMonth} days in {selectedMonth}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Category Allocations Breakdown */}
            {Object.keys(categoryTargets).length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.summary.categoryBudgets}
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(categoryTargets).map(([catKey, targetVal]) => {
                    if (!targetVal || targetVal <= 0) return null;
                    const Icon = EXPENSE_CATEGORY_ICONS[catKey as ExpenseCategory] || TrendingDown;
                    const spent = categorySpentMap[catKey] || 0;
                    const percent = Math.round((spent / targetVal) * 100);
                    const isCatOver = spent > targetVal;
                    const diff = Math.abs(targetVal - spent);
                    const catLabel = t.expenseCategories[catKey as ExpenseCategory] || catKey;

                    return (
                      <div
                        key={catKey}
                        className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-[var(--text-main)]">{catLabel}</span>
                          </div>

                          <span
                            className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                              isCatOver
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}
                          >
                            {isCatOver ? `+${formatCurrency(diff, currency)} over` : `${formatCurrency(diff, currency)} left`}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between text-xs font-mono">
                          <span className="font-bold text-[var(--text-main)] tabular-numbers">
                            {formatCurrency(spent, currency)}
                          </span>
                          <span className="text-[var(--text-muted)] text-[11px] tabular-numbers">
                            target: {formatCurrency(targetVal, currency)} ({percent}%)
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="w-full h-1.5 rounded-full bg-[var(--bg-surface-solid)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCatOver ? 'bg-rose-500' : 'bg-[var(--accent-emerald)]'
                            }`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4 Big Metrics Grid (iOS Liquid Glass Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Income */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] space-y-2 min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{t.summary.totalIncome}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-extrabold tracking-tight truncate text-[var(--accent-emerald)] tabular-numbers font-mono">
            {formatCurrency(totalIncome, currency)}
          </p>
        </div>

        {/* Expenses */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] space-y-2 min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{t.summary.totalExpense}</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-extrabold tracking-tight truncate text-[var(--accent-rose)] tabular-numbers font-mono">
            {formatCurrency(totalExpense, currency)}
          </p>
        </div>

        {/* Saved (with Vault Icon) */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] space-y-2 min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{t.summary.netSavings}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <Vault className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-extrabold tracking-tight truncate text-[var(--accent-amber)] tabular-numbers font-mono">
            {formatCurrency(totalSaved, currency)}
          </p>
        </div>

        {/* Free Cashflow */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] space-y-2 min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{t.summary.netCashFlow}</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-xl sm:text-2xl font-extrabold tracking-tight tabular-numbers font-mono ${
              netFreeCashFlow >= 0 ? 'text-[var(--accent-emerald)]' : 'text-[var(--accent-rose)]'
            }`}
          >
            {formatCurrency(netFreeCashFlow, currency)}
          </p>
        </div>
      </div>

      {/* 3 Secondary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Savings Rate */}
        <div className="p-4 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
              {t.summary.savingsRate}
            </span>
            <p className="text-lg font-bold text-[var(--text-main)] tabular-numbers font-mono">
              {savingsRate}%{' '}
              <span className="text-xs text-[var(--text-muted)] font-normal">
                {t.summary.ofIncome}
              </span>
            </p>
          </div>
        </div>

        {/* Daily Burn Rate */}
        <div className="p-4 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
              {t.summary.dailyAverage}
            </span>
            <p className="text-lg font-bold text-[var(--text-main)] tabular-numbers font-mono">
              {formatCurrency(dailyBurnRate, currency)}{' '}
              <span className="text-xs text-[var(--text-muted)] font-normal">
                {t.summary.perDay}
              </span>
            </p>
          </div>
        </div>

        {/* Comparison vs Previous Month */}
        <div className="p-4 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] flex items-center space-x-3.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              expenseDiff > 0
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}
          >
            {expenseDiff > 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
              {t.summary.comparisonVsLastMonth}
            </span>
            <p className="text-lg font-bold text-[var(--text-main)] tabular-numbers font-mono">
              {Math.abs(expenseDiff)}%{' '}
              <span className="text-xs text-[var(--text-muted)] font-normal">
                {expenseDiff > 0
                  ? t.summary.higherThanLastMonth
                  : t.summary.lowerThanLastMonth}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown per Category & Visual Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category List */}
        <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-main)]">
            {t.summary.categoryBreakdown}
          </h3>

          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-[var(--text-faint)] py-12 text-center">
              {t.record.noTransactions}
            </p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((item) => {
                const Icon = EXPENSE_CATEGORY_ICONS[item.category as ExpenseCategory] || TrendingDown;
                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center space-x-2 text-[var(--text-main)]">
                        <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>{item.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[var(--text-main)] tabular-numbers font-mono">
                          {formatCurrency(item.amount, currency)}
                        </span>
                        <span className="text-[var(--text-muted)] font-mono ml-1.5">
                          ({item.percentage}%)
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent-emerald)] transition-all duration-500"
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Categories Comparison Bar Chart */}
        <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              {t.summary.topCategoriesComparison}
            </h3>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {t.summary.rankedByTotal}
            </span>
          </div>

          {chartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-faint)] py-12">
              {t.record.noTransactions}
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-subtle)' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
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
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                    formatter={(val) => [formatCurrency(Number(val) || 0, currency), 'Total']}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? '#f43f5e'
                            : index === 1
                            ? '#60a5fa'
                            : index === 2
                            ? '#a78bfa'
                            : index === 3
                            ? '#34d399'
                            : '#fbbf24'
                        }
                        opacity={0.85}
                      />
                    ))}
                    <LabelList
                      dataKey="amount"
                      position="top"
                      offset={6}
                      formatter={(val) => formatCurrency(Number(val) || 0, currency)}
                      style={{
                        fill: 'var(--text-main)',
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'monospace',
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* SET / EDIT BUDGET PLAN MODAL */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-main)]">
                    {t.summary.monthlyBudgetPlan}
                  </h3>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    Target for {selectedMonth} ({currency})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudgetPlan} className="space-y-4">
              {/* Total Monthly Target */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    {t.summary.totalMonthlyBudget} ({currency})
                  </label>
                  <span className="text-[11px] text-[var(--text-faint)] font-mono">
                    Max overall spending
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={modalTotalTarget}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, '');
                      setModalTotalTarget(formatNumberWithCommas(raw));
                    }}
                    placeholder="e.g. 150,000"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl pl-4 pr-16 py-3.5 text-base font-bold text-[var(--text-main)] outline-none tabular-numbers font-mono"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[var(--text-muted)] pointer-events-none select-none">
                    {currency}
                  </span>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-[var(--text-muted)] mr-1 font-mono">
                    Presets:
                  </span>
                  {totalBudgetPresets.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setModalTotalTarget(formatNumberWithCommas(val))}
                      className="px-2.5 py-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-semibold text-[var(--text-main)] tabular-numbers font-mono transition-all cursor-pointer"
                    >
                      {formatCurrency(val, currency)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Budget Targets */}
              <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    {t.summary.categoryBudgets}
                  </span>
                  <span className="text-[11px] text-[var(--text-faint)] font-mono">
                    Optional per-category limits
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeCategories.map((catKey) => {
                    const Icon = EXPENSE_CATEGORY_ICONS[catKey] || TrendingDown;
                    const catLabel = t.expenseCategories[catKey] || catKey;
                    const currentVal = modalCategoryTargets[catKey] || '';

                    return (
                      <div
                        key={catKey}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]"
                      >
                        <div className="flex items-center space-x-2 shrink-0">
                          <Icon className="w-4 h-4 text-[var(--text-muted)]" />
                          <span className="text-xs font-bold text-[var(--text-main)]">
                            {catLabel}
                          </span>
                        </div>
                        <div className="relative w-36 sm:w-44">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={currentVal}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, '');
                              setModalCategoryTargets((prev) => ({
                                ...prev,
                                [catKey]: formatNumberWithCommas(raw),
                              }));
                            }}
                            placeholder="0"
                            className="w-full bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl pl-3 pr-12 py-1.5 text-xs font-bold text-[var(--text-main)] outline-none tabular-numbers font-mono"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--text-muted)] pointer-events-none">
                            {currency}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer text-center"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] hover:opacity-90 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  {t.actions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
