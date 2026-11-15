'use client';

import React from 'react';
import { Currency, Language } from '@/types/finance';
import { formatCurrency } from '@/lib/i18n';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { X, PieChart, ShieldCheck, ShoppingBag, ArrowRight } from 'lucide-react';

interface BudgetBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyBudgetTarget: number;
  totalSpentThisMonth: number;
  fixedSpent: number;
  variableSpent: number;
  fixedUnpaid: number;
  leftThisMonth: number;
  safeDailySpend: number;
  daysRemaining: number;
  currency: Currency;
  language: Language;
  onOpenMonthlySettings?: () => void;
}

export function BudgetBreakdownModal({
  isOpen,
  onClose,
  monthlyBudgetTarget,
  totalSpentThisMonth,
  fixedSpent,
  variableSpent,
  fixedUnpaid,
  leftThisMonth,
  safeDailySpend,
  daysRemaining,
  currency,
  language,
  onOpenMonthlySettings,
}: BudgetBreakdownModalProps) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const fixedPct = monthlyBudgetTarget > 0 ? Math.round((fixedSpent / monthlyBudgetTarget) * 100) : 0;
  const varPct = monthlyBudgetTarget > 0 ? Math.round((variableSpent / monthlyBudgetTarget) * 100) : 0;
  const leftPct = monthlyBudgetTarget > 0 ? Math.round((leftThisMonth / monthlyBudgetTarget) * 100) : 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-5 sm:p-6 space-y-4 cursor-default text-[var(--text-main)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[var(--brand)] flex items-center justify-center font-bold">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-main)]">
                {language === 'ja' ? '今月の予算内訳' : 'Monthly Budget Breakdown'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">
                {language === 'ja' ? '固定費 vs 変動費の透明な分析' : 'Fixed commitments vs discretionary spend'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Segment Visual Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded-full bg-white/[0.08] overflow-hidden flex">
            {fixedPct > 0 && (
              <div
                style={{ width: `${Math.min(100, fixedPct)}%` }}
                className="h-full bg-sky-400 transition-all"
                title={`Fixed: ${fixedPct}%`}
              />
            )}
            {varPct > 0 && (
              <div
                style={{ width: `${Math.min(100 - fixedPct, varPct)}%` }}
                className="h-full bg-teal-400 transition-all"
                title={`Variable: ${varPct}%`}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              Fixed Bills ({fixedPct}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
              Variable Spend ({varPct}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
              Left ({leftPct}%)
            </span>
          </div>
        </div>

        {/* Detailed KPI Breakdown Cards */}
        <div className="space-y-2 pt-1 text-xs">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
            <span className="text-[var(--text-muted)] font-medium">Total Monthly Budget</span>
            <b className="font-bold tabular-nums text-sm text-[var(--text-main)]">
              {formatCurrency(monthlyBudgetTarget, currency)}
            </b>
          </div>

          <div className="p-3 rounded-2xl bg-sky-500/[0.04] border border-sky-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <div>
                <span className="font-semibold text-sky-300 block">Fixed Commitments (Bills)</span>
                <span className="text-[10px] text-sky-300/70">
                  {fixedUnpaid === 0 ? 'All bills settled' : `${formatCurrency(fixedUnpaid, currency)} pending`}
                </span>
              </div>
            </div>
            <b className="font-bold tabular-nums text-sky-300">
              {formatCurrency(fixedSpent, currency)}
            </b>
          </div>

          <div className="p-3 rounded-2xl bg-teal-500/[0.04] border border-teal-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-teal-400" />
              <div>
                <span className="font-semibold text-teal-300 block">Variable Spend (Daily Jajan)</span>
                <span className="text-[10px] text-teal-300/70">Food, transport, shopping, leisure</span>
              </div>
            </div>
            <b className="font-bold tabular-nums text-teal-300">
              {formatCurrency(variableSpent, currency)}
            </b>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[var(--text-main)] block">Left This Month</span>
              <span className="text-[10.5px] text-[var(--text-muted)]">
                Safe daily spend: <strong className="text-[var(--brand)] font-mono">{formatCurrency(safeDailySpend, currency)}/day</strong> ({daysRemaining} days left)
              </span>
            </div>
            <b className="text-base font-extrabold tabular-nums text-[var(--brand)]">
              {formatCurrency(leftThisMonth, currency)}
            </b>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex justify-end">
          {onOpenMonthlySettings ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMonthlySettings();
              }}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-[var(--text-main)] border border-white/[0.1] flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span>{language === 'ja' ? '月間予算の再設定' : 'Adjust Monthly Budget'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[var(--brand)] text-[#062024] font-bold text-xs"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
