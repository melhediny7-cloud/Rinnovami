import { DocumentCategory, DocumentItem } from '../types';
import { runItalianOCR, OCRProgress } from './ocrService';
import { compressImageFile } from './imageCompressor';
import { getDefaultReminderDays } from './dateUtils';

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
  const reminderDaysBefore = getDefaultReminderDays(category, parsed.title || file.name);

  // Accurate status evaluation: respect permanent documents and flag estimated/missing dates with needsReview
  const hasNoExpiry = !!parsed.hasNoExpiry;
  let expiryDate = parsed.expiryDate || '';
  let needsReview = !!parsed.needsReview;

  if (!hasNoExpiry && !expiryDate) {
    needsReview = true;
  }

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
    notes: parsed.rawText ? `تم الفحص الضوئي بنجاح. دقة الفحص: ${parsed.confidenceScore}%` : undefined,
    fileData: compression.dataUrl,
    fileName: file.name,
    fileType: file.type,
    fileSize: compression.size,
    isDemo: false,
    hasNoExpiry,
    needsReview,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (onProgress) onProgress(100, 'تم استخراج وحفظ الوثيقة بنجاح!');
  return newDoc;
}
