import { Currency, ExpenseCategory, FundingSource, Language } from '@/types/finance';
import { getTodayLocalDate } from './dateUtils';

// Obfuscated client key for Dailyba proprietary AI Vision engine
const OBFUSCATED_KEY = 'QVEuQWI4Uk42TGhyWEZnQTJHSGI4WE9oaFpLT0ZrYjBfZjF4RkRZc01RT3JEMzZBSVVCNnc=';
const AI_KEY_STORAGE = 'dailyba_ai_scanner_key';

export function getDefaultAIEngineKey(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_AI_SCANNER_KEY) {
    return process.env.NEXT_PUBLIC_AI_SCANNER_KEY.trim();
  }
  try {
    return typeof atob !== 'undefined'
      ? atob(OBFUSCATED_KEY)
      : Buffer.from(OBFUSCATED_KEY, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

export function getAIEngineApiKey(): string {
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem(AI_KEY_STORAGE);
      if (custom && custom.trim()) return custom.trim();
    } catch {}
  }
  return getDefaultAIEngineKey();
}

export function setAIEngineApiKey(key: string) {
  if (typeof window === 'undefined') return;
  try {
    if (key.trim()) {
      localStorage.setItem(AI_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(AI_KEY_STORAGE);
    }
  } catch {}
}

export interface ParsedReceiptResult {
  amount: number;
  currency: Currency;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  source: FundingSource;
  merchant: string;
  note: string;
  confidence: number;
  rawText?: string;
}

/**
 * Checks whether an error or environment state is due to lack of network,
 * offline mode, DNS resolution failure, or timeout.
 */
export function isNetworkError(err: any): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!err) return false;
  if (err.name === 'NetworkOfflineError' || err.message === 'NETWORK_OFFLINE') return true;
  if (err.name === 'AbortError' || err.message?.includes('aborted')) return true;
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('offline') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('connection') ||
    msg.includes('econnrefused')
  );
}

/**
 * Resizes and compresses image to max 1800px for optimal OCR recognition on long receipts,
 * minimal memory footprint, and high-speed analysis across all mobile devices.
 */
