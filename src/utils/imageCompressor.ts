/**
 * Utility to compress images to max 1600px width/height and 0.8 JPEG quality
 * to save storage and speed up OCR analysis significantly.
 */
export interface CompressionResult {
  dataUrl: string;
  size: number;
  width?: number;
  height?: number;
}

export function isValidDataUrl(url?: string): boolean {
  if (!url) return false;
  // Strictly allow only safe image and PDF base64 data URLs
  const regex = /^data:(image\/(jpeg|png|webp|jpg)|application\/pdf);base64,[A-Za-z0-9+/=]+$/;
  return regex.test(url);
}

export async function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.8
): Promise<CompressionResult> {
  // If it's a PDF, we don't resize via canvas; convert to base64 directly
  if (file.type === 'application/pdf') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          dataUrl,
          size: file.size,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsDataURL(file);
    });
  }

  // Handle images
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale down if either dimension exceeds maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to uncompressed
          resolve({
            dataUrl: e.target?.result as string,
            size: file.size,
            width: img.width,
            height: img.height,
          });
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

        // Approximate size in bytes from base64
        const stringLength = compressedDataUrl.length - 'data:image/jpeg;base64,'.length;
        const sizeInBytes = Math.round((stringLength * 3) / 4);

        resolve({
          dataUrl: compressedDataUrl,
          size: sizeInBytes,
          width,
          height,
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Preprocesses an image or canvas for Italian document OCR:
 * 1. Converts to grayscale using perceptual luminance weights.
 * 2. Enhances contrast to separate faint text from security watermarks and colored card plastic.
 * 3. Returns an optimized canvas ready for Tesseract recognition.
 */
export function preprocessCanvasForOCR(source: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = 'naturalWidth' in source ? (source.naturalWidth || source.width) : source.width;
  const height = 'naturalHeight' in source ? (source.naturalHeight || source.height) : source.height;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(source, 0, 0, width, height);

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Contrast enhancement factor (1.4 provides clean separation without harsh pixelation)
    const contrast = 1.4;
    const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

    for (let i = 0; i < data.length; i += 4) {
      // Relative luminance
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Contrast stretching
      let enhanced = factor * (gray - 128) + 128;
      
      // Slight threshold bias for text clarity
      if (enhanced > 200) {
        enhanced = 255; // White background
      } else if (enhanced < 65) {
        enhanced = 0; // Dark sharp text
      }

      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Canvas filter failed, falling back to original canvas:', err);
  }

  return canvas;
}
