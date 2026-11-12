'use client';

import React, { useState, useEffect } from 'react';
import {
  ExpenseCategory,
  FundingSource,
  Language,
  PendingImportItem,
  EmailSyncStatus,
  Transaction,
} from '@/types/finance';
import { translations, formatCurrency } from '@/lib/i18n';
import { dailybaApi } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  X,
  RefreshCw,
  Mail,
  Check,
  Trash2,
  AlertTriangle,
  Sparkles,
  CheckCheck,
  FileText,
} from 'lucide-react';

interface BankEmailSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onApproveTransactions: (txs: Omit<Transaction, 'id'>[]) => void;
  existingTransactions?: Transaction[];
}

const SAMPLE_JAGO = `Assalamu'alaikum MUHAMAD KRISNANDI,
Thank you for trusting Jago! You have made a payment, and here are the details:
Transaction Summary
From 502799066497
To Good Laundry 1
9360000801984237685
Amount Rp 15.000
Transaction Date 06 November 2026, 19:20 WIB
Transaction Status Successful
Acquirer Name Bank Mandiri
Merchant Location Banyumas (Kab)`;

const SAMPLE_MANDIRI = `Pembayaran Berhasil
Halo MUHAMAD KRISNANDI ,
Berikut adalah detail transaksi Anda dengan QR:
Penerima
RM SALERO BARU
BANJARNEGARA - ID
Tanggal 12 Nov 2026
Jam 18:02:33 WIB
Nominal Transaksi Rp 10.000,00
No. Referensi 2611121122539729748`;

const SAMPLE_PAYPAY = `【PayPay】お支払い完了のお知らせ
PayPayをご利用いただき、ありがとうございます。
利用先：ファミリーマート
お支払い金額：1,250円
利用日時：2026/11/12 12:30`;

