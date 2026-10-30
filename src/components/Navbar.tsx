import React from 'react';
import { 
  FileCheck2, 
  Cloud, 
  Languages, 
  Moon, 
  Sun, 
  PlusCircle, 
  BookOpen, 
  CalendarDays, 
  Download, 
  Upload, 
  Bell, 
  Sparkles,
  Mail,
  MessageSquare,
  ShieldCheck,
  Lock,
  CalendarRange
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface NavbarProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAddModal: () => void;
  onOpenGuide: () => void;
  onOpenCalendar: () => void;
  onOpenCalendarView: () => void;
  onOpenAuditLog: () => void;
  onOpenAppLock: () => void;
  onOpenCloudSync: () => void;
  onLockNow: () => void;
  isLockEnabled: boolean;
  onOpenEmailAlerts: () => void;
  onOpenWhatsAppAlerts: () => void;
  onOpenNameSuggestions: () => void;
  onOpenWallpaper: () => void;
  onExportBackup: () => void;
  onImportBackup: (event: React.ChangeEvent<HTMLInputElement>) => void;
  urgentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onLanguageChange,
  darkMode,
  onToggleTheme,
  onOpenAddModal,
  onOpenGuide,
  onOpenCalendar,
  onOpenCalendarView,
  onOpenAuditLog,
  onOpenAppLock,
  onOpenCloudSync,
  onLockNow,
  isLockEnabled,
  onOpenEmailAlerts,
  onOpenWhatsAppAlerts,
  onOpenNameSuggestions,
  onOpenWallpaper,
  onExportBackup,
  onImportBackup,
  urgentCount
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-brand-500 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25 ring-2 sm:ring-4 ring-brand-500/10 transition-transform hover:scale-105">
              <FileCheck2 className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent tracking-tight">
                  {lang === 'ar' ? 'Rinnovami | رينوفامي' : 'Rinnovami'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {lang === 'ar' ? 'جـدّدلي' : 'App Ufficiale'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                {t.appSubTitle}
              </p>
            </div>
          </div>

          {/* Quick Actions & Toggles */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
            {/* Guide Button - Desktop & Tablet */}
            <button
              onClick={onOpenGuide}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              title={t.nav.renewalGuide}
            >
              <BookOpen className="w-4 h-4 text-brand-500" />
              <span className="hidden lg:inline">{t.nav.renewalGuide}</span>
            </button>

            {/* Calendar Export */}
            <button
              onClick={onOpenCalendar}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              title={t.nav.exportCalendar}
            >
              <CalendarDays className="w-4 h-4 text-indigo-500" />
              <span className="hidden lg:inline">{t.nav.exportCalendar}</span>
            </button>

            {/* Email Alerts Modal */}
            <button
              onClick={onOpenEmailAlerts}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              title={lang === 'ar' ? 'التنبيهات البريدية التلقائية' : 'Notifiche Email'}
            >
              <Mail className="w-4 h-4 text-rose-500" />
              <span className="hidden xl:inline">{lang === 'ar' ? 'تنبيهات الإيميل' : 'Email'}</span>
            </button>

            {/* WhatsApp Alerts Modal */}
            <button
              onClick={onOpenWhatsAppAlerts}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors"
              title={lang === 'ar' ? 'تنبيهات ورسائل واتساب' : 'Notifiche WhatsApp'}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xl:inline">{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
            </button>

            {/* Calendar Expiry Visualizer */}
            <button
              onClick={onOpenCalendarView}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              title={lang === 'ar' ? 'تقويم انتهاء الوثائق الشهري' : 'Calendario Scadenze Mensile'}
            >
              <CalendarRange className="w-4 h-4 text-sky-500" />
              <span className="hidden xl:inline">{lang === 'ar' ? 'التقويم' : 'Calendario'}</span>
            </button>

            {/* Audit Log (سجل العمليات) */}
            <button
              onClick={onOpenAuditLog}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              title={lang === 'ar' ? 'سجل العمليات والأمان' : 'Registro Attività & Sicurezza'}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xl:inline">{lang === 'ar' ? 'السجل' : 'Audit'}</span>
            </button>

            {/* Zero-Knowledge Cloud Sync Button */}
            <button
              onClick={onOpenCloudSync}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-sky-700 dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 transition-colors shadow-xs"
              title={lang === 'ar' ? 'السحابة المشفرة والمزامنة بين الأجهزة' : 'Cloud Sync Crittografato'}
            >
              <Cloud className="w-4 h-4 text-sky-500" />
              <span className="hidden xl:inline">{lang === 'ar' ? 'السحابة' : 'Cloud'}</span>
            </button>

            {/* App Lock Settings & Lock Now */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl">
              <button
                onClick={onOpenAppLock}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all flex items-center gap-1 text-xs font-semibold"
                title={lang === 'ar' ? 'إعدادات قفل التطبيق (PIN / Face ID)' : 'Impostazioni Blocco App (PIN / Biometria)'}
              >
                <Lock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLockEnabled ? 'text-amber-500' : 'text-slate-400'}`} />
                <span className="hidden 2xl:inline text-[11px]">{isLockEnabled ? (lang === 'ar' ? 'محمي' : 'Protetto') : (lang === 'ar' ? 'قفل' : 'Blocco')}</span>
              </button>
              {isLockEnabled && (
                <button
                  onClick={onLockNow}
                  className="px-1.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold shadow-xs transition-colors"
                  title={lang === 'ar' ? 'قفل الشاشة الآن' : 'Blocca adesso'}
                >
                  {lang === 'ar' ? 'قفل' : 'Lock'}
                </button>
              )}
            </div>

            {/* Backup / Export / Import */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl">
              <button
                onClick={onExportBackup}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
                title={t.nav.exportBackup}
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <label 
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                title={t.nav.importBackup}
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={onImportBackup}
                />
              </label>
            </div>

            {/* Urgent Notification Bell */}
            <div className="relative">
              <div 
                className={`p-1.5 sm:p-2.5 rounded-xl transition-colors ${
                  urgentCount > 0 
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 ring-2 ring-rose-500/20' 
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
                title={
                  urgentCount > 0 
                    ? (lang === 'ar' ? `تنبيه: ${urgentCount} وثائق تتطلب التجديد أو التدخل العاجل` : `Attenzione: ${urgentCount} documenti richiedono attenzione`)
                    : (lang === 'ar' ? 'جميع الوثائق سارية' : 'Tutti i documenti regolari')
                }
              >
                <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${urgentCount > 0 ? 'animate-bounce' : ''}`} />
                {urgentCount > 0 && (
                  <span className="absolute -top-1 -end-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-rose-600 text-[9px] sm:text-[10px] font-bold text-white shadow-md">
                    {urgentCount}
                  </span>
                )}
              </div>
            </div>

            {/* Language Selector */}
            <button
              onClick={() => onLanguageChange(lang === 'ar' ? 'it' : 'ar')}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/50 border border-brand-200/60 dark:border-brand-800/60 transition-colors"
              title="تغيير اللغة / Cambia lingua"
            >
              <Languages className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[11px] sm:text-xs font-bold">{lang === 'ar' ? '🇮🇹 IT' : '🇸🇦 AR'}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-1.5 sm:p-2.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              title="تبديل الوضع الليلي / Cambia tema"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />}
            </button>

            {/* Add Document Button */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-white text-xs sm:text-sm bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-md shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t.nav.addDoc}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
