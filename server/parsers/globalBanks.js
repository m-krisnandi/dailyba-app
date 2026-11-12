const { normalizeDate, createDedupHash } = require('./types');
const { categorizeTransaction } = require('./categorizer');

/**
 * Global Banks & Cards Parser (PayPal, SMBC, MUFG, Rakuten Card, Wise, Revolut)
 */
const globalBanksParser = {
  name: 'global_banks',

  matches(email) {
    const from = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.text || email.body || '').toLowerCase();

    return (
      from.includes('paypal.com') ||
      from.includes('vpass.ne.jp') ||
      from.includes('bk.mufg.jp') ||
      from.includes('rakuten-card.co.jp') ||
      from.includes('wise.com') ||
      from.includes('revolut.com') ||
      subject.includes('paypal') ||
      subject.includes('三井住友') ||
      subject.includes('三菱ufj') ||
      subject.includes('楽天カード') ||
      body.includes('paypal') ||
      body.includes('三井住友カード') ||
      body.includes('三菱ｕｆｊ銀行')
    );
  },

  parse(email) {
    const text = email.text || email.body || '';
    const subject = email.subject || '';
    const from = (email.from || '').toLowerCase();
    const combined = `${from} ${subject} ${text}`.toLowerCase();

    let provider = 'generic';
    let source = 'bank';
    let currency = 'USD';

    if (combined.includes('paypal')) {
      provider = 'paypal';
      source = 'ewallet';
    } else if (combined.includes('vpass') || combined.includes('三井住友')) {
      provider = 'smbc';
      source = 'credit_card';
      currency = 'JPY';
    } else if (combined.includes('mufg') || combined.includes('三菱ufj')) {
      provider = 'mufg';
      source = 'bank';
      currency = 'JPY';
    } else if (combined.includes('rakuten-card') || combined.includes('楽天カード')) {
      provider = 'rakuten_card';
      source = 'credit_card';
      currency = 'JPY';
    } else if (combined.includes('wise')) {
      provider = 'wise';
      source = 'bank';
    }

    // 1. Merchant Extraction
    let merchant = '';
    // PayPal style: "You sent a payment of $X to Y" or "Receipt for your payment to Y"
    const ppMatch = subject.match(/(?:payment to|sent .* to|receipt for)\s+([^\r\n.]+)/i);
    if (ppMatch) {
      merchant = ppMatch[1].trim();
    }

    if (!merchant) {
      const genericMatch = text.match(/(?:利用先|ご利用先|加盟店|Merchant|Paid to|To)[:：\s]+([^\r\n]+)/i);
      if (genericMatch) {
        merchant = genericMatch[1].trim();
      }
    }

    if (!merchant) {
      merchant = `${provider.toUpperCase()} Transaction`;
    }

    // 2. Amount and Currency Detection
    let amount = 0;

    // Check for USD ($)
    const usdMatch = text.match(/(?:\$|USD\s*)([0-9]+(?:\.[0-9]{2})?)/i) || subject.match(/(?:\$|USD\s*)([0-9]+(?:\.[0-9]{2})?)/i);
    // Check for JPY (¥ or 円)
    const jpyMatch = text.match(/(?:[¥￥]\s*|[0-9,]+\s*円)/) || text.match(/(?:利用金額|お支払い金額|金額)[:：\s]*(?:[¥￥]?\s*)?([0-9,]+)/);
    // Check for IDR (Rp)
    const idrMatch = text.match(/(?:Rp\.?|IDR)\s*([0-9.,]+)/i);

    if (currency === 'JPY' || jpyMatch) {
      currency = 'JPY';
      const m = text.match(/(?:[¥￥]\s*)([0-9,]+)/) ||
                text.match(/([0-9,]+)\s*円/) ||
                text.match(/(?:利用金額|お支払い金額|金額)[:：\s]*(?:[¥￥]?\s*)?([0-9,]+)/);
      if (m) {
        amount = Math.round(parseFloat(m[1].replace(/,/g, ''))) || 0;
      }
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

    // 3. Date
    let occurredAt = normalizeDate(email.date || '');
    let occurredTime = '';

    const dtMatch = text.match(/(?:利用日時|日時|Date|Tanggal)[:：\s]*([0-9]{4}[年/-]\s*[0-9]{1,2}[月/-]\s*[0-9]{1,2}日?|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
    if (dtMatch) {
      occurredAt = normalizeDate(dtMatch[1]);
    }

    if (amount <= 0) {
      return null;
    }

    const category = categorizeTransaction(`${merchant} ${subject}`);
    const messageId = email.messageId || `${provider}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const dedupHash = createDedupHash(merchant, amount, occurredAt);

    return {
      source,
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

module.exports = globalBanksParser;
