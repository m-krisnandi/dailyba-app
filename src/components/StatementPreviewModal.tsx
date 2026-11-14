'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Printer, FileSpreadsheet, X, ShieldCheck } from 'lucide-react';
import { Transaction, Currency, Language } from '@/types/finance';
import { convertCurrency, ExchangeRates, formatNumberWithCommas } from '@/lib/currency';
import { translations } from '@/lib/i18n';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { exportMonthlyTransactionsToExcel } from '@/lib/exportStatement';

interface StatementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  yearMonth: string; // 'YYYY-MM'
  currency: Currency;
  rates?: ExchangeRates;
  language: Language;
}

export function StatementPreviewModal({
  isOpen,
  onClose,
  transactions,
  yearMonth,
  currency,
  rates = { JPY: 1, IDR: 114, USD: 1 / 158, MMK: 28, updatedAt: "" },
  language,
}: StatementPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const t = translations[language];

  useBodyScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const filtered = transactions.filter((tx) => tx.date && tx.date.startsWith(yearMonth));

  let totalIncome = 0;
  let totalExpense = 0;

  filtered.forEach((tx) => {
    const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
    if (tx.type === 'income') totalIncome += converted;
    else if (tx.type === 'expense') totalExpense += converted;
  });

  const netSavings = totalIncome - totalExpense;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex flex-col overflow-y-auto statement-modal-overlay">
      {/* Print Stylesheet overrides */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
          .statement-modal-overlay {
            position: static !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          .statement-print-paper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Top Navigation Bar (Hidden when printing) */}
      <header className="sticky top-0 z-30 bg-[var(--bg-surface-solid)] border-b border-[var(--border-subtle)] px-4 py-3 sm:px-6 flex items-center justify-between shadow-md no-print">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer active:scale-95 shadow-xs"
            title="Back to Dailyba"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span>{language === 'ja' ? '戻る' : 'Back'}</span>
          </button>
          <div className="hidden sm:block">
            <h2 className="text-xs font-bold text-[var(--text-main)] font-mono">
              Dailyba Statement • {yearMonth}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => exportMonthlyTransactionsToExcel(transactions, yearMonth, currency, rates, language)}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Download Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{language === 'ja' ? 'Excel出力' : 'Excel (.xlsx)'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'ja' ? '印刷 / PDF保存' : 'Print / Save PDF'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer sm:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Printable Document Sheet */}
      <main className="flex-1 p-3 sm:p-6 md:p-8 flex justify-center">
        <div className="statement-print-paper w-full max-w-4xl bg-white text-slate-900 rounded-3xl p-6 sm:p-10 md:p-12 shadow-2xl border border-slate-200 space-y-6">
          {/* Statement Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-black tracking-tight text-slate-950 font-sans">
                  Dailyba
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Daily Balance & Wealth Tracker • Financial Statement
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold font-mono text-slate-900 block">
                {yearMonth}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Generated: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">
                {t.summary.totalIncome}
              </p>
              <p className="text-sm sm:text-lg font-black font-mono text-emerald-600 mt-1">
                +{currency} {formatNumberWithCommas(totalIncome)}
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-700">
                {t.summary.totalExpense}
              </p>
              <p className="text-sm sm:text-lg font-black font-mono text-rose-600 mt-1">
                -{currency} {formatNumberWithCommas(totalExpense)}
              </p>
            </div>

            <div className={`p-3.5 sm:p-4 rounded-2xl border ${
              netSavings >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-rose-50 border-rose-200'
            }`}>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700">
                {t.summary.netCashFlow}
              </p>
              <p className={`text-sm sm:text-lg font-black font-mono mt-1 ${
                netSavings >= 0 ? 'text-indigo-600' : 'text-rose-600'
              }`}>
                {netSavings >= 0 ? '+' : ''}{currency} {formatNumberWithCommas(netSavings)}
              </p>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-300 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Source / Destination</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                      No transactions recorded for this period.
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx) => {
                    const isExpense = tx.type === 'expense';
                    const isIncome = tx.type === 'income';
                    const isTransfer = tx.type === 'transfer';

                    const typeLabel = isTransfer
                      ? t.record.typeTransfer
                      : isExpense
                      ? t.record.typeExpense
                      : isIncome
                      ? t.record.typeIncome
                      : t.record.typeSavings;

                    const catLabel = isTransfer
                      ? 'Internal Transfer'
                      : isExpense
                      ? (t.expenseCategories as any)[tx.category] || tx.category
                      : isIncome
                      ? (t.incomeCategories as any)[tx.category] || tx.category
                      : t.record.typeSavings;

                    const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
                    const sourceText = isTransfer
                      ? `${t.sources[tx.source] || tx.source} → ${t.sources[tx.destinationSource || 'ewallet'] || tx.destinationSource || 'E-Wallet'}`
                      : t.sources[tx.source] || tx.source;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isExpense
                                ? 'bg-rose-100 text-rose-700'
                                : isIncome
                                ? 'bg-emerald-100 text-emerald-700'
                                : isTransfer
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {typeLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {catLabel}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {sourceText}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate">
                          {tx.note || '-'}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                          isExpense ? 'text-rose-600' : isIncome ? 'text-emerald-600' : 'text-slate-700'
                        }`}>
                          {isExpense ? '-' : isIncome ? '+' : ''}
                          {currency} {formatNumberWithCommas(converted)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Statement Footer */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 font-mono">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Dailyba Personal Finance Vault • Privacy-First Statement</span>
            </div>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </main>
    </div>,
    document.body
  );
}
