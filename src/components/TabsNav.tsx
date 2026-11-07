'use client';

import React from 'react';
import { Language } from '@/types/finance';
import { translations } from '@/lib/i18n';
import {
  Zap,
  CalendarDays,
  Calendar,
  BarChart3,
  TrendingUp,
  Vault,
} from 'lucide-react';

export type TabKey = 'record' | 'daily' | 'monthly' | 'yearly' | 'investments' | 'savings';

interface TabsNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  language: Language;
  isMounted?: boolean;
}

export function TabsNav({ activeTab, onTabChange, language, isMounted = true }: TabsNavProps) {
  const t = translations[language];

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'record', label: t.nav.record, icon: Zap },
    { key: 'daily', label: t.nav.daily, icon: CalendarDays },
    { key: 'monthly', label: t.nav.monthly, icon: Calendar },
    { key: 'yearly', label: t.nav.yearly, icon: BarChart3 },
    { key: 'investments', label: t.nav.investments, icon: TrendingUp },
    { key: 'savings', label: t.nav.savings, icon: Vault },
  ];

  return (
    <div className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur-2xl py-2.5 px-4 sticky top-16 z-20 shadow-xs transition-colors duration-200">
      <nav className="max-w-5xl mx-auto flex items-center justify-between sm:justify-start sm:space-x-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isMounted && activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[var(--bg-surface-solid)] text-[var(--text-main)] font-bold border border-[var(--border-strong)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive
                    ? 'text-[var(--text-main)] stroke-[2.2]'
                    : 'text-[var(--text-faint)] stroke-[1.8]'
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
