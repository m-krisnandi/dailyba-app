const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SECRET_SEED = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'dailyba_default_encryption_seed_2026';
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
 * Decrypts AES-256-GCM ciphertext string
 * @param {string} cipherText
 * @returns {string}
 */
function decrypt(cipherText) {
  if (!cipherText) return '';
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    // If not in iv:tag:encrypted format, return as-is (e.g. legacy plaintext migration)
    return cipherText;
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
    console.error('[Crypto] Decryption failed:', err.message);
    return '';
  }
}

/**
 * Sanitizes and redacts sensitive PII from email snippets before logging or storing
 * Masks credit card numbers, PAN, bank accounts, and phone numbers.
 * @param {string} text
 * @returns {string}
 */
function redactPII(text) {
  if (!text) return '';
  return String(text)
    // Redact 16-19 digit card PANs (e.g. 9360000801984237685)
    .replace(/\b(\d{4})\d{8,11}(\d{4})\b/g, '$1********$2')
    // Redact 10-14 digit bank account numbers (e.g. 502799066497)
    .replace(/\b(\d{3})\d{4,8}(\d{3})\b/g, '$1****$2')
    // Redact email addresses
    .replace(/([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, (match, user, domain) => {
      const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : '***';
      return `${maskedUser}@${domain}`;
    })
    // Redact Indonesian/International phone numbers
    .replace(/(?:\+62|08)[0-9]{8,12}/g, '[REDACTED_PHONE]');
}

module.exports = {
  encrypt,
  decrypt,
  redactPII
};
