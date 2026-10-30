import React, { useState } from 'react';
import { X, Download, Smartphone, Monitor, Sparkles, Check, Image as ImageIcon } from 'lucide-react';
import { Language } from '../types';

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  wallpaperUrl: string;
  isAppBackgroundActive: boolean;
  onToggleAppBackground: () => void;
}

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  onClose,
  lang,
  wallpaperUrl,
  isAppBackgroundActive,
  onToggleAppBackground,
}) => {
  if (!isOpen) return null;

  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'خلفية Rinnovami الرسمية' : 'Sfondo Ufficiale Rinnovami'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar'
                  ? 'خلفية فخمة وعصرية لشاشة الهاتف أو كخلفية تفاعلية داخل البرنامج'
                  : 'Sfondo premium per smartphone e per l\'applicazione'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={wallpaperUrl}
              download="rinnovami-wallpaper.png"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تحميل الصورة الأصلية' : 'Scarica Sfondo HD'}</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/60">
          
          {/* Controls: Mode switcher & App background toggle */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  previewMode === 'mobile'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'معاينة شاشة الهاتف' : 'Vista Smartphone'}</span>
              </button>
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  previewMode === 'desktop'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'معاينة شاشة الكمبيوتر' : 'Vista Desktop'}</span>
              </button>
            </div>

            {/* Toggle as app background */}
            <button
              onClick={onToggleAppBackground}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                isAppBackgroundActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {isAppBackgroundActive
                  ? (lang === 'ar' ? 'الخلفية مفعلة داخل البرنامج ✓' : 'Sfondo attivo nell\'app ✓')
                  : (lang === 'ar' ? 'تفعيل كخلفية داخل البرنامج' : 'Attiva come sfondo nell\'app')}
              </span>
            </button>
          </div>

          {/* Visual Showcase Frame */}
          <div className="flex items-center justify-center py-4 w-full">
            {previewMode === 'mobile' ? (
              /* Simulated Smartphone frame */
              <div className="relative w-64 sm:w-72 h-[480px] sm:h-[520px] rounded-[42px] p-3 bg-slate-900 border-4 border-slate-700 shadow-2xl ring-8 ring-slate-800/40 flex flex-col overflow-hidden">
                {/* Dynamic island / notch */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-20 flex items-center justify-end px-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                </div>

                {/* Screen content */}
                <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-slate-950 flex flex-col justify-between p-4 text-white">
                  <img
                    src={wallpaperUrl}
                    alt="Rinnovami Wallpaper"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 z-10" />

                  {/* Top clock */}
                  <div className="relative z-20 pt-8 text-center">
                    <p className="text-3xl font-extrabold tracking-tight drop-shadow-md">09:41</p>
                    <p className="text-[11px] font-semibold text-slate-200/90 drop-shadow">
                      {lang === 'ar' ? 'الجمعة، ٣٠ أكتوبر' : 'Venerdì 30 Ottobre'}
                    </p>
                  </div>

                  {/* Notification bubble simulation */}
                  <div className="relative z-20 p-2.5 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 text-start shadow-lg">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-white mb-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Rinnovami</span>
                      <span className="text-white/60 ms-auto">الآن</span>
                    </div>
                    <p className="text-[11px] font-bold text-white">
                      {lang === 'ar' ? 'جميع وثائقك الإيطالية مؤمنة ومحدثة ✅' : 'Tutti i tuoi documenti sono al sicuro ✅'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Simulated Desktop / Landscape frame */
              <div className="relative w-full max-w-2xl h-80 sm:h-96 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-2xl">
                <img
                  src={wallpaperUrl}
                  alt="Rinnovami Desktop"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30 flex items-end p-6">
                  <div>
                    <h3 className="text-xl font-black text-white drop-shadow-md">
                      Rinnovami | رينوفامي
                    </h3>
                    <p className="text-xs text-slate-300 font-medium drop-shadow">
                      {lang === 'ar' ? 'حارسك الأمين لصلاحية وثائقك الرسمية في إيطاليا' : 'Il tuo assistente intelligente per la gestione delle scadenze'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
