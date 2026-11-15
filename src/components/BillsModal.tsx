'use client';

import React, { useState, useMemo } from 'react';
import {
  Currency,
  Language,
  RecurringBill,
  Transaction,
  ExpenseCategory,
  FundingSource,
  CustomCategory,
} from '@/types/finance';
import { formatCurrency, translations } from '@/lib/i18n';
import { convertCurrency, DEFAULT_RATES, ExchangeRates, formatNumberWithCommas, parseRawNumber } from '@/lib/currency';
import { getTodayLocalDate } from '@/lib/dateUtils';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { SubscriptionPresetsModal } from '@/components/SubscriptionPresetsModal';
import { CustomSelect, CustomSelectOption } from '@/components/CustomSelect';
import { FormattedAmountInput } from '@/components/FormattedAmountInput';
import {
  EXPENSE_CATEGORY_ICONS,
  FUNDING_SOURCE_ICONS,
  getCategoryBadgeStyle,
  getFundingSourceBadgeStyle,
} from '@/lib/constants';
import {
  X,
  Plus,
  Sparkles,
  CheckCircle2,
  Calendar,
  Trash2,
  Edit2,
  Receipt,
  Wallet,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface BillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currency: Currency;
  rates?: ExchangeRates;
  recurringBills: RecurringBill[];
  transactions: Transaction[];
  customCategories?: CustomCategory[];
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onDeleteTransaction?: (id: string) => void;
  onAddRecurringBill?: (bill: Omit<RecurringBill, 'id'>) => void;
  onUpdateRecurringBill?: (bill: RecurringBill) => void;
  onDeleteRecurringBill?: (id: string) => void;
}

