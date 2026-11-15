'use client';

import React, { useRef, useState } from 'react';
import { Currency, FinanceState, Language } from '@/types/finance';
import { translations } from '@/lib/i18n';
import { getTodayLocalDate } from '@/lib/dateUtils';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { LegalModal } from './LegalModal';
import { CustomTimePicker } from './CustomTimePicker';
import { useAuth } from '@/lib/authContext';
import { APP_VERSION } from '@/lib/version';
import {
  Upload,
  Trash2,
  X,
  FileJson,
  FileSpreadsheet,
  Check,
  Bell,
  Cloud,
  RefreshCw,
  HardDrive,
  Fingerprint,
  Sliders,
  User as UserIcon,
  LogOut,
  Globe,
  Coins,
  Tag,
  History,
  Target,
} from 'lucide-react';
import { scheduleDailyReminder } from '@/lib/localNotifications';
import { backupToGoogleDrive, getLastGoogleDriveBackupTime } from '@/lib/googleDriveBackup';
import { isAppLockEnabled, setAppLockEnabled, getAppLockPin } from '@/lib/biometricAuth';
import { SecuritySettingsModal, SecurityModalMode } from './SecuritySettingsModal';

const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: 'JPY', label: '¥ JPY', symbol: '¥' },
  { code: 'IDR', label: 'Rp IDR', symbol: 'Rp' },
  { code: 'USD', label: '$ USD', symbol: '$' },
  { code: 'MMK', label: 'K MMK', symbol: 'K' },
];

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currency?: Currency;
  state: FinanceState;
  onImportData: (data: Partial<FinanceState>) => void;
  onResetSample?: () => void;
  onClearAll: () => void;
  onToggleReminder?: (enabled: boolean, time?: string) => void;
  onSetAutoBackupFrequency?: (freq: 'off' | 'daily' | 'weekly') => void;
  onManualSync?: () => Promise<void>;
  onOpenAuth?: () => void;
  onLanguageChange?: (lang: Language) => void;
  onCurrencyChange?: (curr: Currency) => void;
  onUpdateDailyTarget?: (target: number) => void;
  onOpenChangelog?: () => void;
  onOpenCsvImport?: () => void;
  onManageCategories?: () => void;
}

