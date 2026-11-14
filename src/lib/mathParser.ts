/**
 * Safe inline math expression evaluator for financial amounts
 * Supports: +, -, *, /, x, X, and decimal periods.
 * Strips thousand-separator commas so expressions like "10,000+20000" evaluate to 30,000.
 * Examples:
 *   "10,000+20000" -> 30000
 *   "18,000*3" -> 54000
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

export function evaluateInlineMath(input: string): MathEvalResult {
  if (!input || typeof input !== 'string') {
    return { hasExpression: false, rawExpression: '', result: null, isValid: false };
  }

  // Normalize: replace 'x' or 'X' with '*', convert Japanese full-width numbers & operators, strip all commas
  const normalized = input
    .trim()
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/×/g, '*')
    .replace(/[xX]/g, '*')
    .replace(/÷/g, '/')
    .replace(/＋/g, '+')
    .replace(/ー|−/g, '-')
    .replace(/,/g, '');

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
      formattedResult: rounded.toLocaleString(),
      isValid: true,
    };
  } catch {
    return { hasExpression: true, rawExpression: input, result: null, isValid: false };
  }
}