export function BillsModal({
  isOpen,
  onClose,
  language,
  currency,
  rates = DEFAULT_RATES,
  recurringBills = [],
  transactions = [],
  customCategories = [],
  onAddTransaction,
  onDeleteTransaction,
  onAddRecurringBill,
  onUpdateRecurringBill,
  onDeleteRecurringBill,
}: BillsModalProps) {
  useBodyScrollLock(isOpen);

  const t = translations[language];
  const todayStr = useMemo(() => getTodayLocalDate(), []);
  const currentMonthKey = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  const currentDayOfMonth = useMemo(() => parseInt(todayStr.slice(8, 10), 10), [todayStr]);

  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formAmountStr, setFormAmountStr] = useState('');
  const [formCategory, setFormCategory] = useState<string>('rent');
  const [formSource, setFormSource] = useState<FundingSource>('bank');
  const [formDayOfMonth, setFormDayOfMonth] = useState<number>(25);

  // Status mapping for bills
  const billStatuses = useMemo(() => {
    const [yStr, mStr] = currentMonthKey.split('-');
    const curY = parseInt(yStr || '2026', 10);
    const curM = parseInt(mStr || '11', 10);
    const prevY = curM === 1 ? curY - 1 : curY;
    const prevM = curM === 1 ? 12 : curM - 1;
    const prevMonthPrefix = `${prevY}-${String(prevM).padStart(2, '0')}`;

    return recurringBills.map((bill) => {
      const converted = convertCurrency(bill.defaultAmount, bill.currency || 'JPY', currency, rates);
      const billLabel = (bill.name || bill.category).toLowerCase();

      // Check current month transaction
      const currentMonthTx = transactions.find(
        (tx) =>
          tx.type === 'expense' &&
          (tx.recurringBillId === bill.id ||
            tx.category === bill.category ||
            (tx.note && tx.note.toLowerCase().includes(billLabel))) &&
          tx.date.startsWith(currentMonthKey)
      );

      // Check end-of-prev-month advance payment
      const prevMonthTx = !currentMonthTx
        ? transactions.find(
            (tx) =>
              tx.type === 'expense' &&
              (tx.recurringBillId === bill.id ||
                tx.category === bill.category ||
                (tx.note && tx.note.toLowerCase().includes(billLabel))) &&
              tx.date.startsWith(prevMonthPrefix) &&
              parseInt(tx.date.slice(8, 10), 10) >= 20
          )
        : undefined;

      const paidTx = currentMonthTx || prevMonthTx;
      const isPaid = Boolean(paidTx);
      const dueDay = bill.dayOfMonth || 1;
      const isOverdue = !isPaid && currentDayOfMonth > dueDay;
      const isDueSoon = !isPaid && dueDay - currentDayOfMonth <= 5 && dueDay >= currentDayOfMonth;

      return {
        ...bill,
        convertedAmount: converted,
        isPaid,
        paidTxId: paidTx ? paidTx.id : undefined,
        paidTxDate: paidTx ? paidTx.date : undefined,
        isAdvancePayment: Boolean(prevMonthTx),
        isOverdue,
        isDueSoon,
        dueDay,
      };
    });
  }, [recurringBills, currentMonthKey, currentDayOfMonth, transactions, currency, rates]);

  // Commitment metrics
  const metrics = useMemo(() => {
    let totalCommitment = 0;
    let paidCommitment = 0;
    let paidCount = 0;

    billStatuses.forEach((b) => {
      totalCommitment += b.convertedAmount;
      if (b.isPaid) {
        paidCommitment += b.convertedAmount;
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
      totalCount: billStatuses.length,
      paidPercent,
    };
  }, [billStatuses]);

  const handleMarkPaid = (bill: typeof billStatuses[number]) => {
    const billLabel = bill.name || bill.category;
    onAddTransaction({
      type: 'expense',
      amount: bill.convertedAmount,
      category: bill.category,
      source: bill.source || 'bank',
      currency,
      date: todayStr,
      note: language === 'ja' ? `毎月の固定費: ${billLabel}` : `Monthly Fixed: ${billLabel}`,
      recurringBillId: bill.id,
      isRecurring: true,
    });
  };

  const handleUnmarkPaid = (bill: typeof billStatuses[number]) => {
    if (bill.paidTxId && onDeleteTransaction) {
      onDeleteTransaction(bill.paidTxId);
    }
  };

  const openAddForm = () => {
    setEditingBill(null);
    setFormName('');
    setFormAmountStr('');
    setFormCategory('rent');
    setFormSource('bank');
    setFormDayOfMonth(25);
    setIsAddingNew(true);
  };

  const openEditForm = (bill: RecurringBill) => {
    setEditingBill(bill);
    setFormName(bill.name);
    setFormAmountStr(formatNumberWithCommas(bill.defaultAmount));
    setFormCategory(bill.category);
    setFormSource(bill.source || 'bank');
    setFormDayOfMonth(bill.dayOfMonth || 25);
    setIsAddingNew(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseRawNumber(formAmountStr);
    if (!formName.trim() || !amount || amount <= 0) return;

    if (editingBill && onUpdateRecurringBill) {
      onUpdateRecurringBill({
        ...editingBill,
        name: formName.trim(),
        defaultAmount: amount,
        category: formCategory,
        source: formSource,
        dayOfMonth: formDayOfMonth,
        currency,
      });
    } else if (onAddRecurringBill) {
      onAddRecurringBill({
        name: formName.trim(),
        defaultAmount: amount,
        category: formCategory,
        source: formSource,
        dayOfMonth: formDayOfMonth,
        currency,
      });
    }

    setIsAddingNew(false);
    setEditingBill(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto cursor-default text-[var(--text-main)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[var(--brand)] flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-main)]">
                  {language === 'ja' ? '固定費・定期支払' : 'Recurring Bills'}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">
                  {language === 'ja' ? '家賃、通信費、サブスクの自動管理' : 'Subscriptions, rent & regular commitments'}
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

          {/* Commitment Summary Banner */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                {metrics.remainingCommitment === 0 ? 'All Settled' : 'Remaining To Pay'}
              </span>
              <div className="text-xl font-bold tabular-nums text-[var(--text-main)] mt-0.5">
                {formatCurrency(metrics.remainingCommitment, currency)}
              </div>
              <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                Total monthly commitment: {formatCurrency(metrics.totalCommitment, currency)}
              </span>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                metrics.totalCount > 0 && metrics.remainingCommitment === 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              }`}>
                {metrics.paidCount}/{metrics.totalCount} Paid ({metrics.paidPercent}%)
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsPresetsOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-main)] border border-white/[0.08] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'ja' ? 'プリセットから選ぶ' : 'Browse Presets'}</span>
            </button>

            <button
              type="button"
              onClick={openAddForm}
              className="px-3 py-1.5 rounded-xl bg-[var(--brand)] text-[#062024] font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'ja' ? '新規追加' : 'Add Bill'}</span>
            </button>
          </div>

          {/* Add / Edit Form Modal or Inline Expansion */}
          {isAddingNew && (
            <form onSubmit={handleSaveForm} className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.12] space-y-3 animate-fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                <h4 className="text-xs font-bold text-[var(--text-main)]">
                  {editingBill ? 'Edit Recurring Bill' : 'New Recurring Bill'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                    Bill Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rent, Fiber WiFi, Netflix"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs text-[var(--text-main)] placeholder-zinc-500 focus:outline-none focus:border-[var(--brand)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                      Monthly Amount ({currency})
                    </label>
                    <input
                      type="text"
                      required
                      value={formAmountStr}
                      onChange={(e) => setFormAmountStr(e.target.value)}
                      placeholder="e.g. 50,000"
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs text-[var(--text-main)] font-mono placeholder-zinc-500 focus:outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                      Due Day of Month
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={formDayOfMonth}
                      onChange={(e) => setFormDayOfMonth(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs text-[var(--text-main)] font-mono placeholder-zinc-500 focus:outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--brand)]"
                    >
                      <option value="rent" className="bg-slate-900">Rent / Housing</option>
                      <option value="vps" className="bg-slate-900">Servers / VPS</option>
                      <option value="mobile" className="bg-slate-900">Mobile / SIM</option>
                      <option value="shopping" className="bg-slate-900">Subscription / Streaming</option>
                      <option value="transport" className="bg-slate-900">Commute / Train</option>
                      <option value="others" className="bg-slate-900">Other Regular</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                      Funding Source
                    </label>
                    <select
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value as FundingSource)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--brand)]"
                    >
                      <option value="bank" className="bg-slate-900">Bank Transfer</option>
                      <option value="credit_card" className="bg-slate-900">Credit Card</option>
                      <option value="ewallet" className="bg-slate-900">E-Wallet</option>
                      <option value="cash" className="bg-slate-900">Cash</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[var(--brand)] text-[#062024] font-bold text-xs"
                  >
                    Save Bill
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Bills List */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {billStatuses.length === 0 ? (
              <div className="py-8 text-center text-[var(--text-muted)] text-xs">
                No recurring bills configured yet. Tap &quot;Add Bill&quot; or choose from &quot;Presets&quot;.
              </div>
            ) : (
              billStatuses.map((bill) => {
                return (
                  <div
                    key={bill.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      bill.isPaid
                        ? 'bg-white/[0.02] border-white/[0.06] opacity-80'
                        : bill.isOverdue
                        ? 'bg-rose-500/[0.04] border-rose-500/30'
                        : 'bg-white/[0.04] border-white/[0.09]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        bill.isPaid ? 'bg-emerald-500/15 text-emerald-400' : 'bg-teal-500/15 text-[var(--brand)]'
                      }`}>
                        {bill.isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[var(--text-main)] truncate">
                            {bill.name || bill.category}
                          </span>
                          {bill.isAdvancePayment && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-medium">
                              Paid in Advance
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10.5px] text-[var(--text-muted)] mt-0.5">
                          <span>Due day {bill.dueDay}</span>
                          <span>•</span>
                          <span className="capitalize">{bill.source}</span>
                          {bill.isOverdue && (
                            <span className="text-rose-400 font-semibold">• Overdue</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-[var(--text-main)] block">
                          {formatCurrency(bill.convertedAmount, currency)}
                        </span>
                        <span className={`text-[10px] font-medium block ${
                          bill.isPaid ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {bill.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>

                      {bill.isPaid ? (
                        <button
                          type="button"
                          onClick={() => handleUnmarkPaid(bill)}
                          title="Unmark paid"
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold cursor-pointer transition-all"
                        >
                          Paid ✓
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(bill)}
                          className="px-2.5 py-1 rounded-xl bg-[var(--brand)] hover:opacity-90 text-[#062024] text-[11px] font-bold cursor-pointer transition-all shadow-xs"
                        >
                          Mark Paid
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditForm(bill)}
                        title="Edit bill"
                        className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.05]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {onDeleteRecurringBill && (
                        <button
                          type="button"
                          onClick={() => onDeleteRecurringBill(bill.id)}
                          title="Delete bill"
                          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-white/[0.05]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Popular Presets Modal */}
      {isPresetsOpen && (
        <SubscriptionPresetsModal
          isOpen={isPresetsOpen}
          onClose={() => setIsPresetsOpen(false)}
          language={language}
          currency={currency}
          onSelectPreset={(preset) => {
            if (onAddRecurringBill) {
              onAddRecurringBill(preset);
            }
            setIsPresetsOpen(false);
          }}
        />
      )}
    </>
  );
}
