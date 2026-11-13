'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Fingerprint, Lock, ShieldCheck, Delete } from 'lucide-react';
import { KakeiboLogo } from './KakeiboLogo';
import {
  authenticateWithBiometrics,
  getAppLockPin,
  isBiometricsAvailable,
  verifyPin,
  setJustUnlocked,
} from '@/lib/biometricAuth';
import { Language } from '@/types/finance';
import { translations } from '@/lib/i18n';

interface AppLockOverlayProps {
  isLocked: boolean;
  onUnlock: () => void;
  language: Language;
}

export function AppLockOverlay({ isLocked, onUnlock, language }: AppLockOverlayProps) {
  const t = translations[language];
  const [pinInput, setPinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometryLabel, setBiometryLabel] = useState('Biometrics');
  const [hasSavedPin, setHasSavedPin] = useState(false);

  const triggerBiometricAuth = useCallback(async () => {
    setErrorMessage('');
    const success = await authenticateWithBiometrics(
      language === 'ja' ? 'Dailybaのロックを解除' : 'Unlock Dailyba'
    );
    if (success) {
      setPinInput('');
      setJustUnlocked();
      onUnlock();
    } else {
      const pinExists = Boolean(getAppLockPin());
      if (pinExists) {
        setErrorMessage(
          language === 'ja'
            ? '生体認証がキャンセルまたは失敗しました。PINでも解除できます。'
            : 'Biometric verification cancelled. You can also enter your PIN.'
        );
      }
    }
  }, [language, onUnlock]);

  useEffect(() => {
    if (isLocked) {
      setPinInput('');
      setErrorMessage('');
      const pin = getAppLockPin();
      setHasSavedPin(Boolean(pin));

      isBiometricsAvailable().then((res) => {
        setHasBiometrics(res.available);
        setBiometryLabel(res.biometryType);
        // On native platforms, auto-trigger biometric prompt once when overlay is displayed.
        // On web browser, require explicit user click to satisfy browser user-gesture security policy.
        if (res.available && Capacitor.isNativePlatform()) {
          triggerBiometricAuth();
        }
      });
    }
  }, [isLocked, triggerBiometricAuth]);

  if (!isLocked) return null;

  const handleKeyPress = (num: string) => {
    if (pinInput.length >= 4) return;
    const next = pinInput + num;
    setPinInput(next);
    setErrorMessage('');

    if (next.length === 4) {
      if (verifyPin(next)) {
        setJustUnlocked();
        setTimeout(() => {
          setPinInput('');
          onUnlock();
        }, 100);
      } else {
        setErrorMessage(language === 'ja' ? 'PINコードが一致しません' : 'Incorrect PIN');
        setTimeout(() => setPinInput(''), 400);
      }
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-between p-6 bg-[var(--bg-surface-solid)] backdrop-blur-3xl text-[var(--text-main)] animate-fade-in select-none">
      <div className="w-full flex justify-center pt-8">
        <div className="flex flex-col items-center space-y-3">
          <KakeiboLogo size={44} />
          <h1 className="text-xl font-bold tracking-tight flex items-center space-x-2">
            <span>Dailyba</span>
            <span className="w-2 h-2 rounded-full bg-[var(--accent-emerald)] shadow-[0_0_8px_var(--accent-emerald)]" />
          </h1>
          <p className="text-xs text-[var(--text-muted)] flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t.security.unlockApp}</span>
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs flex flex-col items-center space-y-6">
        {/* PIN Dots (If PIN is set or fallback) */}
        {hasSavedPin && (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center space-x-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    pinInput.length > idx
                      ? 'bg-[var(--accent-emerald)] scale-110 shadow-[0_0_8px_var(--accent-emerald)]'
                      : 'border-2 border-[var(--border-subtle)] bg-[var(--bg-subtle)]'
                  }`}
                />
              ))}
            </div>
            {errorMessage && (
              <p className="text-xs font-semibold text-rose-500 animate-shake">{errorMessage}</p>
            )}
          </div>
        )}

        {/* Biometrics Action Button */}
        {hasBiometrics && (
          <button
            type="button"
            onClick={triggerBiometricAuth}
            className="flex items-center space-x-2.5 px-5 py-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Fingerprint className="w-5 h-5 stroke-[2.2]" />
            <span>
              {language === 'ja'
                ? `${biometryLabel}で認証`
                : `Unlock with ${biometryLabel}`}
            </span>
          </button>
        )}

        {/* Numeric Keypad for PIN */}
        {hasSavedPin && (
          <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-14 rounded-2xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] active:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-lg font-bold font-mono text-[var(--text-main)] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              >
                {digit}
              </button>
            ))}
            <div className="flex items-center justify-center">
              {hasBiometrics && (
                <button
                  type="button"
                  onClick={triggerBiometricAuth}
                  className="w-12 h-12 rounded-xl text-indigo-400 hover:bg-indigo-500/10 flex items-center justify-center transition-all cursor-pointer"
                  title={biometryLabel}
                >
                  <Fingerprint className="w-6 h-6" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-14 rounded-2xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] active:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-lg font-bold font-mono text-[var(--text-main)] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="h-14 rounded-2xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] active:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-lg font-bold text-[var(--text-muted)] hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Delete className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        )}
      </div>

      <div className="w-full flex justify-center pb-4">
        <p className="text-[11px] text-[var(--text-faint)] flex items-center space-x-1.5 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>AES-256 Encrypted Ledger</span>
        </p>
      </div>
    </div>
  );
}
