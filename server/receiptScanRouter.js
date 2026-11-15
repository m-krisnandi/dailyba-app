const express = require('express');
const router = express.Router();

// Built-in fallback AI Vision key for Dailyba
const DEFAULT_KEY = Buffer.from('QVEuQWI4Uk42TGhyWEZnQTJHSGI4WE9oaFpLT0ZrYjBfZjF4RkRZc01RT3JEMzZBSVVCNnc=', 'base64').toString('utf-8');

router.post('/scan-receipt', async (req, res) => {
  try {
    const { base64, mimeType = 'image/jpeg', currency = 'JPY', language = 'ja' } = req.body || {};
    if (!base64) {
      return res.status(400).json({ success: false, message: 'Image base64 data is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || DEFAULT_KEY;
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];

    const prompt = `You are a universal international receipt, invoice, and bill financial parser for Dailyba.
Analyze the provided document or receipt image. It can be from ANY country (Japan, Indonesia, USA, Europe, Singapore, Malaysia, etc.) and in ANY format (thermal register slip, restaurant bill, utility invoice, supermarket itemized slip, ride-hailing receipt, e-commerce bill, handwritten or digital screenshot).

Special handling for long or itemized receipts:
- For long slips (such as supermarkets, drugstores, or restaurants): look for the Store/Merchant name at the very top, and find the final paid amount (Grand Total, 合計, 総合計, 請求額, Total Pembayaran, Total) near the bottom.
- Disregard intermediate line items, subtotals, tax subtotals, change given (お釣り/kembalian), or loyalty points unless needed to identify the main items.

Your task: Extract financial transaction details into strictly valid JSON with no markdown wrapping, no explanation, no backticks.

Allowed categories:
- "food_drinks": groceries, dining, supermarket, restaurant, fast food, cafe, coffee, bakery, snacks, bento, konbini food, bar, izakaya
- "shopping": clothes, retail, electronics, stationery, books, cosmetics, home supplies, general merchandise, 100-yen shop, daiso, amazon, unbranded shopping
- "transport": train, subway, metro, railway, JR, KRL, MRT, LRT, bullet train, transit tickets, taxi, ride-hailing (Gojek, Grab, Uber), fuel/gasoline (Pertamina, Shell, ENEOS), parking fees, toll roads
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
- Default to user active currency "${currency}".

Total Amount Extraction Rules:
- Identify the FINAL GRAND TOTAL paid by the consumer (after all taxes, discounts, service charges, VAT/PPN/GST).
- Disregard subtotals, change given (kembalian, お釣り), or points earned.
- Handle decimal & thousand separators correctly according to locale (e.g. "150.000" in Indonesia is 150000; "1,500" in Japan/US is 1500).
- Must be a positive numeric value.

Date Extraction:
- Find the transaction date. Normalize ANY calendar format (e.g. "2026/11/10", "10-11-2026", "Nov 10, 2026", "令和8年11月10日") into standard ISO "YYYY-MM-DD".
- If date is missing, illegible, or year is unreasonable, return null.

Special Rules for Japanese Receipts (日本国内のレシート・領収書):
- Convenience Stores (コンビニ: セブン-イレブン, ファミリーマート, ローソン, ミニストップ) & Supermarkets (ライフ, 西友, イオン, イトーヨーカドー):
  * Items marked with "※" or "軽" denote 8% reduced consumption tax (軽減税率 food/drinks) -> category: "food_drinks".
  * Total Amount: Look strictly for "合計", "お買上合計", "お買上げ合計", or "現計".
  * NEVER extract "お預り" / "お預かり" (cash handed over by customer, e.g. ¥10,000)!
  * NEVER extract "お釣り" / "つり" (change returned)!
  * NEVER extract "小計" (subtotal) or "内消費税等" / "内税" (tax amount)!
- Train Stations & Railway Transit (JR東日本, JR西日本, 東京メトロ, 都営地下鉄, 私鉄, 券売機・精算機 領収書):
  * Always set category to "transport".
- 100-yen shops (Daiso, Seria, CanDo): category "shopping".
- Drugstores (Sugi Yakkyoku, Matsumoto Kiyoshi, Welcia): category "food_drinks" if mainly snacks/groceries/drinks, or "others" if medicine.
- Payment Method Recognition in Japan:
  * "交通系IC", "交通系電子マネー", "Suica", "PASMO", "ICOCA" -> source: "ewallet"
  * "コード決済", "PayPay", "LINE Pay", "楽天ペイ", "d払い", "au PAY" -> source: "ewallet"
  * "クレジット", "クレカ", "JCB", "VISA", "Mastercard", "AMEX" -> source: "credit_card"
  * "現計", "現金", "現金支払" -> source: "cash"

JSON Schema to output:
{
  "amount": number,
  "currency": "IDR" | "JPY" | "USD" | "MMK",
  "date": "YYYY-MM-DD" | null,
  "category": "food_drinks" | "shopping" | "transport" | "laundry" | "rent" | "family" | "gifts" | "vps" | "mobile" | "others",
  "source": "cash" | "bank" | "credit_card" | "ewallet",
  "merchant": string,
  "itemsSummary": string,
  "note": string,
  "confidence": number
}

Language Requirements:
- The target user interface language is: ${language === 'ja' ? 'Japanese (日本語)' : 'English'}.
- For "itemsSummary": Written in ${language === 'ja' ? 'Japanese (e.g. 「お弁当・お茶」, 「日用品」, 「食料品」)' : 'English'}.
- For "merchant": Store native name (e.g. 「イトーヨーカドー」, 「セブン-イレブン」, 「ファミリーマート」, 「スギ薬局」, 「ダイソー」).
- For "note": Format as "[Merchant] - [ItemsSummary]".`;

    let lastError = null;
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const apiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: base64 } }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!apiRes.ok) {
          const errData = await apiRes.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `AI error HTTP ${apiRes.status}`);
        }

        const data = await apiRes.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('No candidate content returned');

        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        return res.json({
          success: true,
          data: {
            amount: Math.abs(Number(parsed.amount)) || 0,
            currency: parsed.currency || currency,
            date: parsed.date || null,
            category: parsed.category || 'food_drinks',
            source: parsed.source || 'cash',
            merchant: (parsed.merchant || '').trim(),
            itemsSummary: (parsed.itemsSummary || '').trim(),
            note: (parsed.note || '').trim() || (parsed.merchant ? `${parsed.merchant}${parsed.itemsSummary ? ` - ${parsed.itemsSummary}` : ''}` : 'Receipt scan'),
            confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.95))
          }
        });
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('Could not parse receipt');
  } catch (err) {
    console.error('[ReceiptScanAPI] Error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Receipt scan failed' });
  }
});

module.exports = router;
