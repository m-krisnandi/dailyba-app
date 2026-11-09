import { Language } from '@/types/finance';

export const APP_VERSION = '1.5.0';
export const APP_BUILD = '20261110';

export interface LocalizedChangelogItem {
  version: string;
  date: string;
  title: Record<Language, string>;
  highlights: Record<Language, string[]>;
}

export const APP_CHANGELOG: LocalizedChangelogItem[] = [
  {
    version: '1.5.0',
    date: '2026-11-10',
    title: {
      en: 'AI Receipt & Invoice Scanner with Gemini, Permanent Account Deletion, & Store Compliance',
      ja: 'Gemini AI レシート・請求書自動スキャン機能、アカウント完全削除、ストア公開基準対応',
    },
    highlights: {
      en: [
        'AI Receipt & Invoice Scanner: Take photos or upload bills/receipts. Powered by Gemini Multimodal Vision, automatically parsing total amount, payment source (QRIS/Bank/Cash/Card), date, merchant, and expense categories.',
        'Permanent Account & Data Deletion: Complete GDPR, Apple App Store Guideline 5.1.1(v), and Google Play Data Safety compliance. Irreversibly delete account and cloud vault with one tap.',
        'Store Compliance & Privacy Policy: In-app Privacy Policy & Terms of Service modal, plus camera & photo library permissions configured for iOS & Android.',
      ],
      ja: [
        'Gemini AI レシート・請求書スキャナー：カメラ撮影または画像アップロードにより、合計金額・支払方法（QRIS/銀行/現金/クレカ）・日付・店舗名・費目を全自動抽出＆入力補助。',
        'アカウントおよびクラウドデータの完全削除：Apple App Store ガイドライン 5.1.1(v) および Google Play データセーフティ基準に完全準拠し、サーバー上の個人データと同期バックアップを永久破棄可能に。',
        'プライバシーポリシー・利用規約モーダル：アプリ内に専用の法的規約画面を完備し、カメラ・写真ライブラリの利用目的を明記。',
      ],
    },
  },
  {
    version: '1.4.8',
    date: '2026-11-10',
    title: {
      en: 'Local Device Timezone Sync, Smart Entry Brevity, & Credit Card Funding Restrictions',
      ja: '端末タイムゾーン同期・スマート入力の簡素化・クレカ支払元の適正化',
    },
    highlights: {
      en: [
        'Local Timezone Synchronization: All dates and today indicators now dynamically align with the user device local clock (e.g. Asia/Jakarta, Tokyo, London) instead of lagging in UTC.',
        'Credit Card Filtering: Credit card option is now strictly available only for Expenses. It is cleanly excluded from Income and Savings destination accounts.',
        'Streamlined Smart Quick Entry: Simplified placeholder and helper hint into a concise, compact single line format.',
      ],
      ja: [
        '端末タイムゾーン完全同期：UTC起因で深夜〜未明に日付が前日になっていた問題を解消。端末のローカル時計（東京・ジャカルタ等）に合わせて「今日」を正確に判定。',
        'クレジットカード選択の適正化：クレカ支払元を「支出」のみに限定。収入や貯金振替の預入先からは非表示に整理。',
        'スマート入力の説明を簡潔化：入力欄のヒントとプレースホルダーをスマートでコンパクトな1行表記へリファイン。',
      ],
    },
  },
  {
    version: '1.4.7',
    date: '2026-11-09',
    title: {
      en: 'Fix Investment Tab Crash caused by function initialization',
      ja: '投資タブ切り替え時のクラッシュ不具合を修正',
    },
    highlights: {
      en: [
        'Resolved critical runtime ReferenceError when clicking the Investment Board tab by correctly hoisting category icon helpers.',
      ],
      ja: [
        '投資・純資産タブをクリックした際に発生していた初期化エラー（クラッシュ）を修正し、スムーズに表示できるように改善。',
      ],
    },
  },
  {
    version: '1.4.6',
    date: '2026-11-09',
    title: {
      en: 'Vibrant Color Badges for Asset Classes & Portfolio Holdings in Investment Board',
      ja: '投資資産クラスおよび保有資産カードのカラーバッジ完全対応',
    },
    highlights: {
      en: [
        'Asset Class Dropdown Badges: eliminated grey icons in Add/Edit Asset modal dropdown (Mutual Funds: Cyan, Stocks: Blue, Crypto: Violet, Gold: Warm Amber, Deposits: Emerald).',
        'Holdings Cards Branding: individual investment asset cards and category pills now display their vibrant themed glass badge instead of generic green/grey.',
      ],
      ja: [
        '資産クラス選択のカラー化：投資資産の追加・編集モーダルの「資産クラス」ドロップダウンに残っていたグレーアイコンを完全刷新（投資信託: シアン、個別株: ブルー、暗号資産: バイオレット、金: アンバー、定期預金: エメラルド）。',
        '保有資産カードのビジュアル刷新：各保有資産カードおよびカテゴリーバッジに固有のテーマカラーを適用し、ポートフォリオの視認性を向上。',
      ],
    },
  },
  {
    version: '1.4.5',
    date: '2026-11-09',
    title: {
      en: 'Vibrant Funding Source & Category Color Badges Across Dropdowns & Selectors',
      ja: '支出元・口座およびカテゴリーアイコンのドロップダウン・選択ボタン完全カラー化',
    },
    highlights: {
      en: [
        'Vibrant Funding Source Badges: introduced color-coded badges for payment methods (Bank: Sky Blue, Cash: Mint Green, Credit Card: Indigo Purple, E-Wallet: Warm Amber).',
        'Applied to All Selectors & Dropdowns: active across Quick Entry buttons, Transaction Feed filter dropdowns, Add/Edit Transaction dialogs, and Recurring Bills dropdowns.',
        'Enhanced Transaction Details: payment source row in Transaction Detail modal now renders with its corresponding colored badge matching the category row.',
      ],
      ja: [
        '支出元・口座のカラーバッジ化：決済手段（銀行振込: スカイブルー、現金: ミントグリーン、クレジットカード: インディゴパープル、電子マネー: ウォームアンバー）に専用カラーを導入。',
        '全選択ボタン・ドロップダウンへの反映：記帳画面の支出元ボタン、取引履歴フィルター、取引追加・編集モーダル、固定費設定ドロップダウンに一括適用。',
        '取引詳細ビューの調和：取引明細ポップアップ内の支出元行にもカラーバッジをあしらい、カテゴリー行と美しく整列。',
      ],
    },
  },
  {
    version: '1.4.4',
    date: '2026-11-09',
    title: {
      en: 'Universal Vibrant Category Colors across Pickers, Modals & Dropdowns',
      ja: 'カテゴリー選択・モーダル・ドロップダウンへのカラーバッジ全面適用',
    },
    highlights: {
      en: [
        'Vibrant Category Pickers: eliminated grey category icons on Quick Entry and Income selection grids, wrapping every option in its distinctive glowing liquid glass badge.',
        'Colorful Custom Dropdowns: category dropdown options across Add/Edit Transaction modals and Recurring Bills now render each icon with its matching vibrant theme color.',
        'Category Management & Progress Boards: category badges in Manage Categories modal, Monthly Budget progress bars, and Yearly Summaries now share unified colorful branding.',
      ],
      ja: [
        'カテゴリー選択グリッドのカラー化：記帳画面のカテゴリー選択ボタンに残っていた無機質なグレーアイコンを廃止し、各カテゴリー固有のリキッドグラス・カラーバッジを適用。',
        'ドロップダウン内のアイコン発色：取引追加・編集モーダルや固定費設定のカテゴリー選択リストでも、各項目が鮮やかなテーマカラーで表示。',
        '管理画面・月次年次推移との統一：カテゴリー管理モーダル、月次予算のカテゴリー別進捗バー、年間カテゴリーランキングの全アイコンを完全カラー統一。',
      ],
    },
  },
  {
    version: '1.4.3',
    date: '2026-11-09',
    title: {
      en: 'Smart Advance Payment Detection & Flexible Due Windows for Recurring Bills',
      ja: '固定費の前払い自動検知および支払期日レンジ指定の対応',
    },
    highlights: {
      en: [
        'Smart Advance Payment Detection: transactions recorded in the tail of the preceding month (e.g. rent paid on Oct 23 for Nov) are automatically recognized by the current month recurring bill, displaying "Paid in Advance (10/23)" without duplicate entries.',
        'Flexible Due Windows (e.g. Days 1–10): recurring bills now support range deadlines (e.g. from day 1 to 10) instead of rigid single-day dates.',
        'Protected Unmark: unmarking an advance or linked payment now triggers the sleek confirmation modal to safeguard historical records.',
      ],
      ja: [
        '前払い（翌月分）の自動検知：前月末（20日以降等、例: 10月23日振込）に記録された支出を翌月の固定費が自動認識し、二重計上なしで「前払い済 (10/23)」として自動チェック。',
        '柔軟な支払期日レンジ（例: 毎月1日〜10日）：固定費の期日指定で「1日〜10日」のような支払期間（締切日）の設定に対応。',
        '支払済解除の保護：前払い・確定済み固定費のチェックを解除する際、確認モーダルを表示して誤削除を防止。',
      ],
    },
  },
  {
    version: '1.4.2',
    date: '2026-11-09',
    title: {
      en: 'Category-Based Vibrant Color Palette for Transaction Icons',
      ja: 'カテゴリー別カラーパレットの導入による視認性とデザイン性の向上',
    },
    highlights: {
      en: [
        'Category-Based Icon Colors: replaced uniform red expense icons with an expressive, category-specific soft liquid glass palette (Food: Amber, Shopping: Purple, Housing/Rent: Sky Blue, Mobile: Blue, Transit: Teal, etc.).',
        'Enhanced Visual Hierarchy: immediate distinction between categories during fast scrolling while keeping expense amounts clearly marked in red.',
        'Synchronized across History & Boards: applied consistently to Recent Transactions feed, Daily Spend lists, Recurring Bills, and Transaction Detail modal.',
      ],
      ja: [
        'カテゴリー別カラーの適用：全支出が画一的な赤色アイコンになっていた仕様を刷新し、カテゴリーごとに固有の美しいソフトリキッドグラスカラー（食費: アンバー、買い物: パープル、住居/寮費: スカイブルー、通信費: ブルー、交通費: ティール等）を割り当て。',
        '直感的な視認性の向上：高速スクロール時でも何の出費かが一目で判別可能になり、支出額のマイナス赤文字と調和した洗練されたUIを実現。',
        '全画面での調和：取引履歴リスト、日次支出リスト、毎月の固定費カード、取引詳細モーダルに一括適用。',
      ],
    },
  },
  {
    version: '1.4.1',
    date: '2026-11-09',
    title: {
      en: 'Sleek Liquid Glass Confirmation Modal Before Deleting Items & Data Reset',
      ja: '削除前の洗練された確認モーダル（アラート）の追加と誤削除防止',
    },
    highlights: {
      en: [
        'Sleek Liquid Glass Delete Modal: replaced instant deletions and native browser alerts with a polished custom confirmation dialog featuring glowing danger badges, item details preview, and smooth animations.',
        'Comprehensive Deletion Safeguards: prevents accidental removal of transactions, daily expenses, savings transfers, investment assets, and recurring bills.',
        'Data Backup Reset Protection: fully styled confirmation dialog before wiping database / factory reset with clear warning guidance.',
        'Multilingual & Accessible: localized titles, item summaries, and action prompts in Japanese and English.',
      ],
      ja: [
        '洗練された削除確認モーダル：即時削除やブラウザ標準の無機質なアラートを廃止し、発光する危険バッジ、品名・金額の確認プレビュー、滑らかなアニメーションを備えた専用モーダルを導入。',
        '誤削除の徹底防止：日次支出、取引履歴、貯金振替、投資資産、毎月の固定費の削除時に必ずワンステップ確認を挟み、大切なデータの誤操作を防止。',
        'データ全消去（初期化）の保護：バックアップ画面の「すべてのデータを初期化」にも専用の警告確認モーダルを適用。',
        '日本語・英語の完全ローカライズ：選択中の言語に応じたタイトル、警告文、ボタンテキスト（「削除する」「キャンセル」）の最適表示。',
      ],
    },
  },
  {
    version: '1.4.0',
    date: '2026-11-09',
    title: {
      en: 'Unified Custom Liquid Glass Calendar across All Dialogs & Japanese Dates',
      ja: '全モーダルのカレンダーUI統一と日本語日付ピッカーの全面適用',
    },
    highlights: {
      en: [
        'Unified Custom DatePicker: replaced native browser/OS date inputs across Add/Edit Transaction modals and Daily Spend custom range filters with the beautiful custom liquid-glass calendar.',
        '100% Japanese Calendar: displays Japanese month/year headers (e.g. 2026年 11月), Japanese weekday initials (日・月・火・水・木・金・土), and localized today/yesterday buttons.',
        'Smart Viewport Collision Detection: calendar automatically checks available screen space and opens downwards or upwards dynamically, ensuring it never collides with or hides behind the topbar when scrolled.',
        'Consistent Mobile & Web UX: seamless dark liquid glass aesthetics matching Android, iOS, and Web layouts identically.',
      ],
      ja: [
        'カスタムカレンダーの統一：取引記録モーダル、取引編集モーダル、日次支出の期間指定フィルターに残っていたOS標準の日付入力を廃止し、洗練されたリキッドグラス・カレンダーに完全統一。',
        '完全日本語カレンダー：「2026年 11月」のヘッダー表示、曜日表記（日・月・火・水・木・金・土）、「今日」「昨日」「今日を選択」ショートカットボタンの日本語対応。',
        '動的コリジョン検知（自動上下開閉）：画面のスクロール位置と余白を自動計測し、上に開いてTopBarやメニューに被らないよう、空いている方向（下または上）へ柔軟に展開。',
        'Web・APK・iOSの一貫性：全プラットフォームで一貫したモダンなデザインと操作性を実現。',
      ],
    },
  },
  {
    version: '1.3.9',
    date: '2026-11-09',
    title: {
      en: 'Fixed React Error #310 in Transaction Modals & Japanese Localization for "left" / "over"',
      ja: '取引記録モーダルのReactエラー#310解消および「left/over」の完全日本語化',
    },
    highlights: {
      en: [
        'Fixed React Error #310 (Hook Order): resolved conditional useMemo call inside Add & Edit Transaction modals, eliminating page crash when opening transaction dialogs from Daily Spend or Monthly tabs.',
        'Localized "left" Status in Daily Spend: translated residual "(Rp 50,000 left)" into Japanese "(残り Rp 50,000)".',
        'Localized Monthly Category Limits: translated "over", "left", and "target:" in category budget progress bars.',
      ],
      ja: [
        'Reactエラー#310の解消：取引追加・編集モーダル内でフック（useMemo）の実行順序が条件分岐によって崩れていた不具合を修正し、「取引を記録」タップ時のクラッシュを完全解決。',
        '日次支出「left」の日本語化：目標内バッジの「(Rp 50.000 left)」を「(残り Rp 50.000)」に翻訳。',
        '月次カテゴリ別進捗の翻訳：「over」「left」「target:」をそれぞれ「超過」「残り」「目標: 」に日本語化。',
      ],
    },
  },
  {
    version: '1.3.8',
    date: '2026-11-09',
    title: {
      en: '100% Pure Japanese Localization & Elimination of Residual English Hints',
      ja: 'Enter表記の「決定」統一およびUI通知・プレースホルダーの完全日本語化',
    },
    highlights: {
      en: [
        'Smart Entry Key Terminology: replaced raw English "Enter" with Japanese "決定キーで保存" and "決定..." in quick entry hints.',
        'Notification Toasts: fully localized transaction, fixed recurring bill, and savings notification banners into Japanese.',
        'Localized Input Placeholders: translated asset name examples (Toyota, eMAXIS Slim, Bitcoin) and budget placeholders.',
        'Auth & Verification Prompts: localized OTP verification code sent and password reset feedback messages.',
      ],
      ja: [
        'スマート入力キーの日本語統一：「Enterキーで保存」「Enter...」を日本語標準の「決定キーで保存」「決定...」に全面統一。',
        'ステータス通知メッセージの完全日本語化：記帳完了、毎月の固定費登録・支払・削除、貯蓄目標更新時のトースト通知を日本語化。',
        '入力プレースホルダーの最適化：資産追加時の銘柄例（トヨタ自動車、eMAXIS Slim 全世界株式、ビットコイン等）や予算入力例を日本語環境向けに整備。',
        '認証・パスワード再設定通知：認証コード発行および送信メッセージを日本語化。',
      ],
    },
  },
  {
    version: '1.3.7',
    date: '2026-11-09',
    title: {
      en: 'Sleek Liquid Glass Custom Dropdowns across all Modals & Filters',
      ja: 'ネイティブセレクトの廃止とリキッドグラス・カスタムドロップダウンの刷新',
    },
    highlights: {
      en: [
        'Custom Liquid Glass Dropdowns: replaced all generic browser OS <select> popovers with custom designed liquid-glass dropdown components.',
        'Rich Visual Icons: each category, payment source, and asset class dropdown item now renders with its corresponding colorful icon.',
        'Smooth Animations & Micro-interactions: added rotating chevron indicators, subtle glass blur, active checkmarks, and click-outside dismissal.',
        'Seamless Modal Integration: custom dropdowns seamlessly fit into Add/Edit Transaction modals, Recurring Bills dialog, Asset Portfolio, and Transaction History filters.',
      ],
      ja: [
        'リキッドグラス・カスタムドロップダウン：ブラウザ標準の無機質なOSネイティブ <select> を全廃し、アプリのデザインに調和する洗練されたガラス調ドロップダウンを新設。',
        'カテゴリー・口座アイコンの表示：各選択肢（食費、交通費、銀行振込、暗号資産など）に専用アイコンをあしらい、視認性と操作性を大幅に向上。',
        'スムーズな開閉アニメーション：180度回転する矢印、チェックマーク、ホバーハイライト、外側クリック時の自動クローズに対応。',
        '全モーダルへの一括適用：取引記録・編集モーダル、毎月の固定費設定、資産追加・編集、取引履歴フィルターのすべてで美しいドロップダウンUIを統一。',
      ],
    },
  },
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
