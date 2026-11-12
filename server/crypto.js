const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

// In production, strictly require ENCRYPTION_KEY to prevent silent data loss or security degradation
if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
  console.error('[SECURITY FATAL] ENCRYPTION_KEY must be set in production environment!');
  process.exit(1);
}

const SECRET_SEED = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'dailyba_dev_encryption_seed_2026';
// Derived once at startup
const DERIVED_KEY = crypto.scryptSync(SECRET_SEED, 'dailyba_salt_v1', 32);

/**
 * Encrypts plaintext string using AES-256-GCM
 * @param {string} text
 * @returns {string} iv:tag:encrypted (in hex)
 */
function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, DERIVED_KEY, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM ciphertext string.
 * Returns null if decryption fails or authentication tag is invalid (e.g. key changed).
 * @param {string} cipherText
 * @returns {string|null}
 */
function decrypt(cipherText) {
  if (!cipherText) return '';
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    // If legacy unencrypted plaintext, return null to force secure reconnection
    return null;
  }
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, DERIVED_KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Crypto] Decryption failed (invalid key or corrupted tag):', err.message);
    return null;
  }
}

/**
 * Constant-time comparison to prevent timing attacks on HMAC signatures
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Removes personal greeting lines (e.g. "Halo User ,", "Yth. Nasabah", "様") before sending to external LLM
 * @param {string} text
 * @param {string} [userName] Optional user account name to redact
 * @returns {string}
 */
function stripGreetings(text, userName = '') {
  if (!text) return '';
  let str = String(text)
    .replace(/^(?:Halo|Assalamu'alaikum|Dear|Hi|Hello|Kepada\s+Yth|Yth\.?)[^\n\r]+[\n\r]+/gim, '')
    .replace(/(?:Halo|Assalamu'alaikum|Dear|Hi|Hello|Kepada\s+Yth|Yth\.?)\s+[A-Za-z\s]{2,40}[,、]/gi, '')
    .replace(/^[^\n\r]+(?:様|さま)[^\n\r]*[\n\r]+/gim, '')
    .replace(/(?:Nama\s+Pengirim|Nama\s+Nasabah|Customer\s+Name)[:：\s]+[^\n\r]+/gi, '');

  if (userName && userName.length >= 3) {
    const escaped = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    str = str.replace(new RegExp(escaped, 'gi'), '[CUSTOMER_NAME]');
  }

  return str;
}

/**
 * Sanitizes and redacts sensitive PII from email snippets before logging, storing, or sending to LLM.
 * Carefully preserves merchant names with numbers (e.g. "Good Laundry 1"), amounts (e.g. "1500000"), and dates ("2026-11-06").
 * @param {string} text
 * @returns {string}
 */
function redactPII(text) {
  if (!text) return '';
  let clean = String(text);

  // 1. Redact 16-19 digit card PANs (e.g. 9360000801984237685 or 9360 0008 0198 4237)
  clean = clean.replace(/\b(\d{4})[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4,7}\b/g, '$1********');

  // 2. Redact 10-14 digit bank account numbers (explicitly labeled or standalone sequence of 10-14 digits)
  // Ensures 7-digit amounts like 1500000 or dates like 20261106 are not matched!
  clean = clean.replace(/(?:rekening|account|from|ke\s*rek|no\.?\s*rek)[:\s]*([0-9]{10,14})/gi, (match, acc) => {
    return `rekening ${acc.slice(0, 3)}****${acc.slice(-3)}`;
  });

  // Standalone 10-14 digit sequences (e.g. From 502799066497)
  clean = clean.replace(/\b(\d{3})\d{4,8}(\d{3})\b/g, '$1****$2');

  // 3. Redact email addresses
  clean = clean.replace(/([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, (match, user, domain) => {
    const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : '***';
    return `${maskedUser}@${domain}`;
  });

  // 4. Redact Indonesian/International mobile phone numbers
  clean = clean.replace(/(?:\+62|08)[0-9]{8,12}/g, '[REDACTED_PHONE]');

  return clean;
}

module.exports = {
  encrypt,
  decrypt,
  timingSafeEqual,
  stripGreetings,
  redactPII
};
