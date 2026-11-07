'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Currency, Language } from '@/types/finance';
import { translations } from '@/lib/i18n';
import { ExchangeRates, DEFAULT_RATES } from '@/lib/currency';
import { KakeiboLogo } from '@/components/KakeiboLogo';
import { useAuth } from '@/lib/authContext';
import {
  Globe,
  Sun,
  Moon,
  Database,
  ArrowRightLeft,
  ChevronDown,
  Check,
  Cloud,
  LogIn,
  RefreshCw,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

interface HeaderProps {
  language: Language;
  currency: Currency;
  rates?: ExchangeRates;
  onLanguageChange: (lang: Language) => void;
  onCurrencyChange: (curr: Currency) => void;
  onOpenBackup: () => void;
  onOpenAuth: () => void;
  onManualSync?: () => void;
}

const CURRENCIES: { code: Currency; label: string; symbol: string; name: string }[] = [
  { code: 'JPY', label: '¥ JPY', symbol: '¥', name: 'Yen' },
  { code: 'IDR', label: 'Rp IDR', symbol: 'Rp', name: 'Rupiah' },
  { code: 'USD', label: '$ USD', symbol: '$', name: 'Dollar' },
  { code: 'MMK', label: 'K MMK', symbol: 'K', name: 'Kyat' },
];

export function Header({
  language,
  currency,
  rates = DEFAULT_RATES,
  onLanguageChange,
  onCurrencyChange,
  onOpenBackup,
  onOpenAuth,
  onManualSync,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(true);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  const { user, isAuthenticated, syncStatus, lastSyncedAt, logout } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem('kakeibo_theme');
    if (saved === 'light') {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
    setIsMounted(true);
  }, []);

  // Dismiss dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(e.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kakeibo_theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kakeibo_theme', 'dark');
      setIsDark(true);
    }
  };

  const idrRate = rates.IDR ? Math.round(rates.IDR * 10) / 10 : 114.2;
  const usdRate = rates.USD ? Math.round((1 / rates.USD) * 10) / 10 : 158.4;
  const mmkRate = rates.MMK ? Math.round(rates.MMK * 10) / 10 : 13.3;

  const rateText =
    currency === 'IDR'
      ? `1 JPY ≈ Rp ${idrRate.toLocaleString()}`
      : currency === 'USD'
      ? `1 USD ≈ ¥${usdRate}`
      : currency === 'MMK'
      ? `1 JPY ≈ K ${mmkRate.toLocaleString()}`
      : `1 JPY ≈ Rp ${idrRate.toLocaleString()}`;

  const currentCurrencyItem = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur-2xl transition-colors duration-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand & Minimalist Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <KakeiboLogo size={32} />
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-[var(--text-main)] leading-none flex items-center space-x-1.5 whitespace-nowrap">
              <span>{t.appTitle}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-emerald)] animate-pulse" />
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 hidden sm:block font-medium">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Live Rate Pill (Desktop) */}
          <div
            className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[11px] text-[var(--text-muted)] tabular-numbers font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] shrink-0"
            title="Live Exchange Rate"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-emerald)] shadow-[0_0_8px_var(--accent-emerald)]" />
            <ArrowRightLeft className="w-3 h-3 text-[var(--text-faint)]" />
            <span>{rateText}</span>
          </div>

          {/* Currency Dropdown Selector */}
          <div className="relative shrink-0" ref={currencyDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer font-mono shadow-xs whitespace-nowrap"
              title="Select Active Currency"
            >
              <span className="font-mono">{currentCurrencyItem.label}</span>
              <ChevronDown
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
                  isCurrencyDropdownOpen ? 'rotate-180 text-[var(--text-main)]' : ''
                }`}
              />
            </button>

            {isCurrencyDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] shadow-xl p-1.5 z-50 animate-fade-in space-y-0.5">
                {CURRENCIES.map((c) => {
                  const isSelected = currency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        onCurrencyChange(c.code);
                        setIsCurrencyDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--bg-subtle)] text-[var(--text-main)] font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-[var(--text-main)]">
                          {c.label}
                        </span>
                        <span className="text-[11px] text-[var(--text-faint)]">
                          ({c.name})
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[var(--accent-emerald)] stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => onLanguageChange(language === 'en' ? 'ja' : 'en')}
            className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-medium text-[var(--text-main)] transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Toggle Language (English / Japanese)"
          >
            <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="hidden sm:inline">{language === 'en' ? 'EN' : '日本語'}</span>
          </button>

          {/* Cloud Sync & Auth Button / User Profile Pill */}
          <div className="relative shrink-0" ref={userMenuRef}>
            {!isMounted ? (
              <div className="w-16 sm:w-20 h-7 rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)]" />
            ) : isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer shadow-xs whitespace-nowrap"
                title="Account & Cloud Sync"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center text-[10px] font-black shrink-0">
                  {userInitial}
                </div>
                <span className="hidden sm:inline max-w-[80px] truncate text-xs font-medium text-[var(--text-main)]">
                  {displayName}
                </span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    syncStatus === 'syncing'
                      ? 'bg-amber-400 animate-spin'
                      : syncStatus === 'error'
                      ? 'bg-rose-500'
                      : 'bg-emerald-400 shadow-[0_0_6px_var(--accent-emerald)]'
                  }`}
                  title={`Sync: ${syncStatus}`}
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                title="Sign In to your account"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Sign In</span>
              </button>
            )}

            {/* User Dropdown Menu */}
            {isUserMenuOpen && isAuthenticated && user && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] shadow-2xl p-3 z-50 animate-fade-in space-y-2.5">
                <div className="px-2 py-1 border-b border-[var(--border-subtle)] pb-2">
                  <p className="text-xs font-bold text-[var(--text-main)] truncate">
                    {user.name || 'Dailyba Account'}
                  </p>
                  <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                    {user.email}
                  </p>
                  <div className="flex items-center space-x-1.5 mt-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {syncStatus === 'syncing'
                        ? 'Syncing to Cloud...'
                        : 'Cloud Backup Active'}
                    </span>
                  </div>
                  {lastSyncedAt && (
                    <p className="text-[10px] text-[var(--text-faint)] font-mono mt-0.5">
                      Synced: {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  {onManualSync && (
                    <button
                      type="button"
                      onClick={() => {
                        onManualSync();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sync Vault Now</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onOpenBackup();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Backup & Restore Data</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenAuth();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Account & Server Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Backup / Export (Desktop & Tablet) */}
          <button
            type="button"
            onClick={onOpenBackup}
            className="hidden sm:flex p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shrink-0"
            title={t.actions.export}
          >
            <Database className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Theme Toggle (Light <-> Dark) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shrink-0"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 stroke-[2] text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 stroke-[2] text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
