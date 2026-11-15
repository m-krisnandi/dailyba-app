'use client';

import React, { useMemo } from 'react';
import { FinanceState, Currency, Language, Transaction, FundingSource, ExpenseCategory } from '@/types/finance';
import { ExchangeRates, DEFAULT_RATES, convertCurrency } from '@/lib/currency';
import { formatCurrency } from '@/lib/i18n';
import { formatFriendlyDate, getMonthDateRange, isDateInMonthCycle } from '@/lib/dateUtils';
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
      // Use configured savings target as a natural budget baseline
      return state.savingsGoalMonthly * 2;
    }
    // Baseline sensible defaults per currency
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

  // 2. Spending by Funding Source this month
  const sourceTotals = useMemo(() => {
    const totals: Record<FundingSource, number> = {
      bank: 0,
      ewallet: 0,
      cash: 0,
      credit_card: 0,
    };
    monthTransactions.forEach((tx) => {
      if (tx.type === 'expense' && tx.source) {
        const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
        if (totals[tx.source] !== undefined) {
          totals[tx.source] += converted;
        }
      }
    });
    return totals;
  }, [monthTransactions, currency, rates]);

  // 3. User Avatar initial
  const userInitial = useMemo(() => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'M';
  }, [user]);

  // 4. Recent transactions grouped by day
  const recentGrouped = useMemo(() => {
    // Sort transactions date descending
    const sorted = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.id || '').localeCompare(a.id || '');
    });

    const recentItems = sorted.slice(0, 8);
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
        return '#i-food';
      case 'shopping':
        return '#i-bag';
      case 'laundry':
        return '#i-shirt';
      case 'transport':
        return '#i-car';
      case 'bills':
      case 'rent':
      case 'vps':
        return '#i-bank';
      default:
        return '#i-wallet';
    }
  };

  return (
    <>
      {/* SVG Icon Symbols matching mock exactly */}
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

      {/* Ambient background: the glass needs something to blur */}
      <div className="app-bg" aria-hidden="true">
        <svg viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="r1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6FA9B4" stopOpacity=".55"/>
              <stop offset="1" stopColor="#173540" stopOpacity=".08"/>
            </linearGradient>
            <linearGradient id="r2" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4C8794" stopOpacity=".45"/>
              <stop offset="1" stopColor="#10262E" stopOpacity=".05"/>
            </linearGradient>
          </defs>
          <path d="M-40 170C110 40 300 110 335 330S250 620 460 700" fill="none" stroke="url(#r1)" strokeWidth="64" strokeLinecap="round"/>
          <path d="M-40 170C110 40 300 110 335 330S250 620 460 700" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="2" transform="translate(-14 -14)"/>
          <path d="M-60 540C100 440 240 570 205 770S380 900 470 820" fill="none" stroke="url(#r2)" strokeWidth="52" strokeLinecap="round"/>
        </svg>
      </div>

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

        {/* Cards: Spending by Funding Source */}
        <section className="cards" aria-label="Spending by funding source">
          <article className="src pane s-bank">
            <svg className="ic"><use href="#i-bank"/></svg>
            <div>
              <b className="tabular-nums">{formatCurrency(sourceTotals.bank, currency)}</b>
              <span>Bank, this month</span>
            </div>
          </article>
          <article className="src pane s-wallet">
            <svg className="ic"><use href="#i-wallet"/></svg>
            <div>
              <b className="tabular-nums">{formatCurrency(sourceTotals.ewallet, currency)}</b>
              <span>E-wallet, this month</span>
            </div>
          </article>
          <article className="src pane s-cash">
            <svg className="ic"><use href="#i-cash"/></svg>
            <div>
              <b className="tabular-nums">{formatCurrency(sourceTotals.cash, currency)}</b>
              <span>Cash, this month</span>
            </div>
          </article>
          <article className="src pane s-card">
            <svg className="ic"><use href="#i-card"/></svg>
            <div>
              <b className="tabular-nums">{formatCurrency(sourceTotals.credit_card, currency)}</b>
              <span>Credit card, this month</span>
            </div>
          </article>
        </section>

        {/* Quick Actions */}
        <section className="actions" aria-label="Quick actions">
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

        {/* Review Banner */}
        {pendingEmailSyncCount > 0 ? (
          <section className="banner pane">
            <div>
              <b>{pendingEmailSyncCount} imports waiting for review</b>
              <p>Found in your bank and e-wallet emails</p>
            </div>
            <button type="button" className="pill" onClick={onOpenEmailSync}>
              Review
            </button>
          </section>
        ) : (
          <section className="banner pane">
            <div>
              <b>Bank &amp; Email Sync</b>
              <p>Auto-parse expense receipts from your emails</p>
            </div>
            <button type="button" className="pill" onClick={onOpenEmailSync}>
              Sync
            </button>
          </section>
        )}

        {/* Recent Transactions Panel (Glass) */}
        <section className="panel glass" aria-labelledby="recent">
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
            <div className="py-8 text-center text-[var(--text-2)] text-xs">
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
