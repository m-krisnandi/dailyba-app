'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  sublabel?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  badgeColor?: string;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
  dropUp?: boolean;
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  menuClassName = '',
  disabled = false,
  dropUp = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicked outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    (optValue: T) => {
      onChange(optValue);
      setIsOpen(false);
    },
    [onChange]
  );

  const SelectedIcon = selectedOption?.icon;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[var(--bg-subtle)] border text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer shadow-xs select-none outline-none ${
          isOpen
            ? 'border-[var(--accent-emerald)] ring-2 ring-[var(--accent-emerald)]/15 bg-[var(--bg-surface-solid)]'
            : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle-hover)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
          {SelectedIcon && (
            <div className="w-6 h-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-main)] shrink-0 shadow-2xs">
              <SelectedIcon className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="truncate text-xs font-bold text-[var(--text-main)]">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.sublabel && (
            <span className="text-[11px] font-mono text-[var(--text-muted)] truncate hidden sm:inline">
              ({selectedOption.sublabel})
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--accent-emerald)]' : ''
          }`}
        />
      </button>

      {/* Floating Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 z-50 w-full min-w-[180px] p-1.5 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)]/98 backdrop-blur-2xl shadow-2xl space-y-0.5 animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${menuClassName}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const OptIcon = opt.icon;

            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer select-none text-left ${
                  isSelected
                    ? 'bg-[var(--bg-subtle)] text-[var(--text-main)] font-bold shadow-2xs border border-[var(--border-subtle)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)] font-medium border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  {OptIcon && (
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected
                          ? 'bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--accent-emerald)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      <OptIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="block truncate text-xs">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="block text-[10px] text-[var(--text-faint)] font-mono truncate">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-[var(--accent-emerald)] stroke-[2.5] shrink-0 ml-1.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
