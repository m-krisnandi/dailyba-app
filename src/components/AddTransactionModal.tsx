'use client';

import React, { useState, useEffect } from 'react';
import {
  Currency,
  ExpenseCategory,
  FundingSource,
  IncomeCategory,
  Language,
  Transaction,
  TransactionType,
} from '@/types/finance';
import { translations } from '@/lib/i18n';
import {
  EXPENSE_CATEGORY_ICONS,
  INCOME_CATEGORY_ICONS,
  FUNDING_SOURCE_ICONS,
} from '@/lib/constants';
import { formatNumberWithCommas, parseRawNumber } from '@/lib/currency';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  X,
  Check,
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  CreditCard,
  Plus,
  Sparkles,
} from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  language: Language;
  currency: Currency;
  initialType?: TransactionType;
  initialDate?: string;
  initialCategory?: string;
  initialAmount?: number;
  initialNote?: string;
  title?: string;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onAddTransaction,
  language,
  currency,
  initialType = 'expense',
  initialDate,
  initialCategory,
  initialAmount,
  initialNote,
  title,
}: AddTransactionModalProps) {
  useBodyScrollLock(isOpen);

  const t = translations[language];

  const todayStr = new Date().toISOString().split('T')[0];
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>(initialCategory || 'food_drinks');
  const [source, setSource] = useState<FundingSource>('cash');
  const [date, setDate] = useState<string>(initialDate || todayStr);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setDate(initialDate || new Date().toISOString().split('T')[0]);
      if (initialCategory) {
        setCategory(initialCategory);
      } else {
        setCategory(initialType === 'income' ? 'salary' : initialType === 'savings' ? 'savings' : 'food_drinks');
      }
      setAmountStr(initialAmount ? formatNumberWithCommas(initialAmount) : '');
      setNote(initialNote || '');
    }
  }, [isOpen, initialType, initialDate, initialCategory, initialAmount, initialNote]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseRawNumber(amountStr);
    if (!parsedAmount || parsedAmount <= 0) return;

    onAddTransaction({
      type,
      amount: parsedAmount,
      category: type === 'savings' ? 'savings' : (category as ExpenseCategory),
      source,
      date: date || todayStr,
      note: note.trim() || undefined,
      currency,
    });
    onClose();
  };

  const expenseCategories = Object.keys(EXPENSE_CATEGORY_ICONS) as ExpenseCategory[];
  const incomeCategories = Object.keys(INCOME_CATEGORY_ICONS) as IncomeCategory[];
  const fundingSources: FundingSource[] = ['cash', 'bank', 'ewallet', 'credit_card'];

  // Currency quick presets
  const presets =
    currency === 'IDR'
      ? [20000, 50000, 100000, 200000, 500000]
      : currency === 'USD'
      ? [5, 10, 20, 50, 100]
      : currency === 'MMK'
      ? [3000, 5000, 10000, 20000, 50000]
      : [500, 1000, 2000, 5000, 10000];

  const modalTitle = title || (type === 'expense' ? 'Record Expense' : type === 'income' ? 'Record Income' : 'Save to Reserves');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-main)]">
                {modalTitle}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">
                {date === todayStr ? 'Today • Fast Entry' : date}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (category === 'salary' || category === 'savings') setCategory('food_drinks');
              }}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-[var(--bg-surface-solid)] text-rose-500 border border-rose-500/40 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              <span>{t.record.typeExpense}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                if (category === 'food_drinks' || category === 'savings') setCategory('salary');
              }}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-[var(--bg-surface-solid)] text-emerald-500 border border-emerald-500/40 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t.record.typeIncome}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('savings');
                setCategory('savings');
              }}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'savings'
                  ? 'bg-[var(--bg-surface-solid)] text-amber-500 border border-amber-500/40 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.record.typeSavings}</span>
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {t.record.amountLabel} ({currency})
              </label>
              {amountStr && (
                <button
                  type="button"
                  onClick={() => setAmountStr('')}
                  className="text-xs text-[var(--text-muted)] hover:text-rose-500 transition-colors font-mono cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={amountStr}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  setAmountStr(formatNumberWithCommas(raw));
                }}
                placeholder="0"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl pl-4 pr-16 py-3 text-lg font-bold text-[var(--text-main)] outline-none tabular-numbers font-mono"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[var(--text-muted)] pointer-events-none select-none">
                {currency}
              </span>
            </div>

            {/* Quick Amount Presets */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 no-scrollbar">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountStr(formatNumberWithCommas(val))}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)] transition-all cursor-pointer whitespace-nowrap"
                >
                  +{val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selector (when not savings) */}
          {type !== 'savings' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {t.record.selectCategory}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl px-4 py-2.5 text-xs font-bold text-[var(--text-main)] outline-none cursor-pointer"
              >
                {type === 'expense'
                  ? expenseCategories.map((c) => (
                      <option key={c} value={c}>
                        {t.expenseCategories[c] || c}
                      </option>
                    ))
                  : incomeCategories.map((c) => (
                      <option key={c} value={c}>
                        {t.incomeCategories[c] || c}
                      </option>
                    ))}
              </select>
            </div>
          )}

          {/* Funding Source Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              {t.record.fundingSource}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {fundingSources.map((s) => {
                const Icon = FUNDING_SOURCE_ICONS[s] || CreditCard;
                const isSelected = source === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(s)}
                    className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--btn-primary-border)] shadow-xs'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{t.sources[s]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              {t.record.date}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-[var(--text-main)] outline-none cursor-pointer"
              required
            />
          </div>

          {/* Note / Memo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              {t.record.note}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.record.notePlaceholder}
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl px-4 py-2.5 text-xs text-[var(--text-main)] outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
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
  );
}
