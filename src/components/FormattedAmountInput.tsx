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
}

export const FormattedAmountInput = forwardRef<HTMLInputElement, FormattedAmountInputProps>(
  (
    {
      value,
      onChange,
      allowDecimal = true,
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

    // Evaluate inline math if operators (+, -, *, /, x, X) are detected
    const mathEval = useMemo(() => {
      if (!displayValue || !/[+\-*/xX×÷]/.test(displayValue)) {
        return null;
      }
      return evaluateInlineMath(displayValue);
    }, [displayValue]);

    const applyMathResult = (res: number) => {
      const formatted = formatNumberWithCommas(String(res));
      onChange(formatted, res);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const currentVal = input.value;

      // If typing math operators, preserve them
      const hasMathOp = /[+\-*/xX×÷]/.test(currentVal);
      if (hasMathOp) {
        // Keep digits, dots, commas, spaces, and operators
        const sanitized = currentVal.replace(/[^0-9.,+\-*/xX×÷\s]/g, '');
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
        applyMathResult(mathEval.result);
        return;
      }

      // Special ergonomic handling for Backspace directly after a comma:
      if (e.key === 'Backspace' && !/[+\-*/xX×÷]/.test(displayValue)) {
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
        applyMathResult(mathEval.result);
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
        {/* Math Calculation Preview Pill */}
        {mathEval && mathEval.isValid && mathEval.result !== null && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              applyMathResult(mathEval.result!);
            }}
            className="absolute right-2 -bottom-6 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 z-20 flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-mono text-[11px] font-bold shadow-xs transition-all cursor-pointer animate-fade-in"
            title="Click or press Enter to calculate"
          >
            <Calculator className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>= {mathEval.formattedResult}</span>
          </button>
        )}
      </div>
    );
  }
);

FormattedAmountInput.displayName = 'FormattedAmountInput';
