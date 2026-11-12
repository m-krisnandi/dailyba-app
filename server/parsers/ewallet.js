const { normalizeDate, createDedupHash } = require('./types');
const { categorizeTransaction } = require('./categorizer');

/**
 * Multi-E-Wallet Parser for Indonesian & Japanese e-wallets
 * (GoPay, OVO, ShopeePay, DANA, Rakuten Pay, Mobile Suica, LINE Pay)
 */
const ewalletParser = {
  name: 'ewallet',

  matches(email) {
    const from = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.text || email.body || '').toLowerCase();

    return (
      from.includes('gojek.com') ||
      from.includes('gopay') ||
      from.includes('ovo.id') ||
      from.includes('shopee') ||
      from.includes('dana.id') ||
      from.includes('mobilesuica.com') ||
      from.includes('pay.rakuten.co.jp') ||
      subject.includes('gopay') ||
      subject.includes('ovo') ||
      subject.includes('shopeepay') ||
      subject.includes('dana') ||
      subject.includes('楽天ペイ') ||
      subject.includes('suica') ||
      subject.includes('line pay') ||
      body.includes('gopay') ||
      body.includes('ovo') ||
      body.includes('shopeepay') ||
      body.includes('dana') ||
      body.includes('モバイルsuica')
    );
  },

  parse(email) {
    const text = email.text || email.body || '';
    const subject = email.subject || '';
    const from = (email.from || '').toLowerCase();
    const combined = `${from} ${subject} ${text}`.toLowerCase();

    // Identify provider
    let provider = 'ewallet';
    let defaultCurrency = 'IDR';

    if (combined.includes('gopay') || combined.includes('gojek')) {
      provider = 'gopay';
      defaultCurrency = 'IDR';
    } else if (combined.includes('ovo')) {
      provider = 'ovo';
      defaultCurrency = 'IDR';
    } else if (combined.includes('shopeepay') || combined.includes('shopee')) {
      provider = 'shopeepay';
      defaultCurrency = 'IDR';
    } else if (combined.includes('dana')) {
      provider = 'dana';
      defaultCurrency = 'IDR';
    } else if (combined.includes('楽天ペイ') || combined.includes('rakuten')) {
      provider = 'rakuten';
      defaultCurrency = 'JPY';
    } else if (combined.includes('suica') || combined.includes('mobilesuica')) {
      provider = 'suica';
      defaultCurrency = 'JPY';
    } else if (combined.includes('line pay')) {
      provider = 'linepay';
      defaultCurrency = 'JPY';
    }

    // 1. Merchant Extraction
    let merchant = '';
    const mMatch = text.match(/(?:Merchant|Penerima|Tujuan|利用先|加盟店|支払先|Store|Recipient)[:\s]+([^\r\n]+)/i);
    if (mMatch) {
      merchant = mMatch[1].trim();
    } else {
      // From subject (e.g. "Payment to Starbucks on GoPay")
      const subjMatch = subject.match(/(?:to|di|at)\s+([^\r\n-]+)/i);
      if (subjMatch) {
        merchant = subjMatch[1].trim();
      }
    }

    if (!merchant) {
      merchant = `${provider.toUpperCase()} Merchant`;
    }

    // 2. Amount & Currency
    let amount = 0;
    let currency = defaultCurrency;

    if (defaultCurrency === 'JPY') {
      const jpyMatch = text.match(/(?:金額|合計|お支払い金額)[:：\s]*(?:[¥￥]?\s*)?([0-9,]+)\s*(?:円)?/) ||
                       text.match(/(?:[¥￥]\s*)([0-9,]+)/) ||
                       text.match(/([0-9,]+)\s*円/);
      if (jpyMatch) {
        amount = Math.round(parseFloat(jpyMatch[1].replace(/,/g, ''))) || 0;
      }
    } else {
      // IDR
      const idrMatch = text.match(/(?:Total|Nominal|Jumlah|Amount)(?:\s+Pembayaran)?\s*[:\s]*(?:Rp\.?|IDR)?\s*([0-9.,]+)/i) ||
                       text.match(/(?:Rp\.?|IDR)\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2})?)/i) ||
                       text.match(/(?:Rp\.?|IDR)\s*([0-9.,]+)/i);
      if (idrMatch) {
        let raw = idrMatch[1].trim();
        if (raw.includes(',') && raw.includes('.')) {
          raw = raw.replace(/\./g, '').replace(',', '.');
        } else if (raw.includes('.')) {
          raw = raw.replace(/\./g, '');
        } else if (raw.includes(',')) {
          raw = raw.replace(',', '.');
        }
        amount = Math.round(parseFloat(raw)) || 0;
      }
    }

    // 3. Date & Time
    let occurredAt = normalizeDate(email.date || '');
    let occurredTime = '';

    const dtMatch = text.match(/(?:Tanggal|Date|日時|利用日時)[:：\s]*([0-9]{4}[年/-]\s*[0-9]{1,2}[月/-]\s*[0-9]{1,2}日?|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
    if (dtMatch) {
      occurredAt = normalizeDate(dtMatch[1]);
    }
    const tMatch = text.match(/(?:Jam|Time|時刻)[:：\s]*([0-9]{2}:[0-9]{2})/i);
    if (tMatch) {
      occurredTime = tMatch[1];
    }

    if (amount <= 0) {
      return null;
    }

    const category = categorizeTransaction(`${merchant} ${subject}`);
    const messageId = email.messageId || `${provider}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const dedupHash = createDedupHash(merchant, amount, occurredAt);

    return {
      source: 'ewallet',
      provider,
      merchant,
      amount,
      currency,
      category,
      occurredAt,
      occurredTime,
      confidence: 0.60,
      messageId,
      dedupHash,
      verificationStatus: "unverified_heuristic",
      rawSnippet: text.slice(0, 300)
    };
  }
};

module.exports = ewalletParser;
