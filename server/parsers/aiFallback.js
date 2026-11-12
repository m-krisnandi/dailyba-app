const { normalizeDate, createDedupHash } = require('./types');
const { categorizeTransaction } = require('./categorizer');

/**
 * Universal AI Fallback & Heuristic Parser for arbitrary bank or e-wallet receipts.
 */
const aiFallbackParser = {
  name: 'ai_fallback',

  matches() {
    return true; // Fallback matches anything if prior parsers don't match or fail
  },

  async parse(email) {
    const text = email.text || email.body || '';
    const subject = email.subject || '';
    const from = email.from || '';

    // If Gemini API Key is configured, attempt intelligent zero-shot extraction
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey && (text.length > 20 || subject.length > 5)) {
      try {
        const prompt = `You are a financial transaction extractor for the Dailyba app.
Extract the transaction details from this email receipt:
FROM: ${from}
SUBJECT: ${subject}
BODY:
${text.slice(0, 1500)}

Respond ONLY with valid JSON with these exact keys:
{
  "merchant": "Name of store, merchant, or recipient",
  "amount": number (positive numeric value, integer if IDR or JPY),
  "currency": "IDR" | "JPY" | "USD" | "MMK",
  "source": "bank" | "ewallet" | "credit_card" | "cash",
  "category": "food_drinks" | "shopping" | "train" | "ride" | "laundry" | "rent" | "family" | "gifts" | "vps" | "mobile" | "others",
  "date": "YYYY-MM-DD",
  "confidence": number (between 0.5 and 0.99)
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1
              }
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawOutput) {
            const parsed = JSON.parse(rawOutput);
            if (parsed.amount && parsed.amount > 0) {
              const occurredAt = normalizeDate(parsed.date || email.date);
              const messageId = email.messageId || `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              return {
                source: parsed.source || 'bank',
                provider: 'generic',
                merchant: parsed.merchant || 'Unknown Merchant',
                amount: Math.round(Number(parsed.amount)),
                currency: parsed.currency || 'IDR',
                category: parsed.category || categorizeTransaction(parsed.merchant || subject),
                occurredAt,
                confidence: parsed.confidence || 0.85,
                messageId,
                dedupHash: createDedupHash(parsed.merchant, parsed.amount, occurredAt),
                rawSnippet: text.slice(0, 300)
              };
            }
          }
        }
      } catch (err) {
        console.warn('[AIFallback] Gemini extraction failed, using heuristic regex:', err.message);
      }
    }

    // Heuristic Regex Fallback
    return heuristicParse(email);
  }
};

function heuristicParse(email) {
  const text = email.text || email.body || '';
  const subject = email.subject || '';

  // 1. Detect Currency and Amount
  let amount = 0;
  let currency = 'IDR';

  // Check JPY
  const jpyMatch = text.match(/(?:[¥￥]\s*)([0-9,]+)/) ||
                   text.match(/([0-9,]+)\s*円/) ||
                   text.match(/(?:利用金額|お支払い金額|金額)[:：\s]*([0-9,]+)/);
  // Check USD
  const usdMatch = text.match(/(?:\$|USD\s*)([0-9]+(?:\.[0-9]{2})?)/i) ||
                   subject.match(/(?:\$|USD\s*)([0-9]+(?:\.[0-9]{2})?)/i);
  // Check IDR
  const idrMatch = text.match(/(?:Rp\.?|IDR)\s*([0-9.,]+)/i) ||
                   text.match(/(?:Total|Nominal|Jumlah|Amount)\s*[:\s]*(?:Rp\.?|IDR)?\s*([0-9.,]+)/i);

  if (jpyMatch) {
    currency = 'JPY';
    amount = Math.round(parseFloat(jpyMatch[1].replace(/,/g, ''))) || 0;
  } else if (usdMatch) {
    currency = 'USD';
    amount = parseFloat(usdMatch[1]) || 0;
  } else if (idrMatch) {
    currency = 'IDR';
    let raw = idrMatch[1].trim();
    if (raw.includes('.') && raw.includes(',')) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    } else if (raw.includes('.')) {
      raw = raw.replace(/\./g, '');
    }
    amount = Math.round(parseFloat(raw)) || 0;
  }

  if (amount <= 0) {
    return null;
  }

  // 2. Extract Merchant
  let merchant = '';
  const mMatch = text.match(/(?:Merchant|Penerima|Tujuan|利用先|加盟店|Store|Recipient|To)[:\s]+([^\r\n]+)/i);
  if (mMatch) {
    merchant = mMatch[1].trim();
  } else {
    merchant = subject.replace(/pembayaran|berhasil|payment|receipt|alert|notification/gi, '').trim() || 'Imported Transaction';
  }

  // 3. Date
  const occurredAt = normalizeDate(email.date || '');
  const category = categorizeTransaction(`${merchant} ${subject}`);
  const messageId = email.messageId || `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const dedupHash = createDedupHash(merchant, amount, occurredAt);

  return {
    source: 'bank',
    provider: 'generic',
    merchant: merchant.slice(0, 50),
    amount,
    currency,
    category,
    occurredAt,
    confidence: 0.7,
    messageId,
    dedupHash,
    rawSnippet: text.slice(0, 300)
  };
}

module.exports = aiFallbackParser;
