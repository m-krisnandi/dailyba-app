'use client';

import React, { useState } from 'react';
import { Currency, Language } from '@/types/finance';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  Sparkles,
  ArrowRight,
  Check,
  CheckCircle2,
  Globe,
  Coins,
  Target,
  ChevronLeft,
} from 'lucide-react';
import { FormattedAmountInput } from '@/components/FormattedAmountInput';
import { parseRawNumber } from '@/lib/currency';

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  currentLanguage: Language;
  currentCurrency: Currency;
  onComplete: (options: {
    language: Language;
    currency: Currency;
    dailySpendTarget?: number;
  }) => void;
}

const CURRENCIES: { code: Currency; symbol: string; nameEn: string; nameJa: string }[] = [
  { code: 'IDR', symbol: 'Rp', nameEn: 'Indonesian Rupiah', nameJa: 'インドネシア・ルピア' },
  { code: 'JPY', symbol: '¥', nameEn: 'Japanese Yen', nameJa: '日本円' },
  { code: 'USD', symbol: '$', nameEn: 'US Dollar', nameJa: '米ドル' },
  { code: 'MMK', symbol: 'Ks', nameEn: 'Myanmar Kyat', nameJa: 'ミャンマー・チャット' },
];

export function WelcomeOnboardingModal({
  isOpen,
  currentLanguage,
  currentCurrency,
  onComplete,
}: WelcomeOnboardingModalProps) {
  useBodyScrollLock(isOpen);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(currentLanguage);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currentCurrency);
  const [targetAmountStr, setTargetAmountStr] = useState<string>('');

  if (!isOpen) return null;

  const isJa = selectedLanguage === 'ja';

  const getPresets = (curr: Currency) => {
    switch (curr) {
      case 'IDR':
        return [
          { val: 100000, label: 'Rp 100.000' },
          { val: 150000, label: 'Rp 150.000' },
          { val: 250000, label: 'Rp 250.000' },
        ];
      case 'JPY':
        return [
          { val: 2500, label: '¥2,500' },
          { val: 3500, label: '¥3,500' },
          { val: 5000, label: '¥5,000' },
        ];
      case 'USD':
        return [
          { val: 25, label: '$25' },
          { val: 50, label: '$50' },
          { val: 75, label: '$75' },
        ];
      case 'MMK':
        return [
          { val: 20000, label: '20,000 Ks' },
          { val: 35000, label: '35,000 Ks' },
          { val: 50000, label: '50,000 Ks' },
        ];
    }
  };

  const handleFinish = () => {
    const rawTarget = parseRawNumber(targetAmountStr);
    onComplete({
      language: selectedLanguage,
      currency: selectedCurrency,
      dailySpendTarget: rawTarget > 0 ? rawTarget : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-fade-in select-none">
      <div className="w-full max-w-md rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-[var(--modal-shadow)] p-6 space-y-6">
        {/* Step Progress Dots */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center space-x-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s
                    ? 'w-6 bg-emerald-500'
                    : step > s
                    ? 'w-2 bg-emerald-500/50'
                    : 'w-2 bg-[var(--border-subtle)]'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)] font-bold">
            Step {step} of 4
          </span>
        </div>

        {/* STEP 1: Language */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-[var(--text-main)]">
                Choose Your Language
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                言語を選択してください (後からいつでも変更できます)
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedLanguage('en')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedLanguage === 'en'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center justify-center font-mono shrink-0">EN</div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[var(--text-main)]">English</p>
                    <p className="text-[11px] text-[var(--text-muted)]">International English</p>
                  </div>
                </div>
                {selectedLanguage === 'en' && <Check className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedLanguage('ja')}
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedLanguage === 'ja'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center font-mono shrink-0">JA</div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[var(--text-main)]">日本語</p>
                    <p className="text-[11px] text-[var(--text-muted)]">日本の家計簿フォーマット</p>
                  </div>
                </div>
                {selectedLanguage === 'ja' && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>{isJa ? '次へ進む' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Currency */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-3">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-[var(--text-main)]">
                {isJa ? '主な基準通貨を選択' : 'Select Primary Currency'}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {isJa
                  ? '日々の支出や資産残高の基準となる通貨です'
                  : 'Your default currency for daily expenses and balance calculations.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCurrency(c.code)}
                  className={`p-3.5 rounded-2xl border flex flex-col items-start justify-between cursor-pointer transition-all ${
                    selectedCurrency === c.code
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base font-extrabold font-mono text-emerald-400">
                      {c.symbol}
                    </span>
                    {selectedCurrency === c.code && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <div className="text-left mt-2">
                    <p className="text-xs font-bold text-[var(--text-main)] font-mono">{c.code}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[120px]">
                      {isJa ? c.nameJa : c.nameEn}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{isJa ? '次へ進む' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Daily Target (Optional) */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-[var(--text-main)]">
                {isJa ? '1日の予算目安を設定' : 'Daily Spending Target'}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {isJa
                  ? '支出をコントロールするための1日の目標額です (スキップ可)'
                  : 'Helps keep daily impulse spending in check (optional, can change later).'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <FormattedAmountInput
                  value={targetAmountStr}
                  onChange={(val) => setTargetAmountStr(val)}
                  placeholder="e.g. 100,000"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:border-emerald-500 rounded-2xl pl-4 pr-16 py-3 text-base font-bold text-[var(--text-main)] outline-none font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[var(--text-muted)] pointer-events-none">
                  {selectedCurrency}
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                {getPresets(selectedCurrency).map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setTargetAmountStr(String(p.val))}
                    className="flex-1 py-1.5 px-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-emerald-500/40 text-[11px] font-mono font-bold text-[var(--text-muted)] hover:text-emerald-400 transition-all cursor-pointer text-center"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="p-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{targetAmountStr ? (isJa ? '設定して次へ' : 'Set & Continue') : (isJa ? 'スキップ' : 'Skip & Continue')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Ready! */}
        {step === 4 && (
          <div className="space-y-5 text-center animate-fade-in py-2">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-[var(--text-main)]">
                {isJa ? '準備が完了しました！' : "You're All Set!"}
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                {isJa
                  ? 'Dailyba で日々の収支バランスと資産推移をスマートに記録しましょう。'
                  : 'Start tracking your daily balance and wealth effortlessly with Dailyba.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>{isJa ? '言語' : 'Language'}:</span>
                <span className="font-bold text-[var(--text-main)]">
                  {selectedLanguage === 'ja' ? '日本語' : 'English'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span>{isJa ? '基準通貨' : 'Primary Currency'}:</span>
                <span className="font-bold text-[var(--text-main)] font-mono">
                  {selectedCurrency}
                </span>
              </div>
              {targetAmountStr && (
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span>{isJa ? '日次予算目標' : 'Daily Target'}:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {selectedCurrency} {targetAmountStr}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isJa ? 'Dailyba をはじめる' : 'Start Tracking My Balance'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
