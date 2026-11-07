'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Currency,
  ExpenseCategory,
  FundingSource,
  IncomeCategory,
  Language,
  RecurringBill,
  Transaction,
  TransactionType,
} from '@/types/finance';
import { formatCurrency, translations } from '@/lib/i18n';
import { convertCurrency, DEFAULT_RATES, ExchangeRates, formatNumberWithCommas, parseRawNumber } from '@/lib/currency';
import { CustomDatePicker } from '@/components/CustomDatePicker';
import {
  EXPENSE_CATEGORY_ICONS,
  INCOME_CATEGORY_ICONS,
  FUNDING_SOURCE_ICONS,
  DEFAULT_RECURRING_BILLS,
} from '@/lib/constants';
import {
  Check,
  Trash2,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Vault,
  CornerDownLeft,
  AlertCircle,
  SlidersHorizontal,
  Plus,
  Pencil,
  X,
  Clock,
} from 'lucide-react';

interface QuickRecordBoardProps {
  language: Language;
  currency: Currency;
  rates?: ExchangeRates;
  transactions: Transaction[];
  hiddenCategories?: string[];
  recurringBills?: RecurringBill[];
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onDeleteTransaction: (id: string) => void;
  onToggleHideCategory?: (catKey: string) => void;
  onAddRecurringBill?: (bill: Omit<RecurringBill, 'id'>) => void;
  onUpdateRecurringBill?: (bill: RecurringBill) => void;
  onDeleteRecurringBill?: (id: string) => void;
}

