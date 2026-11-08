'use client';

import React, { useRef, useState } from 'react';
import { FinanceState, Language } from '@/types/finance';
import { translations } from '@/lib/i18n';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  Download,
  Upload,
  Trash2,
  X,
  FileJson,
  FileSpreadsheet,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  state: FinanceState;
  onImportData: (data: Partial<FinanceState>) => void;
  onResetSample?: () => void;
  onClearAll: () => void;
}

export function BackupModal({
  isOpen,
  onClose,
  language,
  state,
  onImportData,
  onClearAll,
}: BackupModalProps) {
  useBodyScrollLock(isOpen);

  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dailyba_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setFeedback('Backup JSON exported successfully!');
    setTimeout(() => setFeedback(null), 2500);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Category', 'Amount', 'Currency', 'Source', 'Date', 'Note'];
    const rows = state.transactions.map((tx) => [
      tx.id,
      tx.type,
      tx.category,
      tx.amount,
      tx.currency || 'JPY',
      tx.source,
      tx.date,
      `"${(tx.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodedUri);
    downloadAnchor.setAttribute('download', `dailyba_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setFeedback('Transactions CSV exported successfully!');
    setTimeout(() => setFeedback(null), 2500);
  };

  // Import JSON handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && (Array.isArray(parsed.transactions) || Array.isArray(parsed.investments))) {
          onImportData(parsed);
          setFeedback('Data imported successfully!');
          setTimeout(() => setFeedback(null), 2500);
        } else {
          setFeedback('Invalid JSON backup file structure.');
          setTimeout(() => setFeedback(null), 3000);
        }
      } catch (err) {
        setFeedback('Error parsing JSON backup file.');
        setTimeout(() => setFeedback(null), 3000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="liquid-glass-modal rounded-3xl max-w-md w-full my-auto p-6 sm:p-7 space-y-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h3 className="text-base font-bold text-[var(--text-main)] flex items-center space-x-2">
            <span>{t.actions.export}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-emerald)]" />
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback && (
          <div className="p-3.5 rounded-xl bg-[var(--accent-emerald-soft)] border border-[var(--accent-emerald)] text-[var(--accent-emerald)] text-xs font-semibold flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Export Options */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Export Data
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportJSON}
                className="p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] flex items-center justify-center space-x-2 text-xs font-bold text-[var(--text-main)] transition-all shadow-xs cursor-pointer"
              >
                <FileJson className="w-4 h-4 text-amber-500" />
                <span>Backup JSON</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] flex items-center justify-center space-x-2 text-xs font-bold text-[var(--text-main)] transition-all shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Import JSON */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Restore Data
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] flex items-center justify-center space-x-2 text-xs font-bold text-[var(--text-main)] transition-all shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Import JSON Backup</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Management
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to delete ALL data? This action cannot be undone.')) {
                  onClearAll();
                  setFeedback('All local data cleared.');
                  setTimeout(() => setFeedback(null), 2500);
                }
              }}
              className="w-full p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 flex items-center justify-center space-x-1.5 text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
