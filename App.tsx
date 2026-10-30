import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusCircle, 
  Sparkles, 
  FolderOpen, 
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { DocumentCategory, DocumentItem, DocumentStatus, Language } from './types';
import { translations } from './translations';
import { 
  loadDocuments, 
  saveDocuments, 
  exportBackupJSON, 
  exportCSV, 
  playAlertSound,
  parseAndValidateBackup 
} from './utils/storage';
import { computeDocumentStatus, getDaysRemaining } from './utils/dateUtils';

import { Navbar } from './components/Navbar';
import { StatsCards } from './components/StatsCards';
import { AlertBanner } from './components/AlertBanner';
import { Filters } from './components/Filters';
import { DocumentCard } from './components/DocumentCard';
import { DocumentModal } from './components/DocumentModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { RenewModal } from './components/RenewModal';
import { RenewalGuideModal } from './components/RenewalGuideModal';
import { CalendarExportModal } from './components/CalendarExportModal';
import { WallpaperModal } from './components/WallpaperModal';
import { EmailAlertsModal } from './components/EmailAlertsModal';
import { WhatsAppAlertsModal } from './components/WhatsAppAlertsModal';
import { AutoDropzone } from './components/AutoDropzone';
import { AutoScanModal } from './components/AutoScanModal';
import { GlobalDropOverlay } from './components/GlobalDropOverlay';
import { autoProcessFile, AutoScanProgressItem } from './utils/autoScanProcessor';
import { ExpiryCalendarViewModal } from './components/ExpiryCalendarViewModal';
import { AuditLogModal } from './components/AuditLogModal';
import { AppLockModal } from './components/AppLockModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { loadCloudSyncSettings, syncVaultToCloud } from './utils/cloudSyncService';
import { AppLockScreen } from './components/AppLockScreen';
import { isCurrentlyLocked, lockAppImmediately, loadLockSettings } from './utils/appLockService';
import { logActivity } from './utils/auditLogger';
import { checkAndDispatchAutonomousAlerts } from './utils/autonomousNotifier';

