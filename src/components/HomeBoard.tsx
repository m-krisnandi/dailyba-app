'use client';

import React, { useState, useMemo } from 'react';
import {
  FinanceState,
  Currency,
  Language,
  Transaction,
  FundingSource,
  ExpenseCategory,
  RecurringBill,
} from '@/types/finance';
import { ExchangeRates, DEFAULT_RATES, convertCurrency } from '@/lib/currency';
import { formatCurrency } from '@/lib/i18n';
import { formatFriendlyDate, getMonthDateRange, isDateInMonthCycle, getTodayLocalDate } from '@/lib/dateUtils';
import { cleanTransactionNote } from '@/lib/transactionUtils';
import { parseSmartText } from '@/lib/parser';
import { TabKey } from '@/components/TabsNav';
import { BillsModal } from '@/components/BillsModal';
import { BudgetBreakdownModal } from '@/components/BudgetBreakdownModal';

interface HomeBoardProps {
  state: FinanceState;
  rates?: ExchangeRates;
  user?: { email?: string | null; name?: string | null } | null;
  pendingEmailSyncCount?: number;
  onNavigateTab: (tab: TabKey) => void;
  onOpenEmailSync: () => void;
  onOpenScanner: () => void;
  onOpenAddTransaction: () => void;
  onOpenMenu?: () => void;
  onSelectTransactionDetail?: (tx: Transaction) => void;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onDeleteTransaction?: (id: string) => void;
  onAddRecurringBill?: (bill: Omit<RecurringBill, 'id'>) => void;
  onUpdateRecurringBill?: (bill: RecurringBill) => void;
  onDeleteRecurringBill?: (id: string) => void;
}

