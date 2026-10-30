import { DocumentItem } from '../types';
import { getTodayOffset } from './dateUtils';
import { isValidDataUrl } from './imageCompressor';

// Database name incremented to v2 to ensure clean object store setup
const DB_NAME = 'rinnovami_db_v2';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

// Persistent flags and fallback keys
const SEEDED_FLAG_KEY = 'rinnovami_seeded_flag_v2';
const META_BACKUP_KEY = 'rinnovami_docs_meta_v2';

// Legacy keys for automatic migration
const LEGACY_STORAGE_KEY_V1 = 'docuscadenza_documents_v1';
const LEGACY_FALLBACK_KEY_V1 = 'rinnovami_documents_fallback';

export const DEFAULT_DEMO_DOCUMENTS: DocumentItem[] = [
  {
    id: 'demo-doc-1',
    title: 'تصريح الإقامة - Permesso di Soggiorno',
    category: 'permesso_soggiorno',
    documentNumber: 'I098234567X',
    holderName: 'أحمد محمود / Ahmed Mahmoud',
    issueDate: getTodayOffset(-720),
    expiryDate: getTodayOffset(12), // Critical: 12 days left
    issuingAuthority: 'Questura di Milano',
    reminderDaysBefore: 60,
    notes: 'تم استلام المظروف الأصفر (Kit). يجب التقديم قبل انتهاء الصلاحية.',
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-doc-2',
    title: 'تأمين السيارة - Assicurazione Auto RCA',
    category: 'assicurazione',
    documentNumber: 'POL-2024-88912',
    holderName: 'أحمد محمود / Ahmed Mahmoud',
    issueDate: getTodayOffset(-375),
    expiryDate: getTodayOffset(-5), // Expired 5 days ago
    issuingAuthority: 'Allianz Assicurazioni',
    reminderDaysBefore: 30,
    notes: 'فترة السماح (Tolleranza 15 giorni) تنتهي قريباً جداً!',
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-doc-3',
    title: 'بطاقة الهوية الإلكترونية - Carta d\'Identità',
    category: 'carta_identita',
    documentNumber: 'CA45678YY',
    holderName: 'أحمد محمود / Ahmed Mahmoud',
    issueDate: getTodayOffset(-365 * 9),
    expiryDate: getTodayOffset(45), // Expiring soon: 45 days left
    issuingAuthority: 'Comune di Roma',
    reminderDaysBefore: 90,
    notes: 'تم حجز موعد التجديد على موقع prenotazionicie.interno.gov.it',
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-doc-4',
    title: 'رخصة القيادة - Patente di Guida B',
    category: 'patente',
    documentNumber: 'U19876543Z',
    holderName: 'أحمد محمود / Ahmed Mahmoud',
    issueDate: getTodayOffset(-365 * 2),
    expiryDate: getTodayOffset(365 * 8), // Valid
    issuingAuthority: 'UCO Ministero Trasporti',
    reminderDaysBefore: 60,
    notes: 'سارية الصلاحية',
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-doc-5',
    title: 'البطاقة الصحية - Tessera Sanitaria (TEAM)',
    category: 'tessera_sanitaria',
    documentNumber: '8038000123456789012',
    holderName: 'أحمد محمود / Ahmed Mahmoud',
    issueDate: getTodayOffset(-365 * 4),
    expiryDate: getTodayOffset(220), // Valid
    issuingAuthority: 'Agenzia delle Entrate / ASL',
    reminderDaysBefore: 60,
    notes: 'صالحة في جميع دول الاتحاد الأوروبي',
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let dbInstance: IDBDatabase | null = null;

/**
 * Open or retrieve the cached IndexedDB instance
 */
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB غير مدعوم في هذا المتصفح'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error || new Error('فشل فتح قاعدة البيانات المحلية'));
    };
  });
}

/**
 * Check if there are legacy documents in localStorage that need migration
 */
function checkLegacyDocs(): DocumentItem[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY_V1) || localStorage.getItem(LEGACY_FALLBACK_KEY_V1);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn('Error reading legacy localStorage:', e);
  }
  return null;
}

/**
 * Load all documents from IndexedDB.
 * Uses SEEDED_FLAG_KEY to ensure demo data is only seeded ONCE on first run,
 * and never re-seeded if user deletes documents!
 */
