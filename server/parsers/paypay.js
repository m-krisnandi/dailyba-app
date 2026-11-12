const { normalizeDate, createDedupHash } = require('./types');
const { categorizeTransaction } = require('./categorizer');

/**
 * PayPay Japan Email Parser
 * Handles transaction receipts from PayPay (Japan's #1 QR & Barcode e-wallet).
 */
const paypayParser = {
  name: 'paypay',

  matches(email) {
    const from = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.text || email.body || '').toLowerCase();

    return (
      from.includes('paypay.ne.jp') ||
      subject.includes('paypay') ||
      body.includes('paypay') ||
      subject.includes('お支払い完了のお知らせ')
    );
  },

  parse(email) {
    const text = email.text || email.body || '';
    const subject = email.subject || '';

    // 1. Merchant / Store
    let merchant = '';
    const storeMatch = text.match(/(?:利用先|加盟店|支払先|お支払い先)[:：\s]+([^\r\n]+)/);
    if (storeMatch) {
      merchant = storeMatch[1].trim();
    }

    if (!merchant) {
      merchant = 'PayPay 加盟店';
    }

    // 2. Amount in JPY (e.g. 1,250円 or ¥1,250)
    let amount = 0;
    const amountMatch = text.match(/(?:お支払い金額|利用金額|合計金額|金額)[:：\s]*(?:[¥￥]?\s*)?([0-9,]+)\s*(?:円)?/) ||
                        text.match(/(?:[¥￥]\s*)([0-9,]+)/) ||
                        text.match(/([0-9,]+)\s*円/);

    if (amountMatch) {
      const raw = amountMatch[1].replace(/,/g, '');
      amount = Math.round(parseFloat(raw)) || 0;
    }

    // 3. Date & Time
    let occurredAt = normalizeDate(email.date || '');
    let occurredTime = '';

    const dtMatch = text.match(/(?:日時|利用日時|決済日時)[:：\s]*([0-9]{4}[年/-]\s*[0-9]{1,2}[月/-]\s*[0-9]{1,2}日?)(?:\s*([0-9]{2}:[0-9]{2}))?/);
    if (dtMatch) {
      occurredAt = normalizeDate(dtMatch[1]);
      if (dtMatch[2]) {
        occurredTime = dtMatch[2];
      }
    }

    if (amount <= 0) {
      return null;
    }

    const category = categorizeTransaction(`${merchant} ${subject}`);
    const messageId = email.messageId || `paypay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const dedupHash = createDedupHash(merchant, amount, occurredAt);

    return {
      source: 'ewallet',
      provider: 'paypay',
      merchant,
      amount,
      currency: 'JPY',
      category,
      occurredAt,
      occurredTime,
      confidence: 0.98,
      messageId,
      dedupHash,
      verificationStatus: "unverified_heuristic",
      rawSnippet: text.slice(0, 300)
    };
  }
};

module.exports = paypayParser;
