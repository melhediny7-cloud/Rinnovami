import { AppLockSettings } from '../types';

const LOCK_SETTINGS_KEY = 'rinnovami_lock_settings_v1';
const SESSION_UNLOCKED_KEY = 'rinnovami_session_unlocked';

const DEFAULT_LOCK_SETTINGS: AppLockSettings = {
  isEnabled: false,
  pin: undefined,
  useBiometrics: false,
  autoLockMinutes: 5,
};

/**
 * Load app lock settings
 */
export function loadLockSettings(): AppLockSettings {
  try {
    const raw = localStorage.getItem(LOCK_SETTINGS_KEY);
    if (!raw) return DEFAULT_LOCK_SETTINGS;
    return { ...DEFAULT_LOCK_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LOCK_SETTINGS;
  }
}

/**
 * Save app lock settings
 */
export function saveLockSettings(settings: AppLockSettings): void {
  localStorage.setItem(LOCK_SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Check if WebAuthn Biometrics (Fingerprint / Face ID / Windows Hello) is available
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Trigger Biometric Authentication prompt using WebAuthn
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Dummy assertion for local biometric user verification
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname || undefined,
        allowCredentials: []
      }
    });

    return !!credential;
  } catch (err) {
    // If WebAuthn mock challenge throws (common on localhost without registered creds),
    // we can fallback to checking platform authenticator
    console.warn('Biometric challenge note:', err);
    return false;
  }
}

/**
 * Check if the app is currently locked
 */
export function isCurrentlyLocked(): boolean {
  const settings = loadLockSettings();
  if (!settings.isEnabled || !settings.pin) {
    return false;
  }

  const sessionUnlocked = sessionStorage.getItem(SESSION_UNLOCKED_KEY);
  if (!sessionUnlocked) {
    return true;
  }

  // Check timeout
  const lastUnlocked = parseInt(sessionUnlocked, 10);
  const now = Date.now();
  const maxIdleMs = (settings.autoLockMinutes || 5) * 60 * 1000;

  if (now - lastUnlocked > maxIdleMs) {
    sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    return true;
  }

  return false;
}

/**
 * Mark the app as unlocked for the current session
 */
export function setSessionUnlocked(): void {
  sessionStorage.setItem(SESSION_UNLOCKED_KEY, Date.now().toString());
}

/**
 * Manually lock the app immediately
 */
export function lockAppImmediately(): void {
  sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
}

/**
 * Verify PIN code against saved PIN
 */
export function verifyPinCode(inputPin: string): boolean {
  const settings = loadLockSettings();
  if (!settings.pin) return true;
  return settings.pin.trim() === inputPin.trim();
}
