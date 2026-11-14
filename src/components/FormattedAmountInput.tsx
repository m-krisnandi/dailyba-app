'use client';

import React, { useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { formatNumberWithCommas } from '@/lib/currency';
import { evaluateInlineMath } from '@/lib/mathParser';
import { Calculator } from 'lucide-react';

export interface FormattedAmountInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string | number;
  onChange: (formattedValue: string, rawNumber: number) => void;
  allowDecimal?: boolean;
  hasCurrencySuffix?: boolean;
  currency?: string;
  onMathEvaluated?: (formula: string, result: number) => void;
}

export const FormattedAmountInput = forwardRef<HTMLInputElement, FormattedAmountInputProps>(
  (
    {
      value,
      onChange,
      allowDecimal = true,
      hasCurrencySuffix = true,
      currency,
      onMathEvaluated,
      className,
      placeholder = '0',
      onKeyDown,
      onBlur,
      ...rest
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => internalRef.current as HTMLInputElement);

    const displayValue = String(value ?? '');

    // Evaluate inline math if operators (+, -, *, /, x, X) or shorthand (k, rb) are detected
    const mathEval = useMemo(() => {
      if (!displayValue || !(/[-+*/xX×÷]|(?:k|rb)/i.test(displayValue))) {
        return null;
      }
      return evaluateInlineMath(displayValue);
    }, [displayValue]);

    const applyMathResult = (res: number, originalExpr?: string) => {
      const formatted = formatNumberWithCommas(String(res));
      onChange(formatted, res);
      const expr = originalExpr || (mathEval ? mathEval.rawExpression : '');
      if (expr) {
        onMathEvaluated?.(expr, res);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const currentVal = input.value;

      // If typing math operators or shorthand suffixes, preserve them
      const hasMathOp = /[-+*/xX×÷]|(?:k|rb)/i.test(currentVal);
      if (hasMathOp) {
        // Keep digits, dots, commas, spaces, k, rb, and operators
        const sanitized = currentVal.replace(/[^0-9.,+*/xX×÷\skKRrbB-]/gi, '');
        const evaluated = evaluateInlineMath(sanitized);
        const rawNum = evaluated.isValid && evaluated.result !== null ? evaluated.result : 0;
        onChange(sanitized, rawNum);
        return;
      }

      const cursorPos = input.selectionStart ?? currentVal.length;

      // Count how many non-comma/non-formatting characters were before cursor
      const charsBeforeCursor = currentVal.slice(0, cursorPos);
      const digitsBefore = allowDecimal
        ? charsBeforeCursor.replace(/[^0-9.]/g, '').length
        : charsBeforeCursor.replace(/[^0-9]/g, '').length;

      // Clean raw input
      const rawCleaned = allowDecimal
        ? currentVal.replace(/[^0-9.]/g, '')
        : currentVal.replace(/[^0-9]/g, '');

      // Prevent multiple dots
      const parts = rawCleaned.split('.');
      const normalizedRaw = parts.length > 2
        ? `${parts[0]}.${parts.slice(1).join('')}`
        : rawCleaned;

      const newFormatted = formatNumberWithCommas(normalizedRaw);
      const rawNumber = parseFloat(normalizedRaw) || 0;

      onChange(newFormatted, rawNumber);

      // Restore cursor position seamlessly in the next frame
      requestAnimationFrame(() => {
        if (!input) return;
        let newCursorPos = 0;
        let count = 0;

        for (let i = 0; i < newFormatted.length; i++) {
          if (newFormatted[i] !== ',') {
            count++;
          }
          if (count === digitsBefore) {
            newCursorPos = i + 1;
            break;
          }
        }

        if (digitsBefore === 0) {
          newCursorPos = 0;
        }

        try {
          input.setSelectionRange(newCursorPos, newCursorPos);
        } catch {
          // ignore selection errors if input blurred
        }
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;

      // If user presses Enter or '=', resolve math expression immediately
      if ((e.key === 'Enter' || e.key === '=') && mathEval && mathEval.isValid && mathEval.result !== null) {
        e.preventDefault();
        applyMathResult(mathEval.result, mathEval.rawExpression);
        return;
      }

      // Special ergonomic handling for Backspace directly after a comma:
      if (e.key === 'Backspace' && !(/[-+*/xX×÷]|(?:k|rb)/i.test(displayValue))) {
        const input = internalRef.current;
        if (!input) return;

        const start = input.selectionStart;
        const end = input.selectionEnd;

        if (start !== null && start === end && start > 0) {
          if (input.value[start - 1] === ',') {
            e.preventDefault();
            const before = input.value.slice(0, start - 2);
            const after = input.value.slice(start);
            const rawCleaned = (before + after).replace(/[^0-9.]/g, '');
            const newFormatted = formatNumberWithCommas(rawCleaned);
            const rawNumber = parseFloat(rawCleaned) || 0;

            const digitsBefore = before.replace(/[^0-9.]/g, '').length;

            onChange(newFormatted, rawNumber);

            requestAnimationFrame(() => {
              let newCursor = 0;
              let count = 0;
              for (let i = 0; i < newFormatted.length; i++) {
                if (newFormatted[i] !== ',') count++;
                if (count === digitsBefore) {
                  newCursor = i + 1;
                  break;
                }
              }
              try {
                input.setSelectionRange(newCursor, newCursor);
              } catch {
                // ignore
              }
            });
          }
        }
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      onBlur?.(e);
      // Auto-evaluate any pending math expression on blur
      if (mathEval && mathEval.isValid && mathEval.result !== null) {
        applyMathResult(mathEval.result, mathEval.rawExpression);
      }
    };

    return (
      <div className="relative w-full">
        <input
          ref={internalRef}
          type="text"
          inputMode="text"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={className}
          {...rest}
        />
        {/* Right side controls: Math Preview Pill + Currency Code grouped seamlessly in flex */}
        <div className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-auto">
          {mathEval && mathEval.isValid && mathEval.result !== null && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyMathResult(mathEval.result!, mathEval.rawExpression);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold shadow-md transition-all cursor-pointer animate-fade-in shrink-0"
              title="Click or press Enter to calculate"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>= {mathEval.formattedResult}</span>
            </button>
          )}
          {currency && (
            <span className="text-sm font-mono font-bold text-[var(--text-muted)] pointer-events-none select-none tracking-wide shrink-0">
              {currency}
            </span>
          )}
        </div>
      </div>
    );
  }
);

FormattedAmountInput.displayName = 'FormattedAmountInput';
