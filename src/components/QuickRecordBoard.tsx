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
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { TransactionDetailModal } from '@/components/TransactionDetailModal';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { CustomSelect, CustomSelectOption } from '@/components/CustomSelect';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  EXPENSE_CATEGORY_ICONS,
  INCOME_CATEGORY_ICONS,
  FUNDING_SOURCE_ICONS,
  getCategoryBadgeStyle,
  getFundingSourceBadgeStyle,
} from '@/lib/constants';
import {
  Check,
  Trash2,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  CornerDownLeft,
  AlertCircle,
  SlidersHorizontal,
  Plus,
  Pencil,
  Edit3,
  X,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
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
  onUpdateTransaction?: (tx: Transaction) => void;
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
  onUpdateTransaction,
  onToggleHideCategory,
  onAddRecurringBill,
  onUpdateRecurringBill,
  onDeleteRecurringBill,
}: QuickRecordBoardProps) {
  const t = translations[language];
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('dailyba_onboarding_dismissed');
    if (!dismissed) {
      setShowOnboarding(true);
    }
  }, []);

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    try {
      localStorage.setItem('dailyba_onboarding_dismissed', 'true');
    } catch {
      // ignore
    }
  };

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
    'carryover',
    'others',
  ];

  // Active (visible) categories
  const visibleExpenseCategories = useMemo(() => {
    return allExpenseCategories.filter((c) => !hiddenCategories.includes(c));
  }, [allExpenseCategories, hiddenCategories]);

  const visibleIncomeCategories = useMemo(() => {
    return allIncomeCategories.filter((c) => !hiddenCategories.includes(c));
  }, [allIncomeCategories, hiddenCategories]);

  const filterSourceOptions = useMemo<CustomSelectOption<FundingSource | 'all'>[]>(
    () => [
      { value: 'all', label: t.record.allSources, icon: SlidersHorizontal },
      ...((['cash', 'bank', 'ewallet', 'credit_card'] as FundingSource[]).map((src) => {
        const s = getFundingSourceBadgeStyle(src);
        return {
          value: src,
          label: t.sources[src],
          icon: FUNDING_SOURCE_ICONS[src],
          badgeClass: `${s.border} ${s.bg} ${s.text}`,
        };
      })),
    ],
    [t]
  );

  const billCurrencyOptions = useMemo<CustomSelectOption<Currency>[]>(
    () => [
      { value: 'JPY', label: 'JPY (¥)' },
      { value: 'IDR', label: 'IDR (Rp)' },
      { value: 'USD', label: 'USD ($)' },
    ],
    []
  );

  const billCategoryOptions = useMemo<CustomSelectOption<ExpenseCategory>[]>(
    () =>
      visibleExpenseCategories.map((cat) => {
        const style = getCategoryBadgeStyle("expense", cat);
        return {
          value: cat,
          label: t.expenseCategories[cat] || cat,
          icon: EXPENSE_CATEGORY_ICONS[cat],
          badgeClass: `${style.border} ${style.bg} ${style.text}`,
        };
      }),
    [visibleExpenseCategories, t]
  );

  const billSourceOptions = useMemo<CustomSelectOption<FundingSource>[]>(
    () =>
      ((['bank', 'credit_card', 'cash', 'ewallet'] as FundingSource[]).map((src) => {
        const s = getFundingSourceBadgeStyle(src);
        return {
          value: src,
          label: t.sources[src],
          icon: FUNDING_SOURCE_ICONS[src],
          badgeClass: `${s.border} ${s.bg} ${s.text}`,
        };
      })),
    [t]
  );


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
  useBodyScrollLock(isCategoryModalOpen || isBillModalOpen);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deletingBill, setDeletingBill] = useState<RecurringBill | null>(null);

  // Bill form state
  const [billName, setBillName] = useState('');
  const [billAmountStr, setBillAmountStr] = useState('');
  const [billCategory, setBillCategory] = useState<ExpenseCategory>('rent');
  const [billCurrency, setBillCurrency] = useState<Currency>(currency);
  const [billSource, setBillSource] = useState<FundingSource>('bank');
  const [billDay, setBillDay] = useState<string>('25');
  const [billDayEnd, setBillDayEnd] = useState<string>('');

  // Transactions Feed Filters & Pagination
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txFilterType, setTxFilterType] = useState<'all' | TransactionType>('all');
  const [txFilterSource, setTxFilterSource] = useState<'all' | FundingSource>('all');
  const [txCurrentPage, setTxCurrentPage] = useState(1);
  const TX_PAGE_SIZE = 10;

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
    setStatusMessage(language === "ja" ? "取引を正常に記録しました！" : "Transaction recorded successfully!");
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
    if (/\b(cc|credit|kredit|kartu kredit|creditcard|visa|mastercard|jcb|amex)\b/.test(rawWords)) {
      detectedSource = 'credit_card';
    } else if (/\b(bank|bca|mandiri|bni|bri|cimb|jago|jenius|atm|transfer|debit|wire)\b/.test(rawWords)) {
      detectedSource = 'bank';
    } else if (/\b(ic|suica|pasmo|wallet|ewallet|e-wallet|ovo|gopay|dana|shopeepay|qris)\b/.test(rawWords)) {
      detectedSource = 'ewallet';
    } else if (/\b(cash|tunai|genkin)\b/.test(rawWords)) {
      detectedSource = 'cash';
    }

    // Clean up source words to leave the clean description/note
    const cleanWords = rawWords
      .replace(/\b(bank|bca|mandiri|bni|bri|cimb|jago|jenius|atm|transfer|debit|wire|ic|suica|pasmo|wallet|ewallet|e-wallet|ovo|gopay|dana|shopeepay|qris|cc|credit|kredit|kartu kredit|creditcard|visa|mastercard|jcb|amex|cash|tunai|genkin)\b/gi, '')
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
      setStatusMessage(language === "ja" ? '入力を解析できませんでした。例: 「電車 220」や「昼食 1000 現金」' : 'Could not parse text. Format e.g. "train 220 bank" or "laundry 600"');
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
    setStatusMessage(language === "ja" ? `${t.expenseCategories[parsed.category as ExpenseCategory] || parsed.category}（${t.sources[parsed.source as FundingSource] || parsed.source}）を記録しました！` : `Saved ${parsed.category} (${parsed.source})!`);
    setTimeout(() => {
      setStatusMessage(null);
      isSubmittingRef.current = false;
    }, 1500);
  };

  // Check recurring bills status for current month
  const activeRecurringBills = Array.isArray(recurringBills) ? recurringBills : [];

  const recurringStatus = useMemo(() => {
    if (!currentMonthPrefix) return activeRecurringBills.map((b) => ({ ...b, isPaid: false, paidTxId: undefined, isAdvancePayment: false, paidDate: undefined }));

    // Previous month prefix for advance payments (e.g. 2026-10 when current is 2026-11)
    const [yStr, mStr] = currentMonthPrefix.split("-");
    const curY = parseInt(yStr || "2026", 10);
    const curM = parseInt(mStr || "11", 10);
    const prevY = curM === 1 ? curY - 1 : curY;
    const prevM = curM === 1 ? 12 : curM - 1;
    const prevMonthPrefix = `${prevY}-${String(prevM).padStart(2, "0")}`;

    return activeRecurringBills.map((bill) => {
      const billLabel = bill.name || (bill.titleKey && t.expenseCategories[bill.titleKey as ExpenseCategory]) || bill.category;
      const lowerLabel = billLabel.toLowerCase();

      // 1. Current month matching transaction
      const currentMonthTx = transactions.find(
        (tx) =>
          tx.type === "expense" &&
          (tx.recurringBillId === bill.id ||
            tx.category === bill.category ||
            (tx.note && tx.note.toLowerCase().includes(lowerLabel))) &&
          tx.date.startsWith(currentMonthPrefix)
      );

      if (currentMonthTx) {
        return {
          ...bill,
          isPaid: true,
          paidTxId: currentMonthTx.id,
          paidDate: currentMonthTx.date,
          isAdvancePayment: false,
        };
      }

      // 2. Smart Advance Payment Detection:
      // Transactions in tail of previous month (day >= 20) matching this bill
      const prevMonthMatches = transactions.filter(
        (tx) =>
          tx.type === "expense" &&
          (tx.recurringBillId === bill.id ||
            tx.category === bill.category ||
            (tx.note && tx.note.toLowerCase().includes(lowerLabel))) &&
          tx.date.startsWith(prevMonthPrefix)
      ).sort((a, b) => b.date.localeCompare(a.date));

      const advanceTx = prevMonthMatches.find((tx) => {
        const parts = tx.date.split("-");
        const day = parts.length === 3 ? parseInt(parts[2], 10) : 0;
        return day >= 20;
      });

      if (advanceTx) {
        return {
          ...bill,
          isPaid: true,
          paidTxId: advanceTx.id,
          paidDate: advanceTx.date,
          isAdvancePayment: true,
        };
      }

      return {
        ...bill,
        isPaid: false,
        paidTxId: undefined,
        paidDate: undefined,
        isAdvancePayment: false,
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
      note: language === "ja" ? `毎月の固定費: ${billLabel}` : `Monthly Fixed: ${billLabel}`,
      recurringBillId: bill.id,
      isRecurring: true,
    });
    setStatusMessage(language === "ja" ? `${billLabel} の支払いを記録しました！` : `Paid ${billLabel}!`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleToggleRecurringPaid = (bill: RecurringBill & { isPaid: boolean; paidTxId?: string; isAdvancePayment?: boolean }) => {
    const billLabel = bill.name || (bill.titleKey && t.expenseCategories[bill.titleKey as ExpenseCategory]) || bill.category;
    if (bill.isPaid && bill.paidTxId && onDeleteTransaction) {
      const linked = transactions.find((t) => t.id === bill.paidTxId);
      if (linked) {
        setDeletingTx(linked);
      } else {
        onDeleteTransaction(bill.paidTxId);
        setStatusMessage(language === "ja" ? `${billLabel} の支払済マークを解除しました。` : `Unmarked ${billLabel} as paid.`);
        setTimeout(() => setStatusMessage(null), 2500);
      }
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
    setStatusMessage(language === "ja" ? `${billLabel} を削除しました。` : `Deleted ${billLabel} and cleared from history.`);
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
    setBillDay('1');
    setBillDayEnd('');
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
    setBillDayEnd(bill.dueDayEnd ? String(bill.dueDayEnd) : '');
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
      dueDayEnd: billDayEnd ? parseInt(billDayEnd, 10) : undefined,
    };

    if (editingBill && onUpdateRecurringBill) {
      onUpdateRecurringBill({
        ...payload,
        id: editingBill.id,
      });
      setStatusMessage(language === "ja" ? "固定費を更新しました！" : "Recurring bill updated!");
    } else if (onAddRecurringBill) {
      onAddRecurringBill(payload);
      setStatusMessage(language === "ja" ? "固定費を新しく追加しました！" : "Recurring bill created!");
    }

    setIsBillModalOpen(false);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // Filter & Search Handlers for Recent Transactions
  const isTxFiltered = txSearchQuery.trim() !== '' || txFilterType !== 'all' || txFilterSource !== 'all';

  const handleSearchChange = (val: string) => {
    setTxSearchQuery(val);
    setTxCurrentPage(1);
  };

  const handleFilterTypeChange = (nextType: 'all' | TransactionType) => {
    setTxFilterType(nextType);
    setTxCurrentPage(1);
  };

  const handleFilterSourceChange = (nextSource: 'all' | FundingSource) => {
    setTxFilterSource(nextSource);
    setTxCurrentPage(1);
  };

  const handleResetFilters = () => {
    setTxSearchQuery('');
    setTxFilterType('all');
    setTxFilterSource('all');
    setTxCurrentPage(1);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (txFilterType !== 'all' && tx.type !== txFilterType) {
        return false;
      }
      // Source filter
      if (txFilterSource !== 'all' && tx.source !== txFilterSource) {
        return false;
      }
      // Search query
      if (txSearchQuery.trim()) {
        const query = txSearchQuery.toLowerCase().trim();
        const noteMatch = tx.note ? tx.note.toLowerCase().includes(query) : false;
        const dateMatch = tx.date ? tx.date.includes(query) : false;
        const amountMatch = String(tx.amount).includes(query);

        const catRaw = (tx.category || '').toLowerCase();
        const catLabel = (
          tx.type === 'expense'
            ? t.expenseCategories[tx.category as ExpenseCategory] || ''
            : tx.type === 'income'
            ? t.incomeCategories[tx.category as IncomeCategory] || ''
            : t.record.typeSavings
        ).toLowerCase();
        const catMatch = catRaw.includes(query) || catLabel.includes(query);

        const sourceLabel = (t.sources[tx.source] || '').toLowerCase();
        const sourceMatch = (tx.source || '').toLowerCase().includes(query) || sourceLabel.includes(query);

        if (!noteMatch && !dateMatch && !amountMatch && !catMatch && !sourceMatch) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, txFilterType, txFilterSource, txSearchQuery, t]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / TX_PAGE_SIZE));
  const currentPage = Math.min(txCurrentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * TX_PAGE_SIZE;
    return filteredTransactions.slice(startIndex, startIndex + TX_PAGE_SIZE);
  }, [filteredTransactions, currentPage]);

  return (
    <div className="space-y-6">
      {/* First-Time User Quick Start Guide */}
      {showOnboarding && transactions.length === 0 && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-xl p-5 sm:p-6 shadow-sm relative space-y-4 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-main)]">
                  {language === 'ja' ? 'Dailyba へようこそ！🌸 クイックスタートガイド' : 'Welcome to Dailyba! 🌸 Quick Start Guide'}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {language === 'ja'
                    ? '3つのステップで毎日の収支管理と貯蓄をスタートできます：'
                    : 'Get started with daily spending awareness & savings in 3 simple steps:'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissOnboarding}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
              title={language === "ja" ? "案内を閉じる" : "Dismiss guide"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[11px] flex items-center justify-center">1</span>
                <span className="text-xs font-bold text-[var(--text-main)]">
                  {language === 'ja' ? '1. 取引を記録' : '1. Record Transactions'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                {language === 'ja'
                  ? '下の入力フォームまたはクイック入力から、支出・収入・貯金振替を即座に記録できます。'
                  : 'Use the quick form below or Smart Quick Entry to log your first expense, income, or savings.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[11px] flex items-center justify-center">2</span>
                <span className="text-xs font-bold text-[var(--text-main)]">
                  {language === 'ja' ? '2. 日次予算を設定' : '2. Set Daily Limit'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                {language === 'ja'
                  ? '「日次支出」タブで1日の支出目標を設定し、日々の使いすぎをリアルタイムで防止します。'
                  : 'Visit the Daily Spend tab to set your comfortable daily limit and prevent impulsive overspending.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[11px] flex items-center justify-center">3</span>
                <span className="text-xs font-bold text-[var(--text-main)]">
                  {language === 'ja' ? '3. 月次計画 & 貯金' : '3. Budget & Wallet'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                {language === 'ja'
                  ? '「月次サマリー」で予算計画を立て、「貯金管理」で生活防衛資金を着実に積み立てます。'
                  : 'Check the Monthly tab for cashflow overview & budget targets, and grow your emergency reserves in Savings.'}
              </p>
            </div>
          </div>
        </div>
      )}
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
              className="flex-1 min-w-0 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-[var(--text-main)] placeholder-[var(--text-faint)] outline-none transition-all"
            />
            {/* Executive Monochrome Button */}
            <button
              type="submit"
              className="bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-[var(--btn-primary-shadow)] px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center space-x-1.5 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>{t.record.recordButton}</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            {t.record.smartTextHint} {language === 'ja' ? '（例: "電車 220" や "ランチ 1200 口座"）' : '(e.g. "train 4000 bank" or "lunch 1200 ewallet")'}
          </p>
        </form>
      </div>

      {/* Main Fast Input Board */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-7 shadow-[var(--card-shadow)] space-y-5 sm:space-y-6 relative">
        {/* Type Selector (Expense vs Income vs Savings) */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 px-1.5 sm:py-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer min-w-0 whitespace-nowrap ${
              type === 'expense'
                ? 'bg-[var(--bg-surface-solid)] text-rose-500 border border-rose-500/30 shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0" />
            <span className="truncate">{t.record.typeExpense}</span>
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 px-1.5 sm:py-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer min-w-0 whitespace-nowrap ${
              type === 'income'
                ? 'bg-[var(--bg-surface-solid)] text-emerald-500 border border-emerald-500/30 shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
            <span className="truncate">{t.record.typeIncome}</span>
          </button>
          <button
            type="button"
            onClick={() => setType('savings')}
            className={`py-2 px-1.5 sm:py-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer min-w-0 whitespace-nowrap ${
              type === 'savings'
                ? 'bg-[var(--bg-surface-solid)] text-amber-500 border border-amber-500/30 shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
            <span className="truncate sm:hidden">{language === 'en' ? 'Savings' : t.record.typeSavings}</span>
            <span className="hidden sm:inline truncate">{t.record.typeSavings}</span>
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
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-2xl pl-4 sm:pl-5 pr-14 sm:pr-16 py-3.5 sm:py-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-main)] placeholder-[var(--text-faint)] outline-none tabular-numbers transition-all"
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
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-semibold text-[var(--text-main)] tabular-numbers transition-all shadow-xs active:scale-[0.97] cursor-pointer shrink-0"
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
                const catStyle = getCategoryBadgeStyle("expense", catKey);
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedExpenseCat(catKey)}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left flex items-center space-x-2 sm:space-x-2.5 min-w-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--text-main)] bg-[var(--bg-surface-solid)] text-[var(--text-main)] font-bold shadow-xs ring-1 ring-[var(--text-main)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)]'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${catStyle.border} ${catStyle.bg} ${catStyle.text}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
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
                const catStyle = getCategoryBadgeStyle("income", catKey);
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedIncomeCat(catKey)}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left flex items-center space-x-2 sm:space-x-2.5 min-w-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--text-main)] bg-[var(--bg-surface-solid)] text-[var(--text-main)] font-bold shadow-xs ring-1 ring-[var(--text-main)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)]'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${catStyle.border} ${catStyle.bg} ${catStyle.text}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {(['cash', 'bank', 'ewallet', 'credit_card'] as FundingSource[]).map((src) => {
              const Icon = FUNDING_SOURCE_ICONS[src];
              const isSelected = source === src;
              const sourceStyle = getFundingSourceBadgeStyle(src);
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSource(src)}
                  className={`p-2.5 rounded-xl border text-center flex items-center justify-center space-x-1.5 min-w-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--border-strong)] bg-[var(--bg-surface-solid)] text-[var(--text-main)] font-bold shadow-xs'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${sourceStyle.border} ${sourceStyle.bg} ${sourceStyle.text}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="text-xs truncate">{t.sources[src]}</span>
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
              const billStyle = getCategoryBadgeStyle("expense", bill.category);

              return (
                <div
                  key={bill.id}
                  className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 group transition-all"
                >
                  <div className="flex items-center justify-between sm:justify-start space-x-3 min-w-0 w-full sm:w-auto">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-xs shrink-0 ${billStyle.border} ${billStyle.bg} ${billStyle.text}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[var(--text-main)] truncate">
                          {billLabel}
                        </h4>
                        <p className="text-xs font-bold text-[var(--accent-emerald)] tabular-numbers font-mono mt-0.5 whitespace-nowrap">
                          {formatCurrency(convertedBillAmount, currency)} <span className="text-[10px] text-[var(--text-muted)] font-normal">{language === 'ja' ? '/月' : '/ mo'}</span>
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 flex items-center space-x-1">
                          {bill.dayOfMonth && (
                            <span className="flex items-center space-x-0.5 mr-1 shrink-0">
                              <Clock className="w-2.5 h-2.5" />
                              <span>
                                {language === 'ja'
                                  ? (bill.dueDayEnd && bill.dueDayEnd !== bill.dayOfMonth
                                      ? `毎月${bill.dayOfMonth}〜${bill.dueDayEnd}日`
                                      : `毎月${bill.dayOfMonth}日`)
                                  : (bill.dueDayEnd && bill.dueDayEnd !== bill.dayOfMonth
                                      ? `Days ${bill.dayOfMonth}–${bill.dueDayEnd}`
                                      : `Day ${bill.dayOfMonth}`)}
                              </span>
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
                          onClick={() => setDeletingBill(bill)}
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
                      title={bill.isPaid ? (language === "ja" ? "クリックして未払いに戻す" : "Click to unmark as paid") : (language === "ja" ? "クリックして支払済みにする" : "Click to mark as paid")}
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
                      <span className="text-[11px] whitespace-nowrap">
                        {bill.isPaid
                          ? (bill.isAdvancePayment
                              ? (language === 'ja'
                                  ? `前払い済 (${bill.paidDate ? bill.paidDate.slice(5) : ''})`
                                  : `Paid in Advance (${bill.paidDate ? bill.paidDate.slice(5) : ''})`)
                              : t.actions.paidThisMonth)
                          : t.actions.confirmPay}
                      </span>
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
                          onClick={() => setDeletingBill(bill)}
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

      {/* Recent Transactions Feed with Advanced Filters & Pagination */}
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[var(--card-shadow)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              {t.record.recentTransactions}
            </h3>
            {isTxFiltered && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono text-[11px] font-semibold">
                {filteredTransactions.length} {t.record.filterResults}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {transactions.length} {t.record.items}
            </span>
            {isTxFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-emerald-500 hover:text-emerald-400 font-medium underline transition-colors cursor-pointer"
              >
                {t.record.resetFilters}
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar - visible when transactions exist or filter is active */}
        {(transactions.length > 0 || isTxFiltered) && (
          <div className="space-y-2.5 pt-1">
            {/* Search Input & Funding Source Select */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={txSearchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t.record.searchPlaceholder}
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-emerald-500/50 transition-all"
                />
                {txSearchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="shrink-0 min-w-[140px] sm:min-w-[160px]">
                <CustomSelect
                  value={txFilterSource}
                  onChange={(val) => handleFilterSourceChange(val as any)}
                  options={filterSourceOptions}
                />
              </div>
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => handleFilterTypeChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  txFilterType === 'all'
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-xs'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                }`}
              >
                {t.record.allTypes}
              </button>
              <button
                type="button"
                onClick={() => handleFilterTypeChange('expense')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  txFilterType === 'expense'
                    ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 shadow-sm'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                }`}
              >
                {t.record.typeExpense}
              </button>
              <button
                type="button"
                onClick={() => handleFilterTypeChange('income')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  txFilterType === 'income'
                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 shadow-sm'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                }`}
              >
                {t.record.typeIncome}
              </button>
              <button
                type="button"
                onClick={() => handleFilterTypeChange('savings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  txFilterType === 'savings'
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-sm'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                }`}
              >
                {t.record.typeSavings}
              </button>
            </div>
          </div>
        )}

        {/* Content Feed */}
        {transactions.length === 0 ? (
          <p className="text-xs text-[var(--text-faint)] py-6 text-center">
            {t.record.noTransactions}
          </p>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-[var(--text-muted)]">
              {t.record.noMatchingTransactions}
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-emerald-500/50 text-[var(--text-main)] hover:text-emerald-500 transition-all cursor-pointer"
            >
              {t.record.resetFilters}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedTransactions.map((tx) => {
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
                : Wallet;

              const convertedAmount = convertCurrency(
                tx.amount,
                tx.currency || 'JPY',
                currency,
                rates
              );
              const catStyle = getCategoryBadgeStyle(tx.type, tx.category);

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedDetailTx(tx)}
                  className="p-3 sm:p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] flex items-center justify-between space-x-2.5 sm:space-x-3 group transition-all min-w-0 cursor-pointer hover:bg-[var(--bg-surface-solid)] active:scale-[0.99]"
                  title={language === "ja" ? "クリックして取引明細を表示" : "Click to view full transaction details"}
                >
                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${catStyle.border} ${catStyle.bg} ${catStyle.text}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-main)] truncate">
                        {catLabel}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {tx.date} • {t.sources[tx.source]}
                        {tx.note ? ` • ${tx.note}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0 ml-2">
                    <span
                      className={`text-xs sm:text-sm font-bold tabular-numbers font-mono whitespace-nowrap ${
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
                    {onUpdateTransaction && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTx(tx);
                        }}
                        className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-[var(--text-faint)] hover:text-[var(--text-main)] transition-all cursor-pointer shrink-0"
                        title={t.actions.edit}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingTx(tx);
                      }}
                      className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-[var(--text-faint)] hover:text-rose-500 transition-all cursor-pointer shrink-0"
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pt-2 flex items-center justify-between border-t border-[var(--border-subtle)]">
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              {(currentPage - 1) * TX_PAGE_SIZE + 1}–
              {Math.min(currentPage * TX_PAGE_SIZE, filteredTransactions.length)}{' '}
              {t.record.of} {filteredTransactions.length}
            </span>

            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                type="button"
                onClick={() => setTxCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center space-x-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.record.prev}</span>
              </button>

              <span className="px-2 py-1 text-xs font-mono text-[var(--text-muted)]">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setTxCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center space-x-1 cursor-pointer"
              >
                <span className="hidden sm:inline">{t.record.next}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
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
                  const catStyle = getCategoryBadgeStyle("expense", catKey);
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
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${catStyle.border} ${catStyle.bg} ${catStyle.text}`}>
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
                  const catStyle = getCategoryBadgeStyle("income", catKey);
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
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${catStyle.border} ${catStyle.bg} ${catStyle.text}`}>
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
                  {language === "ja" ? "通貨" : "Currency"}
                </label>
                <CustomSelect
                  value={billCurrency}
                  onChange={(val) => setBillCurrency(val as Currency)}
                  options={billCurrencyOptions}
                />
              </div>
            </div>

            {/* Category & Payment Method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  {t.record.billCategory}
                </label>
                <CustomSelect
                  value={billCategory}
                  onChange={(val) => setBillCategory(val as ExpenseCategory)}
                  options={billCategoryOptions}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  {t.record.billSource}
                </label>
                <CustomSelect
                  value={billSource}
                  onChange={(val) => setBillSource(val as FundingSource)}
                  options={billSourceOptions}
                />
              </div>
            </div>

            {/* Day of Month / Payment Window */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  {language === 'ja' ? '支払期日・締切日' : 'Due Day / Payment Window'}
                </label>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {language === 'ja' ? '（例: 1〜10日）' : '(e.g. Day 1 to 10)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={billDay}
                    onChange={(e) => setBillDay(e.target.value)}
                    placeholder={language === 'ja' ? '開始日 (例: 1)' : 'From day (e.g. 1)'}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] font-mono outline-none"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={billDayEnd}
                    onChange={(e) => setBillDayEnd(e.target.value)}
                    placeholder={language === 'ja' ? '締切日 (任意 例: 10)' : 'Until day (opt. e.g. 10)'}
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] font-mono outline-none"
                  />
                </div>
              </div>
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
      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={!!editingTx}
        transaction={editingTx}
        language={language}
        currency={currency}
        onClose={() => setEditingTx(null)}
        onSave={(updated) => {
          if (onUpdateTransaction) onUpdateTransaction(updated);
        }}
      />

      {/* Transaction Detail Viewer Modal */}
      <TransactionDetailModal
        isOpen={!!selectedDetailTx}
        transaction={selectedDetailTx}
        language={language}
        currency={currency}
        rates={rates}
        onClose={() => setSelectedDetailTx(null)}
        onEdit={(tx) => setEditingTx(tx)}
        onDelete={(id) => onDeleteTransaction(id)}
      />
      {/* Confirm Delete Transaction Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingTx}
        title={language === "ja" ? "取引履歴の削除" : "Delete Transaction"}
        description={language === "ja" ? "この取引履歴を削除してもよろしいですか？" : "Are you sure you want to delete this transaction from history?"}
        itemName={deletingTx ? `${deletingTx.type === "expense" ? (t.expenseCategories[deletingTx.category as ExpenseCategory] || deletingTx.category) : deletingTx.type === "income" ? (t.incomeCategories[deletingTx.category as IncomeCategory] || deletingTx.category) : t.record.typeSavings}: ${formatCurrency(convertCurrency(deletingTx.amount, deletingTx.currency || "JPY", currency, rates), currency)}` : undefined}
        language={language}
        onConfirm={() => {
          if (deletingTx) {
            onDeleteTransaction(deletingTx.id);
            setDeletingTx(null);
          }
        }}
        onClose={() => setDeletingTx(null)}
      />

      {/* Confirm Delete Recurring Bill Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletingBill}
        title={language === "ja" ? "固定費の削除" : "Delete Recurring Bill"}
        description={language === "ja" ? "この固定費項目を削除してもよろしいですか？（今月記録済みの支払いは履歴から自動クリアされます）" : "Are you sure you want to delete this recurring bill? (Any payment logged this month will also be cleared)"}
        itemName={deletingBill ? `${deletingBill.name || (deletingBill.titleKey && t.expenseCategories[deletingBill.titleKey as ExpenseCategory]) || deletingBill.category} (${formatCurrency(convertCurrency(deletingBill.defaultAmount, deletingBill.currency, currency, rates), currency)} / 月)` : undefined}
        language={language}
        onConfirm={() => {
          if (deletingBill) {
            handleDeleteRecurringBill(deletingBill);
            setDeletingBill(null);
          }
        }}
        onClose={() => setDeletingBill(null)}
      />
    </div>
  );
}
