import React from 'react';
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  FileText, 
  Clock, 
  Calendar,
  X
} from 'lucide-react';
import { AutoScanProgressItem } from '../utils/autoScanProcessor';
import { Language } from '../types';
import { formatDateLocale } from '../utils/dateUtils';

interface AutoScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: AutoScanProgressItem[];
  lang: Language;
}

export const AutoScanModal: React.FC<AutoScanModalProps> = ({
  isOpen,
  onClose,
  items,
  lang,
}) => {
  if (!isOpen || items.length === 0) return null;

  const isAllDone = items.every((i) => i.status === 'done' || i.status === 'error');
  const successCount = items.filter((i) => i.status === 'done').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                {lang === 'ar' ? 'المسح التلقائي المباشر للوثائق' : 'Elaborazione Automatica Documenti'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAllDone
                  ? (lang === 'ar' ? `اكتمل مسح (${successCount} من ${items.length}) وثيقة بنجاح!` : `Completata analisi di (${successCount} su ${items.length}) documenti!`)
                  : (lang === 'ar' ? 'جارٍ قراءة وفهم النصوص الإيطالية تلقائياً...' : 'Riconoscimento e analisi del testo in corso...')}
              </p>
            </div>
          </div>

          {isAllDone && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Items List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {items.map((item) => {
            const doc = item.result;
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="p-2 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {doc ? doc.title : item.fileName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {(item.fileSize / 1024).toFixed(0)} KB • {item.file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0">
                    {item.status === 'done' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'تم التعرف والحفظ' : 'Riconosciuto'}</span>
                      </span>
                    ) : item.status === 'error' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'فشل' : 'Errore'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-100 dark:bg-brand-950/60 text-brand-800 dark:text-brand-300">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                        <span>{item.progress}%</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar if still running */}
                {item.status !== 'done' && item.status !== 'error' && (
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                {/* Extracted Details pill when done */}
                {doc && item.status === 'done' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded-md border border-brand-200/50 dark:border-brand-800/50">
                      <Calendar className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'تاريخ الانتهاء:' : 'Scadenza:'} {formatDateLocale(doc.expiryDate, lang)}</span>
                    </span>

                    {doc.holderName && (
                      <span className="font-medium text-slate-500 dark:text-slate-400">
                        • {doc.holderName}
                      </span>
                    )}

                    {doc.documentNumber && (
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        • {doc.documentNumber}
                      </span>
                    )}

                    {doc.needsReview && (
                      <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                        ⚠️ {lang === 'ar' ? 'تاريخ مقدّر (تأكيد)' : 'Data stimata'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            {isAllDone
              ? (lang === 'ar' ? 'تمت إضافة جميع الوثائق وبدأ نظام التنبيهات في مراقبتها تلقائياً!' : 'Documenti aggiunti e monitorati automaticamente!')
              : (lang === 'ar' ? 'يرجى الانتظار ثوانٍ معدودة...' : 'Elaborazione in corso...')}
          </p>
          {isAllDone && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/20 transition-all hover:scale-105"
            >
              {lang === 'ar' ? 'رائع، عرض لوحة التحكم' : 'Perfetto, vai alla Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
