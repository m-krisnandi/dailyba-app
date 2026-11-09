'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Language } from '@/types/finance';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  language: Language;
  dropUp?: boolean;
  className?: string;
}

export function CustomDatePicker({
  value,
  onChange,
  language,
  dropUp = false,
  className = '',
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback
  const parsedValueDate = useMemo(() => {
    if (!value) return new Date();
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [value]);

  // Calendar view month & year state
  const [viewYear, setViewYear] = useState(() => parsedValueDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsedValueDate.getMonth());

  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

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
  }, [value, parsedValueDate, language]);

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

  const handleSelectDay = (day: number) => {
    const yStr = String(viewYear);
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    onChange(`${yStr}-${mStr}-${dStr}`);
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    setViewYear(y);
    setViewMonth(m);
    onChange(today.toISOString().split('T')[0]);
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
    onChange(yest.toISOString().split('T')[0]);
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

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button with Apple Liquid Glass Styling */}
      <div className="flex items-center space-x-1.5 w-full">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none ${
            isOpen
              ? 'border-[var(--text-main)] bg-[var(--bg-subtle-hover)] text-[var(--text-main)] ring-1 ring-[var(--text-main)] shadow-xs'
              : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)]'
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0 pr-1">
            <CalendarIcon className="w-4 h-4 text-[var(--text-main)] shrink-0" />
            <span className="tabular-numbers truncate font-mono text-xs">{displayText}</span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* 1-Tap Quick Shortcut Pill */}
        <button
          type="button"
          onClick={handleSetToday}
          className="px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer transition-all shrink-0"
          title={language === "ja" ? "今日に設定" : "Set to today"}
        >
          {language === 'ja' ? '今日' : 'Today'}
        </button>
      </div>

      {/* Custom Modern Dropdown Calendar Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-[calc(100vw-2.5rem)] max-w-xs sm:w-80 sm:max-w-none p-4 rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)]/98 backdrop-blur-2xl shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
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
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-main)] cursor-pointer transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((wd, i) => (
              <span
                key={wd}
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  i === 0 ? 'text-[var(--accent-rose)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Day Grid Cells */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank leading days from previous month */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <span
                key={`prev-${i}`}
                className="h-8 flex items-center justify-center text-[11px] text-[var(--text-faint)] opacity-40 font-mono"
              >
                {prevMonthDays - firstDayIndex + i + 1}
              </span>
            ))}

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
            <button
              type="button"
              onClick={handleSetYesterday}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-medium cursor-pointer transition-all"
            >
              {language === 'ja' ? '昨日' : 'Yesterday'}
            </button>
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
