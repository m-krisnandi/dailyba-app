import { ExpenseCategory, FundingSource, IncomeCategory, TransactionType } from '@/types/finance';

export interface ParsedSmartInput {
  amount: number;
  category: ExpenseCategory | IncomeCategory | 'savings' | 'transfer' | 'carryover' | string;
  type: TransactionType;
  source?: FundingSource;
  destinationSource?: FundingSource;
  note: string;
}

/**
 * Normalizes fullwidth Japanese characters and spaces
 */
function normalizeInputString(str: string): string {
  return str
    // Convert fullwidth Japanese spaces (\u3000) to standard spaces
    .replace(/\u3000/g, ' ')
    // Convert fullwidth numbers (０-９) to halfwidth (0-9)
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    // Convert fullwidth symbols （） to ()
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .trim();
}

/**
 * Extracts a numeric amount from tokens, supporting:
 * - Standard numbers: "1000", "1500.5"
 * - Japanese units: "1.5万" -> 15000, "6万" -> 60000, "500円" -> 500, "¥1500" -> 1500
 * - Indonesian / Global units: "25k" / "50rb" -> 25000 / 50000, "1.5m" / "2jt" -> 1500000 / 2000000
 */
function extractAmount(text: string): { amount: number; remainingText: string } | null {
  // 1. Separate currency symbols / yen / man concatenated to words
  let normalized = text
    .replace(/([¥￥Rp$€£])\s*([0-9.,]+)/gi, '$2')
    .replace(/([0-9.,]+)\s*円/gi, '$1')
    .replace(/([0-9]+(?:\.[0-9]+)?)\s*万/gi, '$1man');

  // Separate boundary between letters/cjk and digits (e.g. "電車500" -> "電車 500", "セブン850" -> "セブン 850")
  normalized = normalized
    .replace(/([^\d\s.,kKrbRBmMjtJT万a-zA-Z]+)(\d)/g, '$1 $2')
    .replace(/(\d)([^\d\s.,kKrbRBmMjtJTmanMAN]+)/g, '$1 $2');

  const tokens = normalized.split(/\s+/).filter(Boolean);
  let detectedAmount = 0;
  const remainingTokens: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // Match numbers with units: e.g. "1.5man", "25k", "50rb", "1.5m", "2jt", or raw numbers "1000", "10,000"
    const matchUnit = lower.match(/^([0-9]+(?:[.,][0-9]+)?)(man|k|rb|m|jt)?$/);
    if (matchUnit && detectedAmount === 0) {
      let num = parseFloat(matchUnit[1].replace(/,/g, ''));
      const unit = matchUnit[2];

      if (unit === 'man') {
        num = Math.round(num * 10000);
      } else if (unit === 'k' || unit === 'rb') {
        num = Math.round(num * 1000);
      } else if (unit === 'm' || unit === 'jt') {
        num = Math.round(num * 1000000);
      }

      if (num > 0) {
        detectedAmount = num;
        continue;
      }
    }

    remainingTokens.push(token);
  }

  if (detectedAmount <= 0) return null;

  return {
    amount: detectedAmount,
    remainingText: remainingTokens.join(' ').trim(),
  };
}

/**
 * Intelligent Multilingual Natural Language Financial Parser
 * Supports English, Japanese (Kanji/Kana/Romaji), and Indonesian inputs.
 *
 * Examples:
 * - "電車 500 suica" -> train 500 via ewallet
 * - "セブン 850 現金" -> food_drinks 850 via cash
 * - "ファミマ 450" -> food_drinks 450
 * - "1.5万 家賃 bank" -> rent 15000 via bank
 * - "lunch 35k gopay" -> food_drinks 35000 via ewallet
 * - "train 2500" -> train 2500
 * - "gaji 5m" -> salary income 5000000
 */
