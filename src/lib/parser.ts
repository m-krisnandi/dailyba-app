import { ExpenseCategory, IncomeCategory, TransactionType } from '@/types/finance';

export interface ParsedInput {
  amount: number;
  category?: ExpenseCategory | IncomeCategory | string;
  type: TransactionType;
  note?: string;
}

export function parseSmartText(text: string): ParsedInput | null {
  const clean = text.trim();
  if (!clean) return null;

  // Regex to extract number (supports 25k, 50rb, 1.5m, etc.)
  const tokens = clean.split(/\s+/);
  let amount = 0;
  let remainingTokens: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    const matchNumber = lower.match(/^(\d+(?:[.,]\d+)?)(k|rb|m|jt)?$/);
    if (matchNumber && amount === 0) {
      let num = parseFloat(matchNumber[1].replace(',', '.'));
      const unit = matchNumber[2];
      if (unit === 'k' || unit === 'rb') {
        num *= 1000;
      } else if (unit === 'm' || unit === 'jt') {
        num *= 1000000;
      }
      if (num > 0) {
        amount = num;
        continue;
      }
    }
    remainingTokens.push(token);
  }

  if (amount <= 0) return null;

  const keyword = remainingTokens.join(' ').toLowerCase();

  // Keyword mapping
  if (/^(makan|minum|food|drink|gohan|tabemono|bento|lunch|dinner|breakfast|cafe|kopi|coffee|tea|supermarket|konbini|groceries)/i.test(keyword)) {
    return { amount, category: 'food_drinks', type: 'expense', note: remainingTokens.join(' ') };
  }
  if (/^(train|kereta|densha|subway|metro|suica|pasmo|station|stasiun|jr)/i.test(keyword)) {
    return { amount, category: 'train', type: 'expense', note: remainingTokens.join(' ') };
  }
  if (/^(gojek|grab|ride|ojol|taksi|taxi|uber)/i.test(keyword)) {
    return { amount, category: 'ride', type: 'expense', note: remainingTokens.join(' ') };
  }
  if (/^(laundry|cuci|laundromat|coin laundry|sentaku)/i.test(keyword)) {
    return { amount, category: 'laundry', type: 'expense', note: remainingTokens.join(' ') };
  }
  if (/^(shop|belanja|baju|clothes|uniqlo|shoes|sepatu|fuku|kaimono)/i.test(keyword)) {
    return { amount, category: 'shopping', type: 'expense', note: remainingTokens.join(' ') };
  }
  if (/^(ryou|rent|kosan|asrama|yachin|housing|dorm)/i.test(keyword)) {
    return { amount, category: 'rent', type: 'expense', note: remainingTokens.join(' ') };
  }
  if (/^(family|keluarga|ortu|shiokuri|send money|kirim)/i.test(keyword)) {
    return { amount, category: 'family', type: 'expense', note: remainingTokens.join(' ') };
  }
  if (/^(gift|kado|hadiah|traktir|donasi|kifu|oiwai|kondangan)/i.test(keyword)) {
    return { amount, category: 'gifts', type: 'expense', note: remainingTokens.join(' ') };
  }
  if (/^(vps|server|cloud|linode|digitalocean|hosting|domain)/i.test(keyword)) {
    return { amount, category: 'vps', type: 'expense', note: remainingTokens.join(' ') };
  }
  if (/^(sim|pulsa|kuota|data|mobile|tsushin|internet)/i.test(keyword)) {
    return { amount, category: 'mobile', type: 'expense', note: remainingTokens.join(' ') };
  }
  if (/^(nabung|save|chokin|savings|tabungan)/i.test(keyword)) {
    return { amount, category: 'savings', type: 'savings', note: remainingTokens.join(' ') || 'Savings' };
  }
  if (/^(gaji|salary|kyuuryou|payroll|income)/i.test(keyword)) {
    return { amount, category: 'salary', type: 'income', note: remainingTokens.join(' ') || 'Salary' };
  }
  if (/^(freelance|side-gig|fukugyou|project|client)/i.test(keyword)) {
    return { amount, category: 'freelance', type: 'income', note: remainingTokens.join(' ') || 'Freelance' };
  }
  if (/^(sisa|leftover|carryover|rollover|saldo lalu|sisa uang|sisa saldo|kurikoshi|繰越)/i.test(keyword)) {
    return { amount, category: 'carryover', type: 'income', note: remainingTokens.join(' ') || 'Leftover Carryover' };
  }

  // Default fallback
  return {
    amount,
    category: 'others',
    type: 'expense',
    note: remainingTokens.join(' ') || undefined,
  };
}
