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
  normalizeDate
};
