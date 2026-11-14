'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check, ChevronDown } from 'lucide-react';
import { Language } from '@/types/finance';

interface CustomTimePickerProps {
  value: string; // "HH:MM"
  onChange: (time: string) => void;
  language: Language;
  className?: string;
}

const COMMON_PRESETS = [
  { time: '08:00', labelEn: '8:00 AM', labelJa: '朝 08:00' },
  { time: '12:30', labelEn: '12:30 PM', labelJa: '昼 12:30' },
  { time: '18:00', labelEn: '6:00 PM', labelJa: '夕 18:00' },
  { time: '20:00', labelEn: '8:00 PM', labelJa: '夜 20:00' },
  { time: '21:30', labelEn: '9:30 PM', labelJa: '夜 21:30' },
];

export function CustomTimePicker({
  value,
  onChange,
  language,
  className = '',
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoursStr, minutesStr] = (value || '20:00').split(':');
  const [selectedHour, setSelectedHour] = useState(hoursStr || '20');
  const [selectedMinute, setSelectedMinute] = useState(minutesStr || '00');

  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setSelectedHour(h);
      setSelectedMinute(m);
    }
  }, [value]);

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

  const handleApply = (h: string, m: string) => {
    const formatted = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    onChange(formatted);
  };

  const handlePresetSelect = (presetTime: string) => {
    const [h, m] = presetTime.split(':');
    setSelectedHour(h);
    setSelectedMinute(m);
    handleApply(h, m);
    setIsOpen(false);
  };

  const handleConfirm = () => {
    handleApply(selectedHour, selectedMinute);
    setIsOpen(false);
  };

  const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] hover:border-emerald-500/50 text-[var(--text-main)] font-mono text-xs font-bold shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
      >
        <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>{selectedHour}:{selectedMinute}</span>
        <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Sheet */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 z-[110] w-[310px] sm:w-[340px] rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] p-4 shadow-2xl backdrop-blur-2xl animate-fade-in space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-[var(--text-main)]">
                {language === 'ja' ? 'リマインダー通知時間' : 'Reminder Time'}
              </span>
            </div>
            <span className="text-sm font-extrabold font-mono text-[var(--accent-emerald)] bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              {selectedHour}:{selectedMinute}
            </span>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              {language === 'ja' ? 'よく使う時間' : 'Quick Presets'}
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {COMMON_PRESETS.map((p) => (
                <button
                  key={p.time}
                  type="button"
                  onClick={() => handlePresetSelect(p.time)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedHour === p.time.split(':')[0] && selectedMinute === p.time.split(':')[1]
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] shadow-xs'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {language === 'ja' ? p.labelJa : p.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Grid selector: Hours & Minutes */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Hours Grid */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {language === 'ja' ? '時 (Hour)' : 'Hour (0-23)'}
              </span>
              <div className="grid grid-cols-4 gap-1 max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                {hoursList.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSelectedHour(h)}
                    className={`py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer text-center ${
                      selectedHour === h
                        ? 'bg-[var(--accent-emerald)] text-white shadow-xs'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Grid */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {language === 'ja' ? '分 (Minute)' : 'Minute'}
              </span>
              <div className="grid grid-cols-3 gap-1 max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                {minutesList.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMinute(m)}
                    className={`py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer text-center ${
                      selectedMinute === m
                        ? 'bg-[var(--accent-emerald)] text-white shadow-xs'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    :{m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-semibold cursor-pointer transition-all"
            >
              {language === 'ja' ? '閉じる' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-3 py-1.5 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-xs hover:opacity-90 active:scale-95 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{language === 'ja' ? '設定' : 'Apply'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
