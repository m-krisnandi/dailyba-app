import { Language } from '@/types/finance';

export const APP_VERSION = '1.3.1';
export const APP_BUILD = '20261108';

export interface LocalizedChangelogItem {
  version: string;
  date: string;
  title: Record<Language, string>;
  highlights: Record<Language, string[]>;
}

export const APP_CHANGELOG: LocalizedChangelogItem[] = [
  {
    version: '1.3.1',
    date: '2026-11-08',
    title: {
      en: 'Real-Market MMK Rate, Transaction Detail Viewer & Multilingual Changelog',
      ja: 'ミャンマーチャット実勢レート対応・取引詳細ビュー・多言語更新履歴',
    },
    highlights: {
      en: [
        'Real-world open market Myanmar Kyat (MMK) rate (~28 MMK / JPY) integrated with live street rate sync.',
        'Transaction Detail Viewer: click any transaction to inspect full notes, descriptions, exact timestamp, and category details.',
        'Multilingual Changelog: fully localized release notes in English and Japanese matching your app language.',
        'Mobile Action Buttons: responsive 2-column layout in Daily Spend with clean, non-redundant labels.',
      ],
      ja: [
        'ミャンマーチャット（MMK）の実勢市場為替レート（約28 MMK / JPY）に対応し、リアルタイム連動を開始。',
        '取引詳細ビューの追加：取引履歴をタップすることで、省略されていたメモや詳細情報をポップアップで全画面確認可能に。',
        '更新履歴（Changelog）の多言語化：アプリの表示言語（英語・日本語）に完全連動。',
        'モバイル操作ボタンの最適化：日次支出タブのボタンを2列グリッド化し、表記の重複をクリーンアップ。',
      ],
    },
  },
  {
    version: '1.3.0',
    date: '2026-11-08',
    title: {
      en: 'Universal 1-Tap Entry, Contextual Recording & Guided Onboarding',
      ja: 'ワンタップ即時記録（FAB）・コンテキスト記帳・初心者ガイド',
    },
    highlights: {
      en: [
        'Universal Floating Action Button (FAB "+"): record transactions instantly with 1 tap from any tab.',
        'In-context "+ Record Spend" button directly inside Daily Spend tab to log expenses without switching tabs.',
        'In-context "+ Record Transaction" button inside Monthly tab for seamless budget planning and tracking.',
        'Interactive 3-step Quick Start Onboarding Guide for new users with zero transactions.',
        'Smart APK download button in website topbar (automatically hidden inside native APK/iOS app).',
        'Renamed navigation tab to "Transactions" for clearer information architecture.',
      ],
      ja: [
        '全画面共通のフローティングアクションボタン（FAB "+"）：どのタブからでも1タップで素早く記帳可能。',
        '「日次支出」タブ内に直接「支出を記録」ボタンを配置し、タブ移動なしで今日の支出を登録可能に。',
        '「月次サマリー」タブ内にも直接「取引を記録」ボタンを追加。',
        '初回利用時の3ステップクイックスタートガイドを新設。',
        'Web版ヘッダーにAPKダウンロードボタンを追加（アプリ内では自動非表示）。',
        'タブ名称を「取引・記帳」に改変し、より直感的なナビゲーションに改善。',
      ],
    },
  },
  {
    version: '1.2.0',
    date: '2026-11-07',
    title: {
      en: 'Monthly Budgeting, Edit Transactions & Performance Optimization',
      ja: '月間予算計画・取引編集機能・パフォーマンス最適化',
    },
    highlights: {
      en: [
        'Monthly Budget & Spending Plan: track overall budget limit and category-by-category allocations.',
        'Complete Edit Transaction capability (not just delete) across Quick Entry, Daily Spend, and Savings.',
        'Compact 1-row Month Picker with 12-month Quick-Jump and year stepper.',
        'Zero-drift currency precision preserving exact target numbers in IDR and JPY.',
        'Instant Dark/Light mode theme switching optimized for Xiaomi MIUI and modern devices.',
        'Ultra-light APK bundle size (~5.9 MB) with recursive cache cleanup.',
      ],
      ja: [
        '月間予算計画（Monthly Budget Plan）機能：総予算およびカテゴリ別配分目標の管理。',
        '取引の編集機能（削除だけでなく内容修正に対応）。',
        '省スペースな1行月選択ナビゲーションと12ヶ月クイックジャンプ。',
        '通貨換算における端数ズレを解消し、設定目標の数値を正確に保持。',
        'Xiaomi/MIUI等の端末でも滑らかに切り替わるダーク/ライトモードの描画最適化。',
        'APK容量を約5.9MBに大幅軽量化。',
      ],
    },
  },
  {
    version: '1.1.0',
    date: '2026-11-06',
    title: {
      en: 'Cloud Vault Sync & Authentication',
      ja: 'クラウド同期・アカウント認証・複数通貨対応',
    },
    highlights: {
      en: [
        'Automatic multi-device synchronization via Dailyba Cloud Vault.',
        'Thumb-friendly mobile 2-row tab layout.',
        'Multi-currency support for JPY, IDR, USD, and MMK with live rate updates.',
      ],
      ja: [
        'Dailyba Cloud Vault による複数デバイス間の自動クラウド同期。',
        '親指操作に配慮したモバイル向けタブレイアウト。',
        '日本円(JPY)、ルピア(IDR)、米ドル(USD)、チャット(MMK)のマルチ通貨対応。',
      ],
    },
  },
  {
    version: '1.0.0',
    date: '2026-11-05',
    title: {
      en: 'Dailyba Initial Release',
      ja: 'Dailyba 初期リリース',
    },
    highlights: {
      en: [
        'Smart quick entry with instant text parsing.',
        'Daily, monthly, and annual financial overview with modern glass cards.',
        'Investment portfolio and total net worth tracker.',
      ],
      ja: [
        'スマート即時入力機能によるストレスフリーな家計簿記録。',
        '日次・月次・年次の収支グラフとモダンなガラスモーフィズムUI。',
        '資産運用ポートフォリオおよび純資産（Net Worth）の可視化。',
      ],
    },
  },
];
