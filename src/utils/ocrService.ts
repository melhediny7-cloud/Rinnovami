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
 * Extract text directly from a PDF file using PDF.js text layer.
 * If text layer is empty (scanned PDF), render first page to canvas for OCR.
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (p: OCRProgress) => void
): Promise<string> {
  if (onProgress) {
    onProgress({ status: 'lettura_pdf', progress: 0.15 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let extractedText = '';
  const maxPages = Math.min(pdf.numPages, 3); // check first 3 pages

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageStr = textContent.items
      .map((item: any) => item.str || '')
      .join(' ');
    extractedText += ' ' + pageStr;

    if (onProgress) {
      onProgress({
        status: `pagina_${i}`,
        progress: 0.2 + (i / maxPages) * 0.4,
      });
    }
  }

  // If we found meaningful text in the text layer, return it directly!
  if (extractedText.trim().length > 30) {
    if (onProgress) {
      onProgress({ status: 'completato_testo', progress: 1.0 });
    }
    return extractedText;
  }

  // Otherwise, it's a scanned PDF without text layer: render page 1 to canvas for OCR
  if (onProgress) {
    onProgress({ status: 'scansione_ocr_pdf', progress: 0.5 });
  }

  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return extractedText;
  }

  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

  // Preprocess canvas with contrast enhancement to eliminate background scan shadows/patterns
  const enhancedCanvas = preprocessCanvasForOCR(canvas);

  // Run Tesseract OCR on rendered canvas
  const ocrResult = await Tesseract.recognize(enhancedCanvas, 'ita+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress({
          status: 'ocr_scansione',
          progress: Math.min(0.6 + (m.progress || 0) * 0.35, 0.95),
        });
      }
    },
  });

  return ocrResult.data.text || extractedText;
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
