/**
 * Safe inline math expression evaluator for financial amounts
 * Supports: +, -, *, /, x, X, and decimal periods.
 * Strips thousand-separator commas so expressions like "10,000+20000" evaluate to 30,000.
 * Automatically recognizes Indonesian/European thousand-separator dots (e.g. "100.000 + 20.000" -> 120,000).
 * Supports standard "k" / "rb" shortcuts (e.g. "50k + 20k" -> 70,000, "100rb * 2" -> 200,000).
 * Examples:
 *   "10,000+20000" -> 30000
 *   "100.000 + 20.000" -> 120000
 *   "18,000*3" -> 54000
 *   "50k+20k" -> 70000
 *   "100rb+20rb" -> 120000
 *   "500+250" -> 750
 *   "12,500/2" -> 6250
 *   "50,000 - 15,000" -> 35000
 */

export interface MathEvalResult {
  hasExpression: boolean;
  rawExpression: string;
  result: number | null;
  formattedResult?: string;
  isValid: boolean;
}

/**
 * Formats all numeric operands inside an expression with commas (e.g. "10,000+20000" -> "10,000+20,000")
 */
export function formatMathExpression(expr: string): string {
  if (!expr || typeof expr !== 'string') return '';

  // First normalize Indonesian thousand-separator dots: e.g. 100.000 -> 100,000
  let normalized = expr;
  while (/(\d+)\.(\d{3})(?!\d)/.test(normalized)) {
    normalized = normalized.replace(/(\d+)\.(\d{3})(?!\d)/g, '$1,$2');
  }

  // Format all numeric operands with standard commas
  return normalized.replace(/\b\d+(?:,\d+)*(?:\.\d+)?/g, (match) => {
    const raw = match.replace(/,/g, '');
    if (!raw) return match;
    const parts = raw.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? `${intPart}.${parts.slice(1).join('')}` : intPart;
  });
}

export function evaluateInlineMath(input: string): MathEvalResult {
  if (!input || typeof input !== 'string') {
    return { hasExpression: false, rawExpression: '', result: null, isValid: false };
  }

  // Normalize: replace 'x' or 'X' with '*', convert Japanese full-width numbers & operators, strip all commas
  let normalized = input
    .trim()
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/×/g, '*')
    .replace(/[xX]/g, '*')
    .replace(/÷/g, '/')
    .replace(/＋/g, '+')
    .replace(/ー|−/g, '-')
    .replace(/,/g, '');

  // Expand Indonesian & global shorthand suffixes: 'k' / 'K' / 'rb' / 'RB' (e.g. 50k -> 50000, 100rb -> 100000)
  normalized = normalized.replace(/(\d+(?:\.\d+)?)\s*(?:k|rb)\b/gi, (_, num) => {
    return String(Math.round(Number(num) * 1000));
  });

  // Convert thousand-separator dots: if dot is followed by exactly 3 digits (e.g. 100.000 -> 100000, 1.250.000 -> 1250000)
  // while preserving true decimals like 12.5 or 0.25 (1 or 2 digits)
  while (/(\d+)\.(\d{3})(?!\d)/.test(normalized)) {
    normalized = normalized.replace(/(\d+)\.(\d{3})(?!\d)/g, '$1$2');
  }

  // Check if it contains any arithmetic operator
  const hasOperator = /[+\-*/]/.test(normalized);
  if (!hasOperator) {
    const num = Number(normalized);
    const isValid = !isNaN(num) && isFinite(num) && num >= 0;
    return {
      hasExpression: false,
      rawExpression: input,
      result: isValid ? num : null,
      isValid,
    };
  }

  // Sanitize: only allow numbers, dots, spaces, and + - * / ( )
  if (!/^[\d\s.+\-*/()]+$/.test(normalized)) {
    return { hasExpression: true, rawExpression: input, result: null, isValid: false };
  }

  try {
    // Tokenize
    const tokens: string[] = [];
    const tokenRegex = /\d+(?:\.\d+)?|[+\-*/()]/g;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(normalized)) !== null) {
      tokens.push(match[0]);
    }

    if (tokens.length === 0) {
      return { hasExpression: true, rawExpression: input, result: null, isValid: false };
    }

    // Evaluate simple left-to-right with standard operator precedence
    // Step 1: Handle * and /
    const intermediate: (number | string)[] = [];
    let i = 0;
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok === '*' || tok === '/') {
        const prev = intermediate.pop();
        const next = Number(tokens[i + 1]);
        if (typeof prev !== 'number' || isNaN(next)) {
          return { hasExpression: true, rawExpression: input, result: null, isValid: false };
        }
        if (tok === '/' && next === 0) {
          return { hasExpression: true, rawExpression: input, result: null, isValid: false }; // Division by zero
        }
        const res = tok === '*' ? prev * next : prev / next;
        intermediate.push(res);
        i += 2;
      } else if (!isNaN(Number(tok))) {
        intermediate.push(Number(tok));
        i++;
      } else {
        intermediate.push(tok);
        i++;
      }
    }

    // Step 2: Handle + and -
    let finalResult = typeof intermediate[0] === 'number' ? intermediate[0] : 0;
    let j = typeof intermediate[0] === 'number' ? 1 : 0;

    while (j < intermediate.length) {
      const op = intermediate[j];
      const next = intermediate[j + 1];
      if (typeof next !== 'number') break;

      if (op === '+') {
        finalResult += next;
      } else if (op === '-') {
        finalResult -= next;
      }
      j += 2;
    }

    if (isNaN(finalResult) || !isFinite(finalResult) || finalResult < 0) {
      return { hasExpression: true, rawExpression: input, result: null, isValid: false };
    }

    // Round to 2 decimal places to avoid floating point anomalies
    const rounded = Math.round(finalResult * 100) / 100;

    return {
      hasExpression: true,
      rawExpression: input,
      result: rounded,
      // Format with en-US to guarantee commas as thousand separators across all locales
      formattedResult: rounded.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      isValid: true,
    };
  } catch {
    return { hasExpression: true, rawExpression: input, result: null, isValid: false };
  }
}
