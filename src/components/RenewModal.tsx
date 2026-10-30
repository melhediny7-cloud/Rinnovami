import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { DocumentItem, Language } from '../types';
import { translations } from '../translations';
import { formatDateLocale } from '../utils/dateUtils';

interface RenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  onRenew: (docId: string, newExpiryDate: string) => void;
  lang: Language;
}

function addYearsToDateString(dateStr: string, yearsToAdd: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const newYear = y + yearsToAdd;
  let newDay = d;

  // Leap year safety check: if Feb 29 and target year is not leap year, clamp to Feb 28
  if (m === 2 && d === 29) {
    const isLeap = (newYear % 4 === 0 && newYear % 100 !== 0) || newYear % 400 === 0;
    if (!isLeap) {
      newDay = 28;
    }
  }

  return `${newYear}-${String(m).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
}

export const RenewModal: React.FC<RenewModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  onRenew,
  lang,
}) => {
  // Hooks MUST be called unconditionally at the top level
  const [newDate, setNewDate] = useState<string>('');

  useEffect(() => {
    if (doc?.expiryDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      // If expired, base calculation from today, otherwise from existing expiry date
      const baseDate = doc.expiryDate < todayStr ? todayStr : doc.expiryDate;
      setNewDate(addYearsToDateString(baseDate, 1));
    }
  }, [doc, isOpen]);

  // Early return ONLY after all hooks
  if (!isOpen || !doc) return null;

  const t = translations[lang];

  const handleSetOffsetYears = (years: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const baseDate = doc.expiryDate < todayStr ? todayStr : doc.expiryDate;
    setNewDate(addYearsToDateString(baseDate, years));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;
    onRenew(doc.id, newDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-brand-50/50 dark:bg-brand-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {t.renewModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                {doc.title}
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

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t.renewModal.description}
          </p>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex justify-between">
            <span className="text-slate-400">{lang === 'ar' ? 'التاريخ الحالي المسجل:' : 'Data attuale:'}</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{formatDateLocale(doc.expiryDate, lang)}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.renewModal.newExpiryDate}
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Quick presets */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-400 mb-2">
              {lang === 'ar' ? 'أو اختر تمديداً سريعاً:' : 'Oppure seleziona estensione rapida:'}
            </span>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSetOffsetYears(1)}
                className="py-1.5 px-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-slate-700 dark:text-slate-200"
              >
                +1 {lang === 'ar' ? 'سنة' : 'anno'}
              </button>
              <button
                type="button"
                onClick={() => handleSetOffsetYears(2)}
                className="py-1.5 px-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-slate-700 dark:text-slate-200"
              >
                +2 {lang === 'ar' ? 'سنتين' : 'anni'}
              </button>
              <button
                type="button"
                onClick={() => handleSetOffsetYears(5)}
                className="py-1.5 px-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-slate-700 dark:text-slate-200"
              >
                +5 {lang === 'ar' ? 'سنوات' : 'anni'}
              </button>
              <button
                type="button"
                onClick={() => handleSetOffsetYears(10)}
                className="py-1.5 px-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-slate-700 dark:text-slate-200"
              >
                +10 {lang === 'ar' ? 'سنوات' : 'anni'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.modal.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/20 transition-all"
            >
              {t.renewModal.updateButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
