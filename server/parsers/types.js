const crypto = require('crypto');

/**
 * Standardized Parsed Transaction structure
 * @typedef {Object} ParsedTransaction
 * @property {string} source - 'bank' | 'ewallet' | 'credit_card' | 'cash'
 * @property {string} provider - 'jago' | 'mandiri' | 'bca' | 'paypay' | 'gopay' | 'ovo' | 'shopeepay' | 'dana' | 'rakuten' | 'smbc' | 'mufg' | 'paypal' | 'generic'
 * @property {string} merchant
 * @property {number} amount - positive number (integer for JPY/IDR)
 * @property {'IDR' | 'JPY' | 'USD' | 'MMK'} currency
 * @property {string} category - expense category key
 * @property {string} occurredAt - YYYY-MM-DD
 * @property {string} [occurredTime] - HH:mm
 * @property {number} confidence - 0.0 to 1.0
 * @property {string} messageId - unique email message id or synthetic id
 * @property {string} dedupHash - hash of (merchant + amount + occurredAt)
 * @property {string} [rawSnippet] - excerpt of the email
 */

/**
 * Generates a SHA-256 deduplication hash based on merchant, amount, and date.
 * Used to identify identical or potential duplicate transactions in the UI.
 *
 * @param {string} merchant
 * @param {number} amount
 * @param {string} occurredAt
 * @returns {string}
 */
function createDedupHash(merchant, amount, occurredAt) {
  const normMerchant = String(merchant || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normAmount = Math.round(Number(amount) || 0);
  const normDate = String(occurredAt || '').slice(0, 10);
  return crypto.createHash('sha256').update(`${normMerchant}:${normAmount}:${normDate}`).digest('hex').slice(0, 24);
}

/**
 * Safely parses currency string amounts handling Indonesian, Japanese, and US/European number formats.
 *
 * Examples:
 * - "15.000" (IDR) -> 15000
 * - "10.000,00" (IDR) -> 10000
 * - "1.500.000,50" (IDR) -> 1500001
 * - "1,500" (JPY) -> 1500
 * - "12.50" (USD) -> 12.5
 * - "1,500.50" (USD) -> 1500.5
 *
 * @param {string|number} rawInput
 * @param {'IDR'|'JPY'|'USD'|'MMK'} [currencyHint='IDR']
 * @returns {number}
 */
function parseCurrencyAmount(rawInput, currencyHint = 'IDR') {
  if (typeof rawInput === 'number') return rawInput;
  if (!rawInput) return 0;

  let clean = String(rawInput).trim().replace(/[^0-9.,]/g, '');
  if (!clean) return 0;

  // Case 1: contains both '.' and ','
  if (clean.includes('.') && clean.includes(',')) {
    const lastDot = clean.lastIndexOf('.');
    const lastComma = clean.lastIndexOf(',');
    if (lastComma > lastDot) {
      // European/Indonesian style: 1.500.000,50 -> dot is thousand, comma is decimal
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // US/UK style: 1,500,000.50 -> comma is thousand, dot is decimal
      clean = clean.replace(/,/g, '');
    }
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : (currencyHint === 'JPY' || currencyHint === 'IDR' ? Math.round(val) : val);
  }

  // Case 2: contains only '.'
  if (clean.includes('.')) {
    // If currency is IDR or JPY and matches thousands format (e.g. 15.000, 1.500.000)
    if (currencyHint === 'IDR' || currencyHint === 'JPY') {
      const parts = clean.split('.');
      const isThousandPattern = parts.slice(1).every(p => p.length === 3);
      if (isThousandPattern) {
        clean = clean.replace(/\./g, '');
        return Math.round(parseFloat(clean)) || 0;
      }
    }
    // Otherwise standard decimal point (e.g. 12.50)
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }

  // Case 3: contains only ','
  if (clean.includes(',')) {
    // If followed by 2 digits and currency is IDR (e.g. 10000,00) -> decimal
    if (currencyHint === 'IDR' && /,\d{2}$/.test(clean)) {
      clean = clean.replace(',', '.');
      return Math.round(parseFloat(clean)) || 0;
    }
    // If followed by 3 digits -> thousands separator (e.g. 1,500 or 15,000)
    const parts = clean.split(',');
    const isThousandPattern = parts.slice(1).every(p => p.length === 3);
    if (isThousandPattern) {
      clean = clean.replace(/,/g, '');
      return Math.round(parseFloat(clean)) || 0;
    }
    clean = clean.replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }

  // Plain integer
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

/**
 * Decodes and sanitizes MIME HTML/text payloads received from Gmail API.
 * Converts HTML table layouts into readable text, decodes HTML entities, and strips tags.
 *
 * @param {string} rawHtmlOrText
 * @returns {string} Clean plain text
 */
function cleanMimeText(rawHtmlOrText) {
  if (!rawHtmlOrText) return '';
  let str = String(rawHtmlOrText);

  // 1. Remove style, script, and head blocks
  str = str.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  str = str.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  str = str.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

  // 2. Convert block boundaries to newlines
  str = str.replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n');
  str = str.replace(/<(br|hr)\s*\/?>/gi, '\n');
  str = str.replace(/<\/(td|th)>/gi, ' ');

  // 3. Strip remaining HTML tags
  str = str.replace(/<[^>]+>/g, '');

  // 4. Decode HTML entities
  const entities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&apos;': "'",
    '&yen;': '¥',
    '&#165;': '¥',
    '&copy;': ''
  };

  str = str.replace(/&(?:nbsp|amp|lt|gt|quot|#39|#x27|apos|yen|#165|copy);/gi, match => {
    return entities[match.toLowerCase()] ?? ' ';
  });

  // Decode arbitrary decimal entities (e.g. &#8217;)
  str = str.replace(/&#(\d+);/g, (m, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return ' ';
    }
  });

  // 5. Normalize whitespace and newlines
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  str = str.replace(/[ \t]+/g, ' ');
  str = str.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return str.trim();
}

