'use client';

import React from 'react';
import { Currency, ExpenseCategory, FundingSource, Language, RecurringBill } from '@/types/finance';
import { formatCurrency, translations } from '@/lib/i18n';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  Tv,
  Music,
  Wifi,
  HeartPulse,
  Home,
  Dumbbell,
  Server,
  CreditCard,
  X,
  Plus,
  Sparkles,
  LucideIcon,
} from 'lucide-react';
import { getCategoryBadgeStyle } from '@/lib/constants';

interface PresetItem {
  id: string;
  name: string;
  category: ExpenseCategory;
  defaultAmounts: Record<Currency, number>;
  source: FundingSource;
  dayOfMonth: number;
  icon: LucideIcon;
  descriptionJa: string;
  descriptionEn: string;
}

const POPULAR_PRESETS: PresetItem[] = [
  {
    id: 'preset_netflix',
    name: 'Netflix',
    category: 'shopping',
    defaultAmounts: { JPY: 1490, IDR: 186000, USD: 15.49, MMK: 35000 },
    source: 'bank',
    dayOfMonth: 15,
    icon: Tv,
    descriptionJa: '動画ストリーミング定額配信',
    descriptionEn: 'Streaming video entertainment plan',
  },
  {
    id: 'preset_spotify',
    name: 'Spotify Premium',
    category: 'shopping',
    defaultAmounts: { JPY: 980, IDR: 54990, USD: 10.99, MMK: 23000 },
    source: 'bank',
    dayOfMonth: 10,
    icon: Music,
    descriptionJa: '音楽ストリーミング配信',
    descriptionEn: 'High quality music subscription',
  },
  {
    id: 'preset_wifi',
    name: 'Home Fiber / WiFi',
    category: 'mobile',
    defaultAmounts: { JPY: 4800, IDR: 350000, USD: 45, MMK: 75000 },
    source: 'bank',
    dayOfMonth: 20,
    icon: Wifi,
    descriptionJa: '光回線・自宅インターネット',
    descriptionEn: 'Home broadband / fiber internet',
  },
  {
    id: 'preset_health',
    name: 'Health / BPJS Insurance',
    category: 'family',
    defaultAmounts: { JPY: 12000, IDR: 150000, USD: 50, MMK: 50000 },
    source: 'bank',
    dayOfMonth: 10,
    icon: HeartPulse,
    descriptionJa: '国民健康保険 / 社会保険 / BPJS',
    descriptionEn: 'National health insurance commitment',
  },
  {
    id: 'preset_rent',
    name: 'House Rent / Kos',
    category: 'rent',
    defaultAmounts: { JPY: 65000, IDR: 1500000, USD: 500, MMK: 350000 },
    source: 'bank',
    dayOfMonth: 1,
    icon: Home,
    descriptionJa: '毎月の住居費・家賃・管理費',
    descriptionEn: 'Monthly residence rent or lease',
  },
  {
    id: 'preset_gym',
    name: 'Gym & Fitness',
    category: 'others',
    defaultAmounts: { JPY: 7500, IDR: 350000, USD: 40, MMK: 65000 },
    source: 'bank',
    dayOfMonth: 5,
    icon: Dumbbell,
    descriptionJa: 'フィットネスジム月額会費',
    descriptionEn: 'Gym & fitness membership fee',
  },
  {
    id: 'preset_cloud',
    name: 'Cloud VPS / Hosting',
    category: 'vps',
    defaultAmounts: { JPY: 1200, IDR: 150000, USD: 10, MMK: 21000 },
    source: 'bank',
    dayOfMonth: 28,
    icon: Server,
    descriptionJa: 'クラウドサーバー・インフラ費用',
    descriptionEn: 'Cloud hosting / VPS server bill',
  },
  {
    id: 'preset_loan',
    name: 'Vehicle / Device Installment',
    category: 'others',
    defaultAmounts: { JPY: 25000, IDR: 1200000, USD: 150, MMK: 250000 },
    source: 'bank',
    dayOfMonth: 25,
    icon: CreditCard,
    descriptionJa: '車両ローン・分割払・定期引落し',
    descriptionEn: 'Vehicle / gadget loan installment',
  },
];

interface SubscriptionPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currency: Currency;
  onSelectPreset: (preset: Omit<RecurringBill, 'id'>) => void;
}

export function SubscriptionPresetsModal({
  isOpen,
  onClose,
  language,
  currency,
  onSelectPreset,
}: SubscriptionPresetsModalProps) {
  useBodyScrollLock(isOpen);
  const t = translations[language];

  if (!isOpen) return null;

  const handleApply = (preset: PresetItem) => {
    const defaultAmount = preset.defaultAmounts[currency] || preset.defaultAmounts.JPY;
    onSelectPreset({
      name: preset.name,
      category: preset.category,
      defaultAmount,
      currency,
      source: preset.source,
      dayOfMonth: preset.dayOfMonth,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="liquid-glass-modal rounded-3xl max-w-lg w-full my-auto p-5 sm:p-7 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-main)]">
                {language === 'ja' ? '人気サブスク・固定費テンプレート' : 'Popular Subscription Presets'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {language === 'ja'
                  ? 'タップするだけで毎月の固定費リストに即時追加できます'
                  : 'Tap any preset to instantly add to your monthly commitments'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {POPULAR_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const amount = preset.defaultAmounts[currency] || preset.defaultAmounts.JPY;
            const style = getCategoryBadgeStyle('expense', preset.category);

            return (
              <div
                key={preset.id}
                className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] flex flex-col justify-between transition-all group shadow-xs space-y-2.5"
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${style.border} ${style.bg} ${style.text}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-[var(--text-main)] truncate">
                      {preset.name}
                    </h4>
                    <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                      {language === 'ja' ? preset.descriptionJa : preset.descriptionEn}
                    </p>
                    <p className="text-xs font-extrabold text-[var(--accent-emerald)] font-mono tabular-numbers mt-1">
                      {formatCurrency(amount, currency)}{' '}
                      <span className="text-[10px] text-[var(--text-muted)] font-normal">
                        {language === 'ja' ? '/月' : '/mo'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]">
                  <span>
                    {language === 'ja' ? `毎月${preset.dayOfMonth}日` : `Due day ${preset.dayOfMonth}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApply(preset)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border border-[var(--btn-primary-border)] hover:opacity-90 active:scale-95 font-bold transition-all flex items-center space-x-1 cursor-pointer shadow-xs text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{language === 'ja' ? '追加' : 'Add'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
