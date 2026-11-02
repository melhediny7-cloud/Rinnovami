import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { analyzeItalianDocumentText, ParsedDocumentData } from './italianDocParser';
import { preprocessCanvasForOCR } from './imageCompressor';

// Configure PDF.js worker
try {
  // Use Vite's URL import for worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
} catch (e) {
  console.warn('PDF.js worker initialization warning:', e);
}

export interface OCRProgress {
  status: string;
  progress: number;
}

/**
 * Extract text directly from a PDF file using PDF.js text layer across all pages.
 * If text layer is missing or sparse (scanned PDF), renders pages to canvas and runs Tesseract OCR.
 * Scans up to 8 pages to read full multi-page contracts, courses, and certificates.
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (p: OCRProgress) => void
): Promise<string> {
  if (onProgress) {
    onProgress({ status: 'lettura_pdf', progress: 0.1 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  let extractedText = '';
  const maxTextPages = Math.min(totalPages, 15); // inspect up to 15 pages for digital text

  for (let i = 1; i <= maxTextPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageStr = textContent.items
      .map((item: any) => item.str || '')
      .join(' ')
      .trim();
    if (pageStr) {
      extractedText += `\n[--- Pagina ${i} ---]\n${pageStr}`;
    }

    if (onProgress) {
      onProgress({
        status: `Lettura pagina ${i}/${maxTextPages}...`,
        progress: 0.1 + (i / maxTextPages) * 0.3,
      });
    }
  }

  // If we found sufficient digital text (> 120 chars), return the full multi-page text!
  if (extractedText.trim().length > 120) {
    if (onProgress) {
      onProgress({ status: 'completato_testo', progress: 1.0 });
    }
    return extractedText;
  }

  // Otherwise, it's a scanned PDF without text layer: run OCR across all pages (up to 8 pages)
  const maxOcrPages = Math.min(totalPages, 8);
  let ocrFullText = '';

  for (let i = 1; i <= maxOcrPages; i++) {
    if (onProgress) {
      onProgress({
        status: `Scansione OCR pagina ${i}/${maxOcrPages}...`,
        progress: 0.2 + ((i - 1) / maxOcrPages) * 0.75,
      });
    }

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    // Contrast enhancement
    const enhancedCanvas = preprocessCanvasForOCR(canvas);

    const ocrResult = await Tesseract.recognize(enhancedCanvas, 'ita+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          const pageProgress = (m.progress || 0) / maxOcrPages;
          const baseProgress = 0.2 + ((i - 1) / maxOcrPages) * 0.75;
          onProgress({
            status: `Scansione OCR pagina ${i}/${maxOcrPages}...`,
            progress: Math.min(baseProgress + pageProgress * 0.75, 0.96),
          });
        }
      },
    });

    if (ocrResult.data.text && ocrResult.data.text.trim()) {
      ocrFullText += `\n[--- Pagina ${i} ---]\n${ocrResult.data.text.trim()}`;
    }
  }

  if (onProgress) {
    onProgress({ status: 'completato_ocr', progress: 1.0 });
  }

  return ocrFullText || extractedText;
}

/**
 * Loads a File or string URL into an HTMLImageElement for canvas preprocessing
 */
function loadImageSource(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for OCR'));
    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Perform Italian document analysis on an image or PDF
 */
export async function runItalianOCR(
  fileOrUrl: File | string,
  fileName?: string,
  onProgress?: (p: OCRProgress) => void
): Promise<ParsedDocumentData> {
  try {
    let rawText = '';

    // Check if input is a PDF File
    if (fileOrUrl instanceof File && fileOrUrl.type === 'application/pdf') {
      rawText = await extractTextFromPDF(fileOrUrl, onProgress);
    } else {
      // Input is an image
      if (onProgress) {
        onProgress({ status: 'inizializzazione', progress: 0.1 });
      }

      // Preprocess image for maximum contrast on scanned documents
      let ocrInput: HTMLCanvasElement | File | string = fileOrUrl;
      try {
        const imgEl = await loadImageSource(fileOrUrl);
        ocrInput = preprocessCanvasForOCR(imgEl);
      } catch (prepErr) {
        console.warn('Image pre-filter fallback to original:', prepErr);
      }

      const result = await Tesseract.recognize(ocrInput as any, 'ita+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress({
              status: m.status,
              progress: Math.min(0.2 + (m.progress || 0) * 0.75, 0.95),
            });
          }
        },
      });

      rawText = result.data.text || '';
    }

    if (onProgress) {
      onProgress({ status: 'analisi_campi', progress: 0.98 });
    }

    const parsed = analyzeItalianDocumentText(rawText, fileName);

    if (onProgress) {
      onProgress({ status: 'completato', progress: 1.0 });
    }

    return parsed;
  } catch (error) {
    console.error('OCR / PDF Extraction Error:', error);
    // Return empty result with 0 confidence so UI can show proper warning!
    return {
      title: fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : '',
      category: 'altro',
      confidenceScore: 0,
      extractedFields: [],
      rawText: '',
      notes: undefined,
    };
  }
}
