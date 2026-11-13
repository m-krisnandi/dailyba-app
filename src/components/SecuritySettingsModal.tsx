'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, Fingerprint, KeyRound, Check, AlertCircle } from 'lucide-react';
import { Language } from '@/types/finance';
import { translations } from '@/lib/i18n';
import {
  isAppLockEnabled,
  setAppLockEnabled,
  getAppLockPin,
  setAppLockPin,
  isBiometricsAvailable,
} from '@/lib/biometricAuth';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export function SecuritySettingsModal({
  isOpen,
  onClose,
  language,
}: SecuritySettingsModalProps) {
  const t = translations[language];
  const [enabled, setEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [biometryInfo, setBiometryInfo] = useState({ available: false, biometryType: 'None' });
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEnabled(isAppLockEnabled());
      const savedPin = getAppLockPin();
      setPin(savedPin || '');
      setConfirmPin(savedPin || '');
      setFeedback(null);

      isBiometricsAvailable().then(setBiometryInfo);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (enabled && pin && pin.length !== 4) {
      setFeedback(language === 'ja' ? 'PINは4桁の数字で入力してください。' : 'PIN must be exactly 4 digits.');
      return;
    }
    if (enabled && pin && pin !== confirmPin) {
      setFeedback(language === 'ja' ? '確認用PINが一致しません。' : 'PIN confirmation does not match.');
      return;
    }

    setAppLockEnabled(enabled);
    setAppLockPin(enabled && pin ? pin : null);
    onClose();
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in cursor-pointer">
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-white dark:bg-[#0f1722] border border-[var(--border-strong)] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6 cursor-default">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-main)]">
                {t.security.securitySettings}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {t.security.biometricLockDesc}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Lock */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#16202e] border border-[var(--border-subtle)]">
          <div className="flex items-center space-x-3">
            <Fingerprint className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs font-bold text-[var(--text-main)]">
                {t.security.biometricLock}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {biometryInfo.available
                  ? (language === 'ja' ? `${biometryInfo.biometryType}対応` : `Supported: ${biometryInfo.biometryType}`)
                  : (language === 'ja' ? 'PINコードによるロック' : '4-Digit PIN Security')}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--border-strong)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
          </label>
        </div>

        {/* PIN Configuration */}
        {enabled && (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#16202e] border border-[var(--border-subtle)] animate-fade-in">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[var(--text-main)]">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>{t.security.enterPin}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                  {language === 'ja' ? '新しいPIN (4桁)' : 'New PIN (4 digits)'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="w-full bg-white dark:bg-[#0c121a] border border-[var(--border-strong)] focus:border-indigo-500 rounded-xl px-3 py-2.5 text-center text-sm font-mono tracking-widest text-[var(--text-main)] outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                  {language === 'ja' ? 'PINの確認' : 'Confirm PIN'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="w-full bg-white dark:bg-[#0c121a] border border-[var(--border-strong)] focus:border-indigo-500 rounded-xl px-3 py-2.5 text-center text-sm font-mono tracking-widest text-[var(--text-main)] outline-none font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {feedback && (
          <div className="flex items-center space-x-2 text-xs text-rose-400 font-medium p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
          >
            {t.actions.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t.actions.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
