import { Language } from '@/types/finance';

export const APP_VERSION = '1.3.6';
export const APP_BUILD = '20261109';

export interface LocalizedChangelogItem {
  version: string;
  date: string;
  title: Record<Language, string>;
  highlights: Record<Language, string[]>;
}

export const APP_CHANGELOG: LocalizedChangelogItem[] = [
  {
    version: '1.3.6',
    date: '2026-11-09',
    title: {
      en: 'Comprehensive 100% Japanese Localization across all Modals & Boards',
      ja: '月間予算・各種モーダル・プリセット表示の完全日本語化対応',
    },
    highlights: {
      en: [
        'Monthly Budget & Spending Plan: translated modal header "Target for YYYY-MM", "Max overall spending", "Optional per-category limits", and "Presets:".',
        'Transaction Entry Modal: localized modal title "Record Transaction (YYYY-MM)" and subtitle "Today • Fast Entry" (今日 • クイック入力).',
        'Daily Spend & Savings Presets: translated quick amount labels "Presets:" (プリセット:) across daily spend and savings goal forms.',
        'Data Backup & Cloud Modals: fully localized Backup & Restore modal and Dailyba Cloud authentication dialogs into Japanese.',
      ],
      ja: [
        '月間予算・支出計画モーダル：「Target for YYYY-MM」を「YYYY-MM の支出目標」、「Max overall spending」を「月間の支出上限額」、「Optional per-category limits」を「カテゴリー別の配分（任意）」、「Presets:」を「プリセット:」に日本語化。',
        '取引記録モーダル：月次サマリーからの記録タイトル「取引を記録 (YYYY-MM)」、サブタイトル「今日 • クイック入力」、クリアボタンを日本語化。',
        '日次支出・貯金管理のプリセット：各目標設定フォームの「Presets:」を「プリセット:」に日本語化。',
        'バックアップ・クラウド同期モーダル：データ出力・復元モーダルおよびクラウドログイン・新規登録画面の各種ラベル・説明文を完全日本語対応。',
      ],
    },
  },
  {
    version: '1.3.5',
    date: '2026-11-08',
    title: {
      en: 'Complete Japanese Localization across Daily Spend & Investments',
      ja: '日次支出・資産管理の日本語翻訳の徹底と最適化',
    },
    highlights: {
      en: [
        'Daily Spend Action Buttons: localized "Add Spend" and "Set Target" on mobile screens to Japanese.',
        'Target Adherence & Metrics: translated "Target Adherence" (目標遵守状況), "Safe/Over" (目標内/超過), and "Month-to-Date Spend" (今月の累計支出).',
        'Chart Legend: localized "Within Target" (目標内) and "Exceeded" (目標超過).',
        'Net Worth Title: removed trailing English "(Net Worth)" to display clean "純資産総額".',
      ],
      ja: [
        '日次支出ボタンの日本語化：スマホ画面で「Add Spend」および「Set Target」と表示されていたボタンを「支出を記録」「目標を設定」に翻訳。',
        '目標遵守・集計指標の翻訳：「Target Adherence」を「目標遵守状況」、「Safe / Over」を「目標内 / 超過」、「Month-to-Date Spend」を「今月の累計支出」に日本語化。',
        '推移グラフの凡例：「Within Target / Exceeded」を「目標内 / 目標超過」に翻訳。',
        '純資産タイトルの整理：英語の「(Net Worth)」を省き、すっきりとした「純資産総額」に統一。',
      ],
    },
  },
  {
    version: '1.3.4',
    date: '2026-11-08',
    title: {
      en: 'Background Scroll Lock, Clean Auth Dialog & Mobile TopBar Responsiveness',
      ja: 'モーダル背景スクロール防止・ログイン画面クリーン化・スマホTopbar表示最適化',
    },
    highlights: {
      en: [
        'Removed VPS Server Info: eliminated technical server URL and configuration from the Auth modal for a clean end-user experience.',
        'Modal Background Scroll Lock: opening any modal now locks background page scrolling (prevents scroll bleed), adhering to mobile & web UX best practices.',
        'Mobile Topbar Responsiveness: resolved header overflow on narrow devices (iPhone SE/Android ~360-390px) where the theme toggle (Sun/Moon) was clipped.',
        'Guide Alignment: updated Quick Start Guide text to eliminate outdated floating button references.',
      ],
      ja: [
        'サーバー情報フッターの削除：ログイン画面下部のVPSサーバーURLおよび開発者向け設定を非表示にし、すっきりしたデザインに改善。',
        'モーダル展開時の背景スクロールロック：ダイアログ表示中に背面のページがスクロールしてしまう不具合を解消（UX標準仕様）。',
        'スマホTopBar表示の最適化：幅の狭いスマートフォン（iPhone SEや375-390px端末）でライト/ダークモード切替ボタンが画面外に見切れる問題を解消。',
        'ガイド文言の最新化：クイックスタートガイドの操作案内を現行UIに合わせて更新。',
      ],
    },
  },
  {
    version: '1.3.3',
    date: '2026-11-08',
    title: {
      en: 'Complete Japanese Localization, Chart Focus Outline Fix & Savings Goal Calculation',
      ja: '日本語翻訳の完全対応・グラフ黄枠の解消・貯金目標計算の適正化',
    },
    highlights: {
      en: [
        'Complete Japanese Localization: translated all remaining English texts across Savings, Investments, Daily Spend cards, and chart tooltips.',
        'Mobile Date Display: fixed date truncation in Daily Spend on mobile screens, displaying dates clearly with responsive "Today" badge.',
        'Removed Chart Yellow Border: eliminated distracting browser focus rings / yellow outlines on touch, maintaining clean interactive tooltips.',
        'Savings Target Calculation: Emergency Reserve Vault goal now correctly tracks Total Accumulated Savings (e.g. ¥100,000 saved from ¥800,000 target leaves ¥700,000 remaining).',
      ],
      ja: [
        '日本語翻訳の完全対応：貯金管理、資産管理、日次支出カード、およびグラフツールチップの英語表記を全て日本語化。',
        'スマホ日付表示の改善：日次支出履歴で日付（2026-11-08等）が途切れてしまう問題を解消し、「今日」バッジと合わせて綺麗に表示。',
        'グラフの黄枠線の解消：グラフや棒をタップした際に表示されていたブラウザ固有の黄色いフォーカス枠線を完全除去。',
        '生活防衛資金・貯蓄目標計算の適正化：目標額（¥800,000等）に対して累計積立額（¥100,000）を正しく反映し、残り目標（¥700,000）を正確に算出。',
      ],
    },
  },
  {
    version: '1.3.2',
    date: '2026-11-08',
    title: {
      en: 'Custom Payday Billing Cycle, Refined Budget UI & Wallet Icon Best Practice',
      ja: '給料日起算日設定・月間予算UI整理・貯金アイコン刷新',
    },
    highlights: {
      en: [
        'Custom Month Cycle (Payday Setting): set your billing or salary start day (1–31) so monthly tracking aligns with your income cycle (e.g. Day 20 to 19 of next month).',
        'Streamlined Monthly Budgeting: removed redundant buttons, displaying only a single clear CTA when no plan is set and "Edit Plan" when configured.',
        'Standard Wallet Icon: replaced safe vault with the recognized Wallet icon across navigation, cards, and modal dialogs.',
        'Clear Annual Performance Navigator: intuitive Year selector with contextual "Back to 2026" shortcut.',
        'Concise Action Labels: shortened "1-Click Confirm Pay" to "Mark as Paid" for monthly recurring bills.',
        'Modal Touch Optimization: tap anywhere outside any modal backdrop to dismiss seamlessly.',
        'Custom Date Range Filter: filter Daily Spend by any "From - To" custom date range.',
      ],
      ja: [
        '集計起算日（給料日）設定：1〜31日の任意の日付から1ヶ月の集計を開始可能（例：20日支給の場合、20日〜翌月19日で集計）。',
        '月間予算UIの最適化：未設定時の重複ボタンを排除し、設定後はシンプルな「計画を編集」ボタンに統一。',
        '貯金アイコンの刷新：金庫アイコンから業界標準のウォレット（財布）アイコンに変更。',
        '年間ナビゲーターのUX改善：「今年へ戻る」ボタンと分かりやすい年度切り替え。',
        '定期支払いの操作ボタン簡素化：「1クリック確認」から「支払済みにする」に表記短縮。',
        'モーダルの操作性向上：背景タップでどこでもスムーズに閉じられるよう改善。',
        '日次支出の期間指定フィルター：任意の日付（開始日〜終了日）で支出を絞り込み。',
      ],
    },
  },
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
