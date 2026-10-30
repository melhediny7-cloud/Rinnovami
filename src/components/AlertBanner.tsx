import React from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Volume2, ShieldAlert } from 'lucide-react';
import { DocumentItem, Language } from '../types';
import { translations } from '../translations';
import { computeDocumentStatus } from '../utils/dateUtils';
import { playAlertSound } from '../utils/storage';

interface AlertBannerProps {
  documents: DocumentItem[];
  lang: Language;
  onFilterUrgent: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  documents,
  lang,
  onFilterUrgent,
}) => {
  const t = translations[lang];

  let expiredCount = 0;
  let criticalCount = 0;

  documents.forEach((doc) => {
    const status = computeDocumentStatus(doc.expiryDate, doc.reminderDaysBefore);
    if (status === 'expired') expiredCount++;
    else if (status === 'critical') criticalCount++;
  });

  if (expiredCount === 0 && criticalCount === 0) {
    return null;
  }

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 text-white p-4 sm:p-5 shadow-lg shadow-rose-500/15 mb-6 animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl shrink-0 mt-0.5 sm:mt-0 ring-2 ring-white/30">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg">
                {t.alerts.attentionRequired}
              </h3>
              <button
                onClick={playAlertSound}
                className="p-1 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors"
                title={t.alerts.notificationSound}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-white/90 text-xs sm:text-sm mt-0.5 font-medium leading-relaxed">
              {expiredCount > 0 && (
                <span>
                  {t.alerts.documentsExpiredMsg.replace('{count}', String(expiredCount))}{' '}
                </span>
              )}
              {criticalCount > 0 && (
                <span>
                  {t.alerts.documentsCriticalMsg.replace('{count}', String(criticalCount))}
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onFilterUrgent}
          className="self-end sm:self-center shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95"
        >
          <span>{lang === 'ar' ? 'عرض الوثائق العاجلة' : 'Visualizza Documenti Urgenti'}</span>
          <ArrowIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
