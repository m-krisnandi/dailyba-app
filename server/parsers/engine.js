const jagoParser = require('./jago');
const mandiriParser = require('./mandiri');
const bcaParser = require('./bca');
const paypayParser = require('./paypay');
const ewalletParser = require('./ewallet');
const globalBanksParser = require('./globalBanks');
const aiFallbackParser = require('./aiFallback');

const PARSERS = [
  jagoParser,
  mandiriParser,
  bcaParser,
  paypayParser,
  ewalletParser,
  globalBanksParser
];

/**
 * Parses an email receipt against specialized parsers, falling back to AI/heuristics.
 *
 * @param {Object} email
 * @param {string} [email.from]
 * @param {string} [email.subject]
 * @param {string} [email.text]
 * @param {string} [email.body]
 * @param {string} [email.date]
 * @param {string} [email.messageId]
 * @returns {Promise<import('./types').ParsedTransaction | null>}
 */
async function parseEmailReceipt(email) {
  if (!email) return null;

  // Try specialized parsers first
  for (const parser of PARSERS) {
    try {
      if (parser.matches(email)) {
        const result = await parser.parse(email);
        if (result && result.amount > 0) {
          return result;
        }
      }
    } catch (err) {
      console.warn(`[Parser Engine] Error in ${parser.name}:`, err.message);
    }
  }

  // Fallback to AI / Heuristic parser
  try {
    const fallbackResult = await aiFallbackParser.parse(email);
    if (fallbackResult && fallbackResult.amount > 0) {
      return fallbackResult;
    }
  } catch (err) {
    console.warn('[Parser Engine] Error in fallback parser:', err.message);
  }

  return null;
}

module.exports = {
  parseEmailReceipt,
  PARSERS
};
