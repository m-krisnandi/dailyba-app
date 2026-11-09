'use client';

import React, { useState } from 'react';
import { Language } from '@/types/finance';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import { Shield, FileText, X, Check, Lock, Trash2, Camera } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialTab?: 'privacy' | 'terms';
}

export function LegalModal({
  isOpen,
  onClose,
  language,
  initialTab = 'privacy',
}: LegalModalProps) {
  useBodyScrollLock(isOpen);
  const [tab, setTab] = useState<'privacy' | 'terms'>(initialTab);

  if (!isOpen) return null;

  const isJa = language === 'ja';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-5 sm:p-7 space-y-5 max-h-[90vh] flex flex-col cursor-default relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-main)]">
                {isJa ? 'プライバシーと利用規約' : 'Privacy & Legal Terms'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {isJa ? 'Google Play & App Store 準拠の規約' : 'App Store & Google Play Compliant'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)] shrink-0">
          <button
            type="button"
            onClick={() => setTab('privacy')}
            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              tab === 'privacy'
                ? 'bg-[var(--bg-surface-solid)] text-emerald-500 shadow-xs border border-emerald-500/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isJa ? 'プライバシーポリシー' : 'Privacy Policy'}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('terms')}
            className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              tab === 'terms'
                ? 'bg-[var(--bg-surface-solid)] text-blue-500 shadow-xs border border-blue-500/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isJa ? '利用規約' : 'Terms of Service'}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-[var(--text-muted)] leading-relaxed">
          {tab === 'privacy' ? (
            <>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">
                  {isJa ? '1. 基本方針（オフラインファースト・プライバシー優先）' : '1. Overview (Offline-First Privacy)'}
                </h4>
                <p>
                  {isJa
                    ? 'Dailyba は利用者のプライバシーを最優先に設計された家計管理・純資産記録アプリです。本アプリはアカウント登録なしでも端末内ローカルストレージ（IndexedDB/LocalStorage）に全データを暗号化・保存してオフラインで完結してご利用いただけます。'
                    : 'Dailyba is designed with privacy as its primary foundation. All financial transactions, budgets, and investment records are stored locally on your device by default, fully functional without mandatory account registration.'}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">
                  {isJa ? '2. カメラ・画像アクセス（レシートAIスキャン）' : '2. Camera & Photo Access (AI Receipt OCR)'}
                </h4>
                <p>
                  {isJa
                    ? 'レシートスキャン機能を利用する際のみ、カメラでの撮影または写真ライブラリの画像を選択する権限を使用します。画像データはレシートの内容（金額、店名、日付、支払元）をテキスト解析するためだけに Dailyba AI 解析エンジンへ送信され、広告目的での収集や第三者への販売は一切行われません。'
                    : 'Camera and Photo Library permissions are requested solely when you choose to scan physical receipts or invoices. Images are processed via Dailyba AI Vision engine exclusively for OCR text extraction (amount, date, merchant, category) and are never used for advertising, tracking, or sold to third parties.'}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">
                  {isJa ? '3. クラウド同期とデータ保管' : '3. Cloud Synchronization & Data Storage'}
                </h4>
                <p>
                  {isJa
                    ? '複数端末でデータを同期するためにアカウントを作成された場合、メールアドレスと暗号化されたパスワードハッシュ、および最新のバックアップJSONのみがサーバーに安全に保管されます。第三者への開示は行いません。'
                    : 'If you register an account for multi-device synchronization, only your email address, bcrypt password hash, and encrypted state snapshot are stored on the secure Dailyba server.'}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">
                  {isJa ? '4. アカウントおよびデータの完全削除（GDPR / App Store 準拠）' : '4. Account & Data Deletion (App Store & GDPR Compliant)'}
                </h4>
                <p>
                  {isJa
                    ? '利用者はアプリ内の「アカウント・設定」画面からいつでも「アカウントを削除」を実行できます。実行すると、サーバー上に保存されているアカウント情報および全てのクラウドバックアップデータが直ちに永久削除されます。また、端末内のローカルデータも設定から即時初期化可能です。'
                    : 'In compliance with Apple App Store Guideline 5.1.1(v) and Google Play policy, you can permanently delete your account and all associated cloud data at any time directly within the app under "Account Settings > Delete Account". All server-side data is irreversibly wiped upon confirmation.'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">
                  {isJa ? '1. 利用許諾' : '1. Terms of Use'}
                </h4>
                <p>
                  {isJa
                    ? 'Dailyba は個人の家計管理および資産ポートフォリオ追跡を目的として提供されています。利用者は自己の責任において本アプリを使用するものとします。'
                    : 'Dailyba is provided for personal budgeting and portfolio management purposes. You agree to use the service in accordance with applicable laws.'}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">
                  {isJa ? '2. 免責事項（投資・税務助言の否定）' : '2. Financial & Investment Disclaimer'}
                </h4>
                <p>
                  {isJa
                    ? '本アプリに表示される純資産推移、為替換算レート、資産評価額は自己管理のための参考値であり、金融商品取引法に基づく投資助言や税務相談を提供するものではありません。'
                    : 'Information displayed in Dailyba, including exchange rates, investment valuation, and net worth calculations, is for personal organizational tracking only and does not constitute financial, investment, or legal advice.'}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">
                  {isJa ? '3. サービス変更・アカウント停止' : '3. Service Modifications & Termination'}
                </h4>
                <p>
                  {isJa
                    ? 'ユーザーはいつでも本アプリの利用を終了し、アカウントおよび端末データを削除することができます。'
                    : 'You may terminate your use of the application at any time by deleting your account and local data.'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <span className="text-[10px] text-[var(--text-faint)] font-mono">
            Dailyba • Updated Nov 2026
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-xs text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
          >
            {isJa ? '閉じる' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
