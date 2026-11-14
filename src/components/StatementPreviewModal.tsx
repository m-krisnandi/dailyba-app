'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Download,
  Share2,
  Printer,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Folder,
  FolderPlus,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import { Transaction, Currency, Language } from '@/types/finance';
import { convertCurrency, ExchangeRates, formatNumberWithCommas } from '@/lib/currency';
import { translations } from '@/lib/i18n';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  exportMonthlyTransactionsToCSV,
  exportMonthlyTransactionsToExcel,
  exportMonthlyTransactionsToPDF,
  generateMonthlyCSVText,
  generateMonthlyExcelData,
  DownloadResult,
  TargetExportLocation,
} from '@/lib/exportStatement';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

interface StatementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  yearMonth: string; // 'YYYY-MM'
  currency: Currency;
  rates?: ExchangeRates;
  language: Language;
}

const STORAGE_DEFAULT_LOCATION = 'dailyba_export_default_location_v1';
const STORAGE_LAST_FOLDER_LABEL = 'dailyba_export_last_folder_label_v1';

export function StatementPreviewModal({
  isOpen,
  onClose,
  transactions,
  yearMonth,
  currency,
  rates = { JPY: 1, IDR: 114, USD: 1 / 158, MMK: 28, updatedAt: '' },
  language,
}: StatementPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [targetLocation, setTargetLocation] = useState<TargetExportLocation>('DOCUMENTS');
  const [lastSavedLocation, setLastSavedLocation] = useState<string>('');
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<DownloadResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const folderMenuRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  useBodyScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
    try {
      const savedLoc = localStorage.getItem(STORAGE_DEFAULT_LOCATION) as TargetExportLocation;
      if (savedLoc && ['DOCUMENTS', 'DOWNLOADS', 'SYSTEM_PICKER'].includes(savedLoc)) {
        setTargetLocation(savedLoc);
      }
      const savedLabel = localStorage.getItem(STORAGE_LAST_FOLDER_LABEL);
      if (savedLabel) {
        setLastSavedLocation(savedLabel);
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isFolderMenuOpen) {
          setIsFolderMenuOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isFolderMenuOpen]);

  // Handle outside click to close folder menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setIsFolderMenuOpen(false);
      }
    };
    if (isFolderMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isFolderMenuOpen]);

  const handleLocationChange = (newLoc: TargetExportLocation) => {
    setTargetLocation(newLoc);
    setIsFolderMenuOpen(false);
    try {
      localStorage.setItem(STORAGE_DEFAULT_LOCATION, newLoc);
    } catch {
      // ignore
    }
  };

  const filtered = useMemo(() => {
    return transactions.filter((tx) => tx.date && tx.date.startsWith(yearMonth));
  }, [transactions, yearMonth]);

  let totalIncome = 0;
  let totalExpense = 0;

  filtered.forEach((tx) => {
    const converted = convertCurrency(tx.amount, tx.currency || 'JPY', currency, rates);
    if (tx.type === 'income') totalIncome += converted;
    else if (tx.type === 'expense') totalExpense += converted;
  });

  const netSavings = totalIncome - totalExpense;

  // Memoized Excel data
  const excelData = useMemo(() => {
    return generateMonthlyExcelData(transactions, yearMonth, currency, rates, language);
  }, [transactions, yearMonth, currency, rates, language]);

  // Memoized CSV text
  const csvText = useMemo(() => {
    return generateMonthlyCSVText(transactions, yearMonth, currency, rates, language);
  }, [transactions, yearMonth, currency, rates, language]);

  const csvLines = useMemo(() => {
    return csvText.split('\r\n').filter(Boolean);
  }, [csvText]);

  if (!isOpen || !mounted) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadFeedback(null);

    try {
      let result: DownloadResult;
      if (activeTab === 'pdf') {
        result = await exportMonthlyTransactionsToPDF(
          transactions,
          yearMonth,
          currency,
          rates,
          language,
          targetLocation
        );
      } else if (activeTab === 'excel') {
        result = await exportMonthlyTransactionsToExcel(
          transactions,
          yearMonth,
          currency,
          rates,
          language,
          targetLocation
        );
      } else {
        result = await exportMonthlyTransactionsToCSV(
          transactions,
          yearMonth,
          currency,
          rates,
          language,
          targetLocation
        );
      }

      setDownloadFeedback(result);
      if (result.success && result.location) {
        setLastSavedLocation(result.location);
        try {
          localStorage.setItem(STORAGE_LAST_FOLDER_LABEL, result.location);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setDownloadFeedback({
        success: false,
        fileName: '',
        error: err?.message || 'Download failed',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareResult = async (result: DownloadResult) => {
    if (result.uri) {
      try {
        await Share.share({
          title: `Dailyba Statement - ${yearMonth}`,
          text: `Dailyba Financial Statement (${yearMonth})`,
          url: result.uri,
          dialogTitle: 'Share / Send Statement',
        });
      } catch (e) {
        console.warn('Share cancelled or failed:', e);
      }
    }
  };

  const handleCopyCSV = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(csvText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const isNative = Capacitor.isNativePlatform();

  const getTargetLocationLabel = () => {
    switch (targetLocation) {
      case 'DOCUMENTS':
        return 'Documents';
      case 'DOWNLOADS':
        return 'Downloads';
      case 'SYSTEM_PICKER':
        return isNative ? 'Pilih Folder (Save As)' : 'Choose Folder';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex flex-col overflow-y-auto statement-modal-overlay">
      {/* Print Stylesheet overrides for desktop browser print */}
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

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[var(--bg-surface-solid)] border-b border-[var(--border-subtle)] px-3 sm:px-6 py-2.5 sm:py-3 shadow-md no-print">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Back Button & Tabs */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start space-x-2 sm:space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>{language === 'ja' ? '戻る' : 'Back'}</span>
            </button>

            {/* Format View Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pdf');
                  setDownloadFeedback(null);
                }}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'pdf'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('excel');
                  setDownloadFeedback(null);
                }}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'excel'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('csv');
                  setDownloadFeedback(null);
                }}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'csv'
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Right: Custom Folder Destination Dropdown & Download Button */}
          <div className="w-full sm:w-auto flex items-center justify-end space-x-2">
            {/* Custom Destination Selector Dropdown (Zero Emojis, Pure Lucide Icons) */}
            <div className="relative" ref={folderMenuRef}>
              <button
                type="button"
                onClick={() => setIsFolderMenuOpen(!isFolderMenuOpen)}
                className="flex items-center space-x-2 bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer shadow-xs active:scale-95"
                title="Pilih folder tujuan (tersimpan sebagai default)"
              >
                {targetLocation === 'DOCUMENTS' && <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                {targetLocation === 'DOWNLOADS' && <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                {targetLocation === 'SYSTEM_PICKER' && <FolderPlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}

                <span className="truncate max-w-[120px] sm:max-w-none">{getTargetLocationLabel()}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
                    isFolderMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu Modal */}
              {isFolderMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] shadow-2xl p-2 z-50 animate-fade-in">
                  <div className="px-3 py-2 border-b border-[var(--border-subtle)] mb-1">
                    <p className="text-xs font-bold text-[var(--text-main)]">
                      {language === 'ja' ? '保存先フォルダ' : 'Lokasi Simpan / Save Destination'}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {language === 'ja'
                        ? '選択した場所は次回以降デフォルトになります'
                        : 'Pilihan ini akan otomatis tersimpan sebagai default'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {/* Option 1: Documents */}
                    <button
                      type="button"
                      onClick={() => handleLocationChange('DOCUMENTS')}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        targetLocation === 'DOCUMENTS'
                          ? 'bg-amber-500/15 border border-amber-500/30 text-[var(--text-main)]'
                          : 'hover:bg-[var(--bg-subtle)] text-[var(--text-main)]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                          <Folder className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">Documents</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            {language === 'ja' ? 'アプリ内ドキュメント' : 'Folder Dokumen Aplikasi (Internal)'}
                          </p>
                        </div>
                      </div>
                      {targetLocation === 'DOCUMENTS' && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                    </button>

                    {/* Option 2: Downloads */}
                    <button
                      type="button"
                      onClick={() => handleLocationChange('DOWNLOADS')}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        targetLocation === 'DOWNLOADS'
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-[var(--text-main)]'
                          : 'hover:bg-[var(--bg-subtle)] text-[var(--text-main)]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                          <Download className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">Downloads</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            {language === 'ja' ? '端末のダウンロードフォルダ' : 'Folder Unduhan Publik Perangkat'}
                          </p>
                        </div>
                      </div>
                      {targetLocation === 'DOWNLOADS' && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                    </button>

                    {/* Option 3: System Picker / File Manager (Save As) */}
                    <button
                      type="button"
                      onClick={() => handleLocationChange('SYSTEM_PICKER')}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        targetLocation === 'SYSTEM_PICKER'
                          ? 'bg-indigo-500/15 border border-indigo-500/30 text-[var(--text-main)]'
                          : 'hover:bg-[var(--bg-subtle)] text-[var(--text-main)]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                          <FolderPlus className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">
                            {isNative ? 'Pilih Folder (File Manager)' : 'Choose Folder (Save As)'}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                            {isNative
                              ? 'Buka Pengelola File Android langsung'
                              : 'Buka dialog penjelajah file komputer'}
                          </p>
                        </div>
                      </div>
                      {targetLocation === 'SYSTEM_PICKER' && (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  </div>

                  {/* Dropdown Footer */}
                  <div className="px-3 py-2 mt-1.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Default Tersimpan</span>
                    </span>
                    {lastSavedLocation && (
                      <span className="truncate max-w-[120px] font-mono text-[9px] text-[var(--text-muted)]">
                        {lastSavedLocation}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 ${
                activeTab === 'pdf'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : activeTab === 'excel'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-teal-600 hover:bg-teal-500'
              }`}
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>
                {activeTab === 'pdf'
                  ? 'Download PDF'
                  : activeTab === 'excel'
                  ? 'Download Excel (.xlsx)'
                  : 'Download CSV'}
              </span>
            </button>

            {/* Desktop Print option for PDF */}
            {activeTab === 'pdf' && !isNative && (
              <button
                type="button"
                onClick={() => window.print()}
                className="hidden lg:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                title="Print Browser View"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Download Status Toast Banner */}
      {downloadFeedback && !downloadFeedback.cancelled && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-3 no-print animate-fade-in">
          {downloadFeedback.success ? (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-md">
              <div className="flex items-center space-x-2 truncate mr-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {language === 'ja'
                    ? `ダウンロード完了: ${downloadFeedback.fileName} (${downloadFeedback.location})`
                    : `Berhasil disimpan di ${downloadFeedback.location}: ${downloadFeedback.fileName}`}
                </span>
              </div>
              {downloadFeedback.uri && isNative && (
                <button
                  type="button"
                  onClick={() => handleShareResult(downloadFeedback)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Buka / Bagikan</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold shadow-md">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{downloadFeedback.error || 'Gagal menyimpan file'}</span>
            </div>
          )}
        </div>
      )}

      {downloadFeedback?.cancelled && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-3 no-print animate-fade-in">
          <div className="flex items-center space-x-2 p-2.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <span>Pemilihan folder dibatalkan</span>
          </div>
        </div>
      )}

      {/* Main Preview Container */}
      <main className="flex-1 p-3 sm:p-6 md:p-8 flex justify-center">
        {/* TAB 1: PDF DOCUMENT PREVIEW */}
        {activeTab === 'pdf' && (
          <div className="statement-print-paper w-full max-w-4xl bg-white text-slate-900 rounded-3xl p-6 sm:p-10 md:p-12 shadow-2xl border border-slate-200 space-y-6 animate-fade-in">
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
                  Daily Balance & Wealth Tracker • Financial Statement (PDF Report)
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

              <div
                className={`p-3.5 sm:p-4 rounded-2xl border ${
                  netSavings >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-rose-50 border-rose-200'
                }`}
              >
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700">
                  {t.summary.netCashFlow}
                </p>
                <p
                  className={`text-sm sm:text-lg font-black font-mono mt-1 ${
                    netSavings >= 0 ? 'text-indigo-600' : 'text-rose-600'
                  }`}
                >
                  {netSavings >= 0 ? '+' : ''}
                  {currency} {formatNumberWithCommas(netSavings)}
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
                        ? `${t.sources[tx.source] || tx.source} -> ${t.sources[tx.destinationSource || 'ewallet'] || tx.destinationSource || 'E-Wallet'}`
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
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                              isExpense ? 'text-rose-600' : isIncome ? 'text-emerald-600' : 'text-slate-700'
                            }`}
                          >
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
        )}

        {/* TAB 2: EXCEL SPREADSHEET PREVIEW (.xlsx) */}
        {activeTab === 'excel' && (
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col animate-fade-in">
            {/* Excel Brand Ribbon Header */}
            <div className="bg-[#107c41] text-white px-5 py-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    Microsoft Excel Spreadsheet Preview
                  </h3>
                  <p className="text-[11px] text-emerald-100">
                    dailyba_statement_{yearMonth}.xlsx • Ready for formulas & filters
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center space-x-2 text-xs font-mono bg-emerald-800/60 px-3 py-1 rounded-lg border border-emerald-600">
                <span>Tab: Statement {yearMonth}</span>
              </div>
            </div>

            {/* Formula Bar */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center space-x-3 text-xs font-mono text-slate-700">
              <span className="font-bold text-slate-500">fx</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-900 font-semibold truncate">
                {`=SUM(I9:I${filtered.length + 8})`}
              </span>
            </div>

            {/* Excel Grid Table with Column & Row Headers */}
            <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
              <table className="w-full border-collapse text-left font-sans text-xs">
                <thead>
                  {/* Excel Column Letters Header */}
                  <tr className="bg-slate-200 border-b border-slate-300 text-slate-600 font-mono text-[11px]">
                    <th className="w-10 border-r border-slate-300 py-1.5 text-center bg-slate-300 font-bold">#</th>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((col) => (
                      <th key={col} className="border-r border-slate-300 px-3 py-1.5 text-center font-bold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-xs">
                  {excelData.sheetData.map((row, rowIdx) => {
                    const isTitle = rowIdx === 0;
                    const isTableHeader = rowIdx === 7;
                    const isKPI = rowIdx >= 3 && rowIdx <= 5;

                    return (
                      <tr
                        key={rowIdx}
                        className={`hover:bg-slate-50 transition-colors ${
                          isTableHeader ? 'bg-slate-100 font-bold' : ''
                        }`}
                      >
                        {/* Excel Row Number Column */}
                        <td className="w-10 border-r border-slate-300 bg-slate-200 text-slate-500 text-center font-mono py-1.5 px-1 font-bold text-[10px]">
                          {rowIdx + 1}
                        </td>

                        {row.map((cell, colIdx) => (
                          <td
                            key={colIdx}
                            className={`border-r border-slate-200 px-3 py-1.5 truncate max-w-[200px] ${
                              isTitle
                                ? 'font-bold text-slate-900 text-sm'
                                : isKPI
                                ? 'font-bold text-slate-800'
                                : isTableHeader
                                ? 'font-bold text-slate-900 bg-slate-100'
                                : colIdx === 6 || colIdx === 8
                                ? 'text-right font-mono font-medium'
                                : 'text-slate-800'
                            }`}
                          >
                            {String(cell || '')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Excel Sheet Tabs Footer */}
            <div className="bg-slate-100 border-t border-slate-300 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center space-x-1">
                <span className="px-3 py-1 bg-white border border-slate-300 border-b-white rounded-t font-semibold text-slate-900 shadow-xs">
                  Statement {yearMonth}
                </span>
              </div>
              <span className="font-mono">Total {filtered.length} rows</span>
            </div>
          </div>
        )}

        {/* TAB 3: CSV RAW DATA PREVIEW (.csv) */}
        {activeTab === 'csv' && (
          <div className="w-full max-w-4xl bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col animate-fade-in">
            {/* CSV Top Bar with Copy Button */}
            <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                <span className="text-xs font-mono font-bold text-slate-200">
                  dailyba_statement_{yearMonth}.csv (UTF-8 BOM)
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCSV}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-teal-400 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Raw CSV'}</span>
              </button>
            </div>

            {/* Monospace Code Editor View */}
            <div className="p-4 sm:p-6 overflow-x-auto max-h-[600px] overflow-y-auto font-mono text-xs text-slate-300 space-y-1">
              {csvLines.map((line, idx) => (
                <div key={idx} className="flex items-start space-x-3 hover:bg-slate-800/40 px-2 py-0.5 rounded">
                  <span className="text-slate-600 select-none w-8 text-right shrink-0">{idx + 1}</span>
                  <span className={`break-all ${idx === 0 ? 'text-teal-300 font-bold' : 'text-slate-300'}`}>
                    {line}
                  </span>
                </div>
              ))}
            </div>

            {/* CSV Footer */}
            <div className="bg-slate-950 px-5 py-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>{csvLines.length} Lines • Comma Delimited</span>
              <span>Encrypted Export</span>
            </div>
          </div>
        )}
      </main>
    </div>,
    document.body
  );
}
