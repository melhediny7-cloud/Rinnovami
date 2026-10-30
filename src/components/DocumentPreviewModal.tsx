import React, { useState, useEffect } from 'react';
import { X, Download, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DocumentItem, Language } from '../types';
import { translations } from '../translations';
import { isValidDataUrl } from '../utils/imageCompressor';
import { decryptDocumentData } from '../utils/cryptoService';
import { logActivity } from '../utils/auditLogger';

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
  const [decryptedData, setDecryptedData] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && doc?.fileData) {
      // Log activity
      logActivity('view', doc.title, `Aperto file: ${doc.fileName || 'allegato'}`, doc.id);

      // Decrypt if encrypted package
      if (doc.fileData.startsWith('ENC_V1:')) {
        decryptDocumentData(doc.fileData).then((decrypted) => {
          setDecryptedData(decrypted);
          setupBlob(decrypted, doc.fileType);
        });
      } else {
        setDecryptedData(doc.fileData);
        setupBlob(doc.fileData, doc.fileType);
      }
    } else {
      setDecryptedData(null);
      setBlobUrl(null);
    }
  }, [doc, isOpen]);

  const setupBlob = (data: string, fileType?: string) => {
    if (data && isValidDataUrl(data)) {
      if (fileType === 'application/pdf' || data.startsWith('data:application/pdf')) {
        try {
          const blob = base64ToBlob(data, 'application/pdf');
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        } catch (e) {
          console.error('Error creating PDF blob URL:', e);
          setBlobUrl(null);
        }
      }
    }
  };

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (!isOpen || !doc || !doc.fileData) return null;
  const t = translations[lang];

  const activeData = decryptedData || doc.fileData;
  const isSafe = isValidDataUrl(activeData);
  if (!isSafe && !doc.fileData.startsWith('ENC_V1:')) {
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

  const isImage = doc.fileType?.startsWith('image/') || activeData.startsWith('data:image/');

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

          {/* Security Badge if Encrypted */}
          {doc.isEncrypted && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold me-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'مشفّر AES-256' : 'Protetto AES-256'}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <a
              href={blobUrl || activeData}
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
              src={activeData}
              alt={doc.title}
              className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-lg"
            />
          ) : (
            <iframe
              src={blobUrl || activeData}
              title={doc.title}
              className="w-full h-[70vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
};