export async function prepareImageForAI(
  file: File | Blob
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.onload = () => {
        const MAX_DIM = 1800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Clean white background for transparent PNG/PDF captures
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const base64Data = dataUrl.split(',')[1];
        resolve({
          base64: base64Data,
          mimeType: 'image/jpeg',
          previewUrl: dataUrl,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Universal Multi-Country Receipt & Invoice AI Parser
 * Supports any country (Japan, Indonesia, US, EU, UK, Asia, etc.) and any format
 * (thermal receipts, restaurant guest checks, A4 invoices, supermarket bills, PDF screenshots, delivery slips).
 */
export async function parseReceiptWithAI(
  base64Data: string,
  mimeType: string,
  activeCurrency: Currency = 'IDR',
  language: Language = 'ja'
): Promise<ParsedReceiptResult> {
  // 1. Instant check for offline network state
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const offlineErr = new Error('NETWORK_OFFLINE');
    offlineErr.name = 'NetworkOfflineError';
    throw offlineErr;
  }

  const apiKey = getAIEngineApiKey();
  const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];

  const prompt = `You are a universal international receipt, invoice, and bill financial parser for Dailyba.
Analyze the provided document or receipt image. It can be from ANY country (Japan, Indonesia, USA, Europe, Singapore, Malaysia, etc.) and in ANY format (thermal register slip, restaurant bill, utility invoice, supermarket itemized slip, ride-hailing receipt, e-commerce bill, handwritten or digital screenshot).

Special handling for long or itemized receipts:
- For long slips (such as supermarkets, drugstores, or restaurants): look for the Store/Merchant name at the very top, and find the final paid amount (Grand Total, 合計, 総合計, 請求額, Total Pembayaran, Total) near the bottom.
- Disregard intermediate line items, subtotals, tax subtotals, change given (お釣り/kembalian), or loyalty points unless needed to identify the main items.

Your task: Extract financial transaction details into strictly valid JSON with no markdown wrapping, no explanation, no backticks.

Allowed categories:
- "food_drinks": groceries, dining, supermarket, restaurant, fast food, cafe, coffee, bakery, snacks, bento, konbini food, bar, izakaya
- "shopping": clothes, retail, electronics, stationery, books, cosmetics, home supplies, general merchandise, amazon, unbranded shopping
- "train": train, subway, metro, railway, JR, KRL, MRT, LRT, bullet train, Shinkansen, transit tickets
- "ride": taxi, cab, ride-hailing (Gojek, Grab, Uber, Lyft, DiDi), fuel/gasoline (Pertamina, Shell, ENEOS), parking fees, toll roads
- "laundry": laundry, laundromat, dry cleaning, coin laundry
- "rent": house rent, apartment, dorm, kosan, monthly tenancy, HOA/maintenance fees
- "mobile": mobile data, cellular subscription, phone bill (Telkomsel, Indosat, Docomo, Softbank, AT&T, Verizon), home internet, wifi
- "vps": cloud hosting, domain, server, VPS (DigitalOcean, AWS, GCP, Cloudflare), SaaS subscription
- "family": money transfer to parents/family, childcare, remittance
- "gifts": donations, charity, presents, gifts to others
- "others": medical, hospital, pharmacy, cinema, games, entertainment, education, travel, government fees, or unspecified expenses

Allowed funding sources:
- "ewallet": QRIS, GoPay, OVO, ShopeePay, DANA, LinkAja, PayPay, LINE Pay, Rakuten Pay, d-barai, Apple Pay, Google Pay, PayPal, Venmo, Cash App, Alipay, WeChat Pay, GrabPay, Suica, Pasmo, IC Card
- "bank": Bank Transfer, Wire, Debit Card, ATM, Virtual Account, Giro, BCA, Mandiri, BRI, BNI, SMBC, MUFG, Mizuho, Yucho, Chase, Bank of America, Wells Fargo, etc.
- "credit_card": Visa, Mastercard, JCB, American Express, Amex, Discover, UnionPay, Diners Club, Credit Card, Cicilan, クレジット
- "cash": Cash, Tunai, 現金, Cash Tendered, Tunai Diterima. Default if unmentioned: "cash"

Currency Detection:
- Detect currency symbol/code (e.g., "¥" or "円" -> JPY, "Rp" or "IDR" -> IDR, "$" or "USD" -> USD, "Ks" or "MMK" -> MMK).
- If receipt is in another currency (EUR, GBP, SGD, etc.), provide "USD" or default to user active currency "${activeCurrency}".

Total Amount Extraction Rules:
- Identify the FINAL GRAND TOTAL paid by the consumer (after all taxes, discounts, service charges, VAT/PPN/GST).
- Disregard subtotals, change given (kembalian, お釣り), or points earned.
- Handle decimal & thousand separators correctly according to locale (e.g. "150.000" in Indonesia is 150000; "1,500" in Japan/US is 1500).
- Must be a positive numeric value.

Date Extraction:
- Find the transaction date. Normalize ANY calendar format (e.g. "2026/11/10", "10-11-2026", "Nov 10, 2026", "令和8年11月10日") into standard ISO "YYYY-MM-DD".
- If date is missing, illegible, or year is unreasonable, return null.


Special Rules for Japanese Receipts (日本国内のレシート・領収書):
- Convenience Stores (コンビニ: セブン-イレブン, ファミリーマート, ローソン, ミニストップ) & Supermarkets (ライフ, 西友, イオン):
  * Items marked with \"※\" or \"軽\" denote 8% reduced consumption tax (軽減税率 food/drinks) -> category: \"food_drinks\".
  * Total Amount: Look strictly for \"合計\", \"お買上合計\", \"お買上げ合計\", or \"現計\".
  * NEVER extract \"お預り\" / \"お預かり\" (cash handed over by customer, e.g. ¥10,000)!
  * NEVER extract \"お釣り\" / \"つり\" (change returned)!
  * NEVER extract \"小計\" (subtotal) or \"内消費税等\" / \"内税\" (tax amount)!
- Train Stations & Railway Transit (JR東日本, JR西日本, 東京メトロ, 都営地下鉄, 私鉄, 券売機・精算機 領収書):
  * Look for slips titled \"領収書\" with words: \"乗車券\", \"定期券\", \"新幹線特急券\", \"特急券\", \"精算\", \"入場券\", \"東日本旅客鉄道\", \"東京メトロ\".
  * Always set category to \"train\".
- Payment Method Recognition in Japan:
  * \"交通系IC\", \"交通系電子マネー\", \"Suica\", \"PASMO\", \"ICOCA\" -> source: \"ewallet\"
  * \"コード決済\", \"PayPay\", \"LINE Pay\", \"楽天ペイ\", \"d払い\", \"au PAY\" -> source: \"ewallet\"
  * \"クレジット\", \"クレカ\", \"JCB\", \"VISA\", \"Mastercard\", \"AMEX\" -> source: \"credit_card\"
  * \"現計\", \"現金\", \"現金支払\" -> source: \"cash\"

JSON Schema to output:
{
  "amount": number,
  "currency": "IDR" | "JPY" | "USD" | "MMK",
  "date": "YYYY-MM-DD" | null,
  "category": "food_drinks" | "shopping" | "train" | "ride" | "laundry" | "rent" | "family" | "gifts" | "vps" | "mobile" | "others",
  "source": "cash" | "bank" | "credit_card" | "ewallet",
  "merchant": string, // Store or vendor name
  "itemsSummary": string, // 2-4 words summarizing main purchased items
  "note": string, // Format: "[Merchant] - [ItemsSummary]"
  "confidence": number // 0.0 to 1.0 confidence score
}

Language Requirements:
- The target user interface language is: ${language === 'ja' ? 'Japanese (日本語)' : 'English'}.
- For "itemsSummary": Must be written in ${language === 'ja' ? 'Japanese (e.g. 「寿司皿」, 「お弁当・お茶」, 「日用品」, 「食料品」, 「カフェ・コーヒー」)' : 'English (e.g. "sushi plates", "groceries", "lunch & coffee")'}.
- For "merchant": Use the store native name (e.g. ${language === 'ja' ? '「はま寿司」, 「セブン-イレブン」, 「ファミリーマート」, 「吉野家」' : '"Hamazushi", "7-Eleven", "Starbucks"'}).
- For "note": Must strictly format as "[Merchant] - [ItemsSummary]" in ${language === 'ja' ? 'Japanese (e.g. 「はま寿司 - 寿司皿」, 「セブン-イレブン - お弁当」)' : 'English (e.g. "Hamazushi - sushi plates")'}.`;

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `AI service returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('AI engine did not return any OCR response');
      }

      const cleaned = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      // Normalize Category
      let rawCat = parsed.category;
      if (rawCat === 'housing' || rawCat === 'dorm') rawCat = 'rent';
      if (rawCat === 'utilities' || rawCat === 'bills') rawCat = 'others';
      if (rawCat === 'transport' || rawCat === 'transit') rawCat = 'ride';
      if (rawCat === 'groceries' || rawCat === 'dining') rawCat = 'food_drinks';
      if (rawCat === 'other_expense') rawCat = 'others';

      const validCategories: ExpenseCategory[] = [
        'food_drinks',
        'shopping',
        'train',
        'ride',
        'laundry',
        'rent',
        'family',
        'gifts',
        'vps',
        'mobile',
        'others',
      ];
      const category: ExpenseCategory = validCategories.includes(rawCat)
        ? rawCat
        : 'food_drinks';

      const validSources: FundingSource[] = ['cash', 'bank', 'credit_card', 'ewallet'];
      const source: FundingSource = validSources.includes(parsed.source)
        ? parsed.source
        : 'cash';

      const validCurrencies: Currency[] = ['IDR', 'JPY', 'USD', 'MMK'];
      const currency: Currency = validCurrencies.includes(parsed.currency)
        ? parsed.currency
        : activeCurrency;

      const date =
        parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
          ? parsed.date
          : getTodayLocalDate();

      const amount = Math.abs(Number(parsed.amount)) || 0;
      const merchant = (parsed.merchant || '').trim();
      const itemsSummary = (parsed.itemsSummary || '').trim();
      const note =
        (parsed.note || '').trim() ||
        (merchant ? `${merchant}${itemsSummary ? ` - ${itemsSummary}` : ''}` : (language === 'ja' ? 'レシート読取' : 'Receipt scan'));

      return {
        amount,
        currency,
        date,
        category,
        source,
        merchant,
        note,
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.95)),
        rawText,
      };
    } catch (err: any) {
      lastError = err;
      // If network connection failed or timed out, do not retry other candidate models in a loop
      if (isNetworkError(err)) {
        break;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error('Could not analyze receipt image.');
}
