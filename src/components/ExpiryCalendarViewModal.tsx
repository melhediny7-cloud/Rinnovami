import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  CalendarDays, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3, 
  ChevronRight, 
  Sparkles,
  FileText
} from 'lucide-react';
import { DocumentItem, Language } from '../types';
import { formatDateLocale, getDaysRemaining } from '../utils/dateUtils';
import { translations } from '../translations';

interface ExpiryCalendarViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  lang: Language;
  onSelectDoc?: (doc: DocumentItem) => void;
}

export const ExpiryCalendarViewModal: React.FC<ExpiryCalendarViewModalProps> = ({
  isOpen,
  onClose,
  documents,
  lang,
  onSelectDoc,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 to 11

  const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
  const nextMonthYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();

  // 1. Documents expiring this month
  const expiringThisMonth = documents.filter((doc) => {
    if (!doc.expiryDate) return false;
    const [y, m] = doc.expiryDate.split('-').map(Number);
    return y === currentYear && m === currentMonth + 1;
  });

  // 2. Documents expiring next month
  const expiringNextMonth = documents.filter((doc) => {
    if (!doc.expiryDate) return false;
    const [y, m] = doc.expiryDate.split('-').map(Number);
    return y === nextMonthYear && m === nextMonth + 1;
  });

  // 3. 12-Month Distribution Analysis for current year
  const MONTH_NAMES_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const MONTH_NAMES_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthLabels = lang === 'ar' ? MONTH_NAMES_AR : MONTH_NAMES_IT;

  const monthlyCounts = new Array(12).fill(0);
  documents.forEach((doc) => {
    if (!doc.expiryDate) return;
    const [y, m] = doc.expiryDate.split('-').map(Number);
    if (y === currentYear && m >= 1 && m <= 12) {
      monthlyCounts[m - 1]++;
    }
  });

  const maxRenewals = Math.max(...monthlyCounts, 1);
  const busiestMonthIndex = monthlyCounts.indexOf(Math.max(...monthlyCounts));
  const busiestMonthCount = monthlyCounts[busiestMonthIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-md shrink-0">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  {lang === 'ar' ? 'تقويم انتهاء المستندات وتوزيع التجديدات' : 'Calendario Scadenze Documenti'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                  {currentYear}
                </span>
              </div>
              <p className="text-xs text-white/85">
                {lang === 'ar' 
                  ? 'رؤية شهرية واضحة للوثائق المنتهية وقريباً من الانتهاء وأكثر الشهور ازدحاماً'
                  : 'Panoramica mensile delle scadenze e analisi dei periodi di maggior rinnovo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50 dark:bg-slate-950/50">
          
          {/* Peak Renewals Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-brand-500/10 border border-amber-300 dark:border-amber-800/60 text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  {lang === 'ar' ? 'أكثر الشهور ازدحامًا بالتجديدات' : 'Mese più impegnativo per i rinnovi'}
                </p>
                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {busiestMonthCount > 0 ? (
                    lang === 'ar' ? (
                      <span>شهر <span className="text-amber-600 dark:text-amber-400">{monthLabels[busiestMonthIndex]}</span> هو الأكثر ضغطاً بإجمالي <span className="underline">{busiestMonthCount}</span> وثائق تنتهي فيه!</span>
                    ) : (
                      <span>Il mese di <span className="text-amber-600 dark:text-amber-400">{monthLabels[busiestMonthIndex]}</span> ha il picco con <span className="underline">{busiestMonthCount}</span> documenti in scadenza!</span>
                    )
                  ) : (
                    lang === 'ar' ? 'لا توجد وثائق مجدولة لهذا العام حتى الآن' : 'Nessun documento programmato per quest\'anno'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* 12-Month Distribution Chart */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-500" />
                <span>{lang === 'ar' ? 'التوزيع السنوي لانتهاء المستندات (12 شهراً)' : 'Distribuzione Annuale Scadenze (12 Mesi)'}</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {documents.length} {lang === 'ar' ? 'وثيقة مسجلة' : 'documenti'}
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-2 items-end min-h-[140px]">
              {monthlyCounts.map((count, idx) => {
                const isCurrent = idx === currentMonth;
                const isBusiest = idx === busiestMonthIndex && count > 0;
                const heightPercent = Math.max(12, Math.round((count / maxRenewals) * 100));

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {count > 0 ? count : ''}
                    </span>
                    <div 
                      className={`w-full max-w-[28px] rounded-lg transition-all duration-300 ${
                        isBusiest
                          ? 'bg-gradient-to-t from-amber-600 to-orange-400 shadow-md shadow-amber-500/30'
                          : isCurrent
                          ? 'bg-gradient-to-t from-brand-600 to-cyan-500 shadow-md shadow-brand-500/30 ring-2 ring-brand-400'
                          : count > 0
                          ? 'bg-indigo-500/80 dark:bg-indigo-600/80 hover:bg-indigo-600'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${monthLabels[idx]}: ${count}`}
                    />
                    <span className={`text-[10px] font-bold truncate ${
                      isCurrent 
                        ? 'text-brand-600 dark:text-brand-400' 
                        : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                    }`}>
                      {monthLabels[idx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two Columns: This Month vs Next Month */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Column 1: Expiring This Month */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'تنتهي خلال هذا الشهر' : 'In Scadenza Questo Mese'}
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  {expiringThisMonth.length}
                </span>
              </div>

              {expiringThisMonth.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-1">
                  <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500/60" />
                  <p className="text-xs font-medium">
                    {lang === 'ar' ? 'لا توجد وثائق تنتهي خلال هذا الشهر 🎉' : 'Nessun documento scade questo mese 🎉'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto">
                  {expiringThisMonth.map((doc) => {
                    const days = getDaysRemaining(doc.expiryDate);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => onSelectDoc && onSelectDoc(doc)}
                        className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-100/60 transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {doc.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {t.categories[doc.category]} • {doc.holderName || doc.documentNumber}
                          </p>
                        </div>
                        <div className="text-end shrink-0">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                            days < 0 
                              ? 'bg-rose-600 text-white' 
                              : 'bg-amber-500 text-white'
                          }`}>
                            {days < 0 
                              ? (lang === 'ar' ? `منتهية منذ ${Math.abs(days)} يوم` : `Scaduto da ${Math.abs(days)} gg`)
                              : (lang === 'ar' ? `متبقي ${days} يوم` : `${days} gg rimasti`)}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            {doc.expiryDate}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column 2: Expiring Next Month */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'تنتهي خلال الشهر القادم' : 'In Scadenza Il Prossimo Mese'}
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  {expiringNextMonth.length}
                </span>
              </div>

              {expiringNextMonth.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-1">
                  <CheckCircle2 className="w-7 h-7 mx-auto text-blue-500/60" />
                  <p className="text-xs font-medium">
                    {lang === 'ar' ? 'لا توجد وثائق تنتهي في الشهر القادم' : 'Nessun documento scade il prossimo mese'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto">
                  {expiringNextMonth.map((doc) => {
                    const days = getDaysRemaining(doc.expiryDate);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => onSelectDoc && onSelectDoc(doc)}
                        className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between gap-3 cursor-pointer hover:bg-blue-100/60 transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {doc.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {t.categories[doc.category]} • {doc.holderName || doc.documentNumber}
                          </p>
                        </div>
                        <div className="text-end shrink-0">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-600 text-white">
                            {lang === 'ar' ? `متبقي ${days} يوم` : `${days} gg rimasti`}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">
                            {doc.expiryDate}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md transition-all"
          >
            {t.modal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
