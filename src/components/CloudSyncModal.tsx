import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  ShieldCheck, 
  RefreshCw, 
  DownloadCloud, 
  UploadCloud, 
  Key, 
  QrCode, 
  Copy, 
  Check, 
  AlertCircle, 
  Lock, 
  Smartphone, 
  Laptop, 
  Eye, 
  EyeOff,
  Sparkles
} from 'lucide-react';
import { DocumentItem, Language } from '../types';
import { 
  loadCloudSyncSettings, 
  saveCloudSyncSettings, 
  syncVaultToCloud, 
  restoreVaultFromCloud, 
  generatePairingQR, 
  CloudSyncSettings 
} from '../utils/cloudSyncService';
import { formatDateLocale } from '../utils/dateUtils';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  documents: DocumentItem[];
  onDocumentsRestored: (docs: DocumentItem[]) => void;
  showToast: (msg: string) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  lang,
  documents,
  onDocumentsRestored,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'qr'>('sync');
  const [settings, setSettings] = useState<CloudSyncSettings>(loadCloudSyncSettings);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [targetSyncId, setTargetSyncId] = useState('');
  const [targetObjectId, setTargetObjectId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSyncId, setCopiedSyncId] = useState(false);
  const [copiedPairingCode, setCopiedPairingCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = loadCloudSyncSettings();
      setSettings(current);
      setPassword(current.vaultPassword || '');
      setTargetSyncId(current.syncId);
      setTargetObjectId(current.cloudObjectId || '');
      setErrorMsg('');
      setSuccessMsg('');

      // Generate pairing QR code
      generatePairingQR(current.syncId, current.cloudObjectId).then((url) => {
        setQrDataUrl(url);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!password || password.length < 4) {
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى إدخال كلمة سر الخزنة السحابية (4 خانات على الأقل) لتشفير البيانات.'
          : 'Inserisci una password per il Vault (almeno 4 caratteri).'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await syncVaultToCloud(documents, password);
      const updated = loadCloudSyncSettings();
      setSettings(updated);
      setSuccessMsg(
        lang === 'ar'
          ? `تم التشفير والرفع بنجاح! تم حفظ ${documents.length} وثيقة في السحابة المشفرة.`
          : `Sincronizzazione completata! ${documents.length} documenti salvati nel Cloud crittografato.`
      );
      showToast(lang === 'ar' ? 'تمت المزامنة السحابية بنجاح' : 'Sincronizzazione completata con successo');
      
      // Refresh QR with object id
      generatePairingQR(updated.syncId, updated.cloudObjectId).then(setQrDataUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطأ أثناء المزامنة السحابية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreNow = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!password) {
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى إدخال كلمة سر الخزنة السحابية لفك تشفير الوثائق.'
          : 'Inserisci la password del Vault per decifrare i documenti.'
      );
      return;
    }

    const confirmMsg = lang === 'ar'
      ? 'هل أنت متأكد من رغبتك في استعادة الوثائق من السحابة؟ سيتم دمج أو استبدال القائمة بالنسخة المستعادة.'
      : 'Sei sicuro di voler ripristinare i documenti dal Cloud?';

    if (!window.confirm(confirmMsg)) return;

    setIsLoading(true);
    try {
      const res = await restoreVaultFromCloud(targetSyncId, password, targetObjectId || undefined);
      if (res.documents && res.documents.length >= 0) {
        onDocumentsRestored(res.documents);
        setSuccessMsg(
          lang === 'ar'
            ? `تم فك التشفير واستعادة ${res.documents.length} وثيقة بنجاح!`
            : `Ripristinati con successo ${res.documents.length} documenti!`
        );
        showToast(lang === 'ar' ? 'تمت استعادة الوثائق من السحابة' : 'Documenti ripristinati con successo');
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطأ أثناء الاستعادة من السحابة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySyncId = () => {
    navigator.clipboard.writeText(settings.syncId);
    setCopiedSyncId(true);
    setTimeout(() => setCopiedSyncId(false), 2000);
  };

  const handleCopyPairingCode = () => {
    const code = `${settings.syncId}|${settings.cloudObjectId || ''}`;
    navigator.clipboard.writeText(code);
    setCopiedPairingCode(true);
    setTimeout(() => setCopiedPairingCode(false), 2000);
  };

  const handleToggleAutoSync = (checked: boolean) => {
    const updated = { ...settings, autoSync: checked };
    setSettings(updated);
    saveCloudSyncSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-500/30 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {lang === 'ar' ? 'المزامنة السحابية المشفرة' : 'Cloud Sync Crittografato'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Zero-Knowledge
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {lang === 'ar' 
                  ? 'تشفير AES-256 وحفظ الوثائق سحابياً لفتحها من أي هاتف أو كمبيوتر' 
                  : 'Crittografia AES-256 e sincronizzazione sicura multi-dispositivo'}
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

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-1.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'sync'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>{lang === 'ar' ? 'المزامنة والحفظ' : 'Sincronizzazione'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{lang === 'ar' ? 'ربط جهاز عبر QR' : 'Collega con QR'}</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
          
          {/* Zero-Knowledge Privacy Guarantee Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold">
                {lang === 'ar' ? 'أمان بمبدأ صفر معرفة (Zero-Knowledge Privacy):' : 'Garanzia Zero-Knowledge:'}
              </p>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                {lang === 'ar' 
                  ? 'وثائقك وبياناتك وتواريخك تُشفر على هاتفك أولاً بتشفير AES-256 قبل مغادرته. لا يمكن لأي سيرفر أو جهة قراءة مستنداتك دون كلمة السر الخاصة بك.'
                  : 'I tuoi dati vengono crittografati localmente con AES-256 prima dell\'invio. Solo chi possiede la password del Vault può decifrarli.'}
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: SYNC & RESTORE */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              
              {/* Sync ID Display */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {lang === 'ar' ? 'معرف المزامنة السحابية (Sync ID)' : 'ID Sincronizzazione Cloud'}
                  </p>
                  <p className="font-mono text-base font-black text-slate-800 dark:text-slate-100 tracking-wider mt-0.5">
                    {settings.syncId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySyncId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-xs"
                >
                  {copiedSyncId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSyncId ? (lang === 'ar' ? 'تم النسخ' : 'Copiato') : (lang === 'ar' ? 'نسخ' : 'Copia')}</span>
                </button>
              </div>

              {/* Master Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-sky-500" />
                    <span>{lang === 'ar' ? 'كلمة سر الخزنة السحابية (Vault Password)' : 'Password Master del Vault'}</span>
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    {lang === 'ar' ? 'احفظها جيداً لفك التشفير على أي جهاز' : 'Necessaria per decifrare sui tuoi dispositivi'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={lang === 'ar' ? 'أدخل كلمة مرور لتشفير وفك تشفير الوثائق...' : 'Inserisci la password del Vault...'}
                    className="w-full ps-3.5 pe-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Auto-Sync Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-500 text-white shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {lang === 'ar' ? 'المزامنة السحابية التلقائية (Auto-Sync)' : 'Sincronizzazione Automatica'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === 'ar'
                        ? 'مزامنة مشفرة فورية في الخلفية عند كل إضافة أو تجديد وثيقة'
                        : 'Aggiorna automaticamente il Cloud quando modifichi o aggiungi documenti'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoSync}
                    onChange={(e) => handleToggleAutoSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              {/* Action Buttons: Sync Up / Restore Down */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-md shadow-sky-500/25 transition-all active:scale-98 disabled:opacity-50"
                >
                  <UploadCloud className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{lang === 'ar' ? 'رفع ومزامنة السحابة الآن' : 'Salva nel Cloud Adesso'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestoreNow}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all active:scale-98 disabled:opacity-50"
                >
                  <DownloadCloud className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{lang === 'ar' ? 'استعادة وفك تشفير النسخة' : 'Ripristina e Decifra'}</span>
                </button>
              </div>

              {/* Sync Status Info Footer */}
              {settings.lastSyncTimestamp && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>
                    {lang === 'ar' ? 'آخر مزامنة ناجحة:' : 'Ultima sincronizzazione:'}{' '}
                    <strong className="text-slate-700 dark:text-slate-200 font-mono">
                      {new Date(settings.lastSyncTimestamp).toLocaleString(lang === 'ar' ? 'ar-EG' : 'it-IT')}
                    </strong>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <Check className="w-3.5 h-3.5" />
                    {settings.documentCount || documents.length} {lang === 'ar' ? 'وثيقة محفوظة' : 'documenti'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEVICE PAIRING VIA QR */}
          {activeTab === 'qr' && (
            <div className="space-y-4 text-center">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'ربط جهاز ثانٍ أو كمبيوتر' : 'Collega un altro Dispositivo'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  {lang === 'ar'
                    ? 'امسح هذا الرمز بواسطة كاميرا هاتفك الآخر أو افتح كود الربط على الكمبيوتر لنقل كافة وثائقك مشفرة فوراً.'
                    : 'Scansiona il codice QR o inserisci il codice di accoppiamento sul nuovo dispositivo.'}
                </p>
              </div>

              {/* QR Code Container */}
              <div className="inline-block p-4 bg-white rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 mx-auto">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Pairing QR Code" className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-xl" />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              {/* Manual Pairing String */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-start">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    {lang === 'ar' ? 'كود الربط المباشر (Pairing Code)' : 'Codice di Accoppiamento'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPairingCode}
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    {copiedPairingCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPairingCode ? (lang === 'ar' ? 'تم النسخ' : 'Copiato') : (lang === 'ar' ? 'نسخ الكود' : 'Copia')}</span>
                  </button>
                </div>
                <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all">
                  {settings.syncId}{settings.cloudObjectId ? `|${settings.cloudObjectId}` : ''}
                </p>
              </div>

              {/* Simple Step-by-Step Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-start text-xs pt-1">
                <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'ar' ? '1. من الجهاز الجديد:' : '1. Sul nuovo dispositivo:'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {lang === 'ar' ? 'افتح موقع Rinnovami ثم انقر على أيقونة السحابة.' : 'Apri Rinnovami e clicca sull\'icona Cloud.'}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 flex items-start gap-2.5">
                  <Laptop className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'ar' ? '2. أدخل كلمة السر:' : '2. Inserisci la password:'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {lang === 'ar' ? 'اضغط "استعادة" لتظهر جميع وثائقك مشفرة فوراً.' : 'Clicca "Ripristina" per caricare tutti i documenti.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
