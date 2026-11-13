'use client';

import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

const STORAGE_LOCK_ENABLED = 'dailyba_app_lock_enabled_v1';
const STORAGE_LOCK_PIN = 'dailyba_app_lock_pin_v1';
const STORAGE_WEBAUTHN_CRED_ID = 'dailyba_webauthn_credential_id_v1';

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

  // Web Browser: check WebAuthn platform authenticator (Touch ID on Mac, Windows Hello on PC, Biometrics on mobile browser)
  if (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      const webAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      const isApple = typeof navigator !== 'undefined' && /Macintosh|MacIntel|iPhone|iPad/i.test(navigator.userAgent);
      return {
        available: webAvailable,
        biometryType: isApple ? 'Touch ID' : 'Biometrics / Screen Lock',
      };
    } catch {
      return { available: false, biometryType: 'PIN' };
    }
  }

  return { available: false, biometryType: 'PIN' };
}

function getStoredCredentialId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_WEBAUTHN_CRED_ID);
  } catch {
    return null;
  }
}

function setStoredCredentialId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) localStorage.setItem(STORAGE_WEBAUTHN_CRED_ID, id);
    else localStorage.removeItem(STORAGE_WEBAUTHN_CRED_ID);
  } catch {
    // ignore
  }
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

  // Web Browser fallback via WebAuthn Platform Authenticator (Touch ID on macOS / Windows Hello / Android Fingerprint)
  if (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    window.PublicKeyCredential &&
    navigator.credentials
  ) {
    try {
      const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) return false;

      const storedCredId = getStoredCredentialId();

      // Determine valid rpId (avoid raw IP addresses as RP ID per WebAuthn spec)
      const hostname = window.location.hostname;
      const isValidRpDomain = hostname && !/^[0-9.]+$/.test(hostname);
      const rpId = isValidRpDomain ? hostname : undefined;

      // 1. If we already have a registered local credential, attempt verification via navigator.credentials.get
      if (storedCredId) {
        try {
          const rawId = Uint8Array.from(atob(storedCredId), (c) => c.charCodeAt(0));
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);

          const getOptions: CredentialRequestOptions = {
            publicKey: {
              challenge,
              ...(rpId ? { rpId } : {}),
              allowCredentials: [
                {
                  id: rawId,
                  type: 'public-key',
                },
              ],
              userVerification: 'required',
              timeout: 60000,
            },
          };

          const assertion = await navigator.credentials.get(getOptions);
          if (assertion) {
            return true;
          }
        } catch (getErr) {
          console.warn('WebAuthn get failed, attempting credential recreate/refresh:', getErr);
        }
      }

      // 2. Register/Create platform biometric credential (triggers Mac Touch ID prompt directly)
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array([68, 65, 73, 76, 89, 66, 65]); // "DAILYBA"

      const createOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: 'Dailyba Vault',
            ...(rpId ? { id: rpId } : {}),
          },
          user: {
            id: userId,
            name: 'dailyba-user',
            displayName: 'Dailyba User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
        },
      };

      const credential = (await navigator.credentials.create(createOptions)) as PublicKeyCredential | null;

      if (credential && credential.rawId) {
        const base64Id = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        setStoredCredentialId(base64Id);
        return true;
      }
    } catch (e: any) {
      // User cancelled Touch ID dialog or failed verification
      console.warn('WebAuthn platform biometric authentication cancelled or failed:', e);
      return false;
    }
  }

  return false;
}
