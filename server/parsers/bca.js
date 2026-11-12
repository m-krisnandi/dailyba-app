const { normalizeDate, createDedupHash } = require('./types');
const { categorizeTransaction } = require('./categorizer');

/**
 * Bank Central Asia (BCA / myBCA / KlikBCA) Email Parser
 */
const bcaParser = {
  name: 'bca',

  matches(email) {
    const from = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.text || email.body || '').toLowerCase();

    return (
      from.includes('bca.co.id') ||
      from.includes('klikbca.com') ||
      subject.includes('bca') ||
      body.includes('klikbca') ||
      body.includes('mybca') ||
      (body.includes('bca') && (body.includes('transaksi qris') || body.includes('bukti transfer')))
    );
  },

  parse(email) {
    const text = email.text || email.body || '';
    const subject = email.subject || '';

    // 1. Merchant / Recipient
    let merchant = '';
    const mMatch = text.match(/(?:Nama\s+Merchant|Merchant|Nama\s+Penerima|Tujuan|Ke\s+Rekening)[:\s]+([^\r\n]+)/i);
    if (mMatch) {
      merchant = mMatch[1].trim();
    }

    if (!merchant) {
      merchant = 'BCA Merchant';
    }

    // 2. Amount
    let amount = 0;
    const amountMatch = text.match(/(?:Jumlah|Nominal)(?:\s+Transaksi)?\s*[:\s]*(?:Rp\.?|IDR)?\s*([0-9.,]+)/i) ||
                        text.match(/(?:Rp\.?|IDR)\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?)/i);

    if (amountMatch) {
      let raw = amountMatch[1].trim();
      if (raw.includes(',') && raw.includes('.')) {
        raw = raw.replace(/\./g, '').replace(',', '.');
      } else if (raw.includes('.')) {
        raw = raw.replace(/\./g, '');
      } else if (raw.includes(',')) {
        raw = raw.replace(',', '.');
      }
      amount = Math.round(parseFloat(raw)) || 0;
    }

    // 3. Date & Time
    let occurredAt = normalizeDate(email.date || '');
    let occurredTime = '';

    const dateMatch = text.match(/Tanggal\s*[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{4}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
    if (dateMatch) {
      occurredAt = normalizeDate(dateMatch[1]);
    }

    const timeMatch = text.match(/(?:Jam|Pukul)\s*[:\s]*([0-9]{2}:[0-9]{2})/i);
    if (timeMatch) {
      occurredTime = timeMatch[1];
    }

    if (amount <= 0) {
      return null;
    }

    const category = categorizeTransaction(`${merchant} ${subject}`);
    const messageId = email.messageId || `bca_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const dedupHash = createDedupHash(merchant, amount, occurredAt);

    return {
      source: 'bank',
      provider: 'bca',
      merchant,
      amount,
      currency: 'IDR',
      category,
      occurredAt,
      occurredTime,
      confidence: 0.98,
      messageId,
      dedupHash,
      rawSnippet: text.slice(0, 300)
    };
  }
};

module.exports = bcaParser;
