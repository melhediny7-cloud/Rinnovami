import React, { useRef } from 'react';
import { UploadCloud, Sparkles, Files, ShieldCheck, Zap } from 'lucide-react';
import { Language } from '../types';

interface AutoDropzoneProps {
  lang: Language;
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

export const AutoDropzone: React.FC<AutoDropzoneProps> = ({
  lang,
  onFilesSelected,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={handleDrop}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      className="relative overflow-hidden my-6 rounded-3xl border-2 border-dashed border-brand-400/60 dark:border-brand-500/40 bg-gradient-to-br from-brand-50/70 via-indigo-50/40 to-cyan-50/50 dark:from-slate-900/80 dark:via-brand-950/20 dark:to-slate-900/80 hover:border-brand-500 dark:hover:border-brand-400 p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-lg group"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center justify-center gap-3">
        {/* Animated Glow Icon */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-600 opacity-30 blur-lg group-hover:opacity-60 transition-opacity" />
          <div className="relative w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Zap className="w-8 h-8 text-brand-500" />
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'ar' ? 'المسح التلقائي المباشر (Auto-Ingestion)' : 'Riconoscimento Automatico Diretto'}</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {lang === 'ar'
              ? 'اسحب وأفلت أوراقك هنا ليقرأها البرنامج تلقائياً'
              : 'Trascina qui i tuoi documenti per l\'analisi automatica'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {lang === 'ar'
              ? 'بمجرد رفع الصورة أو الـ PDF، سيفهم البرنامج نوع الوثيقة الإيطالية ورقمها وتاريخ انتهائها ويبدأ في متابعتها فوراً دون أي إدخال يدوي!'
              : 'Carica immagini o PDF: l\'app riconosce tipo, scadenza e intestatario salvando tutto in automatico!'}
          </p>
        </div>

        {/* Badges / Supported formats */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <Files className="w-3 h-3 text-brand-500" />
            <span>{lang === 'ar' ? 'يدعم رفع ملفات متعددة دفعة واحدة' : 'Supporta file multipli simultanei'}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>JPG, PNG, PDF</span>
          </span>
        </div>
      </div>
    </div>
  );
};
