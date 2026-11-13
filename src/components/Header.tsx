'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Currency, Language } from '@/types/finance';
import { translations } from '@/lib/i18n';
import { ExchangeRates, DEFAULT_RATES } from '@/lib/currency';
import { KakeiboLogo } from '@/components/KakeiboLogo';
import { SecuritySettingsModal } from '@/components/SecuritySettingsModal';
import { useAuth } from '@/lib/authContext';
import { APP_VERSION } from '@/lib/version';
import { Capacitor } from '@capacitor/core';
import {
  Globe,
  Sun,
  Moon,
  Database,
  ArrowRightLeft,
  ChevronDown,
  Check,
  Bell,
  LogIn,
  RefreshCw,
  LogOut,
  Trash2,
  User as UserIcon,
  Smartphone,
  Shield,
  Download,
  Mail,
} from 'lucide-react';

interface HeaderProps {
  language: Language;
  currency: Currency;
  rates?: ExchangeRates;
  onLanguageChange: (lang: Language) => void;
  onCurrencyChange: (curr: Currency) => void;
  onOpenBackup: () => void;
  onOpenAuth: () => void;
  onOpenEmailSync?: () => void;
  pendingEmailSyncCount?: number;
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
  onOpenEmailSync,
  pendingEmailSyncCount = 0,
  onManualSync,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(true);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(true); // default true to avoid SSR layout shift, checked upon mount
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  const { user, isAuthenticated, syncStatus, lastSyncedAt, logout } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem('kakeibo_theme');
    let effectiveDark = true;
    if (saved === 'light') {
      effectiveDark = false;
    } else if (saved === 'dark') {
      effectiveDark = true;
    } else {
      // Default to device OS preference if not explicitly set manually by user
      effectiveDark = Boolean(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    if (effectiveDark) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }

    // If user has not explicitly chosen a manual theme yet, dynamically follow OS theme changes
    const mediaQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const currentSaved = localStorage.getItem('kakeibo_theme');
      if (!currentSaved) {
        if (e.matches) {
          document.documentElement.classList.add('dark');
          setIsDark(true);
        } else {
          document.documentElement.classList.remove('dark');
          setIsDark(false);
        }
      }
    };
    mediaQuery?.addEventListener('change', handleSystemThemeChange);

    try {
      setIsNativeApp(Capacitor.isNativePlatform());
    } catch {
      setIsNativeApp(false);
    }
    setIsMounted(true);

