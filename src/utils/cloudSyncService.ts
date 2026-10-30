import { DocumentItem } from '../types';
import QRCode from 'qrcode';

const CLOUD_SYNC_SETTINGS_KEY = 'rinnovami_cloud_sync_v1';
const CLOUD_ENDPOINT = 'https://api.restful-api.dev/objects';
const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/j469ypwvo8cpihjazbqq25htixq4yu4h';

export interface CloudSyncSettings {
  isEnabled: boolean;
  syncId: string;
  cloudObjectId?: string;
  vaultPassword?: string;
  autoSync: boolean;
  lastSyncTimestamp?: string;
  lastSyncStatus?: 'success' | 'error' | 'idle';
  lastSyncMessage?: string;
  documentCount?: number;
}

const DEFAULT_SYNC_SETTINGS: CloudSyncSettings = {
  isEnabled: false,
  syncId: '',
  cloudObjectId: undefined,
  vaultPassword: '',
  autoSync: false,
  lastSyncTimestamp: undefined,
  lastSyncStatus: 'idle',
  lastSyncMessage: undefined,
  documentCount: 0,
};

/**
 * Generates an easy-to-read unique Sync ID (e.g., "RNV-A8F2-99B1")
 */
export function generateSyncId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RNV-${p1}-${p2}`;
}

/**
 * Load cloud sync settings
 */
export function loadCloudSyncSettings(): CloudSyncSettings {
  try {
    const raw = localStorage.getItem(CLOUD_SYNC_SETTINGS_KEY);
    if (!raw) {
      const init: CloudSyncSettings = {
        ...DEFAULT_SYNC_SETTINGS,
        syncId: generateSyncId(),
      };
      saveCloudSyncSettings(init);
      return init;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.syncId) {
      parsed.syncId = generateSyncId();
    }
    return { ...DEFAULT_SYNC_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SYNC_SETTINGS, syncId: generateSyncId() };
  }
}

/**
 * Save cloud sync settings
 */
export function saveCloudSyncSettings(settings: CloudSyncSettings): void {
  localStorage.setItem(CLOUD_SYNC_SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Derives an AES-GCM-256 CryptoKey using PBKDF2 (100,000 rounds)
 */
async function deriveVaultKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
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
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt full vault of documents using AES-256-GCM
 */
export async function encryptVault(documents: DocumentItem[], masterPassword: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(masterPassword, salt);

  const jsonStr = JSON.stringify({
    v: 1,
    exportedAt: new Date().toISOString(),
    documents,
  });

  const enc = new TextEncoder();
  const encodedData = enc.encode(jsonStr);

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

  return `ENC_VAULT_V1:${saltHex}:${ivHex}:${cipherHex}`;
}

/**
 * Decrypt full vault package back to DocumentItem[]
 */
export async function decryptVault(encryptedPackage: string, masterPassword: string): Promise<DocumentItem[]> {
  if (!encryptedPackage || !encryptedPackage.startsWith('ENC_VAULT_V1:')) {
    throw new Error('حزمة السحابة المشفرة غير صالحة أو غير متوافقة.');
  }

  const parts = encryptedPackage.split(':');
  if (parts.length !== 4) {
    throw new Error('تنسيق حزمة التشفير تالف أو غير مكتمل.');
  }

  const saltHex = parts[1];
  const ivHex = parts[2];
  const cipherHex = parts[3];

  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

  const key = await deriveVaultKey(masterPassword, salt);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );

    const dec = new TextDecoder();
    const rawJson = dec.decode(decryptedBuffer);
    const parsed = JSON.parse(rawJson);

    if (!parsed || !Array.isArray(parsed.documents)) {
      throw new Error('البيانات المفكوكة لا تحتوي على قائمة وثائق صالحة.');
    }

    return parsed.documents;
  } catch (err) {
    throw new Error('كلمة المرور غير صحيحة أو تم تغيير بيانات التشفير.');
  }
}

/**
 * Push encrypted vault to Cloud
 */
export async function syncVaultToCloud(
  documents: DocumentItem[],
  masterPassword: string
): Promise<{ success: boolean; message: string; timestamp: string }> {
  if (!masterPassword || masterPassword.length < 4) {
    throw new Error('يجب تحديد كلمة مرور قوية للخزنة السحابية (4 أحرف على الأقل).');
  }

  const settings = loadCloudSyncSettings();
  const syncId = settings.syncId || generateSyncId();

  // 1. Encrypt completely in the browser before sending
  const encryptedBlob = await encryptVault(documents, masterPassword);
  const now = new Date().toISOString();

  const payload = {
    name: `rinnovami_vault_${syncId}`,
    data: {
      syncId,
      encryptedBlob,
      documentCount: documents.length,
      updatedAt: now,
    },
  };

  let cloudObjectId = settings.cloudObjectId;

  // 2. Upload to Cloud
  if (cloudObjectId) {
    const res = await fetch(`${CLOUD_ENDPOINT}/${cloudObjectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // If object was lost or expired, create fresh object
      cloudObjectId = undefined;
    }
  }

  if (!cloudObjectId) {
    const res = await fetch(CLOUD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`فشل الاتصال بالخادم السحابي (كود: ${res.status})`);
    }

    const created = await res.json();
    cloudObjectId = created.id;
  }

  // 3. Dispatch backup event to Make.com Webhook in the background
  try {
    fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'zero_knowledge_cloud_sync',
        syncId,
        cloudObjectId,
        documentCount: documents.length,
        timestamp: now,
      }),
    }).catch(() => {});
  } catch {}

  // 4. Update saved settings
  const updatedSettings: CloudSyncSettings = {
    ...settings,
    isEnabled: true,
    syncId,
    cloudObjectId,
    vaultPassword: masterPassword,
    lastSyncTimestamp: now,
    lastSyncStatus: 'success',
    lastSyncMessage: `تمت المزامنة بنجاح (${documents.length} وثائق)`,
    documentCount: documents.length,
  };
  saveCloudSyncSettings(updatedSettings);

  return {
    success: true,
    message: 'تم تشفير ورفع الوثائق إلى السحابة بنجاح!',
    timestamp: now,
  };
}

