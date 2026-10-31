import React from 'react';
import { 
  Calendar, 
  User, 
  FileText, 
  Building2, 
  Clock, 
  Eye, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  BookOpen, 
  CalendarPlus, 
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  MessageSquare,
  FolderArchive,
  Tag
} from 'lucide-react';
import { DocumentItem, Language } from '../types';
import { translations } from '../translations';
import { computeDocumentStatus, formatDateLocale, formatRelativeDays, getDaysRemaining, generateGoogleCalendarUrl } from '../utils/dateUtils';
import { sendSingleDocWhatsApp } from '../utils/whatsappAlertService';

interface DocumentCardProps {
  document: DocumentItem;
  lang: Language;
  onPreview: (doc: DocumentItem) => void;
  onEdit: (doc: DocumentItem) => void;
  onDelete: (id: string) => void;
  onQuickRenew: (doc: DocumentItem) => void;
  onOpenGuideForCategory: (cat: DocumentItem['category']) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: doc,
  lang,
  onPreview,
  onEdit,
  onDelete,
  onQuickRenew,
  onOpenGuideForCategory,
}) => {
  const t = translations[lang];
  const days = getDaysRemaining(doc.expiryDate);
  const status = computeDocumentStatus(doc.expiryDate, doc.reminderDaysBefore, doc.hasNoExpiry);

  // Smart Color Palette requested by user:
  // Green: Valid (> 90 days)
  // Yellow: Expiring within 90 days (31 - 90 days)
  // Orange: Expiring within 30 days (1 - 30 days)
  // Red: Expired (<= 0 days)
  // Purple: Needs Review
  const statusConfig = {
    permanent: {
      label: lang === 'ar' ? 'أرشيف دائم' : 'Archivio Permanente',
      badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
      countdownBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
      icon: FolderArchive,
      borderTop: 'border-t-4 border-t-indigo-500',
    },

    valid: {
      label: lang === 'ar' ? 'ساري (> 90 يوم)' : 'Valido (> 90 gg)',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      countdownBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      icon: CheckCircle2,
      borderTop: 'border-t-4 border-t-emerald-500',
    },
    expiring_soon: {
      label: lang === 'ar' ? 'ينتهي خلال 90 يومًا' : 'Scade entro 90 gg',
      badgeBg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/70 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800',
      countdownBg: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
      icon: Clock,
      borderTop: 'border-t-4 border-t-yellow-400',
    },
    critical: {
      label: lang === 'ar' ? 'ينتهي خلال 30 يومًا' : 'Scade entro 30 gg',
      badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300 dark:border-orange-800',
      countdownBg: 'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
      icon: AlertTriangle,
      borderTop: 'border-t-4 border-t-orange-500',
    },
    expired: {
      label: lang === 'ar' ? 'منتهي الصلاحية' : 'Scaduto',
      badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-900',
      countdownBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
      icon: AlertOctagon,
      borderTop: 'border-t-4 border-t-rose-600',
    },
    review: {
      label: lang === 'ar' ? 'يحتاج مراجعة وتأكيد' : 'Richiede verifica',
      badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
      countdownBg: 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
      icon: AlertTriangle,
      borderTop: 'border-t-4 border-t-purple-600',
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className={`group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden ${statusConfig.borderTop}`}>
      
      {/* Top Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          
          {/* Category Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <FileText className="w-3.5 h-3.5 text-brand-500" />
            <span className="line-clamp-1">{t.categories[doc.category]}</span>
          </span>

          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusConfig.badgeBg}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusConfig.label}</span>
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
          {doc.title}
        </h3>

        {/* Countdown Pill */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold ${statusConfig.countdownBg}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formatRelativeDays(days, lang)}</span>
          </div>


        </div>

        {/* Document Details Grid */}
        <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
          
          {/* Expiry Date */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{t.card.expiresOn}:</span>
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {formatDateLocale(doc.expiryDate, lang)}
            </span>
          </div>

          {/* Issue Date (if available) */}
          {doc.issueDate && (
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-sky-500" />
                <span>{lang === 'ar' ? 'تاريخ الإصدار:' : 'Data Rilascio:'}</span>
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatDateLocale(doc.issueDate, lang)}
              </span>
            </div>
          )}

          {/* Holder Name */}
          {doc.holderName && (
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="flex items-center gap-1.5 text-slate-400">
                <User className="w-3.5 h-3.5" />
                <span>{t.card.holder}:</span>
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[180px]">
                {doc.holderName}
              </span>
            </div>
          )}

          {/* Document Number */}
          {doc.documentNumber && (
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="flex items-center gap-1.5 text-slate-400">
                <FileText className="w-3.5 h-3.5" />
                <span>{t.card.docNum}:</span>
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {doc.documentNumber}
              </span>
            </div>
          )}

          {/* Authority */}
          {doc.issuingAuthority && (
            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Building2 className="w-3.5 h-3.5" />
                <span>{t.card.authority}:</span>
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300 line-clamp-1 max-w-[180px]">
                {doc.issuingAuthority}
              </span>
            </div>
          )}

          {/* Notes if any */}
          {doc.notes && (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
              "{doc.notes}"
            </p>
          )}

          {/* Attached File Preview Badge */}
          {doc.fileData && (
            <div className="pt-2">
              <button
                onClick={() => onPreview(doc)}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-semibold text-xs border border-brand-200/50 dark:border-brand-800/50 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="truncate">{doc.fileName || t.card.viewFile}</span>
                <Eye className="w-3.5 h-3.5 ms-auto" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1">
        
        {/* Quick Renew Button */}
        <button
          onClick={() => onQuickRenew(doc)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-sm transition-colors"
          title={t.card.quickRenew}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t.card.quickRenew}</span>
        </button>

        <div className="flex items-center gap-1">
          {/* Quick WhatsApp Reminder */}
          <button
            onClick={() => sendSingleDocWhatsApp(doc, '', lang)}
            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            title={lang === 'ar' ? 'إرسال تذكير عبر واتساب' : 'Invia promemoria WhatsApp'}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Guide tip for this category */}
          <button
            onClick={() => onOpenGuideForCategory(doc.category)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title={t.card.renewGuide}
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Edit Button */}
          <button
            onClick={() => onEdit(doc)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title={t.card.edit}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => {
              if (window.confirm(t.card.confirmDelete)) {
                onDelete(doc.id);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title={t.card.delete}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
