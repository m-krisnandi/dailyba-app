'use client';

import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { Language } from '@/types/finance';
import { getTodayLocalDate, getYesterdayLocalDate } from '@/lib/dateUtils';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (date: string) => void;
  language: Language;
  dropUp?: boolean;
  className?: string;
  placeholder?: string;
  showTodayButton?: boolean;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  allowClear?: boolean;
}

export function CustomDatePicker({
  value,
  onChange,
  language,
  dropUp: explicitDropUp,
  className = '',
  placeholder,
  showTodayButton = true,
  size = 'md',
  align = 'left',
  allowClear = false,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedDropUp, setResolvedDropUp] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Dynamic collision detection to automatically open down or up based on available viewport space
  useLayoutEffect(() => {
    if (!isOpen) return;

    if (explicitDropUp !== undefined) {
      setResolvedDropUp(explicitDropUp);
      return;
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const calendarHeight = 360; // Estimated max height of calendar popover
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < calendarHeight && spaceAbove > spaceBelow && spaceAbove > 280) {
        setResolvedDropUp(true);
      } else {
        setResolvedDropUp(false);
      }
    }
  }, [isOpen, explicitDropUp]);

  // Parse current value or fallback
  const parsedValueDate = useMemo(() => {
    if (!value) return new Date();
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  }, [value]);

  // Calendar view month & year state
  const [viewYear, setViewYear] = useState(() => parsedValueDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsedValueDate.getMonth());

  useEffect(() => {
    if (value && value.includes('-')) {
      const [y, m] = value.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Weekday labels
  const weekdays = useMemo(() => {
    return language === 'ja'
      ? ['日', '月', '火', '水', '木', '金', '土']
      : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  }, [language]);

  // Format display text on trigger button
  const displayText = useMemo(() => {
    if (!value) {
      return placeholder || (language === 'ja' ? '日付未指定' : 'Select date');
    }

    const todayStr = getTodayLocalDate();
    const yesterdayStr = getYesterdayLocalDate();

    if (value === todayStr) {
      return language === 'ja' ? `今日 (${value})` : `Today (${value})`;
    }
    if (value === yesterdayStr) {
      return language === 'ja' ? `昨日 (${value})` : `Yesterday (${value})`;
    }

    if (language === 'ja') {
      return `${parsedValueDate.getFullYear()}年${parsedValueDate.getMonth() + 1}月${parsedValueDate.getDate()}日`;
    }
    return parsedValueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [value, parsedValueDate, language, placeholder]);

  // Calendar cells computation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const dateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    setViewYear(y);
    setViewMonth(m);
    onChange(getTodayLocalDate());
    setIsOpen(false);
  };

  const handleSetYesterday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const y = yest.getFullYear();
    const m = yest.getMonth();
    setViewYear(y);
    setViewMonth(m);
    onChange(getYesterdayLocalDate());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Month header label
  const monthHeaderLabel = useMemo(() => {
    if (language === 'ja') {
      return `${viewYear}年 ${viewMonth + 1}月`;
    }
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${monthNames[viewMonth]} ${viewYear}`;
  }, [viewYear, viewMonth, language]);

  const todayStr = getTodayLocalDate();

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <div className="flex items-center space-x-1.5 w-full">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 flex items-center justify-between rounded-xl border font-semibold transition-all cursor-pointer select-none ${
            size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2.5 text-xs sm:text-sm'
          } ${
            isOpen
              ? 'border-[var(--text-main)] bg-[var(--bg-subtle-hover)] text-[var(--text-main)] ring-1 ring-[var(--text-main)] shadow-xs'
              : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)]'
          } ${!value ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}
        >
          <div className="flex items-center space-x-2 min-w-0 pr-1 truncate">
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="tabular-numbers truncate font-mono text-[11px] sm:text-xs">
              {displayText}
            </span>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {allowClear && value && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="p-0.5 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer"
                title={language === 'ja' ? 'クリア' : 'Clear'}
              >
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* 1-Tap Quick Shortcut Pill */}
        {showTodayButton && (
          <button
            type="button"
            onClick={handleSetToday}
            className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer transition-all shrink-0 ${
              size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-3 py-2.5 text-xs'
            }`}
            title={language === 'ja' ? '今日に設定' : 'Set to today'}
          >
            {language === 'ja' ? '今日' : 'Today'}
          </button>
        )}
      </div>

      {/* Custom Modern Dropdown Calendar Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-50 w-[calc(100vw-2.5rem)] max-w-xs sm:w-80 sm:max-w-none p-4 rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)]/98 backdrop-blur-2xl shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${resolvedDropUp ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {/* Calendar Header with Nav Controls */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)] tabular-numbers font-mono">
              {monthHeaderLabel}
            </h4>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)] cursor-pointer transition-all"
                title={language === 'ja' ? '前月' : 'Previous month'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)] cursor-pointer transition-all"
                title={language === 'ja' ? '次月' : 'Next month'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((day, idx) => (
              <span
                key={day}
                className={`text-[11px] font-semibold ${
                  idx === 0
                    ? 'text-rose-400'
                    : idx === 6
                    ? 'text-sky-400'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1">
            {/* Days from previous month */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = prevMonthDays - firstDayIndex + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-8 w-8 sm:h-9 sm:w-9 mx-auto flex items-center justify-center text-xs text-[var(--text-faint)] tabular-numbers opacity-30 select-none font-mono"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
                dayNum
              ).padStart(2, '0')}`;
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 w-8 sm:h-9 sm:w-9 mx-auto rounded-xl flex items-center justify-center text-xs font-semibold tabular-numbers transition-all cursor-pointer font-mono ${
                    isSelected
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold shadow-xs border border-[var(--btn-primary-border)]'
                      : isToday
                      ? 'border border-[var(--border-strong)] text-[var(--text-main)] font-bold bg-[var(--bg-subtle-hover)]'
                      : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)]'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Shortcuts */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[11px]">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSetYesterday}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-medium cursor-pointer transition-all"
              >
                {language === 'ja' ? '昨日' : 'Yesterday'}
              </button>
              {allowClear && value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer transition-all"
                >
                  {language === 'ja' ? 'クリア' : 'Clear'}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleSetToday}
              className="text-[var(--text-main)] font-bold cursor-pointer hover:underline transition-all"
            >
              {language === 'ja' ? '今日を選択' : 'Select Today'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