    return () => {
      mediaQuery?.removeEventListener('change', handleSystemThemeChange);
    };
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
    // Prevent GPU compositor stuttering on Xiaomi/MIUI by temporarily freezing transitions
    document.documentElement.classList.add('no-theme-transition');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kakeibo_theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kakeibo_theme', 'dark');
      setIsDark(true);
    }
    window.requestAnimationFrame(() => {
      setTimeout(() => {
        document.documentElement.classList.remove('no-theme-transition');
      }, 50);
    });
  };

  const idrRate = rates.IDR ? Math.round(rates.IDR * 10) / 10 : 114.2;
  const usdRate = rates.USD ? Math.round((1 / rates.USD) * 10) / 10 : 158.4;
  const mmkRate = rates.MMK ? Math.round(rates.MMK * 10) / 10 : 28.0;

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
      <div className="max-w-5xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Brand & Minimalist Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <KakeiboLogo size={28} />
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
        <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 shrink-0">
          {/* Live Rate Pill (Desktop Only) */}
          <div
            className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[11px] text-[var(--text-muted)] tabular-numbers font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] shrink-0"
            title={language === 'ja' ? 'リアルタイム為替レート' : 'Live Exchange Rate'}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-emerald)] shadow-[0_0_8px_var(--accent-emerald)]" />
            <ArrowRightLeft className="w-3 h-3 text-[var(--text-faint)]" />
            <span>{rateText}</span>
          </div>

          {/* Download Android APK (Desktop Web Browser Only - on Mobile available inside User Menu) */}
          {isMounted && !isNativeApp && (
            <a
              href="/dailyba.apk"
              download={`dailyba-v${APP_VERSION}.apk`}
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
              title={language === 'ja' ? `Android APKをダウンロード (v${APP_VERSION})` : `Download Android APK (v${APP_VERSION})`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'ja' ? 'APK入手' : 'Get APK'}</span>
              <Download className="w-3 h-3 hidden md:inline shrink-0 opacity-80" />
            </a>
          )}

          {/* Currency Dropdown Selector (Compact on Mobile) */}
          <div className="relative shrink-0" ref={currencyDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer font-mono shadow-xs whitespace-nowrap"
              title={language === 'ja' ? '通貨を選択' : 'Select Active Currency'}
            >
              <span className="font-mono text-xs hidden sm:inline">{currentCurrencyItem.label}</span>
              <span className="font-mono text-xs sm:hidden">{currentCurrencyItem.code}</span>
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

          {/* Language Switcher (Desktop Only - on Mobile available inside User Menu) */}
          <button
            type="button"
            onClick={() => onLanguageChange(language === 'en' ? 'ja' : 'en')}
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-xs font-medium text-[var(--text-main)] transition-all cursor-pointer whitespace-nowrap shrink-0"
            title={language === 'ja' ? '言語切替 (日本語 / 英語)' : 'Toggle Language (English / Japanese)'}
          >
            <Globe className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            <span>{language === 'en' ? 'EN' : '日本語'}</span>
          </button>

          {/* Bank & Email Sync Button (Shortcut on both Mobile & Desktop) */}
          {onOpenEmailSync && (
            <button
              type="button"
              onClick={onOpenEmailSync}
              className="relative flex p-1.5 sm:p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shrink-0"
              title={t.nav.bankEmailSync}
            >
              <Mail className="w-4 h-4 stroke-[2]" />
              {Boolean(pendingEmailSyncCount > 0) && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                  {pendingEmailSyncCount > 9 ? '9+' : pendingEmailSyncCount}
                </span>
              )}
            </button>
          )}

          {/* Cloud Sync & Auth Button / User Profile Pill (Hub for all settings on mobile) */}
          <div className="relative shrink-0" ref={userMenuRef}>
            {!isMounted ? (
              <div className="w-8 sm:w-20 h-7 rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)]" />
            ) : isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer shadow-xs whitespace-nowrap"
                title={language === 'ja' ? 'アカウント・設定メニュー' : 'Account & Settings Menu'}
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
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                title={language === 'ja' ? 'メニュー / ログイン' : 'Menu / Sign In'}
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{language === 'ja' ? 'ログイン' : 'Sign In'}</span>
              </button>
            )}

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] shadow-2xl p-3 z-50 animate-fade-in space-y-2.5">
                {isAuthenticated && user ? (
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
                          ? (language === 'ja' ? 'クラウド同期中...' : 'Syncing to Cloud...')
                          : (language === 'ja' ? 'クラウド同期有効' : 'Cloud Backup Active')}
                      </span>
                    </div>
                    {lastSyncedAt && (
                      <p className="text-[10px] text-[var(--text-faint)] font-mono mt-0.5">
                        {language === 'ja' ? '同期完了:' : 'Synced:'}{' '}
                        {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="px-2 py-1 border-b border-[var(--border-subtle)] pb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-main)]">Dailyba Guest</span>
                      <span className="text-[10px] font-mono text-[var(--text-faint)]">Offline Mode</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAuth();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{language === 'ja' ? 'ログイン / 新規登録' : 'Sign In / Register'}</span>
                    </button>
                  </div>
                )}

                {/* Mobile Quick Toggles Row (Theme & Language) */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-all cursor-pointer select-none"
                    title={isDark ? 'Switch to Light' : 'Switch to Dark'}
                  >
                    {isDark ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Light</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Dark</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onLanguageChange(language === 'en' ? 'ja' : 'en')}
                    className="flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-all cursor-pointer select-none font-mono"
                    title="Toggle Language"
                  >
                    <Globe className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <span>{language === 'en' ? '日本語' : 'EN'}</span>
                  </button>
                </div>

                {/* Download Android APK (Web Browser Only) */}
                {isMounted && !isNativeApp && (
                  <a
                    href="/dailyba.apk"
                    download={`dailyba-v${APP_VERSION}.apk`}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.nav.getApk}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-80">v{APP_VERSION}</span>
                  </a>
                )}

                <div className="space-y-1">
                  {isAuthenticated && onManualSync && (
                    <button
                      type="button"
                      onClick={() => {
                        onManualSync();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.nav.syncVault}</span>
                    </button>
                  )}

                  {onOpenEmailSync && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenEmailSync();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>{language === 'ja' ? '銀行・決済メール連携' : 'Bank & Email Sync'}</span>
                      </div>
                      {Boolean(pendingEmailSyncCount > 0) && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400">
                          {pendingEmailSyncCount}
                        </span>
                      )}
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
                    <span>{t.nav.backupRestore}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenBackup();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{t.nav.remindersNotifications}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSecurityModalOpen(true);
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t.nav.securityAppLock}</span>
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
                    <span>{t.nav.accountSettings}</span>
                  </button>

                  {isAuthenticated && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t.nav.logOut}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onOpenAuth();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.nav.deleteAccount}</span>
                      </button>
                    </>
                  )}

                  <div className="pt-2 border-t border-[var(--border-subtle)] px-2.5 flex items-center justify-between text-[10px] font-mono text-[var(--text-faint)]">
                    <span>Dailyba App</span>
                    <span className="font-bold text-[var(--text-muted)]">v{APP_VERSION}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings & Reminder Button (Desktop Only) */}
          <button
            type="button"
            onClick={onOpenBackup}
            className="hidden sm:flex p-1.5 sm:p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shrink-0"
            title={t.nav.settingsReminder}
          >
            <Bell className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Theme Toggle (Light <-> Dark) (Desktop Only) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="hidden sm:flex p-1.5 sm:p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shrink-0"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 stroke-[2] text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 stroke-[2] text-slate-700 shrink-0" />
            )}
          </button>
        </div>
      </div>
          <SecuritySettingsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        language={language}
      />
    </header>
  );
}