/**
 * Converts various date formats (e.g. "06 November 2026", "12 Nov 2026", "2026/11/12", "2026年11月12日")
 * into ISO "YYYY-MM-DD".
 *
 * @param {string} rawDate
 * @returns {string} YYYY-MM-DD
 */
function normalizeDate(rawDate) {
  if (!rawDate) return new Date().toISOString().slice(0, 10);

  const clean = String(rawDate).trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(isoMatch[2]).padStart(2, '0');
    const d = String(isoMatch[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY (e.g. 10/11/2026 or 12-11-2026)
  const dmyNumeric = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyNumeric) {
    const d = String(dmyNumeric[1]).padStart(2, '0');
    const m = String(dmyNumeric[2]).padStart(2, '0');
    const y = dmyNumeric[3];
    return `${y}-${m}-${d}`;
  }

  // Japanese date format: 2026年11月12日
  const jaMatch = clean.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (jaMatch) {
    const y = jaMatch[1];
    const m = String(jaMatch[2]).padStart(2, '0');
    const d = String(jaMatch[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD Month YYYY (e.g. 06 November 2026 or 12 Nov 2026)
  const dmyMatch = clean.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (dmyMatch) {
    const d = String(dmyMatch[1]).padStart(2, '0');
    const monthStr = dmyMatch[2].toLowerCase();
    const y = dmyMatch[3];
    const months = {
      jan: '01', januari: '01', january: '01',
      feb: '02', februari: '02', february: '02',
      mar: '03', maret: '03', march: '03',
      apr: '04', april: '04',
      may: '05', mei: '05',
      jun: '06', juni: '06', june: '06',
      jul: '07', juli: '07', july: '07',
      aug: '08', agustus: '08', august: '08',
      sep: '09', september: '09',
      oct: '10', oktober: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', desember: '12', december: '12'
    };
    const m = months[monthStr] || months[monthStr.slice(0, 3)] || '01';
    return `${y}-${m}-${d}`;
  }

  // Fallback to JS Date
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

module.exports = {
  createDedupHash,
  parseCurrencyAmount,
  cleanMimeText,
  normalizeDate
};
