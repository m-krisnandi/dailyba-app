'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, AlertCircle, ShieldCheck, Scale, CheckCircle2 } from 'lucide-react';

export default function TermsOfServicePage() {
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
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
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
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
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
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            <span>{isJa ? '公式利用規約' : 'Official Terms of Service'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isJa ? 'Dailyba 利用規約' : 'Dailyba Terms of Service'}
          </h1>
          <p className="text-sm text-slate-400">
            {isJa
              ? '最終改訂日: 2026年11月10日 • Google Play Store & Apple App Store 準拠'
              : 'Last Updated: November 10, 2026 • Compliant with App Store & Google Play Policies'}
          </p>
        </div>

        {/* Highlight Alert */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-white text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{isJa ? '金融免責事項 (Financial Disclaimer)' : 'Important Financial Disclaimer'}</span>
          </div>
          <p className="leading-relaxed">
            {isJa
              ? 'Dailyba は個人の家計記録および自己管理を支援するためのツールであり、公認の投資助言、税務相談、または銀行業務を提供するものではありません。投資判断および財務判断はすべて利用者ご自身の責任において行ってください。'
              : 'Dailyba is an informational budgeting and net worth recordkeeping tool. It does not provide certified financial advisory, brokerage, lending, or tax accounting services. All investment evaluations and spending decisions are made at your own discretion.'}
          </p>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed divide-y divide-slate-800/60">
          {/* Section 1 */}
          <div className="pt-8 first:pt-0 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{isJa ? '1. 規約への同意' : '1. Agreement to Terms'}</span>
            </h2>
            <p>
              {isJa
                ? 'Dailyba（以下「当アプリ」）をダウンロード、インストール、またはご利用いただくことにより、利用者は本利用規約およびプライバシーポリシーに同意したものとみなされます。これらに同意いただけない場合は、アプリのご利用をお控えください。'
                : 'By downloading, accessing, or using Dailyba, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to all terms, please discontinue use of the application.'}
            </p>
          </div>

          {/* Section 2 */}
          <div className="pt-8 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{isJa ? '2. アカウントとセキュリティ' : '2. User Accounts & Security'}</span>
            </h2>
            <p>
              {isJa
                ? 'クラウド同期を利用するためにアカウントを作成する場合、正確な情報を提供し、ご自身のアカウント認証情報を適切に管理する責任を負うものとします。不正アクセスの疑いがある場合は速やかにサポート窓口へご連絡ください。'
                : 'When creating an optional account for Cloud Sync, you agree to maintain the security of your credentials and accept responsibility for activities under your account.'}
            </p>
          </div>

          {/* Section 3 */}
          <div className="pt-8 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Scale className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{isJa ? '3. 禁止行為' : '3. Prohibited Activities'}</span>
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>
                {isJa
                  ? '当アプリのソースコード、API、インフラに対するリバースエンジニアリングや過度な負荷をかける行為。'
                  : 'Attempting to reverse engineer, disrupt, or place unreasonable load on our application API and infrastructure.'}
              </li>
              <li>
                {isJa
                  ? '違法な目的、詐欺的行為、または第三者の権利を侵害する目的で当アプリを利用すること。'
                  : 'Using the application for fraudulent, deceptive, or unlawful financial activities.'}
              </li>
              <li>
                {isJa
                  ? '他の利用者のアカウントやクラウドデータを不正に取得または改ざんしようとする行為。'
                  : 'Interfering with other users’ data access or attempting unauthorized authentication.'}
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="pt-8 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{isJa ? '4. 知的財産権' : '4. Intellectual Property'}</span>
            </h2>
            <p>
              {isJa
                ? 'Dailyba のロゴ、UIデザイン、商標、テキスト、およびソフトウェアコードは Dailyba 開発者に帰属します。私的使用の範囲を超えてこれらを無断複製・転用することは禁止されています。'
                : 'All trademarks, software designs, user interface layouts, logos, and proprietary features in Dailyba remain the exclusive property of Dailyba and its licensors.'}
            </p>
          </div>

          {/* Section 5 */}
          <div className="pt-8 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{isJa ? '5. 規約の変更とお問い合わせ' : '5. Amendments & Inquiries'}</span>
            </h2>
            <p>
              {isJa
                ? '当社は法令の変更やサービス内容の更新に伴い、本利用規約を改定する場合があります。改定後の規約は本ウェブサイトに掲載された時点で効力を生じるものとします。'
                : 'We reserve the right to modify these terms as needed to reflect platform evolutions or regulatory requirements. Updates become effective immediately upon publication on this page.'}
            </p>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1 font-mono">
              <p>
                <span className="text-slate-400">Developer Support:</span>{' '}
                <a href="mailto:support@dailyba.app" className="text-blue-400 hover:underline">
                  support@dailyba.app
                </a>
                {' / '}
                <a href="mailto:support@pdfumi.com" className="text-blue-400 hover:underline">
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
            <Link href="/privacy" className="text-slate-400 hover:text-blue-400 transition-colors">
              {isJa ? 'プライバシーポリシー' : 'Privacy Policy'}
            </Link>
            <span>•</span>
            <Link href="/" className="text-slate-400 hover:text-blue-400 transition-colors">
              {isJa ? 'アプリを開く' : 'Open Dailyba App'}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
