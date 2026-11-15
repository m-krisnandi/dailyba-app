'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import {
  X,
  Shield,
  Fingerprint,
  KeyRound,
  Check,
  AlertCircle,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Language } from '@/types/finance';
import { translations } from '@/lib/i18n';
import {
  isAppLockEnabled,
  setAppLockEnabled,
  getAppLockPin,
  setAppLockPin,
  isBiometricsAvailable,
  verifyPin,
  authenticateWithBiometrics,
} from '@/lib/biometricAuth';

export type SecurityModalMode = 'idle' | 'verifying_to_disable' | 'setting_new_pin' | 'changing_pin';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialMode?: SecurityModalMode;
  onSuccess?: () => void;
}

export function SecuritySettingsModal({
  isOpen,
  onClose,
  language,
  initialMode = 'idle',
  onSuccess,
}: SecuritySettingsModalProps) {
  const t = translations[language];
  const [mounted, setMounted] = useState(false);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<SecurityModalMode>(initialMode);
  const [biometryInfo, setBiometryInfo] = useState({ available: false, biometryType: 'None' });
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Verification state (to disable or change)
  const [verifyPinInput, setVerifyPinInput] = useState('');
  const [isAuthenticatingBiometric, setIsAuthenticatingBiometric] = useState(false);
  const verifyInputRef = useRef<HTMLInputElement>(null);

  // New PIN state (to enable or change)
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    if (isOpen) {
      const isCurrentlyEnabled = isAppLockEnabled();
      setEnabled(isCurrentlyEnabled);
      setMode(initialMode);
      setVerifyPinInput('');
      setNewPin('');
      setConfirmPin('');
      setFeedback(null);
      setIsAuthenticatingBiometric(false);

      isBiometricsAvailable().then(setBiometryInfo);
    }
  }, [isOpen, initialMode]);

  // Auto focus input when entering verification mode
  useEffect(() => {
    if (mode === 'verifying_to_disable') {
      const timer = setTimeout(() => {
        verifyInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  if (!isOpen || !mounted) return null;

  // Trigger biometrics verification to disable lock
  const triggerBiometricDisable = async () => {
    if (!biometryInfo.available || isAuthenticatingBiometric) return;
    setIsAuthenticatingBiometric(true);
    setFeedback(null);

    try {
      const success = await authenticateWithBiometrics(
        language === 'ja'
          ? 'Dailybaのアプリロックを解除するために認証してください'
          : 'Authenticate to disable Dailyba App Lock'
      );

      if (success) {
        setAppLockEnabled(false);
        setAppLockPin(null);
        setEnabled(false);
        setMode('idle');
        setVerifyPinInput('');
        setFeedback({
          type: 'success',
          message: language === 'ja'
            ? '生体認証を確認しました。アプリロックを無効化しました。'
            : 'Authentication verified. App Lock has been disabled.',
        });
        onSuccess?.();
      }
    } catch (err) {
      console.warn('Biometric verify error:', err);
    } finally {
      setIsAuthenticatingBiometric(false);
    }
  };

  // Toggle switch clicked by user (when in idle mode)
  const handleToggleClick = async () => {
    setFeedback(null);

    if (enabled) {
      // User wants to DISABLE App Lock
      const savedPin = getAppLockPin();
      if (!savedPin && !biometryInfo.available) {
        setAppLockEnabled(false);
        setEnabled(false);
        setFeedback({
          type: 'success',
          message: language === 'ja' ? 'アプリロックを無効化しました。' : 'App Lock has been disabled.',
        });
        onSuccess?.();
        return;
      }

      // Try quick biometric verification first if available
      if (biometryInfo.available) {
        setIsAuthenticatingBiometric(true);
        try {
          const ok = await authenticateWithBiometrics(
            language === 'ja'
              ? 'Dailybaのアプリロックを無効化するために認証してください'
              : 'Authenticate to disable Dailyba App Lock'
          );
          if (ok) {
            setAppLockEnabled(false);
            setAppLockPin(null);
            setEnabled(false);
            setFeedback({
              type: 'success',
              message: language === 'ja'
                ? '生体認証を確認しました。アプリロックを無効化しました。'
                : 'Authentication verified. App Lock has been disabled.',
            });
            onSuccess?.();
            setIsAuthenticatingBiometric(false);
            return;
          }
        } catch {
          // Fall through to PIN
        } finally {
          setIsAuthenticatingBiometric(false);
        }
      }

      // Prompt for PIN verification
      setMode('verifying_to_disable');
      setVerifyPinInput('');
    } else {
      // User wants to ENABLE App Lock
      const existingPin = getAppLockPin();
      if (existingPin) {
        setAppLockEnabled(true);
        setEnabled(true);
        setFeedback({
          type: 'success',
          message: language === 'ja' ? 'アプリロックを有効にしました。' : 'App Lock has been enabled.',
        });
        onSuccess?.();
      } else {
        setMode('setting_new_pin');
        setNewPin('');
        setConfirmPin('');
      }
    }
  };

  // Verify entered PIN to disable lock
  const handleVerifyPinInput = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    setVerifyPinInput(clean);

    if (clean.length === 4) {
      if (verifyPin(clean)) {
        setAppLockEnabled(false);
        setAppLockPin(null);
        setEnabled(false);
        setMode('idle');
        setVerifyPinInput('');
        setFeedback({
          type: 'success',
          message: language === 'ja' ? 'PINを確認しました。アプリロックを無効化しました。' : 'PIN verified. App Lock disabled.',
        });
        onSuccess?.();
      } else {
        setFeedback({
          type: 'error',
          message: language === 'ja' ? 'PINコードが間違っています。' : 'Incorrect PIN. Please try again.',
        });
        setVerifyPinInput('');
      }
    }
  };

  // Handle saving new PIN to enable lock
  const handleEnableLock = () => {
    if (newPin.length !== 4) {
      setFeedback({
        type: 'error',
        message: language === 'ja' ? '4桁のPINを入力してください。' : 'Please enter a 4-digit PIN.',
      });
      return;
    }
    if (newPin !== confirmPin) {
      setFeedback({
        type: 'error',
        message: language === 'ja' ? 'PINが一致しません。もう一度お確かめください。' : 'PIN confirmation does not match.',
      });
      return;
    }

    setAppLockPin(newPin);
    setAppLockEnabled(true);
    setEnabled(true);
    setFeedback({
      type: 'success',
      message: language === 'ja' ? 'アプリロックを有効にしました。' : 'App Lock enabled successfully.',
    });
    onSuccess?.();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // Handle changing existing PIN
  const handleChangePinSave = () => {
    if (verifyPinInput.length !== 4 || !verifyPin(verifyPinInput)) {
      setFeedback({
        type: 'error',
        message: language === 'ja' ? '現在のPINが正しくありません。' : 'Current PIN is incorrect.',
      });
      return;
    }
    if (newPin.length !== 4) {
      setFeedback({
        type: 'error',
        message: language === 'ja' ? '新しいPINは4桁で入力してください。' : 'New PIN must be 4 digits.',
      });
      return;
    }
    if (newPin !== confirmPin) {
      setFeedback({
        type: 'error',
        message: language === 'ja' ? '新しい確認用PINが一致しません。' : 'New PIN confirmation does not match.',
      });
      return;
    }

    setAppLockPin(newPin);
    setFeedback({
      type: 'success',
      message: language === 'ja' ? '新しいPINを保存しました。' : 'PIN updated successfully.',
    });
    onSuccess?.();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in cursor-pointer overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface-solid)] backdrop-blur-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 cursor-default animate-in zoom-in-95 duration-150 my-auto"
      >
        {/* Subtle Ambient Liquid Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Dynamic Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)] relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
              {mode === 'setting_new_pin' ? (
                <KeyRound className="w-5 h-5 text-emerald-400" />
              ) : mode === 'changing_pin' ? (
                <Lock className="w-5 h-5 text-indigo-400" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-main)]">
                {mode === 'setting_new_pin'
                  ? (language === 'ja' ? 'PINコードの設定' : 'Create 4-Digit PIN')
                  : mode === 'changing_pin'
                  ? (language === 'ja' ? 'PINコードの変更' : 'Change 4-Digit PIN')
                  : t.security.securitySettings}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {mode === 'setting_new_pin'
                  ? (language === 'ja' ? 'Dailybaを保護するための4桁のPINを入力してください' : 'Set a 4-digit PIN to secure Dailyba')
                  : mode === 'changing_pin'
                  ? (language === 'ja' ? '現在のPINと新しいPINを入力してください' : 'Enter current PIN and choose a new PIN')
                  : t.security.biometricLockDesc}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Lock Item: Only shown when mode is 'idle' */}
        {mode === 'idle' && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] relative z-10">
            <div className="flex items-center space-x-3">
              <Fingerprint className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-xs font-bold text-[var(--text-main)]">
                  {t.security.biometricLock}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {biometryInfo.available
                    ? (language === 'ja' ? `${biometryInfo.biometryType}対応` : `Supported: ${biometryInfo.biometryType}`)
                    : (language === 'ja' ? '4桁のPINによる保護' : '4-Digit PIN Security')}
                </p>
              </div>
            </div>

            {/* Switch Toggle */}
            <button
              type="button"
              onClick={handleToggleClick}
              disabled={isAuthenticatingBiometric}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enabled ? 'bg-indigo-600' : 'bg-[var(--border-strong)]'
              }`}
              aria-checked={enabled}
              role="switch"
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {/* VERIFICATION CARD (To Disable App Lock) */}
        {mode === 'verifying_to_disable' && (
          <div className="space-y-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 animate-fade-in relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <h4 className="text-xs font-bold text-amber-400">
                  {language === 'ja' ? 'PIN認証が必要です' : 'PIN Verification Required'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('idle');
                  setVerifyPinInput('');
                  setFeedback(null);
                }}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                {t.actions.cancel}
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {language === 'ja'
                ? 'アプリロックを無効化するには、現在の4桁PINを入力してください。'
                : 'Enter your current 4-digit PIN to turn off App Lock.'}
            </p>

            {/* Quick Biometrics Option */}
            {biometryInfo.available && (
              <button
                type="button"
                onClick={triggerBiometricDisable}
                disabled={isAuthenticatingBiometric}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              >
                <Fingerprint className="w-4 h-4" />
                <span>
                  {language === 'ja'
                    ? `${biometryInfo.biometryType}で認証して解除`
                    : `Verify with ${biometryInfo.biometryType}`}
                </span>
              </button>
            )}

            {/* PIN Dots & Hidden Input */}
            <div className="flex flex-col items-center space-y-3 pt-1">
              <div className="flex items-center space-x-3">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      verifyPinInput.length > idx
                        ? 'bg-amber-400 scale-110 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                        : 'border-2 border-[var(--border-subtle)] bg-[var(--bg-subtle)]'
                    }`}
                  />
                ))}
              </div>

              <input
                ref={verifyInputRef}
                type="password"
                maxLength={4}
                inputMode="numeric"
                value={verifyPinInput}
                onChange={(e) => handleVerifyPinInput(e.target.value)}
                placeholder="••••"
                className="w-36 bg-[var(--bg-subtle)] border border-[var(--border-strong)] focus:border-amber-400 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-[var(--text-main)] outline-none font-bold placeholder:text-[var(--text-faint)] transition-all"
              />
            </div>
          </div>
        )}

        {/* ACTIVE STATUS & CHANGE PIN (When Enabled and Idle) */}
        {enabled && mode === 'idle' && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 relative z-10 animate-fade-in">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-400">
                  {language === 'ja' ? 'アプリロック有効' : 'App Lock Active'}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {biometryInfo.available
                    ? (language === 'ja' ? `${biometryInfo.biometryType} & PIN保護` : `Protected by ${biometryInfo.biometryType} & PIN`)
                    : (language === 'ja' ? '4桁のPIN保護' : 'Protected by 4-digit PIN')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode('changing_pin');
                setVerifyPinInput('');
                setNewPin('');
                setConfirmPin('');
                setFeedback(null);
              }}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer"
            >
              {language === 'ja' ? 'PIN変更' : 'Change PIN'}
            </button>
          </div>
        )}

        {/* SETUP NEW PIN FORM (Direct Setup when toggle is clicked) */}
        {mode === 'setting_new_pin' && (
          <div className="space-y-4 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] animate-fade-in relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-[var(--text-main)]">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>{language === 'ja' ? '4桁のPINを設定' : 'Create 4-Digit PIN'}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                {t.actions.cancel}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1 font-medium">
                  {language === 'ja' ? 'PIN (4桁)' : 'PIN (4 digits)'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  autoFocus
                  className="w-full bg-[var(--bg-surface-solid)] border border-[var(--border-strong)] focus:border-indigo-500 rounded-xl px-3 py-2.5 text-center text-sm font-mono tracking-widest text-[var(--text-main)] outline-none font-bold placeholder:text-[var(--text-faint)] transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1 font-medium">
                  {language === 'ja' ? 'PINの確認' : 'Confirm PIN'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="w-full bg-[var(--bg-surface-solid)] border border-[var(--border-strong)] focus:border-indigo-500 rounded-xl px-3 py-2.5 text-center text-sm font-mono tracking-widest text-[var(--text-main)] outline-none font-bold placeholder:text-[var(--text-faint)] transition-all"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnableLock}
              className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer mt-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{language === 'ja' ? 'PINを設定してロックを有効化' : 'Save PIN & Enable App Lock'}</span>
            </button>
          </div>
        )}

        {/* CHANGE PIN FORM */}
        {mode === 'changing_pin' && (
          <div className="space-y-3.5 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] animate-fade-in relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-[var(--text-main)]">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>{language === 'ja' ? 'PINの変更' : 'Change 4-Digit PIN'}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                {t.actions.cancel}
              </button>
            </div>

            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1 font-medium">
                {language === 'ja' ? '現在のPIN' : 'Current PIN'}
              </label>
              <input
                type="password"
                maxLength={4}
                inputMode="numeric"
                value={verifyPinInput}
                onChange={(e) => setVerifyPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••"
                autoFocus
                className="w-full bg-[var(--bg-surface-solid)] border border-[var(--border-strong)] focus:border-indigo-500 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-[var(--text-main)] outline-none font-bold placeholder:text-[var(--text-faint)] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1 font-medium">
                  {language === 'ja' ? '新しいPIN' : 'New PIN'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="w-full bg-[var(--bg-surface-solid)] border border-[var(--border-strong)] focus:border-indigo-500 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-[var(--text-main)] outline-none font-bold placeholder:text-[var(--text-faint)] transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1 font-medium">
                  {language === 'ja' ? '新しいPIN確認' : 'Confirm New PIN'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="w-full bg-[var(--bg-surface-solid)] border border-[var(--border-strong)] focus:border-indigo-500 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-[var(--text-main)] outline-none font-bold placeholder:text-[var(--text-faint)] transition-all"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleChangePinSave}
              className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer mt-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{language === 'ja' ? '変更を保存' : 'Save New PIN'}</span>
            </button>
          </div>
        )}

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div
            className={`flex items-center space-x-2 text-xs font-medium p-2.5 rounded-xl border relative z-10 animate-fade-in ${
              feedback.type === 'success'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Close Button Footer */}
        <div className="flex items-center justify-end space-x-2 pt-2 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-main)] transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {language === 'ja' ? '閉じる' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
