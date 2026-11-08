'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Currency, ExpenseCategory, Language, Transaction } from '@/types/finance';
import { formatCurrency, translations } from '@/lib/i18n';
import { EXPENSE_CATEGORY_ICONS } from '@/lib/constants';
import { convertCurrency, DEFAULT_RATES, ExchangeRates } from '@/lib/currency';
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface YearlySummaryBoardProps {
  language: Language;
  currency: Currency;
  rates?: ExchangeRates;
  transactions: Transaction[];
  hiddenCategories?: string[];
}

export function YearlySummaryBoard({
  language,
  currency,
  rates = DEFAULT_RATES,
  transactions,
  hiddenCategories = [],
}: YearlySummaryBoardProps) {
  const t = translations[language];

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const currentActualYear = useMemo(() => new Date().getFullYear(), []);
  const isCurrentYear = selectedYear === currentActualYear;

  useEffect(() => {
    setSelectedYear(new Date().getFullYear());
  }, []);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  // Filter transactions for selected year
  const yearTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date.startsWith(`${selectedYear}-`));
  }, [transactions, selectedYear]);

  // Annual Totals converted to active currency
  const { totalAnnualIncome, totalAnnualExpense, totalAnnualSaved } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let sav = 0;

    yearTransactions.forEach((tx) => {
      const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
      if (tx.type === 'income') inc += converted;
      else if (tx.type === 'expense') exp += converted;
      else if (tx.type === 'savings') sav += converted;
    });

    return {
      totalAnnualIncome: inc,
      totalAnnualExpense: exp,
      totalAnnualSaved: sav,
    };
  }, [yearTransactions, currency, rates]);

  const annualNetSurplus = totalAnnualIncome - totalAnnualExpense - totalAnnualSaved;

  // 12-month data series converted to active currency
  const monthlySeriesData = useMemo(() => {
    const list = Array.from({ length: 12 }, (_, i) => {
      const monthIndex = i + 1;
      const monthPrefix = `${selectedYear}-${String(monthIndex).padStart(2, '0')}`;
      let income = 0;
      let expense = 0;
      let savings = 0;

      yearTransactions.forEach((tx) => {
        if (tx.date.startsWith(monthPrefix)) {
          const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
          if (tx.type === 'income') income += converted;
          else if (tx.type === 'expense') expense += converted;
          else if (tx.type === 'savings') savings += converted;
        }
      });

      return {
        month: monthNames[i],
        Income: income,
        Expense: expense,
        Savings: savings,
      };
    });

    return list;
  }, [yearTransactions, selectedYear, currency, rates]);

  // Top Annual Expense Categories converted to active currency (Hidden categories strictly omitted)
  const topAnnualCategories = useMemo(() => {
    const map: Record<string, number> = {};
    yearTransactions
      .filter((tx) => tx.type === 'expense' && !hiddenCategories.includes(tx.category))
      .forEach((tx) => {
        const cat = tx.category || 'others';
        const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
        map[cat] = (map[cat] || 0) + converted;
      });

    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalAnnualExpense > 0 ? Math.round((amount / totalAnnualExpense) * 100) : 0,
        label: t.expenseCategories[category as ExpenseCategory] || category,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [yearTransactions, totalAnnualExpense, t.expenseCategories, currency, rates, hiddenCategories]);

  return (
    <div className="space-y-6">
      {/* Year Navigator (iOS Liquid Glass) */}
      <div className="flex items-center justify-between bg-[var(--bg-surface)]  p-5 rounded-3xl border border-[var(--border-subtle)] shadow-[var(--card-shadow)]">
        <div>
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            {t.summary.yearlyTitle}
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-main)] tabular-numbers font-mono mt-0.5">
            {selectedYear}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {!isCurrentYear && (
            <button
              type="button"
              onClick={() => setSelectedYear(currentActualYear)}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all cursor-pointer animate-fade-in"
              title={`Return to ${currentActualYear}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'ja' ? '今年へ戻る' : `Back to ${currentActualYear}`}</span>
            </button>
          )}

          <div className="flex items-center space-x-1 p-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-solid)] transition-all cursor-pointer"
              title="Previous Year"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 text-xs font-bold font-mono text-[var(--text-main)] select-none">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-solid)] transition-all cursor-pointer"
              title="Next Year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Big Annual Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Annual Income */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] space-y-2 min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{t.summary.annualIncome}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-extrabold tracking-tight truncate text-[var(--accent-emerald)] tabular-numbers font-mono">
            {formatCurrency(totalAnnualIncome, currency)}
          </p>
        </div>

        {/* Annual Expenses */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] space-y-2 min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{t.summary.annualExpenses}</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-extrabold tracking-tight truncate text-[var(--accent-rose)] tabular-numbers font-mono">
            {formatCurrency(totalAnnualExpense, currency)}
          </p>
        </div>

        {/* Annual Savings */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] space-y-2 min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{t.summary.annualSavings}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-extrabold tracking-tight truncate text-[var(--accent-amber)] tabular-numbers font-mono">
            {formatCurrency(totalAnnualSaved, currency)}
          </p>
        </div>

        {/* Annual Net Free Cash */}
        <div className="p-3.5 sm:p-5 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--card-shadow)] space-y-2 min-w-0">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>{t.summary.annualNetCashflow}</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-xl sm:text-2xl font-extrabold tracking-tight tabular-numbers font-mono ${
              annualNetSurplus >= 0 ? 'text-[var(--accent-emerald)]' : 'text-[var(--accent-rose)]'
            }`}
          >
            {formatCurrency(annualNetSurplus, currency)}
          </p>
        </div>
      </div>

      {/* 12-Month Inflow vs Outflow Bar Chart */}
      <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-[var(--card-shadow)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-[var(--text-main)]">
            {t.summary.monthlyTrend} ({selectedYear})
          </h3>
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="flex items-center space-x-1 text-[var(--accent-emerald)]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Income</span>
            </span>
            <span className="flex items-center space-x-1 text-[var(--accent-rose)]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Expense</span>
            </span>
            <span className="flex items-center space-x-1 text-[var(--accent-amber)]">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Savings</span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="month"
                stroke="var(--text-muted)"
                fontSize={11}
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
                  fontSize: '12px',
                }}
                labelStyle={{
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '11px',
                  marginBottom: '2px',
                }}
                formatter={(val, name) => [formatCurrency(Number(val) || 0, currency), String(name)]}
              />
              <Legend wrapperStyle={{ display: 'none' }} />
              <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} />
              <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.8} />
              <Bar dataKey="Savings" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Expense Categories Grid (iOS Liquid Glass Cards) */}
      <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]  shadow-[var(--card-shadow)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-main)]">
            {t.summary.topExpenses}
          </h3>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {t.summary.ofTotalExpenses}
          </span>
        </div>

        {topAnnualCategories.length === 0 ? (
          <p className="text-xs text-[var(--text-faint)] py-8 text-center">
            {t.record.noTransactions}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topAnnualCategories.map((item) => {
              const Icon = EXPENSE_CATEGORY_ICONS[item.category as ExpenseCategory] || TrendingUp;
              return (
                <div
                  key={item.category}
                  className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-main)] shadow-xs">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-main)]">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[var(--text-main)] tabular-numbers font-mono">
                        {formatCurrency(item.amount, currency)}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-mono ml-1">
                        ({item.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-[var(--bg-surface-solid)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
