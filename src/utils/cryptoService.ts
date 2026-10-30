/**
 * Rinnovami Document Encryption & Hashing Service
 * Uses Web Crypto API (AES-GCM-256, PBKDF2, SHA-256)
 */

const DEFAULT_SALT = 'rinnovami-vault-salt-2026';
const DEFAULT_VAULT_KEY = 'rinnovami-secure-local-vault-key-aes256';

/**
 * Generate a SHA-256 hash of a File for fast duplicate detection
 */
export async function generateFileHash(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    // Fallback composite hash if subtle crypto is unavailable
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}

/**
 * Derive an AES-GCM CryptoKey from a passphrase
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a data URL string (Base64 file)
 * Returns encrypted package formatted as: "ENC_V1:<salt_hex>:<iv_hex>:<ciphertext_hex>"
 */
export async function encryptDocumentData(
  plainDataUrl: string,
  passphrase: string = DEFAULT_VAULT_KEY
): Promise<string> {
  if (!plainDataUrl || !plainDataUrl.startsWith('data:')) {
    return plainDataUrl;
  }

  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase || DEFAULT_VAULT_KEY, salt);

    const enc = new TextEncoder();
    const encodedData = enc.encode(plainDataUrl);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
    const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join('');
    const cipherHex = Array.from(new Uint8Array(ciphertextBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return `ENC_V1:${saltHex}:${ivHex}:${cipherHex}`;
  } catch (err) {
    console.warn('Document encryption fallback:', err);
    return plainDataUrl;
  }
}

/**
 * Decrypt an encrypted document package back to original data URL
 */
export async function decryptDocumentData(
  encryptedPackage: string,
  passphrase: string = DEFAULT_VAULT_KEY
): Promise<string> {
  if (!encryptedPackage || !encryptedPackage.startsWith('ENC_V1:')) {
    return encryptedPackage; // Not encrypted
  }

  try {
    const parts = encryptedPackage.split(':');
    if (parts.length !== 4) return encryptedPackage;

    const saltHex = parts[1];
    const ivHex = parts[2];
    const cipherHex = parts[3];

    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

    const key = await deriveKey(passphrase || DEFAULT_VAULT_KEY, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error('Document decryption error:', err);
    return encryptedPackage;
  }
}