export function BankEmailSyncModal({
  isOpen,
  onClose,
  language,
  onApproveTransactions,
  existingTransactions = [],
}: BankEmailSyncModalProps) {
  useBodyScrollLock(isOpen);

  const t = translations[language];
  const { isAuthenticated } = useAuth();

  const [status, setStatus] = useState<EmailSyncStatus | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingImportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Manual test / paste receipt state
  const [rawText, setRawText] = useState('');
  const [isParsingRaw, setIsParsingRaw] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'test'>('pending');

  // Inline edit state for pending imports before approval
  const [itemCategories, setItemCategories] = useState<Record<string, string>>({});
  const [itemSources, setItemSources] = useState<Record<string, FundingSource>>({});

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, pendingRes] = await Promise.all([
        dailybaApi.getEmailSyncStatus(),
        dailybaApi.getPendingImports(),
      ]);

      if (statusRes.success && statusRes.data) {
        setStatus(statusRes.data);
      }
      if (pendingRes.success && pendingRes.items) {
        setPendingItems(pendingRes.items);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  // Listen for Google OAuth popup callback completion
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'DAILYBA_GOOGLE_CONNECTED') {
        setFeedback({
          type: 'success',
          message: language === 'ja'
            ? 'Googleアカウントの連携が完了しました。'
            : 'Google Account successfully connected!',
        });
        refreshData();
      }
    };
    window.addEventListener('message', handleMessage);

    // Capacitor App resume listener for native system browser OAuth
    let removeSub: (() => void) | null = null;
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', (state) => {
          if (state.isActive) {
            refreshData();
          }
        }).then(sub => {
          removeSub = () => sub.remove();
        });
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      if (removeSub) removeSub();
    };
  }, [language]);

  if (!isOpen) return null;

  // Handle Google OAuth trigger
  const handleConnectGoogle = async () => {
    if (!isAuthenticated) {
      setFeedback({
        type: 'info',
        message: language === 'ja'
          ? 'Google連携を利用するには、まずDailybaアカウントにログインしてください。'
          : 'Please sign in to your Dailyba account to connect Google.',
      });
      return;
    }
    try {
      setIsLoading(true);
      const res = await dailybaApi.getGoogleAuthUrl();
      if (res.success && res.authUrl) {
        if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ url: res.authUrl, windowName: '_system' });
        } else {
          window.open(res.authUrl, 'DailybaGoogleAuth', 'width=520,height=640,menubar=no,toolbar=no');
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.message || t.emailSync.googleNotConfigured,
        });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Cannot initiate Google connection' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setIsLoading(true);
      const res = await dailybaApi.disconnectGoogle();
      if (res.success) {
        setFeedback({
          type: 'info',
          message: language === 'ja' ? '連携を解除しました。' : 'Google Account disconnected.',
        });
        refreshData();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setFeedback(null);
      const res = await dailybaApi.triggerEmailSync();
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `${t.emailSync.syncSuccess} (${res.importedCount ?? 0} ${t.emailSync.pendingCountBadge})`,
        });
        await refreshData();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Sync failed' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Sync failed' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleParseRawText = async () => {
    if (!rawText.trim()) return;
    try {
      setIsParsingRaw(true);
      setFeedback(null);
      const res = await dailybaApi.parseRawEmail({
        text: rawText,
        save: true,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: language === 'ja'
            ? '決済明細を正常に抽出しました。承認待ちリストに追加されました。'
            : 'Transaction successfully extracted and added to pending imports!',
        });
        setRawText('');
        setActiveTab('pending');
        await refreshData();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Could not parse transaction' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Extraction failed' });
    } finally {
      setIsParsingRaw(false);
    }
  };

  const handleApproveSingle = async (item: PendingImportItem) => {
    const finalCategory = itemCategories[item.id] || item.category;
    const finalSource = itemSources[item.id] || item.source;

    try {
      const res = await dailybaApi.approveImport({
        id: item.id,
        updates: {
          category: finalCategory,
          source: finalSource,
        },
      });

      if (res.success) {
        onApproveTransactions([
          {
            type: 'expense',
            amount: item.amount,
            category: finalCategory,
            source: finalSource,
            currency: item.currency,
            date: item.occurred_at,
            note: `${item.provider.toUpperCase()}: ${item.merchant}`,
          },
        ]);

        setPendingItems(prev => prev.filter(p => p.id !== item.id));
        setFeedback({
          type: 'success',
          message: language === 'ja' ? '明細を家計簿に記録しました。' : 'Transaction approved and recorded!',
        });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    }
  };

  const handleApproveAll = async () => {
    if (pendingItems.length === 0) return;
    try {
      const res = await dailybaApi.approveImport({ all: true });
      if (res.success) {
        const approvedTxList: Omit<Transaction, 'id'>[] = pendingItems.map(item => ({
          type: 'expense',
          amount: item.amount,
          category: itemCategories[item.id] || item.category,
          source: itemSources[item.id] || item.source,
          currency: item.currency,
          date: item.occurred_at,
          note: `${item.provider.toUpperCase()}: ${item.merchant}`,
        }));

        onApproveTransactions(approvedTxList);
        setPendingItems([]);
        setFeedback({
          type: 'success',
          message: language === 'ja'
            ? `${approvedTxList.length}件の明細をすべて家計簿に記録しました。`
            : `All ${approvedTxList.length} transactions approved and recorded!`,
        });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    }
  };

  const handleRejectSingle = async (id: string) => {
    try {
      const res = await dailybaApi.rejectImport({ id });
      if (res.success) {
        setPendingItems(prev => prev.filter(p => p.id !== id));
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    }
  };

  const handleRejectAll = async () => {
    if (pendingItems.length === 0) return;
    try {
      const res = await dailybaApi.rejectImport({ all: true });
      if (res.success) {
        setPendingItems([]);
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Mail className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center space-x-2">
                <span>{t.emailSync.title}</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  Automated
                </span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] line-clamp-1">{t.emailSync.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`mx-4 sm:mx-6 mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : feedback.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="ml-2 hover:opacity-75 cursor-pointer font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Google Connection Card */}
          <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    status?.requiresReauth ? 'bg-amber-400 animate-pulse' : status?.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'
                  }`}
                />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-main)]">
                    {status?.requiresReauth
                      ? (language === 'ja' ? 'Google認証が期限切れです。再連携してください。' : 'Google authorization expired. Please reconnect.')
                      : status?.isConnected
                      ? `${t.emailSync.googleConnectedAs} ${status.connectedEmail || ''}`
                      : t.emailSync.googleNotConnected}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    {status?.lastSyncedAt
                      ? `${t.emailSync.lastSynced} ${new Date(status.lastSyncedAt).toLocaleString()}`
                      : t.emailSync.neverSynced}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {status?.isConnected && !status?.requiresReauth ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSyncNow}
                      disabled={isSyncing}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? t.emailSync.syncing : t.emailSync.syncNow}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectGoogle}
                      disabled={isLoading}
                      className="px-2.5 py-1.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-xs text-[var(--text-muted)] hover:text-rose-400 transition-all cursor-pointer"
                    >
                      {t.emailSync.disconnectGoogle}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={isLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{t.emailSync.connectGoogle}</span>
                  </button>
                )}
              </div>
            </div>

            {!status?.googleConfigured && (
              <p className="text-[11px] text-[var(--text-faint)] leading-relaxed border-t border-[var(--border-subtle)] pt-2.5">
                {t.emailSync.googleNotConfigured}
              </p>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center space-x-2 cursor-pointer transition-all ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <span>{t.emailSync.pendingImports}</span>
              {pendingItems.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-400">
                  {pendingItems.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('test')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center space-x-1.5 cursor-pointer transition-all ${
                activeTab === 'test'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t.emailSync.testReceiptTitle}</span>
            </button>
          </div>

          {/* Tab 1: Pending Queue */}
          {activeTab === 'pending' && (
            <div className="space-y-3">
              {pendingItems.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      {pendingItems.length} {t.emailSync.pendingCountBadge}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleApproveAll}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>{t.emailSync.approveAll}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRejectAll}
                        className="px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.emailSync.rejectAll}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {pendingItems.map(item => {
                      const isPotentialDuplicate = existingTransactions.some(
                        tx => tx.amount === item.amount && tx.date === item.occurred_at
                      );
                      const currentCategory = itemCategories[item.id] || item.category;
                      const currentSource = itemSources[item.id] || item.source;

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 hover:border-slate-600 transition-all space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                  {item.provider}
                                </span>
                                <h3 className="text-sm font-bold text-[var(--text-main)]">{item.merchant}</h3>
                                {isPotentialDuplicate && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    <span>{t.emailSync.potentialDuplicate}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-muted)] font-mono flex items-center space-x-2">
                                <span>{item.occurred_at}</span>
                                {item.occurred_time && <span>{item.occurred_time}</span>}
                                <span>•</span>
                                <span className="text-emerald-400 font-bold">
                                  {Math.round(item.confidence * 100)}% {t.emailSync.confidence}
                                </span>
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-sm sm:text-base font-bold text-[var(--text-main)] font-mono">
                                {formatCurrency(item.amount, item.currency)}
                              </span>
                            </div>
                          </div>

                          {/* Editable controls */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-subtle)]">
                            <div>
                              <label className="text-[10px] text-[var(--text-faint)] uppercase block mb-1">
                                {t.emailSync.category}
                              </label>
                              <select
                                value={currentCategory}
                                onChange={e =>
                                  setItemCategories(prev => ({ ...prev, [item.id]: e.target.value }))
                                }
                                className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                              >
                                {Object.keys(t.expenseCategories).map(catKey => (
                                  <option key={catKey} value={catKey}>
                                    {t.expenseCategories[catKey as ExpenseCategory]}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-[var(--text-faint)] uppercase block mb-1">
                                {t.emailSync.source}
                              </label>
                              <select
                                value={currentSource}
                                onChange={e =>
                                  setItemSources(prev => ({
                                    ...prev,
                                    [item.id]: e.target.value as FundingSource,
                                  }))
                                }
                                className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                              >
                                {(['bank', 'ewallet', 'credit_card', 'cash'] as FundingSource[]).map(src => (
                                  <option key={src} value={src}>
                                    {t.sources[src]}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleRejectSingle(item.id)}
                              className="px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            >
                              {t.emailSync.reject}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveSingle(item)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>{t.emailSync.approve}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center">
                    <CheckCheck className="w-6 h-6 stroke-[2]" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                    {t.emailSync.noPendingImports}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Test / Paste Receipt */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">
                  {t.emailSync.testReceiptDesc}
                </p>

                {/* Preset sample buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setRawText(SAMPLE_JAGO)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-blue-500/50 text-[var(--text-muted)] hover:text-blue-400 transition-all cursor-pointer"
                  >
                    {t.emailSync.loadSampleJago}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawText(SAMPLE_MANDIRI)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-blue-500/50 text-[var(--text-muted)] hover:text-blue-400 transition-all cursor-pointer"
                  >
                    {t.emailSync.loadSampleMandiri}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawText(SAMPLE_PAYPAY)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-blue-500/50 text-[var(--text-muted)] hover:text-blue-400 transition-all cursor-pointer"
                  >
                    {t.emailSync.loadSamplePayPay}
                  </button>
                </div>

                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={t.emailSync.pasteEmailPlaceholder}
                  rows={7}
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl p-3 text-xs text-[var(--text-main)] font-mono placeholder:text-[var(--text-faint)] focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseRawText}
                  disabled={isParsingRaw || !rawText.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-md"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isParsingRaw ? 'animate-spin' : ''}`} />
                  <span>{isParsingRaw ? t.emailSync.parsing : t.emailSync.parseReceipt}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] text-xs text-[var(--text-main)] font-medium transition-all cursor-pointer"
          >
            {t.actions.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