export function BackupModal({
  isOpen,
  onClose,
  language,
  currency = 'JPY',
  state,
  onImportData,
  onClearAll,
  onToggleReminder,
  onSetAutoBackupFrequency,
  onManualSync,
  onOpenAuth,
  onLanguageChange,
  onCurrencyChange,
  onUpdateDailyTarget,
  onOpenChangelog,
  onOpenCsvImport,
  onManageCategories,
}: BackupModalProps) {
  useBodyScrollLock(isOpen);

  const t = translations[language];
  const { user, isAuthenticated, syncStatus, logout, deleteAccount } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isConfirmDeleteAccountOpen, setIsConfirmDeleteAccountOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(Boolean(state.dailyReminderEnabled));
  const [reminderTime, setReminderTime] = useState(state.dailyReminderTime || '20:00');
  const [isScheduling, setIsScheduling] = useState(false);
  const [isGDriveBackingUp, setIsGDriveBackingUp] = useState(false);
  const [lastGDriveBackup, setLastGDriveBackup] = useState<string | null>(getLastGoogleDriveBackupTime());
  const [isAppLockOn, setIsAppLockOn] = useState(() => isAppLockEnabled());
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityModalMode, setSecurityModalMode] = useState<SecurityModalMode>('setting_new_pin');
  const [targetInputVal, setTargetInputVal] = useState<string>(
    state.dailySpendTarget ? String(state.dailySpendTarget) : ''
  );

  const handleToggleAppLock = (enable: boolean) => {
    if (enable) {
      const hasPin = Boolean(getAppLockPin());
      if (!hasPin) {
        setSecurityModalMode('setting_new_pin');
        setIsSecurityModalOpen(true);
        return;
      }
      setAppLockEnabled(true);
      setIsAppLockOn(true);
      setFeedback(language === 'ja' ? 'アプリロックを有効にしました' : 'App lock enabled');
    } else {
      setAppLockEnabled(false);
      setIsAppLockOn(false);
      setFeedback(language === 'ja' ? 'アプリロックを解除しました' : 'App lock disabled');
    }
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleToggleReminder = async (enabled: boolean, timeVal?: string) => {
    const targetTime = timeVal || reminderTime;
    setIsScheduling(true);
    const success = await scheduleDailyReminder(enabled, targetTime, language);
    setIsScheduling(false);
    if (success) {
      setReminderEnabled(enabled);
      if (onToggleReminder) onToggleReminder(enabled, targetTime);
      setFeedback(enabled ? t.actions.reminderScheduled : t.actions.reminderDisabled);
    } else {
      setFeedback(t.actions.permissionDenied);
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleGoogleDriveBackup = async () => {
    setIsGDriveBackingUp(true);
    try {
      const res = await backupToGoogleDrive(state, language);
      if (res.success) {
        setLastGDriveBackup(res.backupTime || new Date().toISOString());
        setFeedback(res.message);
      } else {
        setFeedback(res.message);
      }
    } catch {
      setFeedback(language === 'ja' ? 'Google Drive バックアップに失敗しました' : 'Failed to backup to Google Drive');
    } finally {
      setIsGDriveBackingUp(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  if (!isOpen) return null;

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dailyba_backup_${getTodayLocalDate()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setFeedback(language === 'ja' ? 'JSONバックアップを出力しました！' : 'Backup JSON exported successfully!');
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
    downloadAnchor.setAttribute('download', `dailyba_transactions_${getTodayLocalDate()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setFeedback(language === 'ja' ? 'CSVレポートを出力しました！' : 'Transactions CSV exported successfully!');
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
          setFeedback(language === 'ja' ? 'データを正常に復元しました！' : 'Data restored successfully!');
        } else {
          setFeedback(language === 'ja' ? '無効なバックアップファイルです' : 'Invalid backup file structure');
        }
      } catch {
        setFeedback(language === 'ja' ? 'JSONの解析に失敗しました' : 'Failed to parse JSON file');
      }
      setTimeout(() => setFeedback(null), 2500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-surface-solid)] border border-[var(--border-strong)] w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-main)]">
                {language === 'ja' ? '設定 & プリファレンス' : 'Settings & Preferences'}
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                {language === 'ja' ? '通貨・言語・同期・カテゴリ・バックアップ' : 'Currency, language, sync, categories & backup'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 rounded-xl animate-fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Account & Server Setting Section */}
          {isAuthenticated && user ? (
            <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 uppercase font-mono">
                    {user.name ? user.name[0] : (user.email ? user.email[0] : 'U')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text-main)] truncate">
                      {user.name || (language === 'ja' ? 'クラウド同期アカウント' : 'Cloud Account')}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {syncStatus === 'synced' ? (language === 'ja' ? '同期完了' : 'Synced') : syncStatus}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setFeedback(language === 'ja' ? 'ログアウトしました' : 'Signed out');
                      setTimeout(() => setFeedback(null), 2000);
                    }}
                    className="p-1.5 rounded-xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] hover:text-rose-400 text-[var(--text-muted)] transition-all cursor-pointer shadow-xs active:scale-95"
                    title={language === 'ja' ? 'ログアウト' : 'Sign Out'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl border border-indigo-500/25 bg-indigo-500/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text-main)] truncate">
                      {language === 'ja' ? 'クラウド同期アカウント' : 'Cloud Account & Sync'}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                      {language === 'ja' ? 'ログインして複数端末で安全に自動同期' : 'Sign in to sync your data securely across devices'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth?.();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
                >
                  {language === 'ja' ? 'ログイン' : 'Sign In'}
                </button>
              </div>
            </div>
          )}

          {/* Preferences: Currency & Language (Point 6 Migration Guarantee) */}
          <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-[var(--text-main)]">
                  {language === 'ja' ? '基準通貨' : 'Primary Currency'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {CURRENCIES.map((c) => {
                  const isSelected = currency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        onCurrencyChange?.(c.code);
                        setFeedback(`${c.code} selected`);
                        setTimeout(() => setFeedback(null), 2000);
                      }}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--brand)] text-slate-950 font-bold shadow-xs'
                          : 'bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {c.symbol}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-bold text-[var(--text-main)]">
                  {language === 'ja' ? '表示言語' : 'Display Language'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {LANGUAGES.map((l) => {
                  const isSelected = language === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        onLanguageChange?.(l.code);
                        setFeedback(`${l.label} set`);
                        setTimeout(() => setFeedback(null), 2000);
                      }}
                      className={`px-1.5 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-500 text-white font-bold shadow-xs'
                          : 'bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {l.code.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Discipline Target (Point 4) */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-[var(--text-main)] block">
                    {language === 'ja' ? '1日の目標支出' : 'Daily Spend Target'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {language === 'ja' ? '自己管理の目安枠' : 'Personal discipline target'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={targetInputVal}
                  onChange={(e) => setTargetInputVal(e.target.value)}
                  placeholder="e.g. 3000"
                  className="w-24 px-2 py-1 text-xs text-right rounded-lg bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] text-[var(--text-main)] font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const parsed = Number(targetInputVal);
                    if (!isNaN(parsed) && parsed >= 0) {
                      onUpdateDailyTarget?.(parsed);
                      setFeedback(language === 'ja' ? '目標値を保存しました' : 'Target saved');
                      setTimeout(() => setFeedback(null), 2000);
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] hover:border-emerald-500/50 text-[11px] font-bold text-emerald-400 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Quick Management Shortcuts (Categories, CSV Import, Changelog) */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {language === 'ja' ? 'ツール & カテゴリ管理' : 'Tools & Categories'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onManageCategories?.();
                }}
                className="p-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-indigo-500/50 flex flex-col items-center justify-center space-y-1 text-center transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Tag className="w-4 h-4 text-indigo-400" />
                <span className="text-[11px] font-semibold text-[var(--text-main)]">Categories</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCsvImport?.();
                }}
                className="p-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-emerald-500/50 flex flex-col items-center justify-center space-y-1 text-center transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-semibold text-[var(--text-main)]">Import CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChangelog?.();
                }}
                className="p-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-amber-500/50 flex flex-col items-center justify-center space-y-1 text-center transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <History className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] font-semibold text-[var(--text-main)]">v{APP_VERSION}</span>
              </button>
            </div>
          </div>

          {/* Export Files Section */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {language === 'ja' ? 'ファイル出力' : 'Export Files'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-emerald-500/50 flex items-center justify-center space-x-2 text-xs font-semibold text-[var(--text-main)] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <FileJson className="w-4 h-4 text-amber-500" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-emerald-500/50 flex items-center justify-center space-x-2 text-xs font-semibold text-[var(--text-main)] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Google Drive Cloud Backup */}
          <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <HardDrive className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-main)] truncate">
                    {language === 'ja' ? 'Google Drive クラウドバックアップ' : 'Google Drive Cloud Backup'}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                    {language === 'ja'
                      ? 'Google Drive へ直接バックアップ・復元（機種変更時も安心）'
                      : 'Backup & restore directly with Google Drive across devices'}
                  </p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                Google Drive
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isGDriveBackingUp}
                onClick={handleGoogleDriveBackup}
                className="p-2.5 rounded-xl border border-emerald-500/30 bg-[var(--bg-surface-solid)] hover:bg-emerald-500/10 flex items-center justify-center space-x-1.5 text-xs font-bold text-emerald-400 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Cloud className={`w-3.5 h-3.5 ${isGDriveBackingUp ? 'animate-bounce' : ''}`} />
                <span className="truncate">
                  {language === 'ja' ? 'Drive に保存' : 'Backup to Drive'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-solid)] hover:border-indigo-500/50 flex items-center justify-center space-x-1.5 text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span className="truncate">
                  {language === 'ja' ? 'Drive から復元' : 'Restore from Drive'}
                </span>
              </button>
            </div>

            {lastGDriveBackup && (
              <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between pt-1 border-t border-emerald-500/20">
                <span>{language === 'ja' ? '最終 Drive バックアップ' : 'Last Google Drive backup'}</span>
                <span className="font-mono text-emerald-400 font-semibold">{lastGDriveBackup.slice(0, 16).replace('T', ' ')}</span>
              </div>
            )}
          </div>

          {/* Scheduled Cloud Auto-Backup */}
          <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Cloud className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-main)] truncate">
                    {language === 'ja' ? '自動バックアップ・暗号化同期' : 'Scheduled Cloud Auto-Backup'}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                    {language === 'ja'
                      ? '定期的に暗号化スナップショットを作成・同期します'
                      : 'Automatically creates encrypted snapshots on schedule'}
                  </p>
                </div>
              </div>

              {onManualSync && (
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={async () => {
                    setIsSyncing(true);
                    try {
                      await onManualSync();
                      setFeedback(language === 'ja' ? 'バックアップを完了しました！' : 'Encrypted backup synchronized!');
                    } catch {
                      setFeedback(language === 'ja' ? 'バックアップ同期に失敗しました' : 'Backup synchronization failed');
                    } finally {
                      setIsSyncing(false);
                      setTimeout(() => setFeedback(null), 2500);
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] hover:border-emerald-500/50 text-[11px] font-bold text-[var(--text-main)] transition-all flex items-center space-x-1 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
                  <span>{language === 'ja' ? '今すぐ実行' : 'Sync Now'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-xs">
              <span className="text-[11px] text-[var(--text-muted)] font-medium">
                {language === 'ja' ? '同期頻度' : 'Frequency'}
              </span>
              <div className="flex items-center gap-1">
                {(['off', 'daily', 'weekly'] as const).map((freq) => {
                  const isSelected = (state.autoBackupFrequency || 'daily') === freq;
                  const label =
                    freq === 'off'
                      ? (language === 'ja' ? '無効' : 'Off')
                      : freq === 'daily'
                      ? (language === 'ja' ? '毎日' : 'Daily')
                      : (language === 'ja' ? '毎週' : 'Weekly');
                  return (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => {
                        if (onSetAutoBackupFrequency) {
                          onSetAutoBackupFrequency(freq);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-xs'
                          : 'bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {state.lastAutoBackupAt && (
              <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between pt-0.5">
                <span>{language === 'ja' ? '前回のバックアップ' : 'Last backup'}</span>
                <span className="font-mono">{state.lastAutoBackupAt.slice(0, 16).replace('T', ' ')}</span>
              </div>
            )}
          </div>

          {/* Daily Reminder Setting */}
          <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-main)] truncate">
                    {t.actions.dailyReminder}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                    {t.actions.reminderDesc}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  disabled={isScheduling}
                  onChange={(e) => handleToggleReminder(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--border-strong)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-emerald)]"></div>
              </label>
            </div>

            {reminderEnabled && (
              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[var(--text-muted)] font-medium">
                  {t.actions.reminderTime}
                </span>
                <CustomTimePicker
                  value={reminderTime}
                  onChange={(newTime) => {
                    setReminderTime(newTime);
                    handleToggleReminder(true, newTime);
                  }}
                  language={language}
                />
              </div>
            )}
          </div>

          {/* Biometric & App Lock Setting */}
          <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-xs font-bold text-[var(--text-main)] truncate">
                      {t.security.biometricLock}
                    </p>
                    {isAppLockOn && (
                      <button
                        type="button"
                        onClick={() => {
                          setSecurityModalMode('changing_pin');
                          setIsSecurityModalOpen(true);
                        }}
                        className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        {language === 'ja' ? 'PIN変更' : 'Change PIN'}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                    {t.security.biometricLockDesc}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isAppLockOn}
                  onChange={(e) => handleToggleAppLock(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--border-strong)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-emerald)]"></div>
              </label>
            </div>
          </div>

          {/* Import JSON */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {language === 'ja' ? 'データ復元' : 'Restore Data'}
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
              className="w-full p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-emerald-500/50 flex items-center justify-center space-x-2 text-xs font-semibold text-[var(--text-main)] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Upload className="w-4 h-4 text-emerald-500" />
              <span>{language === 'ja' ? 'JSONバックアップを復元' : 'Import JSON Backup'}</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {language === 'ja' ? 'データ初期化・危険ゾーン' : 'Management & Danger Zone'}
            </p>
            <button
              type="button"
              onClick={() => setIsConfirmClearOpen(true)}
              className="w-full p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 flex items-center justify-center space-x-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'ja' ? 'すべてのローカルデータを初期化' : 'Reset All Local Data'}</span>
            </button>

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAccountOpen(true)}
                className="w-full p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 flex items-center justify-center space-x-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'ja' ? 'アカウントとクラウドデータを完全削除' : 'Delete Account & Cloud Data'}</span>
              </button>
            )}

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setIsLegalModalOpen(true)}
                className="text-[11px] text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:underline cursor-pointer"
              >
                {language === 'ja' ? 'プライバシーポリシー & 利用規約' : 'Privacy Policy & Terms of Service'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isConfirmClearOpen}
        title={language === 'ja' ? '全データの初期化' : 'Clear All Data'}
        description={language === 'ja' ? '本当にすべての家計簿・資産データを削除しますか？この操作は元に戻せません。' : 'Are you sure you want to delete ALL transactions, investments, and settings? This action cannot be undone.'}
        itemName={language === 'ja' ? '全データ初期化' : 'Factory Reset All Data'}
        confirmLabel={language === 'ja' ? '全データを削除' : 'Delete All Data'}
        language={language}
        onConfirm={() => {
          onClearAll();
          setFeedback(language === 'ja' ? 'すべてのローカルデータを削除しました。' : 'All local data cleared.');
          setTimeout(() => setFeedback(null), 2500);
        }}
        onClose={() => setIsConfirmClearOpen(false)}
      />

      <ConfirmDeleteModal
        isOpen={isConfirmDeleteAccountOpen}
        title={language === 'ja' ? 'アカウントの完全削除' : 'Delete Account & Cloud Data'}
        description={language === 'ja' ? 'アカウントおよびクラウド上のすべての同期データが永久に削除されます。この操作は取り消せません。' : 'Permanently deletes your account credentials and wipes all cloud backups from the server. This cannot be undone.'}
        itemName={language === 'ja' ? 'アカウント削除' : 'Permanent Account Deletion'}
        confirmLabel={language === 'ja' ? 'アカウントを完全に削除' : 'Delete Account'}
        language={language}
        onConfirm={async () => {
          await deleteAccount();
          setIsConfirmDeleteAccountOpen(false);
          setFeedback(language === 'ja' ? 'アカウントを削除しました。' : 'Account deleted successfully.');
          setTimeout(() => setFeedback(null), 2500);
        }}
        onClose={() => setIsConfirmDeleteAccountOpen(false)}
      />

      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        language={language}
      />

      <SecuritySettingsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        language={language}
        initialMode={securityModalMode}
        onSuccess={() => {
          setIsAppLockOn(true);
          setFeedback(language === 'ja' ? 'PINを設定しました' : 'PIN saved successfully');
          setTimeout(() => setFeedback(null), 2500);
        }}
      />
    </div>
  );
}
