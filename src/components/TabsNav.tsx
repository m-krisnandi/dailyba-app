'use client';

import React from 'react';
import { Language } from '@/types/finance';
import { translations } from '@/lib/i18n';
import {
  Zap,
  CalendarDays,
  Calendar,
  BarChart3,
  Vault,
  TrendingUp,
} from 'lucide-react';

export type TabKey = 'record' | 'daily' | 'monthly' | 'yearly' | 'savings' | 'investments';

interface TabsNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  language: Language;
  isMounted?: boolean;
}

export function TabsNav({ activeTab, onTabChange, language, isMounted = true }: TabsNavProps) {
  const t = translations[language];

  // Swapped: savings is placed before investments (more frequently used)
  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'record', label: t.nav.record, icon: Zap },
    { key: 'daily', label: t.nav.daily, icon: CalendarDays },
    { key: 'monthly', label: t.nav.monthly, icon: Calendar },
    { key: 'yearly', label: t.nav.yearly, icon: BarChart3 },
    { key: 'savings', label: t.nav.savings, icon: Vault },
    { key: 'investments', label: t.nav.investments, icon: TrendingUp },
  ];

  return (
    <div className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur-2xl py-2 sm:py-2.5 px-3 sm:px-4 sticky top-14 sm:top-16 z-20 shadow-xs transition-colors duration-200">
      <nav className="max-w-5xl mx-auto grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:space-x-2 sm:overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isMounted && activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center justify-center space-x-1.5 sm:space-x-2 px-2 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer min-w-0 sm:shrink-0 ${
                isActive
                  ? 'bg-[var(--bg-surface-solid)] text-[var(--text-main)] font-bold border border-[var(--border-strong)] shadow-sm ring-1 ring-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                  isActive
                    ? 'text-[var(--text-main)] stroke-[2.2]'
                    : 'text-[var(--text-faint)] stroke-[1.8]'
                }`}
              />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
