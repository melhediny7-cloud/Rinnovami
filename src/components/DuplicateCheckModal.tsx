import React from 'react';
import { AlertTriangle, Copy, RefreshCw, X, FileText, Calendar } from 'lucide-react';
import { DocumentItem, Language } from '../types';
import { formatDateLocale } from '../utils/dateUtils';
import { translations } from '../translations';

interface DuplicateCheckModalProps {
  isOpen: boolean;
  existingDoc: DocumentItem | null;
  newDocData: Partial<DocumentItem>;
  lang: Language;
  onReplace: () => void;
  onKeepBoth: () => void;
  onCancel: () => void;
}

export const DuplicateCheckModal: React.FC<DuplicateCheckModalProps> = ({
  isOpen,
  existingDoc,
  newDocData,
  lang,
  onReplace,
  onKeepBoth,
  onCancel,
}) => {
  if (!isOpen || !existingDoc) return null;
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-300 dark:border-amber-800/80 overflow-hidden flex flex-col"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {lang === 'ar' ? 'التعرف على وثيقة مكررة' : 'Documento Già Presente'}
              </h2>
              <p className="text-xs text-white/90">
                {lang === 'ar' ? 'تنبيه لمنع تكرار الملفات دون قصد' : 'Avviso di rilevamento duplicato'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-800 dark:text-slate-200 text-sm">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-semibold">
            {lang === 'ar'
              ? 'يبدو أن هذا المستند موجود بالفعل في نظامك. هل تريد استبداله أم الاحتفاظ بالنسختين معاً؟'
              : 'Questo documento sembra essere già presente nel tuo archivio. Vuoi sostituirlo o conservare entrambe le copie?'}
          </div>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Existing Doc */}
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase tracking-wide text-[10px]">
                <FileText className="w-3.5 h-3.5 text-brand-500" />
                <span>{lang === 'ar' ? 'المستند الحالي المسجل' : 'Documento Attuale'}</span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white line-clamp-2">
                {existingDoc.title}
              </p>
              <div className="space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDateLocale(existingDoc.expiryDate, lang)}</span>
                </div>
                {existingDoc.documentNumber && (
                  <p className="font-mono text-[10px]">{existingDoc.documentNumber}</p>
                )}
              </div>
            </div>

            {/* New Upload */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wide text-[10px]">
                <Copy className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'ar' ? 'الملف الجديد المرفوع' : 'Nuovo Documento'}</span>
              </div>
              <p className="font-bold text-emerald-950 dark:text-emerald-200 line-clamp-2">
                {newDocData.title || newDocData.fileName || 'Nuovo Documento'}
              </p>
              <div className="space-y-1 text-emerald-700 dark:text-emerald-400 text-[11px]">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDateLocale(newDocData.expiryDate, lang)}</span>
                </div>
                {newDocData.fileName && (
                  <p className="truncate text-[10px]">{newDocData.fileName}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {t.modal.cancel}
          </button>

          <button
            type="button"
            onClick={onKeepBoth}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
          >
            <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>{lang === 'ar' ? 'الاحتفاظ بالنسختين' : 'Conserva entrambi'}</span>
          </button>

          <button
            type="button"
            onClick={onReplace}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-500/25 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{lang === 'ar' ? 'استبدال المستند الحالي' : 'Sostituisci esistente'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
