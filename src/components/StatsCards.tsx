import React from 'react';
import { Layers, AlertOctagon, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { DocumentItem, DocumentStatus, Language } from '../types';
import { translations } from '../translations';
import { computeDocumentStatus } from '../utils/dateUtils';

interface StatsCardsProps {
  documents: DocumentItem[];
  lang: Language;
  selectedStatus: DocumentStatus | 'all';
  onSelectStatus: (status: DocumentStatus | 'all') => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  documents,
  lang,
  selectedStatus,
  onSelectStatus,
}) => {
  const t = translations[lang];

  let expired = 0;
  let critical = 0;
  let expiringSoon = 0;
  let valid = 0;

  documents.forEach((doc) => {
    const status = computeDocumentStatus(doc.expiryDate, doc.reminderDaysBefore);
    if (status === 'expired') expired++;
    else if (status === 'critical') critical++;
    else if (status === 'expiring_soon') expiringSoon++;
    else valid++;
  });

  const cards = [
    {
      id: 'all' as const,
      label: t.stats.total,
      count: documents.length,
      icon: Layers,
      color: 'slate',
      bgGrad: 'from-slate-500/10 to-slate-600/5',
      activeRing: 'ring-slate-400 dark:ring-slate-500',
      textColor: 'text-slate-700 dark:text-slate-200',
      iconColor: 'text-slate-600 dark:text-slate-300',
    },
    {
      id: 'expired' as const,
      label: t.stats.expired,
      count: expired,
      icon: AlertOctagon,
      color: 'rose',
      bgGrad: 'from-rose-500/10 to-red-600/5',
      activeRing: 'ring-rose-500 dark:ring-rose-400',
      textColor: 'text-rose-700 dark:text-rose-300',
      iconColor: 'text-rose-600 dark:text-rose-400',
      pulse: expired > 0,
    },
    {
      id: 'critical' as const,
      label: t.stats.critical,
      count: critical,
      icon: AlertTriangle,
      color: 'amber',
      bgGrad: 'from-amber-500/10 to-orange-600/5',
      activeRing: 'ring-amber-500 dark:ring-amber-400',
      textColor: 'text-amber-700 dark:text-amber-300',
      iconColor: 'text-amber-600 dark:text-amber-400',
      pulse: critical > 0,
    },
    {
      id: 'expiring_soon' as const,
      label: t.stats.expiringSoon,
      count: expiringSoon,
      icon: Clock,
      color: 'blue',
      bgGrad: 'from-blue-500/10 to-indigo-600/5',
      activeRing: 'ring-blue-500 dark:ring-blue-400',
      textColor: 'text-blue-700 dark:text-blue-300',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'valid' as const,
      label: t.stats.valid,
      count: valid,
      icon: CheckCircle2,
      color: 'emerald',
      bgGrad: 'from-emerald-500/10 to-teal-600/5',
      activeRing: 'ring-emerald-500 dark:ring-emerald-400',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 my-4 sm:my-6">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = selectedStatus === c.id;

        return (
          <button
            key={c.id}
            onClick={() => onSelectStatus(c.id)}
            className={`relative p-3 sm:p-4 rounded-2xl text-start transition-all border first:col-span-2 sm:first:col-span-1 ${
              isSelected
                ? `bg-white dark:bg-slate-900 border-transparent shadow-lg ring-2 ${c.activeRing}`
                : 'bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-900 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">
                {c.label}
              </span>
              <div className={`p-2 rounded-xl bg-gradient-to-br ${c.bgGrad} ${c.iconColor}`}>
                <Icon className={`w-4 h-4 ${c.pulse ? 'animate-pulse' : ''}`} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black ${c.textColor}`}>
                {c.count}
              </span>
              {isSelected && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-1.5 py-0.5 rounded-md">
                  {t.stats.selectedBadge}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