export async function loadDocuments(): Promise<DocumentItem[]> {
  try {
    const db = await openDB();

    const docs = await new Promise<DocumentItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const hasSeeded = localStorage.getItem(SEEDED_FLAG_KEY);

    // If user has visited before: ALWAYS return what is in the database!
    // Even if it has 0 documents (because user deleted them all), do NOT re-seed demo data!
    if (hasSeeded === 'true') {
      return docs;
    }

    // First visit ever: check for legacy documents to migrate first
    const legacy = checkLegacyDocs();
    if (legacy && legacy.length > 0) {
      await saveDocuments(legacy);
      localStorage.setItem(SEEDED_FLAG_KEY, 'true');
      // Clean up legacy key
      localStorage.removeItem(LEGACY_STORAGE_KEY_V1);
      return legacy;
    }

    // First run ever without legacy data: seed demo documents once
    if (docs.length === 0) {
      await saveDocuments(DEFAULT_DEMO_DOCUMENTS);
      localStorage.setItem(SEEDED_FLAG_KEY, 'true');
      return DEFAULT_DEMO_DOCUMENTS;
    }

    localStorage.setItem(SEEDED_FLAG_KEY, 'true');
    return docs;
  } catch (err) {
    console.error('IndexedDB loadDocuments failed, trying fallback:', err);
    // Fallback to metadata backup
    try {
      const raw = localStorage.getItem(META_BACKUP_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}

    const hasSeeded = localStorage.getItem(SEEDED_FLAG_KEY);
    if (hasSeeded === 'true') {
      return [];
    }
    return DEFAULT_DEMO_DOCUMENTS;
  }
}

/**
 * Persist all documents to IndexedDB immediately and safely
 */
export async function saveDocuments(docs: DocumentItem[]): Promise<void> {
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    tx.oncomplete = () => {
      // Save lightweight metadata copy to localStorage for extra resilience
      try {
        const metaOnly = docs.map(({ fileData, ...rest }) => rest);
        localStorage.setItem(META_BACKUP_KEY, JSON.stringify(metaOnly));
      } catch (e) {
        // Ignore quota warning on metadata
      }
      resolve();
    };

    tx.onerror = () => {
      console.error('IndexedDB save error:', tx.error);
      reject(tx.error || new Error('فشلت عملية حفظ المستندات في قاعدة البيانات'));
    };

    tx.onabort = () => {
      console.error('IndexedDB transaction aborted:', tx.error);
      reject(tx.error || new Error('تم إلغاء عملية حفظ المستندات'));
    };

    // Clear existing and write the entire collection
    store.clear();
    for (const doc of docs) {
      store.put(doc);
    }
  });
}

/**
 * Validates document schema for backup import
 */
export function validateDocumentSchema(doc: any): doc is DocumentItem {
  if (!doc || typeof doc !== 'object') return false;
  if (typeof doc.id !== 'string' || !doc.id) return false;
  if (typeof doc.title !== 'string' || !doc.title) return false;
  if (typeof doc.expiryDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(doc.expiryDate)) return false;

  // Validate optional fileData if present
  if (doc.fileData && !isValidDataUrl(doc.fileData)) {
    doc.fileData = undefined;
  }

  return true;
}

/**
 * Validates backup JSON content
 */
export function parseAndValidateBackup(jsonString: string): { validDocs: DocumentItem[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { validDocs: [], error: 'ملف النسخة الاحتياطية غير صالح: يجب أن يحتوي على قائمة وثائق.' };
    }

    const validDocs: DocumentItem[] = [];
    for (const item of parsed) {
      if (validateDocumentSchema(item)) {
        validDocs.push(item);
      }
    }

    if (validDocs.length === 0) {
      return { validDocs: [], error: 'لم يتم العثور على أي وثائق صالحة داخل الملف.' };
    }

    return { validDocs };
  } catch (err) {
    return { validDocs: [], error: 'تنسيق الملف تالف أو ليس بتنسيق JSON صحيح.' };
  }
}

export function exportBackupJSON(docs: DocumentItem[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(docs, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `rinnovami-backup-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Clean and escape CSV fields with formula injection protection
 */
function sanitizeCSVField(val?: string | number): string {
  if (val === undefined || val === null) return '""';
  let str = String(val);

  // CSV Formula Injection Prevention:
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export function exportCSV(docs: DocumentItem[], lang: 'ar' | 'it' = 'it'): void {
  const headers = lang === 'ar' 
    ? ['المعرف', 'اسم الوثيقة', 'الفئة', 'رقم الوثيقة', 'صاحب الوثيقة', 'تاريخ الانتهاء', 'الجهة المصدرة', 'ملاحظات']
    : ['ID', 'Titolo', 'Categoria', 'Numero Documento', 'Intestatario', 'Data Scadenza', 'Ente', 'Note'];

  const rows = docs.map((d) => [
    sanitizeCSVField(d.id),
    sanitizeCSVField(d.title),
    sanitizeCSVField(d.category),
    sanitizeCSVField(d.documentNumber),
    sanitizeCSVField(d.holderName),
    sanitizeCSVField(d.expiryDate),
    sanitizeCSVField(d.issuingAuthority),
    sanitizeCSVField(d.notes),
  ]);

  const csvContent = '\uFEFF' + [headers.map(sanitizeCSVField).join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `rinnovami-report-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function playAlertSound(): void {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (err) {
    // AudioContext might be blocked until user gesture
  }
}
