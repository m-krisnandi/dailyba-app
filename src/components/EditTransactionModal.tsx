'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CustomSelect, CustomSelectOption } from './CustomSelect';
import { CustomDatePicker } from '@/components/CustomDatePicker';
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
import { getTodayLocalDate } from '@/lib/dateUtils';
import {
  EXPENSE_CATEGORY_ICONS,
  INCOME_CATEGORY_ICONS,
  FUNDING_SOURCE_ICONS,
  getCategoryBadgeStyle,
  getFundingSourceBadgeStyle,
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
  FileText,
} from 'lucide-react';

const expenseCategories = Object.keys(EXPENSE_CATEGORY_ICONS) as ExpenseCategory[];
const incomeCategories = Object.keys(INCOME_CATEGORY_ICONS) as IncomeCategory[];
const fundingSources: FundingSource[] = ['cash', 'bank', 'ewallet', 'credit_card'];

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  language: Language;
  currency: Currency;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
}

export function EditTransactionModal({
  isOpen,
  transaction,
  language,
  currency,
  onClose,
  onSave,
}: EditTransactionModalProps) {
  useBodyScrollLock(isOpen && !!transaction);

  const t = translations[language];

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>('food_drinks');
  const [source, setSource] = useState<FundingSource>('cash');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [txCurrency, setTxCurrency] = useState<Currency>(currency);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmountStr(formatNumberWithCommas(transaction.amount));
      setCategory(transaction.category || 'food_drinks');
      setSource(transaction.source || 'cash');
      setDate(transaction.date || getTodayLocalDate());
      setNote(transaction.note || '');
      setTxCurrency(transaction.currency || currency);
    }
  }, [transaction, currency]);

  const availableSources = useMemo<FundingSource[]>(() => {
    if (type === 'expense') {
      return ['cash', 'bank', 'credit_card', 'ewallet'];
    }
    return ['bank', 'cash', 'ewallet'];
  }, [type]);

  useEffect(() => {
    if (type !== 'expense' && source === 'credit_card') {
      setSource('bank');
    }
  }, [type, source]);

  const categoryOptions = useMemo<CustomSelectOption[]>(() => {
    if (type === 'expense') {
      return expenseCategories.map((cat) => {
        const style = getCategoryBadgeStyle("expense", cat);
        return {
          value: cat,
          label: t.expenseCategories[cat] || cat,
          icon: EXPENSE_CATEGORY_ICONS[cat],
          badgeClass: `${style.border} ${style.bg} ${style.text}`,
        };
      });
    }
    return incomeCategories.map((cat) => {
      const style = getCategoryBadgeStyle("income", cat);
      return {
        value: cat,
        label: t.incomeCategories[cat] || cat,
        icon: INCOME_CATEGORY_ICONS[cat],
        badgeClass: `${style.border} ${style.bg} ${style.text}`,
      };
    });
  }, [type, t]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseRawNumber(amountStr);
    if (!parsedAmount || parsedAmount <= 0) return;

    onSave({
      ...transaction,
      type,
      amount: parsedAmount,
      category: type === 'savings' ? 'savings' : category,
      source,
      date: date || getTodayLocalDate(),
      note: note.trim() || undefined,
      currency: txCurrency,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h3 className="text-base font-extrabold text-[var(--text-main)]">
              {t.record.editTransaction}
            </h3>
            <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
              ID: {transaction.id}
            </p>
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
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{t.record.typeExpense}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                if (category === 'food_drinks' || category === 'savings') setCategory('salary');
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t.record.typeIncome}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('savings');
                setCategory('savings');
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === 'savings'
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{t.record.typeSavings}</span>
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              {t.record.amountLabel} ({txCurrency})
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  setAmountStr(formatNumberWithCommas(raw));
                }}
                placeholder="0"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl pl-4 pr-16 py-3 text-base font-bold text-[var(--text-main)] outline-none tabular-numbers font-mono"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[var(--text-muted)] pointer-events-none select-none">
                {txCurrency}
              </span>
            </div>
          </div>

          {/* Category Selector (when not savings) */}
          {type !== 'savings' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {t.record.selectCategory}
              </label>
              <CustomSelect
                value={category}
                onChange={(val) => setCategory(val)}
                options={categoryOptions}
              />
            </div>
          )}

          {/* Funding Source Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              {type === 'income' ? (language === 'ja' ? '受取先口座' : 'Deposit Account') : type === 'savings' ? (language === 'ja' ? '積立先口座' : 'Savings Destination') : t.record.fundingSource}
            </label>
            <div className={`grid gap-2 ${type === 'expense' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
              {availableSources.map((s) => {
                const Icon = FUNDING_SOURCE_ICONS[s] || CreditCard;
                const isSelected = source === s;
                const sourceStyle = getFundingSourceBadgeStyle(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(s)}
                    className={`flex items-center justify-center space-x-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--btn-primary-border)] shadow-xs'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${sourceStyle.border} ${sourceStyle.bg} ${sourceStyle.text}`}>
                      <Icon className="w-3 h-3" />
                    </div>
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
            <CustomDatePicker
              value={date}
              onChange={setDate}
              language={language}
              
            />
          </div>

          {/* Note / Memo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              {t.record.note}
            </label>
            <div className="relative">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.record.notePlaceholder}
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl px-4 py-2.5 text-xs text-[var(--text-main)] outline-none"
              />
            </div>
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
