'use client';

import React, { useState, useRef } from 'react';
import { Currency, ExpenseCategory, FundingSource, IncomeCategory, Language, Transaction, TransactionType } from '@/types/finance';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  FileSpreadsheet,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
} from 'lucide-react';
import { getTodayLocalDate } from '@/lib/dateUtils';

interface CsvImportModalProps {
  isOpen: boolean;
  language: Language;
  currency: Currency;
  onImportTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
  onClose: () => void;
}

interface ParsedRow {
  date: string;
  amount: number;
  type: TransactionType;
  category: ExpenseCategory | IncomeCategory | string;
  source: FundingSource;
  note?: string;
  isValid: boolean;
  error?: string;
}

export function CsvImportModal({
  isOpen,
  language,
  currency,
  onImportTransactions,
  onClose,
}: CsvImportModalProps) {
  useBodyScrollLock(isOpen);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isJa = language === 'ja';

  const downloadSampleCsv = () => {
    const today = getTodayLocalDate();
    const headers = 'Date,Type,Amount,Category,Source,Note\n';
    const sampleRows = [
      `${today},expense,15000,food_drinks,cash,Lunch Bento`,
      `${today},expense,500,transport,ewallet,Subway Ticket`,
      `${today},expense,35000,shopping,credit_card,Groceries & Supplies`,
      `${today},income,2500000,salary,bank,Monthly Salary`,
    ].join('\n');

    const blob = new Blob([headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dailyba_template_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) {
          setParseError(isJa ? 'ファイルが空です' : 'File is empty');
          return;
        }

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setParseError(isJa ? '有効なヘッダーとデータが見つかりません' : 'CSV must contain a header and at least one data row');
          return;
        }

        // Header detection
        const rawHeaders = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase().replace(/["']/g, ''));

        const dateIdx = rawHeaders.findIndex((h) => /date|tanggal|日付|time/.test(h));
        const amountIdx = rawHeaders.findIndex((h) => /amount|nominal|jumlah|金額|price|total/.test(h));
        const typeIdx = rawHeaders.findIndex((h) => /type|tipe|種別|jenis/.test(h));
        const catIdx = rawHeaders.findIndex((h) => /category|kategori|カテゴリ|cat/.test(h));
        const srcIdx = rawHeaders.findIndex((h) => /source|sumber|口座|payment|account/.test(h));
        const noteIdx = rawHeaders.findIndex((h) => /note|memo|description|keterangan|deskripsi|メモ/.test(h));

        if (amountIdx === -1) {
          setParseError(isJa ? '金額列 (Amount) が見つかりませんでした' : 'Could not find "Amount" column in CSV header');
          return;
        }

        const rows: ParsedRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length <= 1) continue;

          // Parse amount
          const rawAmountStr = cols[amountIdx] || '';
          const cleanedAmount = rawAmountStr.replace(/[^0-9.-]/g, '');
          const rawAmount = Math.abs(parseFloat(cleanedAmount));

          if (isNaN(rawAmount) || rawAmount <= 0) {
            continue; // Skip invalid amounts
          }

          // Parse date
          let rawDate = dateIdx !== -1 ? cols[dateIdx] : getTodayLocalDate();
          // Normalize various date formats: YYYY/MM/DD, DD-MM-YYYY, YYYY-MM-DD
          rawDate = rawDate.replace(/\//g, '-');
          if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(rawDate)) {
            const [y, m, d] = rawDate.split('-');
            rawDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(rawDate)) {
            const [d, m, y] = rawDate.split('-');
            rawDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          } else {
            rawDate = getTodayLocalDate();
          }

          // Parse type
          let txType: TransactionType = 'expense';
          if (typeIdx !== -1) {
            const tVal = cols[typeIdx].toLowerCase();
            if (/income|pemasukan|収入|gaji/.test(tVal)) txType = 'income';
            else if (/savings|saving|tabungan|貯蓄/.test(tVal)) txType = 'savings';
          }

          // Parse category
          let category: string = txType === 'income' ? 'salary' : 'food_drinks';
          if (catIdx !== -1 && cols[catIdx]) {
            const cVal = cols[catIdx].toLowerCase();
            if (/food|drink|makan|食費/.test(cVal)) category = 'food_drinks';
            else if (/transport|train|ride|kereta|ojol|交通/.test(cVal)) category = 'transport';
            else if (/shop|belanja|買い物/.test(cVal)) category = 'shopping';
            else if (/laundry|cuci|洗濯/.test(cVal)) category = 'laundry';
            else if (/rent|kos|寮/.test(cVal)) category = 'rent';
            else if (/vps|server/.test(cVal)) category = 'vps';
            else if (/mobile|pulsa|通信/.test(cVal)) category = 'mobile';
            else if (/family|keluarga|仕送り/.test(cVal)) category = 'family';
            else if (/salary|gaji|給与/.test(cVal)) { category = 'salary'; txType = 'income'; }
            else if (/freelance|副業/.test(cVal)) { category = 'freelance'; txType = 'income'; }
            else category = 'others';
          }

          // Parse source
          let source: FundingSource = 'cash';
          if (srcIdx !== -1 && cols[srcIdx]) {
            const sVal = cols[srcIdx].toLowerCase();
            if (/bank|bca|mandiri|bni|bri|銀行/.test(sVal)) source = 'bank';
            else if (/wallet|ewallet|gopay|ovo|dana|shopeepay|qris|suica|pasmo|paypay|電子/.test(sVal)) source = 'ewallet';
            else if (/card|credit|kartu kredit|visa|mastercard|クレジット/.test(sVal)) source = 'credit_card';
            else source = 'cash';
          }

          const note = noteIdx !== -1 ? cols[noteIdx] : undefined;

          rows.push({
            date: rawDate,
            amount: rawAmount,
            type: txType,
            category,
            source,
            note: note || undefined,
            isValid: true,
          });
        }

        if (rows.length === 0) {
          setParseError(isJa ? '有効な取引レコードが見つかりませんでした' : 'No valid transaction rows found in CSV');
          return;
        }

        setParsedRows(rows);
      } catch (err: unknown) {
        setParseError(err instanceof Error ? err.message : 'Error parsing CSV');
      }
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;

    const toImport: Omit<Transaction, 'id'>[] = parsedRows.map((r) => ({
      date: r.date,
      amount: r.amount,
      type: r.type,
      category: r.category,
      source: r.source,
      currency,
      note: r.note,
    }));

    onImportTransactions(toImport);
    onClose();
  };

  const totalValid = parsedRows.filter((r) => r.isValid).length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-5 sm:p-6 space-y-5 max-h-[85vh] overflow-y-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-main)]">
                {isJa ? 'CSV 取引履歴インポート' : 'Import Transactions from CSV'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {isJa ? '他の家計簿や銀行明細を一括取り込み' : 'Batch import from other apps or bank statements'}
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

        {/* Upload Dropzone */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-6 rounded-2xl border-2 border-dashed border-[var(--border-subtle)] hover:border-emerald-500/50 bg-[var(--bg-subtle)] flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-emerald-500/5 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-[var(--text-main)]">
              {fileName || (isJa ? 'CSVファイルを選択またはドロップ' : 'Click to upload or drag CSV file')}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              {isJa ? '対応フォーマット: 日付, 支出/収入, 金額, カテゴリ, 口座' : 'Supported headers: Date, Type, Amount, Category, Source, Note'}
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="inline-flex items-center space-x-1 text-emerald-400 hover:underline cursor-pointer font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isJa ? 'サンプルCSVテンプレートをDL' : 'Download Sample CSV Template'}</span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {parseError && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--text-main)] flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {isJa
                    ? `${totalValid} 件のレコードを検出`
                    : `Detected ${totalValid} valid transactions`}
                </span>
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Currency: {currency}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] divide-y divide-[var(--border-subtle)]">
              {parsedRows.slice(0, 5).map((r, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-[var(--text-main)] truncate">
                      {r.note || r.category}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono flex items-center space-x-1 mt-0.5">
                      <span>{r.date}</span>
                      <span>•</span>
                      <span className="capitalize">{r.source}</span>
                    </p>
                  </div>
                  <span
                    className={`font-mono font-bold shrink-0 ${
                      r.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {r.type === 'income' ? '+' : '-'}{currency} {r.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {parsedRows.length > 5 && (
                <div className="p-2 text-center text-[10px] text-[var(--text-muted)] font-mono bg-[var(--bg-surface)]">
                  +{parsedRows.length - 5} {isJa ? '件のレコード' : 'more records...'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-bold transition-all cursor-pointer"
          >
            {isJa ? 'キャンセル' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={totalValid === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center space-x-1.5"
          >
            <span>{isJa ? `${totalValid} 件を一括インポート` : `Import ${totalValid} Transactions`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
