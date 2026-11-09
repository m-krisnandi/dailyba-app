import { Currency, ExpenseCategory, FundingSource } from '@/types/finance';
import { getTodayLocalDate } from './dateUtils';

const OBFUSCATED_KEY = 'QVEuQWI4Uk42TGhyWEZnQTJHSGI4WE9oaFpLT0ZrYjBfZjF4RkRZc01RT3JEMzZBSVVCNnc=';
const GEMINI_KEY_STORAGE = 'dailyba_gemini_api_key';

export function getDefaultGeminiKey(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GEMINI_API_KEY) {
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY.trim();
  }
  try {
    return typeof atob !== 'undefined'
      ? atob(OBFUSCATED_KEY)
      : Buffer.from(OBFUSCATED_KEY, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem(GEMINI_KEY_STORAGE);
      if (custom && custom.trim()) return custom.trim();
    } catch {}
  }
  return getDefaultGeminiKey();
}

export function setGeminiApiKey(key: string) {
  if (typeof window === 'undefined') return;
  try {
    if (key.trim()) {
      localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
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
 * Resizes and compresses image to max 1280px for high OCR accuracy,
 * instant mobile uploads, and minimal bandwidth.
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
        const MAX_DIM = 1280;
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

        // Clean white background for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
 * Calls Google Gemini Vision multimodal API with fallback models.
 */
export async function parseReceiptWithGemini(
  base64Data: string,
  mimeType: string,
  activeCurrency: Currency = 'IDR'
): Promise<ParsedReceiptResult> {
  const apiKey = getGeminiApiKey();
  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

  const prompt = `You are a high-precision financial receipt and invoice OCR scanner.
Analyze this receipt/bill image and extract transaction data.
Current user active currency: ${activeCurrency}.

Output strictly valid JSON with no markdown wrapping, no formatting ticks, and no commentary.
JSON format:
{
  "amount": number, // Grand total paid (positive number, e.g. 45000 or 1200). If multiple totals exist, take the final paid total after tax/discounts.
  "currency": "IDR" | "JPY" | "USD" | "MMK", // Detect from currency symbols (Rp, ¥, $, Ks) or context. Fallback to "${activeCurrency}".
  "date": "YYYY-MM-DD", // Extracted date. If year/date is missing or ambiguous, return null.
  "category": "food_drinks" | "shopping" | "train" | "ride" | "laundry" | "rent" | "family" | "gifts" | "vps" | "mobile" | "others",
  "source": "cash" | "bank" | "credit_card" | "ewallet", // Payment method:
    // "ewallet" for QRIS, GoPay, OVO, ShopeePay, DANA, LinkAja, PayPay, LINE Pay, Suica, Pasmo
    // "bank" for BCA, Mandiri, BRI, BNI, Bank Transfer, Debit, ATM
    // "credit_card" for Visa, Mastercard, JCB, Credit Card, Cicilan
    // "cash" for Tunai, Cash, Uang Pas, Change/Kembalian. Default: "cash"
  "merchant": string, // Store / merchant / vendor name (e.g. "Indomaret", "FamilyMart", "Starbucks", "PLN Electricity")
  "itemsSummary": string, // Brief 2-4 word summary of main items purchased
  "note": string, // Format as: "[Merchant] - [ItemsSummary]"
  "confidence": number // Number between 0.0 and 1.0 indicating OCR reading confidence
}

Category Guidelines:
- Groceries, dining, cafe, drinks, restaurant, supermarket, food delivery -> food_drinks
- Retail, clothes, electronics, household goods, books, stationery, amazon -> shopping
- Train, subway, metro, JR, KRL, MRT, LRT -> train
- Grab, Gojek, taxi, ride-hailing, fuel, parking -> ride
- Laundry, coin laundromat, dry cleaning -> laundry
- Rent, dormitory, kosan, housing -> rent
- Mobile data, cellular bill, telkomsel, docomo, wifi, internet -> mobile
- Server, VPS, domain, hosting, cloud subscriptions -> vps
- Family support, kids, parents remittance -> family
- Gifts, presents, donations -> gifts
- Miscellaneous / others -> others`;

  let lastError: Error | null = null;

  for (const model of candidateModels) {
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
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Gemini API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini did not return any OCR text');
      }

      // Clean raw text in case model returned markdown codeblocks
      const cleaned = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      // Normalize category alias mappings
      let rawCat = parsed.category;
      if (rawCat === 'housing') rawCat = 'rent';
      if (rawCat === 'utilities') rawCat = 'others';
      if (rawCat === 'transport') rawCat = 'ride';
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
        (merchant ? `${merchant}${itemsSummary ? ` - ${itemsSummary}` : ''}` : 'Receipt scan');

      return {
        amount,
        currency,
        date,
        category,
        source,
        merchant,
        note,
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.9)),
        rawText,
      };
    } catch (err: any) {
      lastError = err;
      // Continue to next model if 503 or model error
    }
  }

  throw lastError || new Error('Could not parse receipt with Gemini AI.');
}