export const App: React.FC = () => {
  // Localization & Theme with backwards compatibility migration
  const [lang, setLang] = useState<Language>(() => {
    return (
      (localStorage.getItem('rinnovami_lang') as Language) ||
      (localStorage.getItem('docuscadenza_lang') as Language) ||
      'it'
    );
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('rinnovami_theme') === 'dark' ||
      localStorage.getItem('docuscadenza_theme') === 'dark'
    );
  });

  // Main Documents State with async IndexedDB loading
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'expiry_asc' | 'expiry_desc' | 'title'>('expiry_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<DocumentItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [renewDoc, setRenewDoc] = useState<DocumentItem | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideCategory, setGuideCategory] = useState<DocumentCategory | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEmailAlertsModalOpen, setIsEmailAlertsModalOpen] = useState(false);
  const [isWhatsAppAlertsModalOpen, setIsWhatsAppAlertsModalOpen] = useState(false);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [isCalendarViewOpen, setIsCalendarViewOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isLockSettingsOpen, setIsLockSettingsOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => isCurrentlyLocked());
  const [lockSettingsVersion, setLockSettingsVersion] = useState(0);

  const isLockEnabled = useMemo(() => {
    return loadLockSettings().isEnabled;
  }, [lockSettingsVersion]);

  // Handle visibility change to re-lock if timeout elapsed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isCurrentlyLocked()) {
          setIsLocked(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  const [autoScanQueue, setAutoScanQueue] = useState<AutoScanProgressItem[]>([]);
  const [isAutoScanModalOpen, setIsAutoScanModalOpen] = useState(false);
  const [isAppBackgroundActive, setIsAppBackgroundActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('rinnovami_bg_active');
    return saved !== null ? saved === 'true' : true;
  });

  // Toast feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = translations[lang];

  // Load documents from IndexedDB on startup
  useEffect(() => {
    loadDocuments()
      .then((docs) => {
        setDocuments(docs);
      })
      .catch((err) => {
        console.error('Error loading documents:', err);
        setToastMessage(lang === 'ar' ? 'خطأ في تحميل المستندات' : 'Errore nel caricamento documenti');
      })
      .finally(() => {
        setIsLoadingDocs(false);
      });
  }, []);

  // Update HTML dir and lang tags
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('rinnovami_lang', lang);
  }, [lang]);

  // Update Dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rinnovami_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rinnovami_theme', 'light');
    }
  }, [darkMode]);

  // Auto-sync encrypted vault to cloud when modified (if enabled)
  useEffect(() => {
    if (!isLoadingDocs && documents.length > 0) {
      const syncSettings = loadCloudSyncSettings();
      if (syncSettings.isEnabled && syncSettings.autoSync && syncSettings.vaultPassword) {
        const timer = setTimeout(() => {
          syncVaultToCloud(documents, syncSettings.vaultPassword!).catch(() => {});
        }, 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [documents, isLoadingDocs]);

  // Persist documents to IndexedDB whenever modified
  useEffect(() => {
    if (!isLoadingDocs) {
      saveDocuments(documents).catch((err) => {
        setToastMessage(err.message || 'خطأ في حفظ المستندات');
      });
    }
  }, [documents, isLoadingDocs]);

  // Autonomous Monitoring Engine: automatically detects expiring documents on startup & sends alerts
  useEffect(() => {
    if (!isLoadingDocs && documents.length > 0) {
      const timer = setTimeout(() => {
        checkAndDispatchAutonomousAlerts(documents, lang, false).then((res) => {
          if (res.triggered) {
            showToast(res.message);
            playAlertSound();
          }
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingDocs, documents.length, lang]);

  // Periodic autonomous check every 60 minutes while app is running
  useEffect(() => {
    const interval = setInterval(() => {
      if (documents.length > 0) {
        checkAndDispatchAutonomousAlerts(documents, lang, false).then((res) => {
          if (res.triggered) {
            showToast(res.message);
          }
        });
      }
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [documents, lang]);

  // Re-check automatically whenever user returns to the tab or unminimizes browser
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && documents.length > 0) {
        checkAndDispatchAutonomousAlerts(documents, lang, false).then((res) => {
          if (res.triggered) {
            showToast(res.message);
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [documents, lang]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Urgent Count (Expired + Critical)
  const urgentCount = useMemo(() => {
    return documents.filter((doc) => {
      const s = computeDocumentStatus(doc.expiryDate, doc.reminderDaysBefore);
      return s === 'expired' || s === 'critical';
    }).length;
  }, [documents]);

  // Demo documents detection
  const hasDemoDocs = useMemo(() => {
    return documents.some((d) => d.isDemo);
  }, [documents]);

  const handleClearDemoDocs = async () => {
    const msg = lang === 'ar'
      ? 'هل أنت متأكد من رغبتك في حذف الوثائق التجريبية والبدء ببياناتك الخاصة؟'
      : 'Sei sicuro di voler rimuovere i documenti dimostrativi?';
    if (window.confirm(msg)) {
      const remaining = documents.filter((d) => !d.isDemo);
      setDocuments(remaining);
      try {
        await saveDocuments(remaining);
        showToast(lang === 'ar' ? 'تم حذف الوثائق التجريبية بنجاح' : 'Dati dimostrativi rimossi con successo');
      } catch (err: any) {
        showToast(err.message || 'خطأ في تحديث قاعدة البيانات');
      }
    }
  };

  // Filtered & Sorted documents
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = doc.title.toLowerCase().includes(q);
          const matchHolder = doc.holderName?.toLowerCase().includes(q);
          const matchNum = doc.documentNumber?.toLowerCase().includes(q);
          const matchAuthority = doc.issuingAuthority?.toLowerCase().includes(q);
          if (!matchTitle && !matchHolder && !matchNum && !matchAuthority) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'all') {
          const status = computeDocumentStatus(doc.expiryDate, doc.reminderDaysBefore);
          if (status !== selectedStatus) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'expiry_asc') {
          return getDaysRemaining(a.expiryDate) - getDaysRemaining(b.expiryDate);
        }
        if (sortBy === 'expiry_desc') {
          return getDaysRemaining(b.expiryDate) - getDaysRemaining(a.expiryDate);
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [documents, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Handlers with immediate persistence to IndexedDB
  const handleSaveDocument = async (doc: DocumentItem) => {
    const exists = documents.some((d) => d.id === doc.id);
    const updated = exists
      ? documents.map((d) => (d.id === doc.id ? doc : d))
      : [doc, ...documents];
    setDocuments(updated);
    try {
      await saveDocuments(updated);
      showToast(exists ? t.toast.docUpdated : t.toast.docAdded);
    } catch (err: any) {
      showToast(err.message || 'خطأ في حفظ الوثيقة');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    const docToDelete = documents.find((d) => d.id === id);
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    try {
      await saveDocuments(updated);
      if (docToDelete) {
        logActivity('delete', docToDelete.title, `Eliminato: ${docToDelete.fileName || docToDelete.id}`);
      }
      showToast(t.toast.docDeleted);
    } catch (err: any) {
      showToast(err.message || 'خطأ في حذف الوثيقة');
    }
  };

  const handleQuickRenew = async (docId: string, newExpiryDate: string) => {
    const docToRenew = documents.find((d) => d.id === docId);
    const updated = documents.map((d) =>
      d.id === docId
        ? { ...d, expiryDate: newExpiryDate, isDemo: false, updatedAt: new Date().toISOString() }
        : d
    );
    setDocuments(updated);
    try {
      await saveDocuments(updated);
      if (docToRenew) {
        logActivity('renew', docToRenew.title, `Nuova scadenza: ${newExpiryDate}`);
      }
      playAlertSound();
      showToast(t.toast.docRenewed);
    } catch (err: any) {
      showToast(err.message || 'خطأ في تحديث التجديد');
    }
  };

  const handleAutoProcessFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const initialTasks: AutoScanProgressItem[] = files.map((file) => ({
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      status: 'compressing',
      progress: 10,
    }));

    setAutoScanQueue(initialTasks);
    setIsAutoScanModalOpen(true);

    const newlyCreatedDocs: DocumentItem[] = [];

    for (const task of initialTasks) {
      try {
        const doc = await autoProcessFile(task.file, (progress) => {
          setAutoScanQueue((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, progress, status: 'scanning' } : t))
          );
        });

        newlyCreatedDocs.push(doc);

        setAutoScanQueue((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, progress: 100, status: 'done', result: doc } : t
          )
        );
      } catch (err: any) {
        console.error('Auto scan failed for file:', task.fileName, err);
        setAutoScanQueue((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: 'error', errorMessage: err?.message || 'فشلت معالجة الملف' }
              : t
          )
        );
      }
    }

    if (newlyCreatedDocs.length > 0) {
      for (const doc of newlyCreatedDocs) {
        logActivity('upload', doc.title, `Scansione automatica completata: ${doc.fileName || doc.category}`, doc.id);
      }
      const updated = [...newlyCreatedDocs, ...documents];
      setDocuments(updated);
      try {
        await saveDocuments(updated);
        playAlertSound();
        showToast(
          lang === 'ar'
            ? `تمت قراءة وإضافة وحفظ (${newlyCreatedDocs.length}) وثيقة تلقائياً!`
            : `Riconosciuti e salvati (${newlyCreatedDocs.length}) documenti!`
        );
      } catch (err: any) {
        showToast(err.message || 'خطأ في حفظ الوثائق المقروءة');
      }
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const { validDocs, error } = parseAndValidateBackup(text);

      if (error || validDocs.length === 0) {
        showToast(error || t.toast.backupError);
        return;
      }

      // Ask user whether to merge or replace
      const confirmMerge = window.confirm(
        lang === 'ar'
          ? `تم العثور على (${validDocs.length}) وثيقة صالحة.\n\nانقر [موافق / OK] لدمجها مع الوثائق الحالية.\nأو [إلغاء / Cancel] لاستبدال الوثائق بالكامل.`
          : `Trovati (${validDocs.length}) documenti validi.\n\nClicca [OK] per unire ai documenti attuali.\nClicca [Annulla] per sostituire tutti i dati.`
      );

      if (confirmMerge) {
        const map = new Map(documents.map((d) => [d.id, d]));
        for (const doc of validDocs) {
          map.set(doc.id, doc);
        }
        const updated = Array.from(map.values());
        setDocuments(updated);
        try {
          await saveDocuments(updated);
          showToast(t.toast.backupImported);
        } catch (err: any) {
          showToast(err.message || 'خطأ في حفظ البيانات المستوردة');
        }
      } else {
        const confirmReplace = window.confirm(
          lang === 'ar'
            ? 'تحذير: هل أنت متأكد من استبدال جميع الوثائق الحالية بتلك الموجودة في النسخة الاحتياطية؟'
            : 'Attenzione: confermi di voler sostituire tutti i documenti esistenti?'
        );
        if (confirmReplace) {
          setDocuments(validDocs);
          try {
            await saveDocuments(validDocs);
            showToast(t.toast.backupImported);
          } catch (err: any) {
            showToast(err.message || 'خطأ في حفظ البيانات المستوردة');
          }
        }
      }
    };
    reader.onerror = () => showToast(t.toast.backupError);
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className={`relative min-h-screen bg-slate-50 dark:bg-slate-950 font-${lang === 'ar' ? 'arabic' : 'latin'}`}>
      
      {/* App Ambient Wallpaper Background */}
      {isAppBackgroundActive && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <img
            src="./rinnovami-wallpaper.png"
            alt="Rinnovami Wallpaper"
            className="w-full h-full object-cover opacity-25 dark:opacity-35 object-center"
          />
          <div className="absolute inset-0 bg-slate-50/75 dark:bg-slate-950/75 backdrop-blur-[2px]" />
        </div>
      )}

      {/* Global Drag-and-Drop Overlay */}
      <GlobalDropOverlay
        lang={lang}
        onFilesDropped={handleAutoProcessFiles}
      />

      {/* Main Content Area */}
      <div className="relative z-10">
        
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 start-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl border border-slate-700 dark:border-slate-300 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Navigation */}
        <Navbar
          lang={lang}
          onLanguageChange={setLang}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode(!darkMode)}
          onOpenAddModal={() => {
            setDocumentToEdit(null);
            setIsAddModalOpen(true);
          }}
          onOpenGuide={() => {
            setGuideCategory(undefined);
            setIsGuideOpen(true);
          }}
          onOpenCalendar={() => setIsCalendarOpen(true)}
          onOpenCalendarView={() => setIsCalendarViewOpen(true)}
          onOpenAuditLog={() => setIsAuditLogOpen(true)}
          onOpenAppLock={() => setIsLockSettingsOpen(true)}
          onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
          onLockNow={() => {
            lockAppImmediately();
            setIsLocked(true);
          }}
          isLockEnabled={isLockEnabled}
          onOpenEmailAlerts={() => setIsEmailAlertsModalOpen(true)}
          onOpenWhatsAppAlerts={() => setIsWhatsAppAlertsModalOpen(true)}
          onOpenNameSuggestions={() => {}}
          onOpenWallpaper={() => setIsWallpaperModalOpen(true)}
          onExportBackup={() => {
            exportBackupJSON(documents);
            showToast(t.toast.backupExported);
          }}
          onImportBackup={handleImportBackup}
          urgentCount={urgentCount}
        />

        {/* Hero / Header Headline */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 pb-2">
          
          {/* Demo Documents Notice Banner */}
          {hasDemoDocs && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 mb-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium leading-relaxed">{t.stats.demoBannerText}</span>
              </div>
              <button
                onClick={handleClearDemoDocs}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.stats.clearDemo}</span>
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-slate-200/60 dark:border-slate-800/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                  {lang === 'ar' ? 'إصدار 2026 الذكي' : 'Edizione 2026 Smart'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  • {documents.length} {lang === 'ar' ? 'وثيقة مسجلة' : 'documenti registrati'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {t.tagline}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDocumentToEdit(null);
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-500 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <PlusCircle className="w-5 h-5" />
                <span>{t.nav.addDoc}</span>
              </button>
            </div>
          </div>

          {/* Direct Auto-Scan Dropzone */}
          <AutoDropzone
            lang={lang}
            onFilesSelected={handleAutoProcessFiles}
            isProcessing={isAutoScanModalOpen}
          />

          {/* Urgent Alert Banner */}
          <div className="mt-4">
            <AlertBanner
              documents={documents}
              lang={lang}
              onFilterUrgent={() => setSelectedStatus('critical')}
              onForceAutoAlert={async () => {
                showToast(lang === 'ar' ? 'جارٍ الفحص الذاتي وإرسال التنبيه التلقائي...' : 'Controllo smart e invio in corso...');
                const res = await checkAndDispatchAutonomousAlerts(documents, lang, true);
                showToast(res.message);
                if (res.triggered) {
                  playAlertSound();
                }
              }}
            />
          </div>

          {/* Stats Metric Cards (Clickable filters) */}
          <StatsCards
            documents={documents}
            lang={lang}
            selectedStatus={selectedStatus}
            onSelectStatus={setSelectedStatus}
          />

          {/* Search & Filters */}
          <Filters
            lang={lang}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onExportCSV={() => exportCSV(filteredDocuments, lang)}
            onResetFilters={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedStatus('all');
              setSortBy('expiry_asc');
            }}
          />

          {/* Loading Indicator or Documents List */}
          {isLoadingDocs ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <p className="text-sm font-semibold">{lang === 'ar' ? 'جارٍ تحميل المستندات...' : 'Caricamento documenti...'}</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-16 text-center bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 my-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {t.filter.noDocumentsFound}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {lang === 'ar'
                  ? 'جرب تغيير شروط التصفية أو البحث، أو أضف وثيقة جديدة للبدء في تتبعها.'
                  : 'Prova a modificare i filtri di ricerca oppure aggiungi un nuovo documento.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 transition-colors"
              >
                {t.filter.clearFilters}
              </button>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-16'
                  : 'flex flex-col space-y-3 pb-16'
              }
            >
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  lang={lang}
                  onPreview={(d) => setPreviewDoc(d)}
                  onEdit={(d) => {
                    setDocumentToEdit(d);
                    setIsAddModalOpen(true);
                  }}
                  onDelete={handleDeleteDocument}
                  onQuickRenew={(d) => setRenewDoc(d)}
                  onOpenGuideForCategory={(cat) => {
                    setGuideCategory(cat);
                    setIsGuideOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <DocumentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setDocumentToEdit(null);
        }}
        onSave={handleSaveDocument}
        documentToEdit={documentToEdit}
        existingDocuments={documents}
        lang={lang}
      />

      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        lang={lang}
      />

      <RenewModal
        isOpen={!!renewDoc}
        onClose={() => setRenewDoc(null)}
        document={renewDoc}
        onRenew={handleQuickRenew}
        lang={lang}
      />

      <RenewalGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        lang={lang}
        initialCategory={guideCategory}
      />

      <CalendarExportModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        documents={documents}
        lang={lang}
      />

      <ExpiryCalendarViewModal
        isOpen={isCalendarViewOpen}
        onClose={() => setIsCalendarViewOpen(false)}
        documents={documents}
        lang={lang}
        onSelectDoc={(d) => {
          setIsCalendarViewOpen(false);
          setPreviewDoc(d);
        }}
      />

      <AuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
        lang={lang}
      />

      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        lang={lang}
        documents={documents}
        onDocumentsRestored={(restoredDocs) => {
          setDocuments(restoredDocs);
          saveDocuments(restoredDocs);
        }}
        showToast={showToast}
      />

      <AppLockModal
        isOpen={isLockSettingsOpen}
        onClose={() => setIsLockSettingsOpen(false)}
        lang={lang}
        onSettingsSaved={() => {
          setLockSettingsVersion((v) => v + 1);
          showToast(lang === 'ar' ? 'تم تحديث إعدادات الأمان والقفل' : 'Impostazioni di sicurezza aggiornate');
        }}
      />

      <WallpaperModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
        lang={lang}
        wallpaperUrl="./rinnovami-wallpaper.png"
        isAppBackgroundActive={isAppBackgroundActive}
        onToggleAppBackground={() => {
          setIsAppBackgroundActive((prev) => {
            const next = !prev;
            localStorage.setItem('rinnovami_bg_active', String(next));
            return next;
          });
        }}
      />

      <EmailAlertsModal
        isOpen={isEmailAlertsModalOpen}
        onClose={() => setIsEmailAlertsModalOpen(false)}
        documents={documents}
        lang={lang}
        onToast={showToast}
      />

      <WhatsAppAlertsModal
        isOpen={isWhatsAppAlertsModalOpen}
        onClose={() => setIsWhatsAppAlertsModalOpen(false)}
        documents={documents}
        lang={lang}
        onToast={showToast}
      />

      <AutoScanModal
        isOpen={isAutoScanModalOpen}
        onClose={() => setIsAutoScanModalOpen(false)}
        items={autoScanQueue}
        lang={lang}
      />

      {/* Lock Screen Security Overlay */}
      {isLocked && (
        <AppLockScreen
          lang={lang}
          onUnlocked={() => setIsLocked(false)}
        />
      )}
    </div>
  );
};

export default App;
