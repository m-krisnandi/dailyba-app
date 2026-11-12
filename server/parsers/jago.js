const { normalizeDate, createDedupHash, parseCurrencyAmount } = require('./types');
const { categorizeTransaction } = require('./categorizer');
const { redactPII } = require('../crypto');

/**
 * Bank Jago / Jago Syariah Email Parser
 * Handles payment confirmation emails from Bank Jago (e.g. QRIS payments, transfers)
 */
const jagoParser = {
  name: 'jago',

  matches(email) {
    const from = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.text || email.body || '').toLowerCase();

    return (
      from.includes('jago.com') ||
      subject.includes('payment to') ||
      body.includes('jago syariah') ||
      body.includes('thank you for trusting jago') ||
      (body.includes('jago') && body.includes('transaction summary'))
    );
  },

  parse(email) {
    const text = email.text || email.body || '';
    const subject = email.subject || '';

    // 1. Extract Merchant
    // Try from subject: "You have made a payment to Good Laundry 1"
    let merchant = '';
    const subjectMatch = subject.match(/payment to\s+([^\r\n💸]+)/i);
    if (subjectMatch) {
      merchant = subjectMatch[1].trim();
    }

    // If not in subject, try from body: "To Good Laundry 1"
    if (!merchant) {
      const toMatch = text.match(/\bTo\s+([^\r\n0-9]+)/i);
      if (toMatch) {
        merchant = toMatch[1].trim();
      }
    }

    if (!merchant) {
      merchant = 'Bank Jago Merchant';
    }

    // 2. Extract Amount
    let amount = 0;
    const amountMatch = text.match(/Amount\s*(?:Rp\.?|IDR)?\s*([0-9.,]+)/i) ||
                        text.match(/(?:Rp\.?|IDR)\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?)/i) ||
                        text.match(/(?:Rp\.?|IDR)\s*([0-9.,]+)/i);
    if (amountMatch) {
      amount = parseCurrencyAmount(amountMatch[1], 'IDR');
    }

    // 3. Extract Date & Time
    // e.g. "Transaction Date 06 November 2026, 19:20 WIB"
    let occurredAt = normalizeDate(email.date || '');
    let occurredTime = '';

    const dateMatch = text.match(/Transaction Date\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})(?:,?\s*([0-9]{2}:[0-9]{2}))?/i);
    if (dateMatch) {
      occurredAt = normalizeDate(dateMatch[1]);
      if (dateMatch[2]) {
        occurredTime = dateMatch[2];
      }
    }

    if (amount <= 0) {
      return null;
    }

    const category = categorizeTransaction(`${merchant} ${subject}`);
    const messageId = email.messageId || `jago_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const dedupHash = createDedupHash(merchant, amount, occurredAt);

    return {
      source: 'bank',
      provider: 'jago',
      merchant,
      amount,
      currency: 'IDR',
      category,
      occurredAt,
      occurredTime,
      confidence: 0.98,
      messageId,
      dedupHash,
      verificationStatus: "verified_with_fixture",
      rawSnippet: redactPII(text.slice(0, 300))
    };
  }
};

module.exports = jagoParser;
