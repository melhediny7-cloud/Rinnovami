import React from 'react';
import { X, CalendarDays, Download, CheckCircle2 } from 'lucide-react';
import { DocumentItem, Language } from '../types';
import { translations } from '../translations';
import { generateICSContent } from '../utils/dateUtils';

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  lang: Language;
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  isOpen,
  onClose,
  documents,
  lang,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const handleDownloadICS = () => {
    const icsContent = generateICSContent(documents);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `docuscadenza-promemoria-${new Date().toISOString().split('T')[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {t.calendarModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Google Calendar / Apple Calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {t.calendarModal.description}
          </p>

          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{t.calendarModal.includedReminders}</span>
            </div>
            <p className="text-indigo-700/80 dark:text-indigo-300/80">
              {lang === 'ar'
                ? `سيتم تضمين تذكيرات لـ (${documents.length}) وثيقة مسجلة لإضافتها لتقويمك بنقرة واحدة.`
                : `Verranno esportati i promemoria per (${documents.length}) documenti da importare nel tuo calendario.`}
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.modal.cancel}
            </button>
            <button
              onClick={handleDownloadICS}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{t.calendarModal.downloadButton}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
