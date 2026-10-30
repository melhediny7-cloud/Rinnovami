import React from 'react';
import { Search, SlidersHorizontal, LayoutGrid, List, FileSpreadsheet, X } from 'lucide-react';
import { DocumentCategory, DocumentStatus, Language } from '../types';
import { translations } from '../translations';

interface FiltersProps {
  lang: Language;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: DocumentCategory | 'all';
  onCategoryChange: (cat: DocumentCategory | 'all') => void;
  selectedStatus: DocumentStatus | 'all';
  onStatusChange: (status: DocumentStatus | 'all') => void;
  sortBy: 'expiry_asc' | 'expiry_desc' | 'title';
  onSortChange: (sort: 'expiry_asc' | 'expiry_desc' | 'title') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onExportCSV: () => void;
  onResetFilters: () => void;
}

export const Filters: React.FC<FiltersProps> = ({
  lang,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onExportCSV,
  onResetFilters,
}) => {
  const t = translations[lang];

  const categories = Object.keys(t.categories) as DocumentCategory[];
  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all' || selectedStatus !== 'all';

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-sm mb-6 space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.filter.searchPlaceholder}
            className="w-full ps-10 pe-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Category Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value as DocumentCategory | 'all')}
            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="all">{t.filter.allCategories}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {t.categories[cat]}
              </option>
            ))}
          </select>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as DocumentStatus | 'all')}
            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="all">{t.filter.allStatuses}</option>
            <option value="expired">🔴 {t.status.expired}</option>
            <option value="critical">🟠 {t.status.critical}</option>
            <option value="expiring_soon">🟡 {t.status.expiring_soon}</option>
            <option value="valid">🟢 {t.status.valid}</option>
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="expiry_asc">⏳ {t.filter.sortExpiryAsc}</option>
            <option value="expiry_desc">⌛ {t.filter.sortExpiryDesc}</option>
            <option value="title">🔤 {t.filter.sortTitle}</option>
          </select>

          {/* Export CSV button */}
          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs sm:text-sm font-medium transition-colors"
            title="Export CSV / Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Grid / List switch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title={t.filter.viewGrid}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title={t.filter.viewList}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 font-semibold"
            >
              {t.filter.clearFilters}
            </button>
          )}

        </div>
      </div>
    </div>
  );
};