export function parseSmartText(raw: string, defaultSource: FundingSource = 'cash'): ParsedSmartInput | null {
  const clean = normalizeInputString(raw);
  if (!clean) return null;

  const extracted = extractAmount(clean);
  if (!extracted || extracted.amount <= 0) return null;

  const { amount, remainingText } = extracted;

  // 1. Detect Funding Source
  let source: FundingSource = defaultSource;
  if (/\b(cc|credit|kredit|kartu kredit|creditcard|visa|mastercard|jcb|amex)\b|クレジット|クレカ/i.test(remainingText)) {
    source = 'credit_card';
  } else if (/\b(bank|bca|mandiri|bni|bri|cimb|jago|jenius|atm|transfer|debit|wire)\b|銀行|振込|引き落とし/i.test(remainingText)) {
    source = 'bank';
  } else if (/\b(ic|suica|pasmo|icoca|wallet|ewallet|e-wallet|ovo|gopay|dana|shopeepay|qris|paypay)\b|ペイペイ|スイカ|パスモ|イコカ|電子マネー|コード決済/i.test(remainingText)) {
    source = 'ewallet';
  } else if (/\b(cash|tunai|genkin)\b|現金|キャッシュ/i.test(remainingText)) {
    source = 'cash';
  }

  // Remove source-specific indicator words from the cleaned note
  const cleanNote = remainingText
    .replace(/\b(bank|bca|mandiri|bni|bri|cimb|jago|jenius|atm|transfer|debit|wire|ic|suica|pasmo|icoca|wallet|ewallet|e-wallet|ovo|gopay|dana|shopeepay|qris|paypay|cc|credit|kredit|kartu kredit|creditcard|visa|mastercard|jcb|amex|cash|tunai|genkin)\b/gi, '')
    .replace(/(クレジット|クレカ|銀行|振込|引き落とし|ペイペイ|スイカ|パスモ|イコカ|電子マネー|コード決済|現金|キャッシュ)/g, '')
    .trim();

  const noteToAnalyze = (cleanNote || remainingText).toLowerCase();

  // 2. Detect Transaction Type & Category
  // Transfer
  if (/\b(transfer|topup|top\s*up|pindah|antar rekening)\b|振替|チャージ|入金/i.test(noteToAnalyze)) {
    return {
      type: 'transfer',
      category: 'transfer',
      amount,
      source,
      destinationSource: source === 'bank' ? 'ewallet' : 'bank',
      note: cleanNote || 'Internal Transfer',
    };
  }

  // Savings
  if (/\b(nabung|save|saving|savings|tabungan|chokin)\b|貯金|積立|貯蓄|生活防衛/i.test(noteToAnalyze)) {
    return {
      type: 'savings',
      category: 'savings',
      amount,
      source,
      note: cleanNote || 'Savings',
    };
  }

  // Salary Income
  if (/\b(gaji|salary|kyuuryou|payroll|income)\b|給料|給与|ボーナス|賞与|手当|本業/i.test(noteToAnalyze)) {
    return {
      type: 'income',
      category: 'salary',
      amount,
      source: source === 'cash' ? 'bank' : source,
      note: cleanNote || 'Salary',
    };
  }

  // Freelance / Side-gig Income
  if (/\b(freelance|side-gig|fukugyou|project|client|bonus)\b|副業|報酬|売上|バイト|アルバイト/i.test(noteToAnalyze)) {
    return {
      type: 'income',
      category: 'freelance',
      amount,
      source: source === 'cash' ? 'bank' : source,
      note: cleanNote || 'Freelance',
    };
  }

  // Carryover
  if (/\b(sisa|leftover|carryover|rollover|saldo lalu|kurikoshi)\b|繰越|繰り越し|前月繰越/i.test(noteToAnalyze)) {
    return {
      type: 'income',
      category: 'carryover',
      amount,
      source,
      note: cleanNote || 'Carryover',
    };
  }

  // 3. Expense Categories
  // Train & Transit
  if (/\b(train|kereta|densha|subway|metro|station|stasiun|jr|bus|transit|commuter)\b|電車|でんしゃ|メトロ|地下鉄|駅|切符|きっぷ|新幹線|定期|定期券|乗車券|交通費|suica|pasmo|icoca/i.test(noteToAnalyze)) {
    return {
      type: 'expense',
      category: 'train',
      amount,
      source: (source === 'cash' && /\b(suica|pasmo|icoca|メトロ|電車|jr)\b/i.test(remainingText)) ? 'ewallet' : source,
      note: cleanNote || remainingText,
    };
  }

  // Food & Drinks & Konbini
  if (/\b(makan|minum|food|drink|gohan|tabemono|bento|lunch|dinner|breakfast|cafe|kopi|coffee|tea|supermarket|konbini|groceries|eat|meal|ramen|rice|bread|snack|sushi)\b|ご飯|ごはん|ランチ|ディナー|朝食|弁当|お弁当|ラーメン|うどん|そば|カフェ|コーヒー|珈琲|居酒屋|セブン|ファミマ|ローソン|ミニストップ|スーパー|コンビニ|外食|食費|お茶/i.test(noteToAnalyze)) {
    return {
      type: 'expense',
      category: 'food_drinks',
      amount,
      source,
      note: cleanNote || remainingText,
    };
  }

  // Shopping & Retail
  if (/\b(shop|belanja|baju|clothes|uniqlo|shoes|sepatu|fuku|kaimono|buy|amazon|store|mall|book)\b|買い物|ショッピング|服|靴|本|ユニクロ|ドラッグストア|薬局|日用品|雑貨|アマゾン/i.test(noteToAnalyze)) {
    return {
      type: 'expense',
      category: 'shopping',
      amount,
      source,
      note: cleanNote || remainingText,
    };
  }

  // Ride / Taxi / Fuel
  if (/\b(gojek|grab|ride|ojol|taksi|taxi|uber|fuel|gas|petrol|parking|toll)\b|タクシー|配車|ガソリン|駐車場|パーキング|高速|有料道路/i.test(noteToAnalyze)) {
    return {
      type: 'expense',
      category: 'ride',
      amount,
      source,
      note: cleanNote || remainingText,
    };
  }

  // Laundry
  if (/\b(laundry|cuci|laundromat|coin laundry|sentaku|wash|dry)\b|洗濯|コインランドリー|クリーニング/i.test(noteToAnalyze)) {
    return {
      type: 'expense',
      category: 'laundry',
      amount,
      source,
      note: cleanNote || remainingText,
    };
  }

  // Rent & Housing
  if (/\b(ryou|rent|kosan|asrama|yachin|housing|dorm|apartment|mansion)\b|家賃|寮|共益費|管理費|部屋代/i.test(noteToAnalyze)) {
    return {
      type: 'expense',
      category: 'rent',
      amount,
      source,
      note: cleanNote || remainingText,
    };
  }

  // Mobile / Internet
  if (/\b(sim|pulsa|kuota|data|mobile|tsushin|internet|wifi|phone)\b|携帯|スマホ|通信|通信費|ネット代|ワイファイ/i.test(noteToAnalyze)) {
    return {
      type: 'expense',
      category: 'mobile',
      amount,
      source,
      note: cleanNote || remainingText,
    };
  }

  // Cloud / VPS / Server
  if (/\b(vps|server|cloud|linode|digitalocean|hosting|domain|aws|gcp)\b|サーバー|ホスティング|ドメイン/i.test(noteToAnalyze)) {
    return {
      type: 'expense',
      category: 'vps',
      amount,
      source,
      note: cleanNote || remainingText,
    };
  }

  // Family Remittance
  if (/\b(family|keluarga|ortu|shiokuri|send money|kirim|mom|dad)\b|仕送り|家族|実家/i.test(noteToAnalyze)) {
    return {
      type: 'expense',
      category: 'family',
      amount,
      source,
      note: cleanNote || remainingText,
    };
  }

  // Gifts / Social
  if (/\b(gift|kado|hadiah|traktir|donasi|kifu|oiwai|kondangan|present|nomikai)\b|プレゼント|お祝い|ギフト|寄付|飲み会|おごり/i.test(noteToAnalyze)) {
    return {
      type: 'expense',
      category: 'gifts',
      amount,
      source,
      note: cleanNote || remainingText,
    };
  }

  // Fallback to Others Expense
  return {
    type: 'expense',
    category: 'others',
    amount,
    source,
    note: cleanNote || remainingText || '',
  };
}
