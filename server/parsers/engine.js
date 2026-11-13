const jagoParser = require('./jago');
const mandiriParser = require('./mandiri');
const bcaParser = require('./bca');
const paypayParser = require('./paypay');
const ewalletParser = require('./ewallet');
const globalBanksParser = require('./globalBanks');
const { aiFallbackParser, heuristicParse } = require('./aiFallback');

// 1. Verified Local Deterministic Parsers: strictly local regex, zero AI, 0.001s, zero data leakage
const VERIFIED_LOCAL_PARSERS = [
  jagoParser,
  mandiriParser
];

// 2. Dynamic Parsers (BCA, PayPay, E-wallets, Global Banks)
const DYNAMIC_PARSERS = [
  bcaParser,
  paypayParser,
  ewalletParser,
  globalBanksParser
];

/**
 * Option A (Smart Hybrid) Receipt Parsing Engine:
 * - Bank Jago & Bank Mandiri: Strictly local regex first (never sent to external AI).
 * - E-wallets, Shopee, PayPay, BCA & Global Banks: AI-first (Gemini 3.8 Flash) with regex fallback.
 *
 * @param {Object} email
 * @returns {Promise<import('./types').ParsedTransaction | null>}
 */
async function parseEmailReceipt(email) {
  if (!email) return null;

  // Step 1: Verified Local Parsers (Jago & Mandiri) strictly local
  for (const parser of VERIFIED_LOCAL_PARSERS) {
    try {
      if (parser.matches(email)) {
        const result = await parser.parse(email);
        if (result && result.amount > 0) {
          result.parsedBy = 'regex';
          result.emailType = result.emailType || 'payment';
          return result;
        }
      }
    } catch (err) {
      console.warn(`[Parser Engine] Error in local parser ${parser.name}:`, err.message);
    }
  }

  // Step 2: For E-wallets, Shopee, and Unverified Providers -> Try AI-first (Gemini 3.8 Flash)
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    try {
      const aiResult = await aiFallbackParser.parse(email);
      if (aiResult && aiResult.amount > 0) {
        return aiResult;
      }
    } catch (err) {
      console.warn('[Parser Engine] AI extraction failed, proceeding to dynamic regex fallback:', err.message);
    }
  }

  // Step 3: Dynamic Regex Fallback (BCA, PayPay, E-Wallets, Global Banks)
  for (const parser of DYNAMIC_PARSERS) {
    try {
      if (parser.matches(email)) {
        const result = await parser.parse(email);
        if (result && result.amount > 0) {
          result.parsedBy = 'regex';
          result.emailType = result.emailType || 'payment';
          return result;
        }
      }
    } catch (err) {
      console.warn(`[Parser Engine] Error in dynamic parser ${parser.name}:`, err.message);
    }
  }

  // Step 4: Final Heuristic Fallback
  try {
    const fallbackResult = heuristicParse(email);
    if (fallbackResult && fallbackResult.amount > 0) {
      return fallbackResult;
    }
  } catch (err) {
    console.warn('[Parser Engine] Error in final heuristic fallback:', err.message);
  }

  return null;
}

module.exports = {
  parseEmailReceipt,
  VERIFIED_LOCAL_PARSERS,
  DYNAMIC_PARSERS
};
