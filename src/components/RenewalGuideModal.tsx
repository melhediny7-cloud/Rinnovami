import React, { useState, useEffect } from 'react';
import { X, BookOpen, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DocumentCategory, Language } from '../types';
import { translations } from '../translations';
import { renewalGuides } from '../data/guides';

interface RenewalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  initialCategory?: DocumentCategory;
}

export const RenewalGuideModal: React.FC<RenewalGuideModalProps> = ({
  isOpen,
  onClose,
  lang,
  initialCategory,
}) => {
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>(
    initialCategory || 'permesso_soggiorno'
  );

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory, isOpen]);

  if (!isOpen) return null;
  const t = translations[lang];

  const currentGuide = renewalGuides.find((g) => g.category === activeCategory) || renewalGuides[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[88vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.guide.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.guide.subtitle}
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

        {/* Categories Tab Selector */}
        <div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none bg-slate-50/30 dark:bg-slate-900">
          {renewalGuides.map((guide) => {
            const isActive = guide.category === activeCategory;
            return (
              <button
                key={guide.category}
                onClick={() => setActiveCategory(guide.category)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {t.categories[guide.category]}
              </button>
            );
          })}
        </div>

        {/* Content Details */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
              {lang === 'ar' ? currentGuide.titleAr : currentGuide.titleIt}
            </h3>
          </div>

          {/* Important Legal Notice Alert */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {lang === 'ar' ? currentGuide.importantNoticeAr : currentGuide.importantNoticeIt}
            </p>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-slate-400">
              {lang === 'ar' ? 'الخطوات والإجراءات المطلوبة:' : 'Fasi e adempimenti richiesti:'}
            </h4>

            <div className="space-y-2.5">
              {(lang === 'ar' ? currentGuide.stepsAr : currentGuide.stepsIt).map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <span className="w-6 h-6 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Official Useful Links */}
          {currentGuide.links && currentGuide.links.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 mb-2">
                {lang === 'ar' ? 'روابط ومواقع رسمية ذات صلة:' : 'Portali ufficiali utili:'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {currentGuide.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/40 border border-brand-200 dark:border-brand-800 transition-colors"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
