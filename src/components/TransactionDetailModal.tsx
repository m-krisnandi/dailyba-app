'use client';

import React from 'react';
import {
  Currency,
  ExpenseCategory,
  FundingSource,
  IncomeCategory,
  Language,
  Transaction,
} from '@/types/finance';
import { formatCurrency, translations } from '@/lib/i18n';
import {
  EXPENSE_CATEGORY_ICONS,
  INCOME_CATEGORY_ICONS,
  FUNDING_SOURCE_ICONS,
  getCategoryBadgeStyle,
  getFundingSourceBadgeStyle,
} from '@/lib/constants';
import { convertCurrency, DEFAULT_RATES, ExchangeRates } from '@/lib/currency';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  X,
  Calendar,
  CreditCard,
  FileText,
  Trash2,
  Edit3,
  TrendingDown,
  TrendingUp,
  Wallet,
  Tag,
} from 'lucide-react';

interface TransactionDetailModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  language: Language;
  currency: Currency;
  rates?: ExchangeRates;
  onClose: () => void;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
}

export function TransactionDetailModal({
  isOpen,
  transaction,
  language,
  currency,
  rates = DEFAULT_RATES,
  onClose,
  onEdit,
  onDelete,
}: TransactionDetailModalProps) {
  useBodyScrollLock(isOpen && !!transaction);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);

  if (!isOpen || !transaction) return null;

  const t = translations[language];
  const isJa = language === 'ja';

  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';

  const catLabel = isExpense
    ? t.expenseCategories[transaction.category as ExpenseCategory] || transaction.category
    : isIncome
    ? t.incomeCategories[transaction.category as IncomeCategory] || transaction.category
    : t.record.typeSavings;

  const Icon = isExpense
    ? EXPENSE_CATEGORY_ICONS[transaction.category as ExpenseCategory] || Tag
    : isIncome
    ? INCOME_CATEGORY_ICONS[transaction.category as IncomeCategory] || TrendingUp
    : Wallet;

  const SourceIcon = FUNDING_SOURCE_ICONS[transaction.source as FundingSource] || CreditCard;

  const convertedAmount = convertCurrency(
    transaction.amount,
    transaction.currency || 'JPY',
    currency,
    rates
  );

  const isDifferentCurrency = transaction.currency && transaction.currency !== currency;
  const catStyle = getCategoryBadgeStyle(transaction.type, transaction.category);
  const sourceStyle = getFundingSourceBadgeStyle(transaction.source);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {isJa ? '取引明細' : 'Transaction Details'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Amount & Type Card */}
        <div
          className={`p-5 rounded-2xl border text-center space-y-2 ${
            isExpense
              ? 'bg-rose-500/5 border-rose-500/20'
              : isIncome
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-amber-500/5 border-amber-500/20'
          }`}
        >
          <div className="flex items-center justify-center space-x-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center space-x-1 ${
                isExpense
                  ? 'bg-rose-500/20 text-rose-500'
                  : isIncome
                  ? 'bg-emerald-500/20 text-emerald-500'
                  : 'bg-amber-500/20 text-amber-500'
              }`}
            >
              {isExpense ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{t.record.typeExpense}</span>
                </>
              ) : isIncome ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{t.record.typeIncome}</span>
                </>
              ) : (
                <>
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{t.record.typeSavings}</span>
                </>
              )}
            </span>
          </div>

          <h2
            className={`text-3xl sm:text-4xl font-black tabular-numbers font-mono tracking-tight ${
              isExpense
                ? 'text-rose-600 dark:text-rose-400'
                : isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {isExpense ? '-' : '+'}
            {formatCurrency(convertedAmount, currency)}
          </h2>

          {isDifferentCurrency && (
            <p className="text-xs font-mono text-[var(--text-muted)]">
              {isJa ? '元金額: ' : 'Original: '}
              {formatCurrency(transaction.amount, transaction.currency || 'JPY')}
            </p>
          )}
        </div>

        {/* Note / Description (Highlighted prominent block) */}
        <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-[var(--text-muted)]">
            <FileText className="w-3.5 h-3.5 text-[var(--accent-emerald)]" />
            <span>{isJa ? '説明・メモ' : 'Note & Description'}</span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-main)] font-medium whitespace-pre-wrap break-words leading-relaxed select-text">
            {transaction.note && transaction.note.trim() ? (
              transaction.note
            ) : (
              <span className="text-[var(--text-faint)] italic">
                {isJa ? 'メモはありません' : 'No description provided'}
              </span>
            )}
          </p>
        </div>

        {/* Key Attributes List */}
        <div className="space-y-2.5">
          {/* Category */}
          <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
              <Tag className="w-3.5 h-3.5" />
              <span>{isJa ? 'カテゴリー' : 'Category'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${catStyle.border} ${catStyle.bg} ${catStyle.text}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-[var(--text-main)]">{catLabel}</span>
            </div>
          </div>

          {/* Funding Source */}
          <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isJa ? '支出元・口座' : 'Payment Source'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${sourceStyle.border} ${sourceStyle.bg} ${sourceStyle.text}`}>
                <SourceIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-[var(--text-main)]">
                {t.sources[transaction.source] || transaction.source}
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
              <Calendar className="w-3.5 h-3.5" />
              <span>{isJa ? '取引日' : 'Date'}</span>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--text-main)]">
              {transaction.date}
            </span>
          </div>

          {/* Transaction ID */}
          <div className="px-3 py-1 flex items-center justify-between text-[10px] font-mono text-[var(--text-faint)]">
            <span>ID: {transaction.id}</span>
            {transaction.isRecurring && (
              <span className="text-emerald-500 font-semibold">{isJa ? '毎月の固定費' : 'Recurring Bill'}</span>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)]">
          {onDelete && (
            <button
              type="button"
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.actions.delete}</span>
            </button>
          )}

          <div className="flex items-center space-x-2 ml-auto">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(transaction);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t.actions.edit}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] hover:opacity-90 text-xs font-bold transition-all cursor-pointer"
            >
              {isJa ? '閉じる' : 'Close'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        title={isJa ? "取引の削除" : "Delete Transaction"}
        description={isJa ? "この取引履歴を削除してもよろしいですか？" : "Are you sure you want to delete this transaction?"}
        itemName={`${catLabel}: ${formatCurrency(convertedAmount, currency)}`}
        language={language}
        onConfirm={() => {
          if (onDelete && transaction) {
            onDelete(transaction.id);
            onClose();
          }
        }}
        onClose={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  );
}
