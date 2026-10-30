import React, { useState, useEffect } from 'react';
import { UploadCloud, Sparkles, Zap } from 'lucide-react';
import { Language } from '../types';

interface GlobalDropOverlayProps {
  lang: Language;
  onFilesDropped: (files: File[]) => void;
}

export const GlobalDropOverlay: React.FC<GlobalDropOverlayProps> = ({
  lang,
  onFilesDropped,
}) => {
  const [isDraggingOverWindow, setIsDraggingOverWindow] = useState(false);
  const dragCounter = React.useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsDraggingOverWindow(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        setIsDraggingOverWindow(false);
        dragCounter.current = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOverWindow(false);
      dragCounter.current = 0;

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const filesArray = Array.from(e.dataTransfer.files);
        onFilesDropped(filesArray);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFilesDropped]);

  if (!isDraggingOverWindow) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-6 animate-in fade-in duration-200 pointer-events-none">
      <div className="relative w-full max-w-2xl p-10 rounded-[36px] border-4 border-dashed border-brand-400 bg-brand-950/40 text-center text-white space-y-4 shadow-2xl ring-8 ring-brand-500/20">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-500 via-indigo-600 to-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-brand-500/40 animate-bounce">
          <UploadCloud className="w-10 h-10 text-white" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'التعرف الآلي الفوري' : 'Riconoscimento Automatico'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black">
            {lang === 'ar'
              ? 'أفلت أوراقك هنا للبدء الفوري!'
              : 'Rilascia qui i tuoi documenti!'}
          </h2>

          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            {lang === 'ar'
              ? 'سيقوم البرنامج بقراءة المستندات الإيطالية، استخراج تواريخ الصلاحية، وحفظها مباشرة لمراقبة انتهائها وتنبيهك.'
              : 'L\'app analizzerà i documenti italiani estraendo automaticamente le scadenze e avviando il monitoraggio.'}
          </p>
        </div>
      </div>
    </div>
  );
};
