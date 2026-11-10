'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, Database, Trash2, Camera, EyeOff, Mail, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState<'en' | 'ja'>('en');
  const isJa = lang === 'ja';

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#e2e8f0] selection:bg-emerald-500/30">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0b0f19]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>{isJa ? 'Dailyba に戻る' : 'Back to Dailyba'}</span>
          </Link>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'en'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang('ja')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'ja'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              日本語
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-10">
        {/* Title Header */}
        <div className="space-y-4 border-b border-slate-800 pb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>{isJa ? '公式プライバシーポリシー' : 'Official Privacy Policy'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isJa ? 'Dailyba プライバシーポリシー' : 'Dailyba Privacy Policy'}
          </h1>
          <p className="text-sm text-slate-400">
            {isJa
              ? '最終改訂日: 2026年11月10日 • Google Play Store & Apple App Store 準拠'
              : 'Last Updated: November 10, 2026 • Compliant with Google Play & Apple App Store Guidelines'}
          </p>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">
              {isJa ? 'ローカルファースト' : 'Offline-First Storage'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isJa
                ? '家計データはお使いの端末内に保存され、アカウント登録なしでも全機能が動作します。'
                : 'All transactions remain on your device by default. Cloud sync is 100% optional.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <EyeOff className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">
              {isJa ? 'データ売却・広告ゼロ' : 'Zero Data Selling'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isJa
                ? '金融データを広告会社や第三者に共有・売却することは一切ありません。'
                : 'We do not sell, rent, or monetize your personal financial data or receipts.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">
              {isJa ? '完全削除権の保障' : 'Instant Account Deletion'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isJa
                ? 'アプリ内から1タップでアカウントおよび全クラウドデータを即時永久消去可能です。'
                : 'Permanently purge your account and cloud data with a single tap in Settings.'}
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed divide-y divide-slate-800/60">
          {/* Section 1 */}
          <div className="pt-8 first:pt-0 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isJa ? '1. はじめに（サービス概要）' : '1. Overview & Service Identity'}</span>
            </h2>
            <p>
              {isJa
                ? 'Dailyba（以下「当アプリ」）は、日々の支出、収入、予算限度額、および純資産ポートフォリオを管理するためのパーソナルファイナンス管理ツールです。当アプリはお客様のプライバシーとデータ主権を尊重し、不要な個人情報の収集を行いません。'
                : 'Dailyba ("we", "our", or "the app") is a personal finance management tool developed to help users track daily expenses, savings reserves, budgets, and net worth. We believe personal financial records should remain private, protected, and under the absolute control of the user.'}
            </p>
          </div>

          {/* Section 2 */}
          <div className="pt-8 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isJa ? '2. 収集する情報とその利用目的' : '2. Information We Collect & How We Use It'}</span>
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-200">
                  {isJa ? '家計・資産取引データ: ' : 'Financial Records & Transaction Ledger: '}
                </strong>
                {isJa
                  ? '支出・収入の金額、日付、カテゴリ、メモ等のデータ。初期状態では端末内ストレージ（IndexedDB/LocalStorage）にのみ保存され、お客様が任意でクラウド同期を有効にした場合のみ、暗号化通信を介して安全なデータベースに保存されます。'
                  : 'Amounts, dates, categories, notes, and asset balances you record. By default, these are stored locally on your device storage. When you enable Cloud Sync, this data is transmitted over encrypted TLS 1.3 to your isolated database record.'}
              </li>
              <li>
                <strong className="text-slate-200">
                  {isJa ? 'アカウント認証情報（任意）: ' : 'Account Authentication (Optional): '}
                </strong>
                {isJa
                  ? 'クラウド同期を利用する場合に限り、メールアドレスおよびハッシュ化されたパスワードを保存します。アカウント未登録のままでもアプリの全機能をご利用いただけます。'
                  : 'If you register for Cloud Sync, we collect your email address and a cryptographically salted password hash. Using Dailyba without an account is always supported.'}
              </li>
              <li>
                <strong className="text-slate-200">
                  {isJa ? 'カメラおよびレシート画像: ' : 'Camera & Receipt Imagery: '}
                </strong>
                {isJa
                  ? 'レシート読取機能を使用する際、レシートの撮影または写真の選択を行います。画像は金額および店舗名の文字認識（OCR）のためだけに処理され、広告目的やモデル訓練に利用・転売されることはありません。'
                  : 'When utilizing the Receipt Scanner feature, photos of purchase receipts are processed temporarily for optical character recognition (OCR) parsing of item totals. Images are never repurposed for advertising, profiling, or training external models.'}
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="pt-8 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isJa ? '3. 端末の権限について (App Permissions)' : '3. Device Permissions'}</span>
            </h2>
            <p>
              {isJa
                ? '当アプリは以下のシステム権限を要求する場合があります。すべての権限はユーザーの明示的な許可があった場合のみ使用されます。'
                : 'Dailyba requests only the minimal device permissions strictly necessary for its advertised features:'}
            </p>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 text-xs">
              <p>
                <code className="text-emerald-400 font-mono">android.permission.CAMERA / NSCameraUsageDescription</code>:
                {' '}
                {isJa
                  ? 'レシートや請求書をカメラで直接撮影して金額を自動読取するために使用します。'
                  : 'Used solely to photograph receipts directly within the app for OCR processing.'}
              </p>
              <p>
                <code className="text-emerald-400 font-mono">NSPhotoLibraryUsageDescription</code>:
                {' '}
                {isJa
                  ? '写真ライブラリから保存済みのレシート画像を選択して解析するために使用します。'
                  : 'Allows importing an existing receipt image from your gallery for scanning.'}
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="pt-8 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{isJa ? '4. アカウントと全データの完全削除 (Account Deletion)' : '4. Account & Data Deletion Rights'}</span>
            </h2>
            <p>
              {isJa
                ? 'Apple App Store ガイドライン 5.1.1(v) および Google Play データセーフティ要件に基づき、Dailyba はユーザーがいつでも自らの意志で全データを完全消去できる権利を保障しています。'
                : 'In full accordance with Apple App Store Review Guideline 5.1.1(v) and Google Play Data Safety standards, Dailyba provides an unconditional mechanism to purge all your records:'}
            </p>
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-2">
              <p className="font-bold text-white">
                {isJa ? 'アプリ内からの即時消去手順:' : 'In-App Instant Deletion:'}
              </p>
              <p>
                {isJa
                  ? 'アプリ右上の「アカウント」アイコンをタップ ➔ 「Delete My Account & Cloud Data（アカウントとクラウドデータを完全削除）」をタップして確認すると、サーバー上の全データが即座に物理削除（CASCADE DELETE）され、復元不可能になります。'
                  : 'Tap your Profile icon at the top right of Dailyba ➔ tap "Delete My Account & Cloud Data" ➔ confirm deletion. All database records, user profiles, and active sessions are permanently expunged immediately without delay.'}
              </p>
              <p>
                {isJa
                  ? 'ローカルデータのみをご利用の場合は、バックアップ設定から「全データをクリア」を実行するか、端末からアプリをアンインストールすることで全てのローカルデータが消去されます。'
                  : 'For offline users, tap "Clear All Local Data" in the Backup & Restore menu, or uninstall the app to eliminate all local storage entries.'}
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="pt-8 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isJa ? '5. お問い合わせ窓口 (Contact Us)' : '5. Contact Information & Support'}</span>
            </h2>
            <p>
              {isJa
                ? 'プライバシーポリシー、データの取り扱い、または削除に関するご質問やご要望は、下記のお問い合わせ先までご連絡ください。'
                : 'For any privacy inquiries, data subject access requests, or regulatory queries, please reach out to our dedicated support team:'}
            </p>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5 font-mono">
              <p>
                <span className="text-slate-400">Application:</span> <span className="text-white">Dailyba (com.dailyba.app)</span>
              </p>
              <p>
                <span className="text-slate-400">Official URL:</span>{' '}
                <a href="https://dailyba.pdfumi.com" className="text-emerald-400 hover:underline">
                  https://dailyba.pdfumi.com
                </a>
              </p>
              <p>
                <span className="text-slate-400">Support Email:</span>{' '}
                <a href="mailto:support@dailyba.app" className="text-emerald-400 hover:underline">
                  support@dailyba.app
                </a>
                {' / '}
                <a href="mailto:support@pdfumi.com" className="text-emerald-400 hover:underline">
                  support@pdfumi.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 Dailyba. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <Link href="/terms" className="text-slate-400 hover:text-emerald-400 transition-colors">
              {isJa ? '利用規約' : 'Terms of Service'}
            </Link>
            <span>•</span>
            <Link href="/" className="text-slate-400 hover:text-emerald-400 transition-colors">
              {isJa ? 'アプリを開く' : 'Open Dailyba App'}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
