'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Currency, ExpenseCategory, Language, Transaction } from '@/types/finance';
import { formatCurrency, translations } from '@/lib/i18n';
import { EXPENSE_CATEGORY_ICONS } from '@/lib/constants';
import { convertCurrency, DEFAULT_RATES, ExchangeRates } from '@/lib/currency';
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
}

export function MonthlySummaryBoard({
  language,
  currency,
  rates = DEFAULT_RATES,
  transactions,
  hiddenCategories = [],
}: MonthlySummaryBoardProps) {
  const t = translations[language];

  // Selected month YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');

  useEffect(() => {
    setSelectedMonth(new Date().toISOString().slice(0, 7));
  }, []);

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
    return Math.min(100, Math.round(((totalSaved) / totalIncome) * 100));
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

  // Breakdown per Category converted to active currency (Hidden categories strictly omitted)
  const categoryBreakdown = useMemo(() => {
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

    return list.sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, totalExpense, t.expenseCategories, currency, rates, hiddenCategories]);

  // Chart data
  const chartData = useMemo(() => {
    return categoryBreakdown.slice(0, 6).map((item) => ({
      name: item.label,
      amount: item.amount,
    }));
  }, [categoryBreakdown]);

  return (
    <div className="space-y-6">
      {/* Month Navigator Header (iOS Liquid Glass) */}
      <div className="flex items-center justify-between bg-[var(--bg-surface)]  p-5 rounded-3xl border border-[var(--border-subtle)] shadow-[var(--card-shadow)]">
        <div>
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            {t.summary.monthlyTitle}
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-main)] tabular-numbers font-mono mt-0.5">
            {selectedMonth}
          </h2>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)] transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
            className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer"
          >
            {t.summary.currentMonth}
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)] transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
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
        <div className="p-4 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-[var(--card-shadow)] flex items-center space-x-3.5">
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
        <div className="p-4 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-[var(--card-shadow)] flex items-center space-x-3.5">
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
        <div className="p-4 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-[var(--card-shadow)] flex items-center space-x-3.5">
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

      {/* Breakdown per Category & Visual Chart (iOS Liquid Glass Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category List */}
        <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-[var(--card-shadow)] space-y-4">
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
        <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-[var(--card-shadow)] flex flex-col">
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
    </div>
  );
}
