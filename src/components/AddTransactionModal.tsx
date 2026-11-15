'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CustomSelect, CustomSelectOption } from './CustomSelect';
import { CustomDatePicker } from '@/components/CustomDatePicker';
import { ReceiptScannerModal } from '@/components/ReceiptScannerModal';
import { FormattedAmountInput } from '@/components/FormattedAmountInput';
import {
  Currency,
  ExpenseCategory,
  FundingSource,
  IncomeCategory,
  Language,
  Transaction,
  TransactionType,
  CustomCategory,
} from '@/types/finance';
import { formatCurrency, translations } from '@/lib/i18n';
import { getTodayLocalDate } from '@/lib/dateUtils';
import {
  EXPENSE_CATEGORY_ICONS,
  INCOME_CATEGORY_ICONS,
  FUNDING_SOURCE_ICONS,
  getCategoryIconComponent,
  getCategoryBadgeStyle,
} from '@/lib/constants';
import { formatNumberWithCommas, parseRawNumber } from '@/lib/currency';
import { parseSmartText } from '@/lib/parser';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  X,
  TrendingDown,
  TrendingUp,
  Wallet,
  CreditCard,
  Plus,
  ScanText,
  Sparkles,
} from 'lucide-react';

const expenseCategories = Object.keys(EXPENSE_CATEGORY_ICONS) as ExpenseCategory[];
const incomeCategories = Object.keys(INCOME_CATEGORY_ICONS) as IncomeCategory[];

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
  hiddenCategories?: string[];
  customCategories?: CustomCategory[];
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
  hiddenCategories = [],
  customCategories = [],
}: AddTransactionModalProps) {
  useBodyScrollLock(isOpen);

  const t = translations[language];

  const todayStr = useMemo(() => getTodayLocalDate(), []);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>(initialCategory || 'food_drinks');
  const [source, setSource] = useState<FundingSource>('cash');
  const [date, setDate] = useState<string>(initialDate || todayStr);
  const [note, setNote] = useState<string>('');
  const [smartText, setSmartText] = useState('');
  const [smartNotice, setSmartNotice] = useState<string | null>(null);

  const categoryOptions = useMemo<CustomSelectOption[]>(() => {
    if (type === 'expense') {
      const defaultOptions = expenseCategories
        .filter((cat) => !hiddenCategories.includes(cat))
        .map((cat) => {
          const style = getCategoryBadgeStyle("expense", cat, customCategories);
          return {
            value: cat,
            label: t.expenseCategories[cat] || cat,
            icon: EXPENSE_CATEGORY_ICONS[cat],
            badgeClass: `${style.border} ${style.bg} ${style.text}`,
          };
        });

      const customOptions = (customCategories || [])
        .filter((c) => !hiddenCategories.includes(c.id))
        .map((c) => {
          const style = getCategoryBadgeStyle("expense", c.id, customCategories);
          const Icon = getCategoryIconComponent(c.id, customCategories);
          return {
            value: c.id,
            label: c.name,
            icon: Icon,
            badgeClass: `${style.border} ${style.bg} ${style.text}`,
          };
        });

      return [...defaultOptions, ...customOptions];
    }
    return incomeCategories
      .filter((cat) => !hiddenCategories.includes(cat))
      .map((cat) => {
        const style = getCategoryBadgeStyle("income", cat);
        return {
          value: cat,
          label: t.incomeCategories[cat] || cat,
          icon: INCOME_CATEGORY_ICONS[cat],
          badgeClass: `${style.border} ${style.bg} ${style.text}`,
        };
      });
  }, [type, t, hiddenCategories, customCategories]);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setDate(initialDate || getTodayLocalDate());
      if (initialCategory) {
        setCategory(initialCategory);
      } else {
        const firstExp = categoryOptions[0]?.value || 'food_drinks';
        setCategory(initialType === 'income' ? 'salary' : initialType === 'savings' ? 'savings' : firstExp);
      }
      setAmountStr(initialAmount ? formatNumberWithCommas(initialAmount) : '');
      setNote(initialNote || '');
      setSmartText('');
      setSmartNotice(null);
    }
  }, [isOpen, initialType, initialDate, initialCategory, initialAmount, initialNote, categoryOptions]);

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

  if (!isOpen) return null;

  const handleParseSmart = () => {
    if (!smartText.trim()) return;
    const parsed = parseSmartText(smartText, 'cash');
    if (parsed && parsed.amount > 0) {
      setType(parsed.type || 'expense');
      setAmountStr(formatNumberWithCommas(parsed.amount));
      if (parsed.category) {
        setCategory(parsed.category);
      }
      if (parsed.source) {
        setSource(parsed.source);
      }
      if (parsed.note) {
        setNote(parsed.note);
      }
      setSmartNotice(
        language === 'ja'
          ? `自動入力完了: ${formatCurrency(parsed.amount, currency)} (${parsed.category})`
          : `Filled: ${formatCurrency(parsed.amount, currency)} (${parsed.category})`
      );
      setTimeout(() => setSmartNotice(null), 3500);
    } else {
      setSmartNotice(
        language === 'ja' ? '金額が見つかりませんでした' : 'No amount detected. e.g. "lunch 35k ewallet"'
      );
      setTimeout(() => setSmartNotice(null), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseRawNumber(amountStr);
    if (!parsedAmount || parsedAmount <= 0) return;

    onAddTransaction({
      type,
      amount: parsedAmount,
      category: type === 'savings' ? 'savings' : category,
      source,
      date: date || todayStr,
      note: note.trim() || undefined,
      currency,
    });
    onClose();
  };

  // Currency quick presets
  const presets =
    currency === 'IDR'
      ? [20000, 50000, 100000, 200000, 500000]
      : currency === 'USD'
      ? [5, 10, 20, 50, 100]
      : currency === 'MMK'
      ? [3000, 5000, 10000, 20000, 50000]
      : [500, 1000, 2000, 5000, 10000];

  const defaultTitle = language === "ja" ? (type === "expense" ? "支出を記録" : type === "income" ? "収入を記録" : "貯金・積立に振替") : (type === "expense" ? "Record Expense" : type === "income" ? "Record Income" : "Save to Reserves");
  const modalTitle = title || defaultTitle;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto cursor-default text-[var(--text-main)]"
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
                {date === todayStr ? (language === "ja" ? "今日 • クイック入力" : "Today • Fast Entry") : date}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setIsReceiptScannerOpen(true)}
              className="px-2.5 py-1.5 rounded-xl text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
              title={language === "ja" ? "レシート読取" : "Scan Receipt"}
            >
              <ScanText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === "ja" ? "レシート読取" : "Scan Receipt"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Smart Quick Entry 1-line parser */}
        <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {language === 'ja' ? '自然文クイック入力' : 'Smart Quick Entry'}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {language === 'ja' ? 'Enterで自動解析' : 'Enter to parse'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={smartText}
              onChange={(e) => setSmartText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleParseSmart();
                }
              }}
              placeholder={language === 'ja' ? '例: ランチ 850 paypay' : 'e.g. lunch 35k ewallet'}
              className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs text-[var(--text-main)] placeholder-zinc-500 focus:outline-none focus:border-[var(--brand)]"
            />
            <button
              type="button"
              onClick={handleParseSmart}
              className="px-3 py-1.5 rounded-xl bg-[var(--brand)] text-[#062024] font-bold text-xs shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
            >
              {language === 'ja' ? '解析' : 'Parse'}
            </button>
          </div>
          {smartNotice && (
            <p className="text-[10.5px] text-emerald-400 flex items-center gap-1">
              <span>✓</span> {smartNotice}
            </p>
          )}
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
              <span>{language === 'ja' ? '貯金・積立' : 'Savings'}</span>
            </button>
          </div>

          {/* Amount Input with Inline Math & quick buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-main)]">
                {t.record.amountLabel}
              </label>
              <span className="text-[11px] text-[var(--text-muted)]">
                {currency}
              </span>
            </div>
            <FormattedAmountInput
              value={amountStr}
              onChange={(formatted) => setAmountStr(formatted)}
              currency={currency}
              placeholder="0"
              className="w-full text-2xl font-bold font-mono px-4 py-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-strong)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              autoFocus
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountStr(formatNumberWithCommas(preset))}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)] transition-all cursor-pointer"
                >
                  +{formatNumberWithCommas(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection (hidden for savings) */}
          {type !== 'savings' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main)]">
                {t.record.selectCategory}
              </label>
              <CustomSelect
                options={categoryOptions}
                value={category}
                onChange={(val) => setCategory(val)}
                placeholder={t.record.selectCategory}
              />
            </div>
          )}

          {/* Funding Source & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main)]">
                {t.record.fundingSource}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {availableSources.map((src) => {
                  const Icon = FUNDING_SOURCE_ICONS[src] || CreditCard;
                  const isSelected = source === src;
                  const label = t.sources[src] || src;
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setSource(src)}
                      className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--bg-surface-solid)] text-[var(--text-main)] border-[var(--border-strong)] font-bold shadow-xs'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-transparent hover:text-[var(--text-main)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main)]">
                {t.record.date}
              </label>
              <CustomDatePicker
                value={date}
                onChange={(newDate) => setDate(newDate)}
                language={language}
              />
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-main)]">
              {t.record.note}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={language === 'ja' ? 'メモ (任意)' : 'Note (optional)'}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
            >
              {language === 'ja' ? 'キャンセル' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-xs hover:opacity-90 active:scale-[0.98] text-xs font-bold transition-all cursor-pointer"
            >
              {language === 'ja' ? '保存する' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>

      {/* Receipt Scanner Submodal */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onAddTransaction={(scannedTx) => {
          onAddTransaction(scannedTx);
          setIsReceiptScannerOpen(false);
          onClose();
        }}
        language={language}
        currency={currency}
        hiddenCategories={hiddenCategories}
        customCategories={customCategories}
      />
    </div>
  );
}
