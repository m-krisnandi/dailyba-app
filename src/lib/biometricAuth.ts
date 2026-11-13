'use client';

import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

const STORAGE_LOCK_ENABLED = 'dailyba_app_lock_enabled_v1';
const STORAGE_LOCK_PIN = 'dailyba_app_lock_pin_v1';

export function isAppLockEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_LOCK_ENABLED) === 'true';
  } catch {
    return false;
  }
}

export function setAppLockEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      localStorage.setItem(STORAGE_LOCK_ENABLED, 'true');
    } else {
      localStorage.removeItem(STORAGE_LOCK_ENABLED);
    }
  } catch (e) {
    console.error('Failed to set app lock:', e);
  }
}

export function getAppLockPin(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_LOCK_PIN);
  } catch {
    return null;
  }
}

export function setAppLockPin(pin: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (pin) {
      localStorage.setItem(STORAGE_LOCK_PIN, pin);
    } else {
      localStorage.removeItem(STORAGE_LOCK_PIN);
    }
  } catch (e) {
    console.error('Failed to set app lock pin:', e);
  }
}

export function verifyPin(inputPin: string): boolean {
  const saved = getAppLockPin();
  if (!saved) return true; // If no PIN set, allow unlock
  return saved === inputPin;
}

export async function isBiometricsAvailable(): Promise<{ available: boolean; biometryType: string }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await BiometricAuth.checkBiometry();
      const hasHardware = info.isAvailable;
      let label = 'Biometrics';
      if (info.biometryType === BiometryType.faceId) label = 'Face ID';
      else if (info.biometryType === BiometryType.touchId) label = 'Touch ID';
      else if (info.biometryType === BiometryType.fingerprintAuthentication) label = 'Fingerprint';

      return { available: hasHardware, biometryType: label };
    } catch {
      return { available: false, biometryType: 'None' };
    }
  }

  // Web Browser: check WebAuthn platform authenticator
  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      const webAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return { available: webAvailable, biometryType: 'Biometrics / Screen Lock' };
    } catch {
      return { available: false, biometryType: 'PIN' };
    }
  }

  return { available: false, biometryType: 'PIN' };
}

export async function authenticateWithBiometrics(reason: string = 'Unlock Dailyba Vault'): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  // Web fallback: if pin is set, user uses PIN. If WebAuthn available, try user credential
  return false;
}