/**
 * Pull and restore encrypted vault from Cloud
 */
export async function restoreVaultFromCloud(
  targetSyncId: string,
  masterPassword: string,
  targetObjectId?: string
): Promise<{ success: boolean; documents: DocumentItem[]; message: string }> {
  if (!targetSyncId && !targetObjectId) {
    throw new Error('يرجى إدخال معرف المزامنة (Sync ID) لاسترجاع البيانات.');
  }
  if (!masterPassword) {
    throw new Error('يرجى إدخال كلمة مرور الخزنة السحابية لفك التشفير.');
  }

  const currentSettings = loadCloudSyncSettings();
  const objectIdToUse = targetObjectId || currentSettings.cloudObjectId;

  if (!objectIdToUse) {
    throw new Error('لم يتم العثور على نسخة سحابية مرتبطة بهذا المعرف على هذا الجهاز. يرجى إدخال كود الربط أو مسح رمز QR.');
  }

  const res = await fetch(`${CLOUD_ENDPOINT}/${objectIdToUse}`);
  if (!res.ok) {
    throw new Error(`تعذر جلب النسخة السحابية (كود: ${res.status}). تأكد من صحة معرف المزامنة.`);
  }

  const remote = await res.json();
  const encryptedBlob = remote?.data?.encryptedBlob;

  if (!encryptedBlob) {
    throw new Error('النسخة السحابية فارغة أو غير متوافقة.');
  }

  // Decrypt locally
  const docs = await decryptVault(encryptedBlob, masterPassword);

  // Update current settings
  const updatedSettings: CloudSyncSettings = {
    ...currentSettings,
    isEnabled: true,
    syncId: targetSyncId || currentSettings.syncId,
    cloudObjectId: objectIdToUse,
    vaultPassword: masterPassword,
    lastSyncTimestamp: new Date().toISOString(),
    lastSyncStatus: 'success',
    lastSyncMessage: `تمت الاستعادة بنجاح (${docs.length} وثائق)`,
    documentCount: docs.length,
  };
  saveCloudSyncSettings(updatedSettings);

  return {
    success: true,
    documents: docs,
    message: `تم فك التشفير واستعادة ${docs.length} وثيقة بنجاح!`,
  };
}

/**
 * Generate a QR Code for Device Pairing (linking another phone or PC)
 */
export async function generatePairingQR(syncId: string, cloudObjectId?: string): Promise<string> {
  const pairingPayload = JSON.stringify({
    app: 'rinnovami',
    type: 'vault_pair',
    syncId,
    cloudObjectId,
    t: Date.now(),
  });

  return await QRCode.toDataURL(pairingPayload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 260,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
