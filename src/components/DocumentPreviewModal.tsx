import React, { useState, useEffect } from 'react';
import { X, Download, FileText, AlertTriangle } from 'lucide-react';
import { DocumentItem, Language } from '../types';
import { translations } from '../translations';
import { isValidDataUrl } from '../utils/imageCompressor';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  lang: Language;
}

function base64ToBlob(base64Data: string, contentType = ''): Blob {
  const parts = base64Data.split(';base64,');
  const rawBase64 = parts[1] || parts[0];
  const byteCharacters = atob(rawBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType || 'application/pdf' });
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  lang,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (doc?.fileData && isValidDataUrl(doc.fileData)) {
      if (doc.fileType === 'application/pdf' || doc.fileData.startsWith('data:application/pdf')) {
        try {
          const blob = base64ToBlob(doc.fileData, 'application/pdf');
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          return () => {
            URL.revokeObjectURL(url);
          };
        } catch (e) {
          console.error('Error creating PDF blob URL:', e);
          setBlobUrl(null);
        }
      }
    }
    setBlobUrl(null);
  }, [doc, isOpen]);

  if (!isOpen || !doc || !doc.fileData) return null;
  const t = translations[lang];

  // Validate security of data URL
  const isSafe = isValidDataUrl(doc.fileData);
  if (!isSafe) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="font-bold text-slate-900 dark:text-white">ملف غير موثوق / File non valido</h3>
          <p className="text-xs text-slate-500">تم حظر معاينة هذا الملف لحماية الأمان.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-bold">
            {t.modal.cancel}
          </button>
        </div>
      </div>
    );
  }

  const isImage = doc.fileType?.startsWith('image/') || doc.fileData.startsWith('data:image/');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h3 className="font-bold text-slate-900 dark:text-white truncate">
                {doc.title}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {doc.fileName || 'Document File'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={blobUrl || doc.fileData}
              download={doc.fileName || `${doc.title}.${isImage ? 'jpg' : 'pdf'}`}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Download file"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
          {isImage ? (
            <img
              src={doc.fileData}
              alt={doc.title}
              className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-lg"
            />
          ) : (
            <iframe
              src={blobUrl || doc.fileData}
              title={doc.title}
              className="w-full h-[70vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
};
