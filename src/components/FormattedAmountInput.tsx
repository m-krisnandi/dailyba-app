'use client';

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { formatNumberWithCommas } from '@/lib/currency';

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
      ...rest
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => internalRef.current as HTMLInputElement);

    const displayValue = String(value ?? '');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const currentVal = input.value;
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

      // Special ergonomic handling for Backspace directly after a comma:
      // e.g. "10,|000" -> backspace deletes '0' to become "1,000" instead of getting stuck on comma
      if (e.key === 'Backspace') {
        const input = internalRef.current;
        if (!input) return;

        const start = input.selectionStart;
        const end = input.selectionEnd;

        if (start !== null && start === end && start > 0) {
          if (input.value[start - 1] === ',') {
            e.preventDefault();
            // Delete the digit before the comma
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

    return (
      <input
        ref={internalRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        {...rest}
      />
    );
  }
);

FormattedAmountInput.displayName = 'FormattedAmountInput';
