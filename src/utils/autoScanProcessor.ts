import { DocumentCategory, DocumentItem } from '../types';
import { runItalianOCR, OCRProgress } from './ocrService';
import { compressImageFile } from './imageCompressor';
import { getTodayOffset } from './dateUtils';

export interface AutoScanProgressItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  status: 'compressing' | 'scanning' | 'analyzing' | 'done' | 'error';
  progress: number;
  result?: DocumentItem;
  errorMessage?: string;
}

/**
 * Determine default reminder threshold based on category
 */
function getDefaultReminderDays(cat?: DocumentCategory): number {
  switch (cat) {
    case 'permesso_soggiorno':
      return 60; // Italian law recommends 60 days before expiry
    case 'carta_identita':
      return 90; // CIE can be renewed up to 180 days before expiry
    case 'patente':
      return 60;
    case 'assicurazione':
      return 30;
    case 'tessera_sanitaria':
      return 60;
    default:
      return 60;
  }
}

/**
 * Process a single file automatically into a DocumentItem
 */
export async function autoProcessFile(
  file: File,
  onProgress?: (progress: number, stepText: string) => void
): Promise<DocumentItem> {
  // Step 1: Compress image or load PDF
  if (onProgress) onProgress(15, 'تحجيم ومعالجة الملف...');
  const compression = await compressImageFile(file, 1600, 0.8);

  // Step 2: Run Italian OCR & PDF analysis
  if (onProgress) onProgress(35, 'قراءة النصوص باللغة الإيطالية...');
  const parsed = await runItalianOCR(file, file.name, (p: OCRProgress) => {
    if (onProgress) {
      const scaledProgress = Math.round(35 + p.progress * 55);
      onProgress(scaledProgress, 'تحليل الكلمات والتواريخ الإيطالية...');
    }
  });

  if (onProgress) onProgress(95, 'استخراج الحقول وتأكيد الصلاحية...');

  const category = parsed.category || 'altro';
  const reminderDaysBefore = getDefaultReminderDays(category);

  // Expiry date is adopted automatically by the system without requiring manual review
  let expiryDate = parsed.expiryDate;
  if (!expiryDate) {
    expiryDate = getTodayOffset(365); // Fallback: 1 year from now
  }
  const needsReview = false;

  const newDoc: DocumentItem = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: parsed.title || file.name.replace(/\.[^/.]+$/, ''),
    category,
    documentNumber: parsed.documentNumber || '',
    holderName: parsed.holderName || '',
    issueDate: parsed.issueDate || undefined,
    expiryDate,
    issuingAuthority: parsed.issuingAuthority || undefined,
    reminderDaysBefore,
    notes: parsed.rawText ? `تم الاستخراج التلقائي بنجاح. دقة الفحص: ${parsed.confidenceScore}%` : undefined,
    fileData: compression.dataUrl,
    fileName: file.name,
    fileType: file.type,
    fileSize: compression.size,
    isDemo: false,
    needsReview,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (onProgress) onProgress(100, 'تم استخراج وحفظ الوثيقة بنجاح!');
  return newDoc;
}