export function HomeBoard({
  state,
  rates = DEFAULT_RATES,
  user,
  pendingEmailSyncCount = 0,
  onNavigateTab,
  onOpenEmailSync,
  onOpenScanner,
  onOpenAddTransaction,
  onOpenMenu,
  onSelectTransactionDetail,
  onAddTransaction,
  onDeleteTransaction,
  onAddRecurringBill,
  onUpdateRecurringBill,
  onDeleteRecurringBill,
}: HomeBoardProps) {
  const { transactions = [], currency = 'IDR', language = 'en', monthStartDay = 1, monthlyBudgets = {} } = state;

  // Local state for Quick Entry input and modals
  const [quickInput, setQuickInput] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);
  const [isBillsModalOpen, setIsBillsModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  // 1. Current active month cycle
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const todayStr = useMemo(() => getTodayLocalDate(), []);
  const currentDayOfMonth = useMemo(() => parseInt(todayStr.slice(8, 10), 10), [todayStr]);

  const activeCycle = useMemo(() => {
    return getMonthDateRange(currentMonthKey, monthStartDay);
  }, [currentMonthKey, monthStartDay]);

  // Current month's transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => isDateInMonthCycle(tx.date, currentMonthKey, monthStartDay));
  }, [transactions, currentMonthKey, monthStartDay]);

  // 2. Recurring Bills status & nearest unpaid bill
  const recurringMetrics = useMemo(() => {
    const activeBills = Array.isArray(state.recurringBills) ? state.recurringBills : [];
    if (activeBills.length === 0) {
      return {
        totalCommitment: 0,
        paidCommitment: 0,
        remainingCommitment: 0,
        paidCount: 0,
        totalCount: 0,
        paidPercent: 0,
        nearestUnpaidBill: null,
      };
    }

    const [yStr, mStr] = currentMonthKey.split('-');
    const curY = parseInt(yStr || '2026', 10);
    const curM = parseInt(mStr || '11', 10);
    const prevY = curM === 1 ? curY - 1 : curY;
    const prevM = curM === 1 ? 12 : curM - 1;
    const prevMonthPrefix = `${prevY}-${String(prevM).padStart(2, '0')}`;

    let totalCommitment = 0;
    let paidCommitment = 0;
    let paidCount = 0;
    const unpaidList: { bill: RecurringBill; convertedAmount: number; dueDay: number }[] = [];

    activeBills.forEach((bill) => {
      const billAmountInCurr = convertCurrency(bill.defaultAmount, bill.currency || 'JPY', currency, rates);
      totalCommitment += billAmountInCurr;

      const billLabel = (bill.name || bill.category).toLowerCase();
      const currentMonthTx = transactions.find(
        (tx) =>
          tx.type === 'expense' &&
          (tx.recurringBillId === bill.id ||
            tx.category === bill.category ||
            (tx.note && tx.note.toLowerCase().includes(billLabel))) &&
          tx.date.startsWith(currentMonthKey)
      );

      const prevMonthTx = !currentMonthTx && transactions.find(
        (tx) =>
          tx.type === 'expense' &&
          (tx.recurringBillId === bill.id ||
            tx.category === bill.category ||
            (tx.note && tx.note.toLowerCase().includes(billLabel))) &&
          tx.date.startsWith(prevMonthPrefix) &&
          parseInt(tx.date.slice(8, 10), 10) >= 20
      );

      if (currentMonthTx || prevMonthTx) {
        paidCommitment += billAmountInCurr;
        paidCount++;
      } else {
        unpaidList.push({
          bill,
          convertedAmount: billAmountInCurr,
          dueDay: bill.dayOfMonth || 1,
        });
      }
    });

    const remainingCommitment = Math.max(0, totalCommitment - paidCommitment);
    const paidPercent = totalCommitment > 0 ? Math.min(100, Math.round((paidCommitment / totalCommitment) * 100)) : 0;

    // Sort unpaid bills to find the nearest due bill
    unpaidList.sort((a, b) => {
      const diffA = a.dueDay >= currentDayOfMonth ? a.dueDay - currentDayOfMonth : a.dueDay + 31 - currentDayOfMonth;
      const diffB = b.dueDay >= currentDayOfMonth ? b.dueDay - currentDayOfMonth : b.dueDay + 31 - currentDayOfMonth;
      return diffA - diffB;
    });

    return {
      totalCommitment,
      paidCommitment,
      remainingCommitment,
      paidCount,
      totalCount: activeBills.length,
      paidPercent,
      nearestUnpaidBill: unpaidList[0] || null,
    };
  }, [state.recurringBills, currentMonthKey, currentDayOfMonth, transactions, currency, rates]);

  // 3. Fixed vs Variable spend breakdown
  const { fixedSpent, variableSpent, totalSpentThisMonth } = useMemo(() => {
    let fixed = 0;
    let variable = 0;

    monthTransactions.forEach((tx) => {
      if (tx.type === 'expense') {
        const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
        const isFixed =
          tx.isRecurring ||
          Boolean(tx.recurringBillId) ||
          state.recurringBills?.some(
            (b) =>
              (b.name && tx.note && tx.note.toLowerCase().includes(b.name.toLowerCase())) ||
              b.category === tx.category
          );

        if (isFixed) {
          fixed += converted;
        } else {
          variable += converted;
        }
      }
    });

    return {
      fixedSpent: fixed,
      variableSpent: variable,
      totalSpentThisMonth: fixed + variable,
    };
  }, [monthTransactions, state.recurringBills, currency, rates]);

  // 4. Monthly Budget Target
  const monthlyBudgetTarget = useMemo(() => {
    const plan = monthlyBudgets[currentMonthKey];
    if (plan && plan.totalTarget && plan.totalTarget > 0) {
      return plan.totalTarget;
    }
    if (state.savingsGoalMonthly && state.savingsGoalMonthly > 0) {
      return state.savingsGoalMonthly * 2;
    }
    switch (currency) {
      case 'IDR':
        return 1000000;
      case 'JPY':
        return 100000;
      case 'USD':
        return 1000;
      case 'MMK':
        return 500000;
      default:
        return 100000;
    }
  }, [monthlyBudgets, currentMonthKey, state.savingsGoalMonthly, currency]);

  // Left this month = Budget - Spent (fixed + variable)
  const leftThisMonth = Math.max(0, monthlyBudgetTarget - totalSpentThisMonth);

  // 2-segment progress bar percentages
  const fixedPercent = monthlyBudgetTarget > 0
    ? Math.min(100, Math.round((fixedSpent / monthlyBudgetTarget) * 100))
    : 0;
  const variablePercent = monthlyBudgetTarget > 0
    ? Math.min(100 - fixedPercent, Math.round((variableSpent / monthlyBudgetTarget) * 100))
    : 0;

  // 5. Today's Spend
  const todaySpent = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'expense' && tx.date === todayStr)
      .reduce((sum, tx) => sum + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates), 0);
  }, [transactions, todayStr, currency, rates]);

  // 6. Unified Pacing Metrics (Single Consistent Daily Guide)
  const pacingMetrics = useMemo(() => {
    const today = new Date();
    const end = new Date(activeCycle.endDate);
    const start = new Date(activeCycle.startDate);

    const diffTime = end.getTime() - today.getTime();
    const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const daysElapsed = Math.max(1, totalDays - daysRemaining);

    // Formula from User Master Brief:
    // Safe daily spend = (Left - fixed belum dibayar) / sisa hari cycle
    const fixedUnpaid = recurringMetrics.remainingCommitment;
    const safeDailySpend = Math.max(0, Math.round((leftThisMonth - fixedUnpaid) / daysRemaining));

    // Projected month-end = Left - fixed belum dibayar - (avg daily variable * sisa hari)
    const avgDailyVariable = daysElapsed > 0 ? variableSpent / daysElapsed : 0;
    const projectedMonthEndLeft = Math.max(0, Math.round(leftThisMonth - fixedUnpaid - (avgDailyVariable * daysRemaining)));

    const expectedSpendSoFar = (monthlyBudgetTarget / totalDays) * daysElapsed;
    const pacingRatio = expectedSpendSoFar > 0 ? totalSpentThisMonth / expectedSpendSoFar : 1;

    let pacingLabel = 'On Track';
    let pacingColor = 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30';

    if (leftThisMonth <= 0) {
      pacingLabel = 'Over Budget';
      pacingColor = 'text-rose-300 bg-rose-500/20 border-rose-500/30';
    } else if (pacingRatio > 1.15) {
      pacingLabel = 'Pacing Fast';
      pacingColor = 'text-amber-300 bg-amber-500/20 border-amber-500/30';
    }

    return {
      daysRemaining,
      safeDailySpend,
      projectedMonthEndLeft,
      pacingLabel,
      pacingColor,
    };
  }, [activeCycle, leftThisMonth, recurringMetrics.remainingCommitment, variableSpent, totalSpentThisMonth, monthlyBudgetTarget]);

  // 7. Total Reserves / Liquid Savings
  const totalLiquidSavings = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'savings')
      .reduce((sum, tx) => sum + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates), 0);
  }, [transactions, currency, rates]);

  // 8. User Avatar initial
  const userInitial = useMemo(() => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'K';
  }, [user]);

  // 9. Recent transactions grouped by day (Top 4 preview)
  const recentGrouped = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.id || '').localeCompare(a.id || '');
    });

    const recentItems = sorted.slice(0, 4);
    const groups: { date: string; friendlyDate: string; items: Transaction[] }[] = [];
    const map = new Map<string, Transaction[]>();

    recentItems.forEach((tx) => {
      const list = map.get(tx.date) || [];
      list.push(tx);
      map.set(tx.date, list);
    });

    map.forEach((items, date) => {
      groups.push({
        date,
        friendlyDate: formatFriendlyDate(date, language),
        items,
      });
    });

    return groups;
  }, [transactions, language]);

  // Category subtle color styling for scan-friendly feed
  const getCategoryTheme = (category: string, type: string) => {
    if (type === 'income') {
      return {
        iconHref: '#i-plus',
        tileClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
      };
    }
    if (type === 'savings') {
      return {
        iconHref: '#i-wallet',
        tileClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
      };
    }
    switch (category) {
      case 'food':
      case 'food_drinks':
        return {
          iconHref: '#i-food',
          tileClass: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
        };
      case 'transport':
      case 'train':
        return {
          iconHref: '#i-car',
          tileClass: 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
        };
      case 'shopping':
        return {
          iconHref: '#i-bag',
          tileClass: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
        };
      case 'laundry':
        return {
          iconHref: '#i-shirt',
          tileClass: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
        };
      case 'bills':
      case 'rent':
      case 'vps':
      case 'mobile':
        return {
          iconHref: '#i-bank',
          tileClass: 'bg-teal-500/15 text-teal-300 border border-teal-500/20',
        };
      default:
        return {
          iconHref: '#i-wallet',
          tileClass: 'bg-slate-500/15 text-slate-300 border border-slate-500/20',
        };
    }
  };

  // Direct fast smart entry from Home bar (<= 2 taps)
  const handleQuickSubmit = () => {
    if (!quickInput.trim()) return;
    const parsed = parseSmartText(quickInput, 'cash');

    if (parsed && parsed.amount > 0) {
      onAddTransaction({
        type: parsed.type || 'expense',
        amount: parsed.amount,
        category: (parsed.category as ExpenseCategory) || 'food_drinks',
        source: parsed.source || 'cash',
        date: todayStr,
        note: parsed.note || undefined,
        currency,
      });

      const label = parsed.note || parsed.category || 'Spend';
      setQuickFeedback(`Recorded ${label} (${formatCurrency(parsed.amount, currency)})`);
      setQuickInput('');
      setTimeout(() => setQuickFeedback(null), 2500);
    } else {
      setQuickFeedback('Please specify an amount (e.g. lunch 35k ewallet)');
      setTimeout(() => setQuickFeedback(null), 3000);
    }
  };

  // Direct "Mark Paid" on the nearest unpaid bill from Home
  const handleMarkNearestPaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!recurringMetrics.nearestUnpaidBill) return;
    const { bill, convertedAmount } = recurringMetrics.nearestUnpaidBill;
    const billLabel = bill.name || bill.category;

    onAddTransaction({
      type: 'expense',
      amount: convertedAmount,
      category: bill.category,
      source: bill.source || 'bank',
      currency,
      date: todayStr,
      note: language === 'ja' ? `毎月の固定費: ${billLabel}` : `Monthly Fixed: ${billLabel}`,
      recurringBillId: bill.id,
      isRecurring: true,
    });

    setQuickFeedback(`Marked ${billLabel} as paid!`);
    setTimeout(() => setQuickFeedback(null), 2500);
  };

  return (
    <>
      {/* SVG Icon Symbols */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></symbol>
        <symbol id="i-chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></symbol>
        <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
        <symbol id="i-scan" viewBox="0 0 24 24"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 12h8"/></symbol>
        <symbol id="i-in" viewBox="0 0 24 24"><path d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14"/></symbol>
        <symbol id="i-home" viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></symbol>
        <symbol id="i-bars" viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></symbol>
        <symbol id="i-wallet" viewBox="0 0 24 24"><path d="M4 8V7a2 2 0 0 1 2-2h11v3"/><rect x="4" y="8" width="16" height="11" rx="3"/><circle cx="16" cy="13.5" r="1"/></symbol>
        <symbol id="i-bank" viewBox="0 0 24 24"><path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></symbol>
        <symbol id="i-food" viewBox="0 0 24 24"><path d="M7 4v6a2 2 0 0 0 2 2v8M7 4v4M11 4v4M16 4c-1.6 1.6-2 3.6-2 6h2v10"/></symbol>
        <symbol id="i-shirt" viewBox="0 0 24 24"><path d="m8 4-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3a4 4 0 0 1-8 0z"/></symbol>
        <symbol id="i-bag" viewBox="0 0 24 24"><path d="M6 8h12l1 12H5z"/><path d="M9 8a3 3 0 0 1 6 0"/></symbol>
        <symbol id="i-car" viewBox="0 0 24 24"><path d="M5 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0M15 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0"/><path d="M5 17H3v-4l2-5h12l2 5v4h-2M5 12h14"/></symbol>
      </svg>

      {/* Ambient subtle background */}
      <div className="app-bg" aria-hidden="true" />

      <main className="screen">
        <h1 className="sr">Home</h1>

        {/* Top Header */}
        <header className="top">
          <button
            type="button"
            className="avatar"
            aria-label="Open settings menu"
            onClick={onOpenMenu}
          >
            {userInitial}
          </button>
          <button
            type="button"
            className="ibtn relative"
            aria-label={`Review ${pendingEmailSyncCount} imported transactions`}
            onClick={onOpenEmailSync}
          >
            <svg className="ic"><use href="#i-mail"/></svg>
            {pendingEmailSyncCount > 0 && (
              <span className="badge">{pendingEmailSyncCount}</span>
            )}
          </button>
        </header>

        {/* Hero: Left this month (Tap opens Breakdown Modal) */}
        <button
          type="button"
          className="hero w-full text-left cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() => setIsBreakdownModalOpen(true)}
          aria-label={`Left this month, ${formatCurrency(leftThisMonth, currency)}. Open monthly breakdown`}
        >
          <span className="hero-label flex items-center justify-between">
            <span>Left this month</span>
            <span className="text-[10px] text-[var(--brand)] font-normal flex items-center gap-0.5">
              Breakdown <svg className="w-3 h-3"><use href="#i-chev"/></svg>
            </span>
          </span>
          <span className="hero-amt tabular-nums">
            {formatCurrency(leftThisMonth, currency)}
            <svg className="ic"><use href="#i-chev"/></svg>
          </span>
        </button>

        {/* 2-Segment Progress Bar (Fixed vs Variable) */}
        <div
          className="bar-2segment mt-1"
          role="progressbar"
          aria-label="Monthly budget used, fixed vs variable"
        >
          <div
            className="seg-fixed"
            style={{ width: `${fixedPercent}%` }}
            title={`Fixed bills: ${formatCurrency(fixedSpent, currency)} (${fixedPercent}%)`}
          />
          <div
            className="seg-var"
            style={{ width: `${variablePercent}%` }}
            title={`Variable spend: ${formatCurrency(variableSpent, currency)} (${variablePercent}%)`}
          />
        </div>
        <p className="hero-sub tabular-nums flex items-center justify-between text-[11px] mt-1">
          <span>
            {formatCurrency(totalSpentThisMonth, currency)} spent of {formatCurrency(monthlyBudgetTarget, currency)}
          </span>
          <span className="text-[10px] text-[var(--text-2)] font-mono">
            {formatCurrency(fixedSpent, currency)} fixed • {formatCurrency(variableSpent, currency)} var
          </span>
        </p>

        {/* Today's Spend Bar: Single Unified Safe Daily Benchmark */}
        <div
          onClick={() => onNavigateTab('daily')}
          className="mt-1.5 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] cursor-pointer hover:bg-white/[0.07] transition-colors"
          title={`Safe daily pace: ${formatCurrency(pacingMetrics.safeDailySpend, currency)}/day`}
        >
          <span className="text-xs text-[var(--text-2)] flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                todaySpent <= pacingMetrics.safeDailySpend ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            Today&apos;s Spend
          </span>
          <span className="tabular-nums font-semibold text-xs text-[var(--text-1)]">
            {formatCurrency(todaySpent, currency)}{' '}
            <span className="text-[var(--text-2)] font-normal text-[11px]">
              / {formatCurrency(pacingMetrics.safeDailySpend, currency)} safe pace
            </span>
          </span>
        </div>

        {/* 2 Essential Cards: Actionable Recurring Bills & Reserves */}
        <section className="grid grid-cols-2 gap-2 mt-1.5" aria-label="Key commitments and reserves">
          {/* Card 1: Actionable Bills Card */}
          <article
            onClick={() => setIsBillsModalOpen(true)}
            className="pane p-2 flex flex-col justify-between min-h-[82px] cursor-pointer hover:border-white/20 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg className="ic w-4 h-4 text-[var(--brand)]"><use href="#i-bank"/></svg>
                <span className="text-xs text-[var(--text-2)] font-medium">Bills</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  recurringMetrics.totalCount > 0 && recurringMetrics.remainingCommitment === 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {recurringMetrics.totalCount > 0
                  ? `${recurringMetrics.paidCount}/${recurringMetrics.totalCount} paid`
                  : '0 Bills'}
              </span>
            </div>

            {recurringMetrics.remainingCommitment === 0 ? (
              <div className="mt-1">
                <b className="text-[14px] font-semibold tabular-nums block text-[var(--text-1)]">
                  {formatCurrency(recurringMetrics.totalCommitment, currency)}
                </b>
                <span className="text-[10px] text-emerald-400 block mt-0.5">
                  All settled this month ✓
                </span>
              </div>
            ) : recurringMetrics.nearestUnpaidBill ? (
              <div className="mt-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <b className="text-[12.5px] font-bold truncate block text-[var(--text-1)]">
                      {recurringMetrics.nearestUnpaidBill.bill.name || recurringMetrics.nearestUnpaidBill.bill.category}
                    </b>
                    <span className="text-[10px] text-amber-300 tabular-nums block">
                      {formatCurrency(recurringMetrics.nearestUnpaidBill.convertedAmount, currency)} • Due day {recurringMetrics.nearestUnpaidBill.dueDay}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkNearestPaid}
                    className="px-2 py-1 rounded-lg bg-[var(--brand)] hover:opacity-90 active:scale-95 text-[#062024] font-bold text-[10px] shrink-0 shadow-xs cursor-pointer"
                  >
                    Mark paid
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <b className="text-[14px] font-semibold tabular-nums block text-[var(--text-1)]">
                  {formatCurrency(recurringMetrics.totalCommitment, currency)}
                </b>
                <span className="text-[10.5px] text-[var(--text-2)] block mt-0.5">
                  Manage commitments
                </span>
              </div>
            )}
          </article>

          {/* Card 2: Total Reserves / Savings */}
          <article
            onClick={() => onNavigateTab('savings')}
            className="pane p-2 flex flex-col justify-between min-h-[82px] cursor-pointer hover:border-white/20 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg className="ic w-4 h-4 text-emerald-400"><use href="#i-wallet"/></svg>
                <span className="text-xs text-[var(--text-2)] font-medium">Reserves</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300">
                Savings
              </span>
            </div>
            <div className="mt-1">
              <b className="text-[14px] font-semibold tabular-nums block text-[var(--text-1)]">
                {formatCurrency(totalLiquidSavings, currency)}
              </b>
              <span className="text-[10.5px] text-[var(--text-2)] block mt-0.5">
                Total saved fund
              </span>
            </div>
          </article>
        </section>

        {/* P0 Item 1: 1-Line Smart Quick Entry Bar on Home */}
        <section className="mt-2" aria-label="Quick Transaction Input">
          <div className="home-quick-bar">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickSubmit();
                }
              }}
              placeholder="lunch 35k ewallet"
              className="home-quick-input"
            />
            <div className="flex items-center gap-1">
              {quickInput.trim() && (
                <button
                  type="button"
                  onClick={handleQuickSubmit}
                  className="home-quick-btn submit"
                  title="Record transaction"
                >
                  <svg className="w-3.5 h-3.5"><use href="#i-plus"/></svg>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenScanner}
                className="home-quick-btn"
                title="Scan receipt camera"
              >
                <svg className="w-4 h-4"><use href="#i-scan"/></svg>
              </button>
            </div>
          </div>
          {quickFeedback && (
            <p className="text-[11px] text-emerald-400 px-2 mt-1 animate-fade-in flex items-center gap-1">
              <span>✓</span> {quickFeedback}
            </p>
          )}
        </section>

        {/* Recent Transactions Feed (P1: Differentiated Scan-Friendly Rows) */}
        <section className="panel glass mt-2 mb-2" aria-labelledby="recent">
          <div className="panel-h">
            <h2 id="recent">Recent transactions</h2>
            <button
              type="button"
              className="pill"
              onClick={() => onNavigateTab('record')}
            >
              All
            </button>
          </div>

          {recentGrouped.length === 0 ? (
            <div className="py-6 text-center text-[var(--text-2)] text-xs">
              No transactions recorded yet. Type above to log your first spend.
            </div>
          ) : (
            recentGrouped.map((group) => (
              <React.Fragment key={group.date}>
                <p className="day">{group.friendlyDate}</p>
                {group.items.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isExpense = tx.type === 'expense';
                  const isSavings = tx.type === 'savings';
                  const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
                  const cleanTitle = cleanTransactionNote(tx.note) || tx.category;
                  const catLabel = tx.category.charAt(0).toUpperCase() + tx.category.slice(1);
                  const theme = getCategoryTheme(tx.category, tx.type);

                  return (
                    <div
                      key={tx.id}
                      onClick={() => onSelectTransactionDetail?.(tx)}
                      className="row cursor-pointer active:opacity-80 transition-opacity"
                    >
                      <span className={`tile ${theme.tileClass}`}>
                        <svg className="ic"><use href={theme.iconHref}/></svg>
                      </span>
                      <div className="t">
                        <b>{cleanTitle}</b>
                        <small>
                          {isIncome
                            ? `${catLabel}, Income`
                            : isSavings
                            ? 'Savings Reserve'
                            : catLabel}
                        </small>
                      </div>
                      <span
                        className={`amt tabular-nums font-semibold ${
                          isIncome ? 'text-emerald-400' : isSavings ? 'text-amber-400' : 'text-[var(--text-1)]'
                        }`}
                      >
                        {isExpense ? '−' : isIncome ? '+' : '→ '}
                        {formatCurrency(converted, currency)}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </section>

        {/* Monthly Pacing & Projection Card */}
        <section
          onClick={() => onNavigateTab('monthly')}
          className="pane p-2.5 mt-2 cursor-pointer hover:border-white/20 active:scale-[0.99] transition-all"
          aria-label="Monthly budget pacing insights"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/20 flex items-center justify-center text-[var(--brand)]">
                <svg className="ic w-4 h-4"><use href="#i-bars"/></svg>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-1)]">Monthly Pacing</h3>
                <p className="text-[11px] text-[var(--text-2)]">{pacingMetrics.daysRemaining} days remaining in cycle</p>
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${pacingMetrics.pacingColor}`}>
              {pacingMetrics.pacingLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/[0.07]">
            <div>
              <span className="text-[10px] text-[var(--text-2)] block">Safe daily spend</span>
              <b className="text-[13.5px] font-semibold tabular-nums text-[var(--text-1)] block mt-0.5">
                {formatCurrency(pacingMetrics.safeDailySpend, currency)}
                <span className="text-[10px] font-normal text-[var(--text-2)]">/day</span>
              </b>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[var(--text-2)] block">Projected month-end</span>
              <b className="text-[13.5px] font-semibold tabular-nums text-[var(--brand)] block mt-0.5">
                {formatCurrency(pacingMetrics.projectedMonthEndLeft, currency)}
                <span className="text-[10px] font-normal text-[var(--text-2)]"> left</span>
              </b>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Bottom Nav (Glass) with P1 Text Labels */}
      <nav className="nav glass" aria-label="Main">
        <button
          type="button"
          className="nav-item"
          aria-label="Home"
          aria-current="page"
          onClick={() => onNavigateTab('home')}
        >
          <svg className="ic"><use href="#i-home"/></svg>
          <span>Home</span>
        </button>

        <button
          type="button"
          className="nav-item"
          aria-label="History"
          onClick={() => onNavigateTab('record')}
        >
          <svg className="ic"><use href="#i-clock"/></svg>
          <span>History</span>
        </button>

        <button
          type="button"
          className="add"
          aria-label="Add transaction (open form bottom sheet)"
          onClick={onOpenAddTransaction}
        >
          <svg className="ic"><use href="#i-plus"/></svg>
        </button>

        <button
          type="button"
          className="nav-item"
          aria-label="Stats"
          onClick={() => onNavigateTab('monthly')}
        >
          <svg className="ic"><use href="#i-bars"/></svg>
          <span>Stats</span>
        </button>

        <button
          type="button"
          className="nav-item"
          aria-label="Wallet"
          onClick={() => onNavigateTab('savings')}
        >
          <svg className="ic"><use href="#i-wallet"/></svg>
          <span>Wallet</span>
        </button>
      </nav>

      {/* Bills Modal */}
      {isBillsModalOpen && (
        <BillsModal
          isOpen={isBillsModalOpen}
          onClose={() => setIsBillsModalOpen(false)}
          language={language}
          currency={currency}
          rates={rates}
          recurringBills={state.recurringBills || []}
          transactions={transactions}
          customCategories={state.customCategories || []}
          onAddTransaction={onAddTransaction}
          onDeleteTransaction={onDeleteTransaction}
          onAddRecurringBill={onAddRecurringBill}
          onUpdateRecurringBill={onUpdateRecurringBill}
          onDeleteRecurringBill={onDeleteRecurringBill}
        />
      )}

      {/* Budget Breakdown Modal */}
      {isBreakdownModalOpen && (
        <BudgetBreakdownModal
          isOpen={isBreakdownModalOpen}
          onClose={() => setIsBreakdownModalOpen(false)}
          monthlyBudgetTarget={monthlyBudgetTarget}
          totalSpentThisMonth={totalSpentThisMonth}
          fixedSpent={fixedSpent}
          variableSpent={variableSpent}
          fixedUnpaid={recurringMetrics.remainingCommitment}
          leftThisMonth={leftThisMonth}
          safeDailySpend={pacingMetrics.safeDailySpend}
          daysRemaining={pacingMetrics.daysRemaining}
          currency={currency}
          language={language}
          onOpenMonthlySettings={() => onNavigateTab('monthly')}
        />
      )}
    </>
  );
}