export function QuickRecordBoard({
  language,
  currency,
  rates = DEFAULT_RATES,
  transactions,
  hiddenCategories = [],
  recurringBills = [],
  onAddTransaction,
  onDeleteTransaction,
  onToggleHideCategory,
  onAddRecurringBill,
  onUpdateRecurringBill,
  onDeleteRecurringBill,
}: QuickRecordBoardProps) {
  const t = translations[language];

  const allExpenseCategories: ExpenseCategory[] = [
    'food_drinks',
    'shopping',
    'train',
    'ride',
    'laundry',
    'rent',
    'family',
    'gifts',
    'vps',
    'mobile',
    'others',
  ];

  const allIncomeCategories: IncomeCategory[] = [
    'salary',
    'freelance',
    'bonus',
    'dividend',
    'others',
  ];

  // Active (visible) categories
  const visibleExpenseCategories = useMemo(() => {
    return allExpenseCategories.filter((c) => !hiddenCategories.includes(c));
  }, [allExpenseCategories, hiddenCategories]);

  const visibleIncomeCategories = useMemo(() => {
    return allIncomeCategories.filter((c) => !hiddenCategories.includes(c));
  }, [allIncomeCategories, hiddenCategories]);

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [selectedExpenseCat, setSelectedExpenseCat] = useState<ExpenseCategory>('food_drinks');
  const [selectedIncomeCat, setSelectedIncomeCat] = useState<IncomeCategory>('salary');
  const [source, setSource] = useState<FundingSource>('cash');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState('');
  const [smartText, setSmartText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const [currentMonthPrefix, setCurrentMonthPrefix] = useState<string>('2026-11');

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);

  // Bill form state
  const [billName, setBillName] = useState('');
  const [billAmountStr, setBillAmountStr] = useState('');
  const [billCategory, setBillCategory] = useState<ExpenseCategory>('rent');
  const [billCurrency, setBillCurrency] = useState<Currency>(currency);
  const [billSource, setBillSource] = useState<FundingSource>('bank');
  const [billDay, setBillDay] = useState<string>('25');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    setCurrentMonthPrefix(today.slice(0, 7));
  }, []);

  // Ensure selected category is always one of the visible ones
  useEffect(() => {
    if (visibleExpenseCategories.length > 0 && !visibleExpenseCategories.includes(selectedExpenseCat)) {
      setSelectedExpenseCat(visibleExpenseCategories[0]);
    }
  }, [visibleExpenseCategories, selectedExpenseCat]);

  useEffect(() => {
    if (visibleIncomeCategories.length > 0 && !visibleIncomeCategories.includes(selectedIncomeCat)) {
      setSelectedIncomeCat(visibleIncomeCategories[0]);
    }
  }, [visibleIncomeCategories, selectedIncomeCat]);

  // Quick preset amount increments based on active currency
  const presets = useMemo(() => {
    if (currency === 'JPY') return [1000, 3000, 5000, 10000, 50000];
    if (currency === 'IDR') return [10000, 20000, 50000, 100000, 500000];
    if (currency === 'MMK') return [5000, 10000, 25000, 50000, 100000];
    return [5, 10, 25, 50, 100];
  }, [currency]);

  const handleAddPreset = (val: number) => {
    const current = parseRawNumber(amountStr);
    const nextVal = current + val;
    setAmountStr(formatNumberWithCommas(nextVal));
  };

  const handleClearAmount = () => {
    setAmountStr('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    const parsedAmount = parseRawNumber(amountStr);
    if (!parsedAmount || parsedAmount <= 0) return;

    isSubmittingRef.current = true;

    const category =
      type === 'expense'
        ? selectedExpenseCat
        : type === 'income'
        ? selectedIncomeCat
        : 'savings';

    onAddTransaction({
      type,
      amount: parsedAmount,
      category,
      source,
      currency,
      date: date || new Date().toISOString().split('T')[0],
      note: note.trim() || undefined,
    });

    setAmountStr('');
    setNote('');
    setStatusMessage('Transaction recorded successfully!');
    setTimeout(() => {
      setStatusMessage(null);
      isSubmittingRef.current = false;
    }, 1500);
  };

  function parseSmartText(raw: string): {
    type: TransactionType;
    category: ExpenseCategory;
    amount: number;
    source: FundingSource;
    note: string;
  } | null {
    const text = raw.trim().toLowerCase();
    const match = text.match(/([a-zA-Z\s]+)?\s*([0-9.,]+)\s*([a-zA-Z\s]+)?/);
    if (!match) return null;

    const numStr = match[2].replace(/,/g, '');
    const amount = parseFloat(numStr);
    if (isNaN(amount) || amount <= 0) return null;

    const rawWords = `${match[1] || ''} ${match[3] || ''}`.trim();

    // 1. Detect funding source from input keywords (e.g. "train 4000 bank")
    let detectedSource: FundingSource = source; // Default to active board source
    if (/\b(bank|bca|mandiri|bni|bri|cimb|jago|jenius|atm|transfer|debit|wire)\b/.test(rawWords)) {
      detectedSource = 'bank';
    } else if (/\b(ic|suica|pasmo|wallet|ewallet|e-wallet|ovo|gopay|dana|shopeepay|qris|card|kartu)\b/.test(rawWords)) {
      detectedSource = 'ewallet';
    } else if (/\b(cash|tunai|genkin)\b/.test(rawWords)) {
      detectedSource = 'cash';
    }

    // Clean up source words to leave the clean description/note
    const cleanWords = rawWords
      .replace(/\b(bank|bca|mandiri|bni|bri|cimb|jago|jenius|atm|transfer|debit|wire|ic|suica|pasmo|wallet|ewallet|e-wallet|ovo|gopay|dana|shopeepay|qris|card|kartu|cash|tunai|genkin)\b/gi, '')
      .trim();

    const words = cleanWords || rawWords;

    let category: ExpenseCategory = 'others';
    if (/train|subway|densha|jr|bus|transport/.test(words)) category = 'train';
    else if (/food|lunch|dinner|cafe|coffee|eat|meal|ramen|rice|drink/.test(words)) category = 'food_drinks';
    else if (/taxi|uber|grab|gojek|ride/.test(words)) category = 'ride';
    else if (/laundry|wash|dry/.test(words)) category = 'laundry';
    else if (/rent|room|apartment|mansion/.test(words)) category = 'rent';
    else if (/vps|server|cloud|aws|digitalocean/.test(words)) category = 'vps';
    else if (/data|sim|mobile|wifi|phone|internet/.test(words)) category = 'mobile';
    else if (/family|support|mom|dad/.test(words)) category = 'family';
    else if (/gift|social|present|nomikai/.test(words)) category = 'gifts';
    else if (/shop|buy|uniqlo|amazon/.test(words)) category = 'shopping';

    // If candidate category is hidden, fallback to first visible category or 'others'
    if (hiddenCategories.includes(category)) {
      category = visibleExpenseCategories.includes('others')
        ? 'others'
        : visibleExpenseCategories[0] || 'others';
    }

    return {
      type: 'expense',
      category,
      amount,
      source: detectedSource,
      note: words || raw,
    };
  }

  const handleSmartTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    if (!smartText.trim()) return;

    const parsed = parseSmartText(smartText);
    if (!parsed) {
      setStatusMessage('Could not parse text. Format e.g. "train 220 bank" or "laundry 600"');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    isSubmittingRef.current = true;

    onAddTransaction({
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      source: parsed.source,
      currency,
      date: date || new Date().toISOString().split('T')[0],
      note: parsed.note,
    });

    setSmartText('');
    setStatusMessage(`Saved ${parsed.category} (${parsed.source})!`);
    setTimeout(() => {
      setStatusMessage(null);
      isSubmittingRef.current = false;
    }, 1500);
  };

  // Check recurring bills status for current month
  const activeRecurringBills = Array.isArray(recurringBills) ? recurringBills : [];

  const recurringStatus = useMemo(() => {
    if (!currentMonthPrefix) return activeRecurringBills.map((b) => ({ ...b, isPaid: false, paidTxId: undefined }));
    return activeRecurringBills.map((bill) => {
      const billLabel = bill.name || (bill.titleKey && t.expenseCategories[bill.titleKey as ExpenseCategory]) || bill.category;
      const matchingTx = transactions.find(
        (tx) =>
          tx.type === 'expense' &&
          (tx.category === bill.category || (tx.note && tx.note.includes(billLabel))) &&
          tx.date.startsWith(currentMonthPrefix)
      );
      return {
        ...bill,
        isPaid: Boolean(matchingTx),
        paidTxId: matchingTx ? matchingTx.id : undefined,
      };
    });
  }, [transactions, currentMonthPrefix, activeRecurringBills, t.expenseCategories]);

  const handleConfirmRecurring = (bill: RecurringBill) => {
    const converted = convertCurrency(bill.defaultAmount, bill.currency, currency, rates);
    const billLabel = bill.name || (bill.titleKey && t.expenseCategories[bill.titleKey as ExpenseCategory]) || bill.category;
    onAddTransaction({
      type: 'expense',
      amount: converted,
      category: bill.category,
      source: bill.source,
      currency,
      date: date || new Date().toISOString().split('T')[0],
      note: `Monthly Fixed: ${billLabel}`,
    });
    setStatusMessage(`Paid ${billLabel}!`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleToggleRecurringPaid = (bill: RecurringBill & { isPaid: boolean; paidTxId?: string }) => {
    const billLabel = bill.name || (bill.titleKey && t.expenseCategories[bill.titleKey as ExpenseCategory]) || bill.category;
    if (bill.isPaid && bill.paidTxId && onDeleteTransaction) {
      onDeleteTransaction(bill.paidTxId);
      setStatusMessage(`Unmarked ${billLabel} as paid (entry removed from history).`);
      setTimeout(() => setStatusMessage(null), 2500);
    } else if (!bill.isPaid) {
      handleConfirmRecurring(bill);
    }
  };

  const handleDeleteRecurringBill = (bill: RecurringBill & { isPaid?: boolean; paidTxId?: string }) => {
    const billLabel = bill.name || (bill.titleKey && t.expenseCategories[bill.titleKey as ExpenseCategory]) || bill.category;
    // Automatically clean up this month's linked transaction from history if paid
    if (bill.paidTxId && onDeleteTransaction) {
      onDeleteTransaction(bill.paidTxId);
    } else if (onDeleteTransaction) {
      const linked = transactions.find(
        (tx) =>
          tx.type === "expense" &&
          tx.date.startsWith(currentMonthPrefix) &&
          (tx.recurringBillId === bill.id || (tx.isRecurring && tx.note && tx.note.includes(billLabel)))
      );
      if (linked) {
        onDeleteTransaction(linked.id);
      }
    }

    if (onDeleteRecurringBill) {
      onDeleteRecurringBill(bill.id);
    }
    setStatusMessage(`Deleted ${billLabel} and cleared from history.`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // Open Recurring Bill modal for Add
  const handleOpenAddBillModal = () => {
    setEditingBill(null);
    setBillName('');
    setBillAmountStr('');
    setBillCategory(visibleExpenseCategories[0] || 'rent');
    setBillCurrency(currency);
    setBillSource('bank');
    setBillDay('25');
    setIsBillModalOpen(true);
  };

  // Open Recurring Bill modal for Edit
  const handleOpenEditBillModal = (bill: RecurringBill) => {
    setEditingBill(bill);
    setBillName(bill.name || (bill.titleKey ? t.expenseCategories[bill.titleKey as ExpenseCategory] || bill.titleKey : bill.category));
    setBillAmountStr(formatNumberWithCommas(bill.defaultAmount));
    setBillCategory(visibleExpenseCategories.includes(bill.category as ExpenseCategory) ? (bill.category as ExpenseCategory) : (visibleExpenseCategories[0] || 'rent'));
    setBillCurrency(bill.currency);
    setBillSource(bill.source);
    setBillDay(bill.dayOfMonth ? String(bill.dayOfMonth) : '');
    setIsBillModalOpen(true);
  };

  // Handle Save Bill (Add or Edit)
  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseRawNumber(billAmountStr);
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!billName.trim()) return;

    const payload: Omit<RecurringBill, 'id'> = {
      name: billName.trim(),
      defaultAmount: parsedAmount,
      category: billCategory,
      currency: billCurrency,
      source: billSource,
      dayOfMonth: billDay ? parseInt(billDay, 10) : undefined,
    };

    if (editingBill && onUpdateRecurringBill) {
      onUpdateRecurringBill({
        ...payload,
        id: editingBill.id,
      });
      setStatusMessage('Recurring bill updated!');
    } else if (onAddRecurringBill) {
      onAddRecurringBill(payload);
      setStatusMessage('Recurring bill created!');
    }

    setIsBillModalOpen(false);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Smart Quick Entry Card */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[var(--card-shadow)] relative transition-all duration-200">
        <form onSubmit={handleSmartTextSubmit} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text-main)] flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-emerald)]" />
              <span>{t.record.smartEntryTitle}</span>
            </label>
            <span className="text-[11px] text-[var(--text-faint)] font-mono">
              {t.record.pressEnterToSave}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={smartText}
              onChange={(e) => setSmartText(e.target.value)}
              placeholder={t.record.smartTextPlaceholder}
              className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-faint)] outline-none transition-all"
            />
            {/* Executive Monochrome Button */}
            <button
              type="submit"
              className="bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center space-x-1.5 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>{t.record.recordButton}</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            {t.record.smartTextHint} (e.g. &quot;train 4000 bank&quot; or &quot;lunch 1200 ewallet&quot;)
          </p>
        </form>
      </div>

      {/* Main Fast Input Board */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[var(--card-shadow)] space-y-6 relative">
        {/* Type Selector (Expense vs Income vs Savings) */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-[var(--bg-surface-solid)] text-rose-500 border border-rose-500/30 shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
            <span>{t.record.typeExpense}</span>
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-[var(--bg-surface-solid)] text-emerald-500 border border-emerald-500/30 shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            <span>{t.record.typeIncome}</span>
          </button>
          <button
            type="button"
            onClick={() => setType('savings')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              type === 'savings'
                ? 'bg-[var(--bg-surface-solid)] text-amber-500 border border-amber-500/30 shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Vault className="w-4 h-4 text-amber-500" />
            <span>{t.record.typeSavings}</span>
          </button>
        </div>

        {/* Amount Input & Presets with Live Comma Formatting */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center space-x-1.5">
              <span>{t.record.amountLabel} ({currency})</span>
            </label>
            {amountStr && (
              <button
                type="button"
                onClick={handleClearAmount}
                className="text-xs text-[var(--text-muted)] hover:text-rose-500 transition-all font-mono cursor-pointer"
              >
                {t.actions.clear}
              </button>
            )}
          </div>

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
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl pl-5 pr-16 py-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-main)] placeholder-[var(--text-faint)] outline-none tabular-numbers transition-all"
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-[var(--text-muted)] pointer-events-none select-none tracking-wide">
              {currency}
            </div>
          </div>

          {/* Quick Increment Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-[var(--text-muted)] mr-1 font-mono">
              {t.record.quickPresets}:
            </span>
            {presets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleAddPreset(val)}
                className="px-3.5 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-semibold text-[var(--text-main)] tabular-numbers transition-all shadow-xs active:scale-[0.97] cursor-pointer"
              >
                +{val.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* 1-Tap Category Grid with Manage Visibility Button */}
        {type === 'expense' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t.record.selectCategory}
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer font-medium"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{t.record.manageCategories}</span>
                {hiddenCategories.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {visibleExpenseCategories.map((catKey) => {
                const Icon = EXPENSE_CATEGORY_ICONS[catKey] || AlertCircle;
                const isSelected = selectedExpenseCat === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedExpenseCat(catKey)}
                    className={`p-3 rounded-2xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--text-main)] bg-[var(--bg-surface-solid)] text-[var(--text-main)] font-bold shadow-xs ring-1 ring-[var(--text-main)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`} />
                    <span className="text-xs truncate">
                      {t.expenseCategories[catKey]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {type === 'income' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t.record.selectCategory}
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer font-medium"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{t.record.manageCategories}</span>
                {hiddenCategories.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {visibleIncomeCategories.map((catKey) => {
                const Icon = INCOME_CATEGORY_ICONS[catKey] || ArrowUpRight;
                const isSelected = selectedIncomeCat === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedIncomeCat(catKey)}
                    className={`p-3 rounded-2xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--text-main)] bg-[var(--bg-surface-solid)] text-[var(--text-main)] font-bold shadow-xs ring-1 ring-[var(--text-main)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`} />
                    <span className="text-xs truncate">
                      {t.incomeCategories[catKey]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Funding Source Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {t.record.fundingSource}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['cash', 'bank', 'ewallet'] as FundingSource[]).map((src) => {
              const Icon = FUNDING_SOURCE_ICONS[src];
              const isSelected = source === src;
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSource(src)}
                  className={`p-2.5 rounded-xl border text-center flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--border-strong)] bg-[var(--bg-surface-solid)] text-[var(--text-main)] font-bold shadow-xs'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs">{t.sources[src]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date & Note Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <CustomDatePicker
              value={date}
              onChange={setDate}
              language={language}
            />
          </div>
          <div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.record.notePlaceholder}
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] outline-none transition-all"
            />
          </div>
        </div>

        {/* Executive Monochrome Primary Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!amountStr || parseRawNumber(amountStr) <= 0}
          className="w-full py-4 rounded-2xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] font-bold text-sm hover:opacity-90 active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {t.actions.save}
        </button>

        {statusMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center animate-fade-in shadow-xs">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Monthly Recurring Bills (Fully Customizable with Paid Checkbox) */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[var(--card-shadow)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center space-x-2">
              <span>{t.record.recurringBillsTitle}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-emerald)]" />
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {t.record.recurringBillsDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddBillModal}
            className="px-3 py-1.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-xs text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.record.addBill}</span>
          </button>
        </div>

        {recurringStatus.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl p-6 bg-[var(--bg-subtle)]">
            <p className="text-xs text-[var(--text-muted)]">
              {t.record.noRecurringBills}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recurringStatus.map((bill) => {
              const Icon = EXPENSE_CATEGORY_ICONS[bill.category as ExpenseCategory] || AlertCircle;
              const convertedBillAmount = convertCurrency(
                bill.defaultAmount,
                bill.currency,
                currency,
                rates
              );
              const billLabel = bill.name || (bill.titleKey && t.expenseCategories[bill.titleKey as ExpenseCategory]) || bill.category;

              return (
                <div
                  key={bill.id}
                  className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 group transition-all"
                >
                  <div className="flex items-center justify-between sm:justify-start space-x-3 min-w-0 w-full sm:w-auto">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-main)] shadow-xs shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[var(--text-main)] truncate">
                          {billLabel}
                        </h4>
                        <p className="text-xs font-bold text-[var(--accent-emerald)] tabular-numbers font-mono mt-0.5 whitespace-nowrap">
                          {formatCurrency(convertedBillAmount, currency)} <span className="text-[10px] text-[var(--text-muted)] font-normal">/ mo</span>
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 flex items-center space-x-1">
                          {bill.dayOfMonth && (
                            <span className="flex items-center space-x-0.5 mr-1 shrink-0">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Day {bill.dayOfMonth}</span>
                            </span>
                          )}
                          <span className="truncate">{t.sources[bill.source]}</span>
                        </p>
                      </div>
                    </div>

                    {/* Mobile only: edit & delete at top right of card */}
                    <div className="flex items-center space-x-1 sm:hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBillModal(bill)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-solid)] transition-all cursor-pointer"
                        title={t.actions.edit}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteRecurringBill && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRecurringBill(bill)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title={t.actions.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)] w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleRecurringPaid(bill)}
                      className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
                        bill.isPaid
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface-solid)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-main)]'
                      }`}
                      title={bill.isPaid ? 'Click to unmark as paid' : 'Click to mark as paid'}
                    >
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                          bill.isPaid
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-[var(--border-strong)] bg-transparent text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="text-[11px] whitespace-nowrap">{bill.isPaid ? t.actions.paidThisMonth : t.actions.confirmPay}</span>
                    </button>

                    {/* Desktop only edit & delete */}
                    <div className="hidden sm:flex items-center space-x-1 pl-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBillModal(bill)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-solid)] transition-all cursor-pointer"
                        title={t.actions.edit}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteRecurringBill && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRecurringBill(bill)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title={t.actions.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions Feed */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[var(--card-shadow)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-main)]">
            {t.record.recentTransactions}
          </h3>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {transactions.length} {t.record.items}
          </span>
        </div>

        {transactions.length === 0 ? (
          <p className="text-xs text-[var(--text-faint)] py-6 text-center">
            {t.record.noTransactions}
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 10).map((tx) => {
              const isExpense = tx.type === 'expense';
              const isSavings = tx.type === 'savings';
              const isIncome = tx.type === 'income';

              const catLabel = isExpense
                ? t.expenseCategories[tx.category as ExpenseCategory] || tx.category
                : isIncome
                ? t.incomeCategories[tx.category as IncomeCategory] || tx.category
                : t.record.typeSavings;

              const Icon = isExpense
                ? EXPENSE_CATEGORY_ICONS[tx.category as ExpenseCategory] || AlertCircle
                : isIncome
                ? INCOME_CATEGORY_ICONS[tx.category as IncomeCategory] || ArrowUpRight
                : Vault;

              const convertedAmount = convertCurrency(
                tx.amount,
                tx.currency || 'JPY',
                currency,
                rates
              );

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] flex items-center justify-between space-x-3 group transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border-subtle)] ${
                        isExpense
                          ? 'bg-rose-500/10 text-rose-500'
                          : isIncome
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-main)]">
                        {catLabel}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {tx.date} • {t.sources[tx.source]}
                        {tx.note ? ` • ${tx.note}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-xs sm:text-sm font-bold tabular-numbers font-mono ${
                        isExpense
                          ? 'text-rose-600 dark:text-rose-400'
                          : isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isExpense ? '-' : '+'}
                      {formatCurrency(convertedAmount, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-faint)] hover:text-rose-500 transition-all cursor-pointer"
                      title={t.actions.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CATEGORY VISIBILITY MANAGEMENT MODAL (PINNED HEADER & NEVER CUT OFF) */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-xl animate-fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCategoryModalOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-xl my-auto max-h-[85vh] flex flex-col rounded-3xl liquid-glass-modal shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pinned Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5 sm:p-6 shrink-0 bg-[var(--bg-surface-solid)]">
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-main)] flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>{t.record.categoriesSettingsTitle}</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {t.record.categoriesSettingsDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-800 dark:text-cyan-300 text-xs">
              {t.record.hiddenCategoriesNotice}
            </div>

            {/* Expense Categories List with Checkbox UI */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {t.record.typeExpense} ({visibleExpenseCategories.length}/{allExpenseCategories.length} {t.record.visible})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allExpenseCategories.map((catKey) => {
                  const Icon = EXPENSE_CATEGORY_ICONS[catKey] || AlertCircle;
                  const isHidden = hiddenCategories.includes(catKey);
                  return (
                    <div
                      key={catKey}
                      onClick={() => onToggleHideCategory && onToggleHideCategory(catKey)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                        isHidden
                          ? 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] opacity-50'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-main)] shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-medium truncate ${isHidden ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>
                          {t.expenseCategories[catKey]}
                        </span>
                      </div>
                      {/* Modern Executive Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                          !isHidden
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                            : 'border-[var(--border-strong)] bg-[var(--bg-subtle)] text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Income Categories List with Checkbox UI */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {t.record.typeIncome} ({visibleIncomeCategories.length}/{allIncomeCategories.length} {t.record.visible})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allIncomeCategories.map((catKey) => {
                  const Icon = INCOME_CATEGORY_ICONS[catKey] || ArrowUpRight;
                  const isHidden = hiddenCategories.includes(catKey);
                  return (
                    <div
                      key={catKey}
                      onClick={() => onToggleHideCategory && onToggleHideCategory(catKey)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                        isHidden
                          ? 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] opacity-50'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-main)] shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs font-medium truncate ${isHidden ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>
                          {t.incomeCategories[catKey]}
                        </span>
                      </div>
                      {/* Modern Executive Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                          !isHidden
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                            : 'border-[var(--border-strong)] bg-[var(--bg-subtle)] text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            </div>

            {/* Pinned Modal Footer */}
            <div className="flex justify-end p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-solid)] shrink-0">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-xs text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              >
                {t.actions.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECURRING BILL ADD/EDIT MODAL (LIVE COMMA FORMATTING & SAFE BACKDROP) */}
      {isBillModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-xl animate-fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsBillModalOpen(false);
            }
          }}
        >
          <form
            onSubmit={handleSaveBill}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md my-auto rounded-3xl liquid-glass-modal p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-main)]">
                  {editingBill ? t.record.editBill : t.record.addBill}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {t.record.recurringBillsDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBillModalOpen(false)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                {t.record.billName}
              </label>
              <input
                type="text"
                required
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
                placeholder={t.record.billNamePlaceholder}
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] outline-none"
              />
            </div>

            {/* Amount & Currency with Live Comma Formatting */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  {t.record.billAmount}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={billAmountStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                    setBillAmountStr(formatNumberWithCommas(raw));
                  }}
                  placeholder="0"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] font-mono outline-none tabular-numbers"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  Currency
                </label>
                <select
                  value={billCurrency}
                  onChange={(e) => setBillCurrency(e.target.value as Currency)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] outline-none cursor-pointer"
                >
                  <option value="JPY">JPY (¥)</option>
                  <option value="IDR">IDR (Rp)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {/* Category & Payment Method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  {t.record.billCategory}
                </label>
                <select
                  value={billCategory}
                  onChange={(e) => setBillCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] outline-none cursor-pointer"
                >
                  {visibleExpenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {t.expenseCategories[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  {t.record.billSource}
                </label>
                <select
                  value={billSource}
                  onChange={(e) => setBillSource(e.target.value as FundingSource)}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] outline-none cursor-pointer"
                >
                  <option value="bank">{t.sources.bank}</option>
                  <option value="credit_card">{t.sources.credit_card}</option>
                  <option value="cash">{t.sources.cash}</option>
                  <option value="ewallet">{t.sources.ewallet}</option>
                </select>
              </div>
            </div>

            {/* Day of Month */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                {t.record.dayOfMonth}
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={billDay}
                onChange={(e) => setBillDay(e.target.value)}
                placeholder="25"
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] font-mono outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBillModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer"
              >
                {t.actions.cancel}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-xs text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              >
                {t.actions.save}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
