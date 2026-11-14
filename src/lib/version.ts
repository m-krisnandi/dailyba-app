import { Language } from '@/types/finance';

export const APP_VERSION = '1.0.0';
export const APP_BUILD = '20261114_1';

export interface LocalizedChangelogItem {
  version: string;
  date: string;
  title: Record<Language, string>;
  highlights: Record<Language, string[]>;
}

export const APP_CHANGELOG: LocalizedChangelogItem[] = [
  {
    version: '1.0.0',
    date: '2026-11-14',
    title: {
      en: 'Dailyba Official Release — Privacy-First Financial Balance & Wealth Vault',
      ja: 'Dailyba 公式リリース — 完全プライバシー重視の家計・資産管理ウォレット',
    },
    highlights: {
      en: [
        'Smart Quick Recording: Log everyday spending with instant natural language parsing (e.g. "lunch 35k ewallet") and quick amount chips.',
        'Custom Payday Cycles: Align your monthly budgets with your actual payday date rather than rigid calendar months.',
        'Dynamic Daily Spending Target: Stay mindful of your daily budget limit with live over-budget alerts and Android home widget.',
        'Internal Account Transfers: Seamlessly move funds between Bank, E-Wallet, and Cash without distorting monthly expense metrics.',
        'Fixed Commitments & Recurring Bills: Plan monthly subscription commitments with 1-tap payment confirmation and scheduled reminders.',
        'Multi-Currency Conversion: Live exchange rate engine supporting JPY, IDR, USD, and MMK with automated background sync.',
        '3-Format Statement Export: Download monthly financial statements in PDF (with executive KPIs), Excel (.xlsx with formulas), and CSV with native Android SAF file manager integration.',
        'Smart AI Receipt Scanner: Scan physical receipts directly with your camera using on-device optical character recognition.',
        'Automated Bank Email Sync: Connect notification emails to automatically extract banking transactions with cryptographic deduplication.',
        'Bank-Grade Security Vault: Protect your sensitive records with 6-digit PIN code and native Biometrics (Fingerprint, Touch ID, Face ID).',
        'Privacy-First Architecture: 100% offline-first local data storage with optional encrypted cloud backup and zero tracking.',
      ],
      ja: [
        'スマート即時入力：自然なテキスト（例:「ランチ 1200 現金」）やクイック金額ボタンで素早く家計簿を記録できます。',
        '給与日サイクル設定：カレンダー月だけでなく、個人の給与支払日に合わせた柔軟な月次予算管理が可能です。',
        '日次支出ターゲット管理：今日の残り予算枠をリアルタイム表示し、超過アラートやAndroidホームウィジェットで支出を抑制。',
        '口座間振替（資金移動）：銀行、電子マネー、現金間の送金を月次支出に混同させず、純資産を正確に維持。',
        '毎月の固定費・サブスク管理：家賃やサブスクの月間総負担額を一目で把握し、1タップで支払確定・期日通知。',
        'マルチ通貨リアルタイム換算：日本円(JPY)、インドネシアルピア(IDR)、米ドル(USD)、チャット(MMK)を自動換算。',
        '3形式ステートメント出力：PDFレポート、計算式付きExcel(.xlsx)、CSV形式で出力。Android標準ファイル管理に直接保存可能。',
        'スマートAIレシート読取：カメラで領収書・レシートを撮影するだけで金額や品目を即座にデータ化。',
        '銀行決済メール自動同期：銀行や決済サービスの通知メールから取引明細を重複なくセキュアに自動反映。',
        '銀行水準のセキュリティ：6桁PINコードおよび生体認証（指紋・顔認証・Touch ID）でアプリの起動を厳重に保護。',
        'プライバシー最優先設計：完全オフライン動作可能なローカル保存と、暗号化クラウドバックアップに対応。',
      ],
    },
  },
];
