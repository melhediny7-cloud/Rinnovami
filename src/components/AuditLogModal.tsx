import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  Upload, 
  Edit3, 
  Eye, 
  Trash2, 
  RefreshCw, 
  Download, 
  Filter, 
  Search, 
  ShieldCheck,
  Smartphone,
  Laptop
} from 'lucide-react';
import { ActivityLogItem, Language } from '../types';
import { loadAuditLogs, clearAuditLogs, exportAuditLogsCSV } from '../utils/auditLogger';
import { translations } from '../translations';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, lang }) => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLogs(loadAuditLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const t = translations[lang];

  const handleClear = () => {
    if (
      window.confirm(
        lang === 'ar'
          ? 'هل أنت متأكد من مسح جميع سجلات العمليات والتتبع؟'
          : 'Sei sicuro di voler cancellare tutto lo storico delle attività?'
      )
    ) {
      clearAuditLogs();
      setLogs([]);
    }
  };

  const getActionBadge = (action: ActivityLogItem['action']) => {
    switch (action) {
      case 'upload':
        return {
          icon: Upload,
          label: lang === 'ar' ? 'رفع وثيقة' : 'Caricamento',
          bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'edit':
        return {
          icon: Edit3,
          label: lang === 'ar' ? 'تعديل بيانات' : 'Modifica',
          bg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        };
      case 'view':
        return {
          icon: Eye,
          label: lang === 'ar' ? 'معاينة وفتح' : 'Visualizzazione',
          bg: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        };
      case 'renew':
        return {
          icon: RefreshCw,
          label: lang === 'ar' ? 'تجديد الصلاحية' : 'Rinnovo',
          bg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        };
      case 'delete':
        return {
          icon: Trash2,
          label: lang === 'ar' ? 'حذف وثيقة' : 'Eliminazione',
          bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        };
      default:
        return {
          icon: History,
          label: action,
          bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesSearch =
      !searchQuery ||
      log.documentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.user && log.user.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md shrink-0">
              <ShieldCheck className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  {lang === 'ar' ? 'سجل العمليات والأمان (Audit Log)' : 'Registro Attività & Sicurezza'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white">
                  {logs.length} {lang === 'ar' ? 'عملية' : 'eventi'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {lang === 'ar'
                  ? 'تتبع مفصل وشامل لجميع عمليات الرفع والتعديل والمعاينة والحذف'
                  : 'Tracciamento completo di chi ha caricato, modificato o visualizzato i documenti'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Actions Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 start-3 my-auto" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ar' ? 'بحث في السجل...' : 'Cerca nel registro...'}
                className="w-full ps-9 pe-3 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">{lang === 'ar' ? 'كل العمليات' : 'Tutte le azioni'}</option>
              <option value="upload">{lang === 'ar' ? 'رفع ملف' : 'Caricamento'}</option>
              <option value="edit">{lang === 'ar' ? 'تعديل' : 'Modifica'}</option>
              <option value="view">{lang === 'ar' ? 'معاينة وفتح' : 'Visualizzazione'}</option>
              <option value="renew">{lang === 'ar' ? 'تجديد' : 'Rinnovo'}</option>
              <option value="delete">{lang === 'ar' ? 'حذف' : 'Eliminazione'}</option>
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => exportAuditLogsCSV(filteredLogs, lang)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
              title="Esporta CSV"
            >
              <Download className="w-3.5 h-3.5 text-brand-500" />
              <span>{lang === 'ar' ? 'تصدير CSV' : 'Esporta CSV'}</span>
            </button>

            {logs.length > 0 && (
              <button
                onClick={handleClear}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title={lang === 'ar' ? 'مسح السجل' : 'Cancella storico'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Logs Table / List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 bg-white dark:bg-slate-900">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold">
                {lang === 'ar' ? 'لا توجد سجلات مطابقة' : 'Nessuna attività registrata'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map((log) => {
                const badge = getActionBadge(log.action);
                const Icon = badge.icon;
                const formattedDate = new Date(log.timestamp).toLocaleString(
                  lang === 'ar' ? 'ar-EG' : 'it-IT',
                  {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }
                );

                return (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-3 group">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            {log.documentTitle}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {log.details}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                          <span>{formattedDate}</span>
                          {log.user && <span>• {log.user}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {t.modal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
