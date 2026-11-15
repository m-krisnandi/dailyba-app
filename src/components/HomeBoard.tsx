'use client';

import React, { useMemo } from 'react';
import { FinanceState, Currency, Language, Transaction, FundingSource, ExpenseCategory } from '@/types/finance';
import { ExchangeRates, DEFAULT_RATES, convertCurrency } from '@/lib/currency';
import { formatCurrency } from '@/lib/i18n';
import { formatFriendlyDate, getMonthDateRange, isDateInMonthCycle, getTodayLocalDate } from '@/lib/dateUtils';
import { cleanTransactionNote } from '@/lib/transactionUtils';
import { TabKey } from '@/components/TabsNav';

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
}: HomeBoardProps) {
  const { transactions = [], currency = 'IDR', language = 'en', monthStartDay = 1, monthlyBudgets = {} } = state;

  // 1. Current active month cycle
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const activeCycle = useMemo(() => {
    return getMonthDateRange(currentMonthKey, monthStartDay);
  }, [currentMonthKey, monthStartDay]);

  // Current month's transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => isDateInMonthCycle(tx.date, currentMonthKey, monthStartDay));
  }, [transactions, currentMonthKey, monthStartDay]);

  // Total spent this month
  const totalSpentThisMonth = useMemo(() => {
    let spent = 0;
    monthTransactions.forEach((tx) => {
      if (tx.type === 'expense') {
        const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
        spent += converted;
      }
    });
    return spent;
  }, [monthTransactions, currency, rates]);

  // Monthly Budget Target: from monthlyBudgets or fallback based on currency
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

  const leftThisMonth = Math.max(0, monthlyBudgetTarget - totalSpentThisMonth);
  const budgetPercent = monthlyBudgetTarget > 0
    ? Math.min(100, Math.round((totalSpentThisMonth / monthlyBudgetTarget) * 100))
    : 0;

  // 2. Today's Spend vs Daily Limit
  const todaySpent = useMemo(() => {
    const todayStr = getTodayLocalDate();
    return transactions
      .filter((tx) => tx.type === 'expense' && tx.date === todayStr)
      .reduce((sum, tx) => sum + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates), 0);
  }, [transactions, currency, rates]);

  const dailyTarget = useMemo(() => {
    return convertCurrency(state.dailySpendTarget || 3000, state.dailySpendCurrency || 'JPY', currency, rates);
  }, [state.dailySpendTarget, state.dailySpendCurrency, currency, rates]);

  // 3. Recurring Bills metrics (Commitments: Rent, VPS, SIM, etc.)
  const recurringMetrics = useMemo(() => {
    const activeBills = Array.isArray(state.recurringBills) ? state.recurringBills : [];
    if (activeBills.length === 0) {
      return { totalCommitment: 0, paidCommitment: 0, remainingCommitment: 0, paidCount: 0, totalCount: 0, paidPercent: 0 };
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
      }
    });

    const remainingCommitment = Math.max(0, totalCommitment - paidCommitment);
    const paidPercent = totalCommitment > 0 ? Math.min(100, Math.round((paidCommitment / totalCommitment) * 100)) : 0;

    return {
      totalCommitment,
      paidCommitment,
      remainingCommitment,
      paidCount,
      totalCount: activeBills.length,
      paidPercent,
    };
  }, [state.recurringBills, currentMonthKey, transactions, currency, rates]);

  // 4. Total Reserves / Liquid Savings
  const totalLiquidSavings = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'savings')
      .reduce((sum, tx) => sum + convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates), 0);
  }, [transactions, currency, rates]);

  // 5. Monthly Budget Pacing & Projection
  const pacingMetrics = useMemo(() => {
    const today = new Date();
    const end = new Date(activeCycle.endDate);
    const start = new Date(activeCycle.startDate);

    const diffTime = end.getTime() - today.getTime();
    const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const daysElapsed = Math.max(1, totalDays - daysRemaining);

    const safeDailySpend = Math.max(0, Math.round(leftThisMonth / daysRemaining));
    const avgDailySpent = daysElapsed > 0 ? totalSpentThisMonth / daysElapsed : 0;
    const projectedMonthTotal = Math.round(totalSpentThisMonth + (avgDailySpent * daysRemaining));

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
      projectedMonthTotal,
      pacingLabel,
      pacingColor,
    };
  }, [activeCycle, leftThisMonth, totalSpentThisMonth, monthlyBudgetTarget]);

  // 6. User Avatar initial
  const userInitial = useMemo(() => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'K';
  }, [user]);

  // 7. Recent transactions grouped by day (Top 4 preview on Home)
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

  // Icon symbol resolver
  const getIconSymbolId = (category: string) => {
    switch (category) {
      case 'food':
      case 'food_drinks':
        return '#i-food';
      case 'shopping':
        return '#i-bag';
      case 'laundry':
        return '#i-shirt';
      case 'transport':
      case 'train':
        return '#i-car';
      case 'bills':
      case 'rent':
      case 'vps':
      case 'mobile':
        return '#i-bank';
      default:
        return '#i-wallet';
    }
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
        <symbol id="i-cash" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.5"/></symbol>
        <symbol id="i-card" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M3 10h18"/></symbol>
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
            aria-label="Open menu"
            onClick={onOpenMenu}
          >
            {userInitial}
          </button>
          <button
            type="button"
            className="ibtn"
            aria-label={`Review ${pendingEmailSyncCount} imported transactions`}
            onClick={onOpenEmailSync}
          >
            <svg className="ic"><use href="#i-mail"/></svg>
            {pendingEmailSyncCount > 0 && (
              <span className="badge">{pendingEmailSyncCount}</span>
            )}
          </button>
        </header>

        {/* Hero: Left this month */}
        <button
          type="button"
          className="hero w-full text-left cursor-pointer"
          onClick={() => onNavigateTab('monthly')}
          aria-label={`Left this month, ${formatCurrency(leftThisMonth, currency)}. Open monthly insights`}
        >
          <span className="hero-label">Left this month</span>
          <span className="hero-amt tabular-nums">
            {formatCurrency(leftThisMonth, currency)}
            <svg className="ic"><use href="#i-chev"/></svg>
          </span>
        </button>
        <div
          className="bar"
          role="progressbar"
          aria-label="Monthly budget used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={budgetPercent}
        >
          <i style={{ width: `${budgetPercent}%` }}></i>
        </div>
        <p className="hero-sub tabular-nums">
          {formatCurrency(totalSpentThisMonth, currency)} spent of {formatCurrency(monthlyBudgetTarget, currency)}
        </p>

        {/* Today's Spend vs Daily Limit Bar */}
        <div 
          onClick={() => onNavigateTab('daily')}
          className="mt-1.5 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] cursor-pointer hover:bg-white/[0.07] transition-colors"
        >
          <span className="text-xs text-[var(--text-2)] flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${todaySpent <= dailyTarget ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            Today&apos;s Spend
          </span>
          <span className="tabular-nums font-semibold text-xs text-[var(--text-1)]">
            {formatCurrency(todaySpent, currency)}{' '}
            <span className="text-[var(--text-2)] font-normal text-[11px]">/ {formatCurrency(dailyTarget, currency)} target</span>
          </span>
        </div>

        {/* 2 Essential Cards: Recurring Bills & Reserves */}
        <section className="grid grid-cols-2 gap-2 mt-1.5" aria-label="Key commitments and reserves">
          {/* Card 1: Recurring Bills */}
          <article 
            onClick={() => onNavigateTab('record')} 
            className="pane p-2 flex flex-col justify-between min-h-[76px] cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg className="ic w-4 h-4 text-[var(--brand)]"><use href="#i-bank"/></svg>
                <span className="text-xs text-[var(--text-2)] font-medium">Bills</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${recurringMetrics.totalCount > 0 && recurringMetrics.remainingCommitment === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {recurringMetrics.totalCount > 0 
                  ? (recurringMetrics.remainingCommitment === 0 ? 'Settled' : `${recurringMetrics.paidCount}/${recurringMetrics.totalCount}`)
                  : '0 Bills'}
              </span>
            </div>
            <div className="mt-1.5">
              <b className="text-[14.5px] font-semibold tabular-nums block text-[var(--text-1)]">
                {formatCurrency(recurringMetrics.remainingCommitment, currency)}
              </b>
              <span className="text-[10.5px] text-[var(--text-2)] block mt-0.5">
                {recurringMetrics.remainingCommitment === 0 ? 'All settled this month' : 'Left to pay'}
              </span>
            </div>
          </article>

          {/* Card 2: Total Reserves / Savings */}
          <article 
            onClick={() => onNavigateTab('savings')} 
            className="pane p-2 flex flex-col justify-between min-h-[76px] cursor-pointer active:scale-[0.98] transition-transform"
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
            <div className="mt-1.5">
              <b className="text-[14.5px] font-semibold tabular-nums block text-[var(--text-1)]">
                {formatCurrency(totalLiquidSavings, currency)}
              </b>
              <span className="text-[10.5px] text-[var(--text-2)] block mt-0.5">
                Total saved fund
              </span>
            </div>
          </article>
        </section>

        {/* Quick Actions */}
        <section className="actions mt-2" aria-label="Quick actions">
          <button type="button" className="act" onClick={onOpenAddTransaction}>
            <span className="pane"><svg className="ic"><use href="#i-plus"/></svg></span>
            Add
          </button>
          <button type="button" className="act" onClick={onOpenScanner}>
            <span className="pane"><svg className="ic"><use href="#i-scan"/></svg></span>
            Scan receipt
          </button>
          <button type="button" className="act" onClick={onOpenEmailSync}>
            <span className="pane"><svg className="ic"><use href="#i-in"/></svg></span>
            Import
          </button>
        </section>

        {/* Pending Email Imports Review Banner (Only shown when pending count > 0) */}
        {pendingEmailSyncCount > 0 && (
          <section className="banner pane mt-3">
            <div>
              <b>{pendingEmailSyncCount} imports waiting for review</b>
              <p>Found in your bank and e-wallet emails</p>
            </div>
            <button type="button" className="pill" onClick={onOpenEmailSync}>
              Review
            </button>
          </section>
        )}

        {/* Recent Transactions Panel (Glass) */}
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
              No transactions recorded yet. Tap &quot;Add&quot; to log your first spend.
            </div>
          ) : (
            recentGrouped.map((group) => (
              <React.Fragment key={group.date}>
                <p className="day">{group.friendlyDate}</p>
                {group.items.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isExpense = tx.type === 'expense';
                  const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
                  const cleanTitle = cleanTransactionNote(tx.note) || tx.category;
                  const catLabel = tx.category.charAt(0).toUpperCase() + tx.category.slice(1);
                  const iconHref = getIconSymbolId(tx.category);

                  return (
                    <div
                      key={tx.id}
                      onClick={() => onSelectTransactionDetail?.(tx)}
                      className="row cursor-pointer active:opacity-80 transition-opacity"
                    >
                      <span className="tile">
                        <svg className="ic"><use href={iconHref}/></svg>
                      </span>
                      <div className="t">
                        <b>{cleanTitle}</b>
                        <small>{isIncome ? `${catLabel}, income` : catLabel}</small>
                      </div>
                      <span className={`amt ${isIncome ? 'in' : ''} tabular-nums`}>
                        {isExpense ? '−' : isIncome ? '+' : ''}
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

          <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-white/[0.07]">
            <div>
              <span className="text-[10.5px] text-[var(--text-2)] block">Safe daily spend</span>
              <b className="text-[13.5px] font-semibold tabular-nums text-[var(--text-1)] block mt-0.5">
                {formatCurrency(pacingMetrics.safeDailySpend, currency)}
                <span className="text-[10px] font-normal text-[var(--text-2)]">/day</span>
              </b>
            </div>
            <div className="text-right">
              <span className="text-[10.5px] text-[var(--text-2)] block">Projected month-end</span>
              <b className="text-[13.5px] font-semibold tabular-nums text-[var(--text-1)] block mt-0.5">
                {formatCurrency(pacingMetrics.projectedMonthTotal, currency)}
              </b>
            </div>
          </div>
        </section>

        
      </main>

      {/* Floating Bottom Nav (Glass) */}
      <nav className="nav glass" aria-label="Main">
        <button
          type="button"
          aria-label="Home"
          aria-current="page"
          onClick={() => onNavigateTab('home')}
        >
          <svg className="ic"><use href="#i-home"/></svg>
        </button>
        <button
          type="button"
          aria-label="History"
          onClick={() => onNavigateTab('record')}
        >
          <svg className="ic"><use href="#i-clock"/></svg>
        </button>
        <button
          type="button"
          className="add"
          aria-label="Add transaction"
          onClick={onOpenAddTransaction}
        >
          <svg className="ic"><use href="#i-plus"/></svg>
        </button>
        <button
          type="button"
          aria-label="Insights"
          onClick={() => onNavigateTab('monthly')}
        >
          <svg className="ic"><use href="#i-bars"/></svg>
        </button>
        <button
          type="button"
          aria-label="Savings and investments"
          onClick={() => onNavigateTab('savings')}
        >
          <svg className="ic"><use href="#i-wallet"/></svg>
        </button>
      </nav>
    </>
  );
}
