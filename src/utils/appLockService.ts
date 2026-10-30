import { AppLockSettings } from '../types';

const LOCK_SETTINGS_KEY = 'rinnovami_lock_settings_v1';
const SESSION_UNLOCKED_KEY = 'rinnovami_session_unlocked';
const BIOMETRIC_CRED_KEY = 'rinnovami_biometric_cred_id_v1';

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
 * Check if WebAuthn Biometrics (Fingerprint / Face ID / Touch ID / Windows Hello) is available on the device
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
 * Register and enroll Biometrics (Face ID / Touch ID / Fingerprint) via WebAuthn Platform Authenticator
 */
export async function registerBiometricCredential(userId: string = 'rinnovami_user'): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userBytes = new TextEncoder().encode(userId + '-' + Date.now());

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Rinnovami',
          id: window.location.hostname || undefined,
        },
        user: {
          id: userBytes,
          name: 'rinnovami_user',
          displayName: 'Rinnovami Secure Vault',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential;

    if (credential && credential.id) {
      localStorage.setItem(BIOMETRIC_CRED_KEY, credential.id);
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn('Biometric registration info:', err);
    // If user cancelled or already has platform enrolled, return false
    return false;
  }
}

/**
 * Trigger Native Biometric Authentication prompt (Face ID / Touch ID / Fingerprint)
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  const credId = localStorage.getItem(BIOMETRIC_CRED_KEY);
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  let allowCredentials: PublicKeyCredentialDescriptor[] | undefined = undefined;
  if (credId) {
    try {
      // Decode base64 / url-safe base64 id
      const normalized = credId.replace(/-/g, '+').replace(/_/g, '/');
      const binStr = atob(normalized);
      const idBytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        idBytes[i] = binStr.charCodeAt(i);
      }
      allowCredentials = [{ id: idBytes, type: 'public-key' }];
    } catch {
      allowCredentials = undefined;
    }
  }

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname || undefined,
        ...(allowCredentials && allowCredentials.length > 0 ? { allowCredentials } : {}),
      },
    });

    return !!credential;
  } catch (err: any) {
    console.warn('Biometric authentication failed or cancelled:', err);
    // If the registered cred was deleted or invalid, try enrolling again
    if (err.name === 'NotAllowedError' || err.name === 'InvalidStateError') {
      return false;
    }
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
