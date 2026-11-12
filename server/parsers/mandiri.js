const { normalizeDate, createDedupHash, parseCurrencyAmount } = require('./types');
const { categorizeTransaction } = require('./categorizer');
const { redactPII } = require('../crypto');

/**
 * Livin' by Mandiri Email Parser
 * Handles QR payment receipts and transfer notifications from Bank Mandiri.
 */
const mandiriParser = {
  name: 'mandiri',

  matches(email) {
    const from = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.text || email.body || '').toLowerCase();

    return (
      from.includes('bankmandiri.co.id') ||
      from.includes('livin') ||
      subject.includes('pembayaran berhasil') ||
      body.includes("livin' by mandiri") ||
      (body.includes('mandiri') && (body.includes('nominal transaksi') || body.includes('detail transaksi')))
    );
  },

  parse(email) {
    const text = email.text || email.body || '';
    const subject = email.subject || '';

    // 1. Extract Merchant / Penerima
    // In Livin' emails:
    // Penerima
    // RM SALERO BARU
    let merchant = '';
    const penerimaMatch = text.match(/Penerima\s*[\r\n]+\s*([^\r\n]+)/i);
    if (penerimaMatch) {
      merchant = penerimaMatch[1].trim();
    }

    // Secondary search for Tujuan or Merchant
    if (!merchant) {
      const tujuanMatch = text.match(/(?:Tujuan|Merchant|Kepada)[:\s]+([^\r\n]+)/i);
      if (tujuanMatch) {
        merchant = tujuanMatch[1].trim();
      }
    }

    if (!merchant) {
      merchant = 'Livin Mandiri Merchant';
    }

    // 2. Extract Amount
    let amount = 0;
    const amountMatch = text.match(/Nominal(?:\s+Transaksi)?\s*(?:Rp\.?|IDR)?\s*([0-9.,]+)/i) ||
                        text.match(/Total\s*(?:Rp\.?|IDR)?\s*([0-9.,]+)/i) ||
                        text.match(/(?:Rp\.?|IDR)\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?)/i) ||
                        text.match(/(?:Rp\.?|IDR)\s*([0-9.,]+)/i);

    if (amountMatch) {
      amount = parseCurrencyAmount(amountMatch[1], 'IDR');
    }

    // 3. Extract Date & Time
    // Tanggal 12 Nov 2026
    // Jam 18:02:33 WIB
    let occurredAt = normalizeDate(email.date || '');
    let occurredTime = '';

    const dateMatch = text.match(/Tanggal\s*[:\s]*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
    if (dateMatch) {
      occurredAt = normalizeDate(dateMatch[1]);
    }

    const timeMatch = text.match(/Jam\s*[:\s]*([0-9]{2}:[0-9]{2})/i);
    if (timeMatch) {
      occurredTime = timeMatch[1];
    }

    if (amount <= 0) {
      return null;
    }

    const category = categorizeTransaction(`${merchant} ${subject}`);
    const messageId = email.messageId || `mandiri_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const dedupHash = createDedupHash(merchant, amount, occurredAt);

    return {
      source: 'bank',
      provider: 'mandiri',
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

module.exports = mandiriParser;
