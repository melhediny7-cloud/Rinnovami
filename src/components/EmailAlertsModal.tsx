import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  X, 
  Send, 
  BellRing, 
  Check, 
  AlertTriangle, 
  Sliders, 
  Terminal, 
  Copy, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { DocumentItem, EmailAlertSettings, Language } from '../types';
import { 
  loadEmailSettings, 
  saveEmailSettings, 
  dispatchEmailAlert, 
  getExpiringDocumentsForAlert,
  formatEmailReport
} from '../utils/emailAlertService';

interface EmailAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  lang: Language;
  onToast: (msg: string) => void;
}

export const EmailAlertsModal: React.FC<EmailAlertsModalProps> = ({
  isOpen,
  onClose,
  documents,
  lang,
  onToast,
}) => {
  const [settings, setSettings] = useState<EmailAlertSettings>(loadEmailSettings);
  const [activeTab, setActiveTab] = useState<'settings' | 'integrations' | 'cron'>('settings');
  const [isSending, setIsSending] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(loadEmailSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const { allUrgent, expired, critical, expiringSoon } = getExpiringDocumentsForAlert(
    documents,
    settings.leadDays
  );

  const handleSave = () => {
    saveEmailSettings(settings);
    onToast(lang === 'ar' ? 'تم حفظ إعدادات التنبيهات البريدية!' : 'Impostazioni email salvate!');
  };

  const handleSendReport = async (isTest = false, forceMethod?: 'webhook' | 'mailto' | 'emailjs') => {
    setIsSending(true);
    try {
      const activeSettings: EmailAlertSettings = {
        ...settings,
        sendMethod: forceMethod || settings.sendMethod || 'webhook',
        webhookUrl: settings.webhookUrl || 'https://hook.eu1.make.com/j469ypwvo8cpihjazbqq25htixq4yu4h',
        recipientEmail: settings.recipientEmail || 'Greenimpianti225@gmail.com',
      };
      saveEmailSettings(activeSettings);
      setSettings(activeSettings);

      const result = await dispatchEmailAlert(activeSettings, documents, lang, isTest);
      onToast(result.message);
      if (result.success) {
        setSettings(loadEmailSettings());
      }
    } catch (err: any) {
      onToast(err.message || 'حدث خطأ أثناء الإرسال');
    } finally {
      setIsSending(false);
    }
  };

  const toggleLeadDay = (day: number) => {
    setSettings((prev) => {
      const exists = prev.leadDays.includes(day);
      const nextDays = exists
        ? prev.leadDays.filter((d) => d !== day)
        : [...prev.leadDays, day].sort((a, b) => b - a);
      const updated = { ...prev, leadDays: nextDays };
      saveEmailSettings(updated);
      return updated;
    });
  };

  const cronCodeSnippet = `// تشغيل التنبيه التلقائي اليومي عبر Node.js:
// 1. صدّر نسخة احتياطية (JSON) من البرنامج باسم rinnovami-backup.json
// 2. نفّذ الأمر التالي:
node scripts/cron-email-notifier.js --backup=rinnovami-backup.json --to=${settings.recipientEmail || 'your-email@gmail.com'}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cronCodeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-white/10 rounded-2xl backdrop-blur-md shrink-0">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {lang === 'ar' ? 'التنبيهات البريدية التلقائية' : 'Notifiche Email Automatiche'}
              </h2>
              <p className="text-[11px] sm:text-xs text-white/80">
                {lang === 'ar' 
                  ? 'استقبل تقارير دورية وتنبيهات فورية قبل انتهاء صلاحية وثائقك' 
                  : 'Ricevi promemoria e avvisi prima della scadenza dei documenti'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-3 sm:px-6 gap-1 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              activeTab === 'settings'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{lang === 'ar' ? 'الإعدادات والإرسال' : 'Impostazioni & Invio'}</span>
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              activeTab === 'integrations'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>{lang === 'ar' ? 'الربط السحابي' : 'Cloud'}</span>
          </button>

          <button
            onClick={() => setActiveTab('cron')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              activeTab === 'cron'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-500" />
            <span>{lang === 'ar' ? 'أتمتة (Cron)' : 'Cron'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1">
          {activeTab === 'settings' && (
            <>
              {/* Recipient Email Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  {lang === 'ar' ? 'بريدك الإلكتروني لتلقي التنبيهات' : 'Il tuo indirizzo Email'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={settings.recipientEmail}
                    onChange={(e) => {
                      const updated = { ...settings, recipientEmail: e.target.value };
                      setSettings(updated);
                      saveEmailSettings(updated);
                    }}
                    placeholder="example@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  />
                  <Mail className="absolute end-3 top-3 w-4 h-4 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {lang === 'ar'
                    ? 'سيتم إرسال تقارير التنبيه إلى هذا البريد بمجرد اقتراب انتهاء أي وثيقة.'
                    : 'Gli avvisi di scadenza verranno inviati a questo indirizzo.'}
                </p>
              </div>

              {/* Alert Lead Times */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                  {lang === 'ar' ? 'مواعيد التنبيه قبل الانتهاء' : 'Anticipo Notifiche'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { days: 30, labelAr: 'قبل 30 يوماً', labelIt: '30 giorni prima' },
                    { days: 15, labelAr: 'قبل 15 يوماً (حرج)', labelIt: '15 giorni prima' },
                    { days: 7, labelAr: 'قبل 7 أيام (عاجل)', labelIt: '7 giorni prima' },
                    { days: 1, labelAr: 'يوم الانتهاء', labelIt: 'Giorno scadenza' },
                  ].map((item) => {
                    const isChecked = settings.leadDays.includes(item.days);
                    return (
                      <button
                        key={item.days}
                        type="button"
                        onClick={() => toggleLeadDay(item.days)}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                          isChecked
                            ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-500 text-brand-700 dark:text-brand-300'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>{lang === 'ar' ? item.labelAr : item.labelIt}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto notify toggle */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'ar' ? 'تنبيه تلقائي عند فتح البرنامج' : 'Avviso automatico all\'avvio'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'ar'
                      ? 'التحقق التلقائي وإرسال إشعار إذا وجدت وثائق تحتاج للتجديد اليوم'
                      : 'Verifica automatica e notifica se ci sono documenti da rinnovare oggi'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoNotifyOnOpen}
                  onChange={(e) => {
                    const updated = { ...settings, autoNotifyOnOpen: e.target.checked };
                    setSettings(updated);
                    saveEmailSettings(updated);
                  }}
                  className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
                />
              </div>

              {/* Urgent Status Card & One-Click Actions */}
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500 text-white rounded-xl">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      {lang === 'ar' ? 'حالة الوثائق العاجلة الآن' : 'Riepilogo Scadenze Attuali'}
                    </h4>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                      {lang === 'ar'
                        ? `لديك ${expired.length} منتهية، و ${critical.length} حرجة، و ${expiringSoon.length} في نطاق الـ 30 يوماً.`
                        : `Hai ${expired.length} scaduti, ${critical.length} imminenti, e ${expiringSoon.length} nei prossimi 30 gg.`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSendReport(false)}
                    disabled={isSending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSending
                        ? (lang === 'ar' ? 'جارٍ الإرسال...' : 'Invio in corso...')
                        : (lang === 'ar' ? 'إرسال تقرير الصلاحيات إلى إيميلك الآن' : 'Invia Report Scadenze Adesso')}
                    </span>
                  </button>

                  <button
                    onClick={() => handleSendReport(true)}
                    disabled={isSending}
                    className="px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    {lang === 'ar' ? 'رسالة تجريبية' : 'Email di Prova'}
                  </button>

                  <button
                    onClick={() => {
                      const rep = formatEmailReport(documents, lang, settings.recipientEmail, false);
                      const su = encodeURIComponent(rep.subject);
                      const body = encodeURIComponent(rep.plainText);
                      const to = encodeURIComponent(settings.recipientEmail || 'Greenimpianti225@gmail.com');
                      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`, '_blank');
                    }}
                    type="button"
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5 text-rose-500" />
                    <span>{lang === 'ar' ? 'أو فتح وإرسال التقرير عبر Gmail مباشرة ✉️' : 'Oppure apri e invia direttamente da Gmail Web ✉️'}</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                  {lang === 'ar' ? 'اختر طريقة الإرسال التلقائي' : 'Metodo di Invio'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'mailto', title: 'بريد الجهاز (Mailto)', desc: 'يفتح برنامج البريد بضغطة واحدة' },
                    { id: 'webhook', title: 'Webhook API', desc: 'Zapier, Make, n8n, Resend' },
                    { id: 'emailjs', title: 'EmailJS السحابي', desc: 'إرسال مباشر بدون خادم backend' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const updated = { ...settings, sendMethod: m.id as any };
                        setSettings(updated);
                        saveEmailSettings(updated);
                      }}
                      className={`p-3 rounded-2xl border text-start transition-all ${
                        settings.sendMethod === m.id
                          ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-500 ring-2 ring-brand-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.title}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {settings.sendMethod === 'webhook' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-brand-500" />
                      <span>{lang === 'ar' ? 'رابط Zapier Webhook التلقائي' : 'Endpoint Zapier Webhook'}</span>
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {lang === 'ar' ? 'متصل وجاهز' : 'Pronto'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'تم ربط رابط Zapier المخصص لإرسال التنبيهات إلى Greenimpianti225@gmail.com. يمكنك إرسال تجربة فورية لفحص الخطوات في Zapier.'
                      : 'Collegato all\'endpoint Zapier per notifiche email. Invia un payload di prova per testare il trigger Zapier.'}
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={settings.webhookUrl || ''}
                      onChange={(e) => {
                        const updated = { ...settings, webhookUrl: e.target.value };
                        setSettings(updated);
                        saveEmailSettings(updated);
                      }}
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendReport(true, 'webhook')}
                      disabled={isSending}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shrink-0 transition-colors shadow-sm"
                    >
                      {isSending ? (lang === 'ar' ? 'جارٍ الإرسال...' : 'Invio...') : (lang === 'ar' ? 'إرسال اختبار لـ Zapier' : 'Test Zapier')}
                    </button>
                  </div>

                  {/* Zapier Field Mapping Guide */}
                  <div className="mt-3 p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] space-y-1.5">
                    <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{lang === 'ar' ? 'أسماء الحقول المتاحة في Zapier (Mapping):' : 'Campi disponibili su Zapier:'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400 font-mono">
                      <div><strong className="text-brand-600">daysRemaining</strong>: متبقي (رقم - لفلتر &le; 3)</div>
                      <div><strong className="text-brand-600">expiryDate</strong>: تاريخ الانتهاء (YYYY-MM-DD)</div>
                      <div><strong className="text-brand-600">title</strong>: اسم الورقة (Permesso...)</div>
                      <div><strong className="text-brand-600">documentTitle</strong>: اسم الوثيقة</div>
                      <div><strong className="text-brand-600">recipient</strong>: البريد المستهدف</div>
                      <div><strong className="text-brand-600">subject</strong>: عنوان البريد الجاهز</div>
                      <div><strong className="text-brand-600">message</strong>: نص التذكير الكامل</div>
                      <div><strong className="text-brand-600">holderName</strong>: صاحب الوثيقة</div>
                    </div>
                  </div>
                </div>
              )}

              {settings.sendMethod === 'emailjs' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'ar' ? 'إعدادات خدمة EmailJS المجانية' : 'Parametri EmailJS'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'تتيح لك خدمة EmailJS (emailjs.com) إرسال حتى 200 رسالة بريد مجاناً شهرياً مباشرة من المتصفح بدون أي برمجة خادم.'
                      : 'EmailJS consente di inviare fino a 200 email/mese gratuite direttamente dal browser.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Service ID"
                      value={settings.emailJsServiceId || ''}
                      onChange={(e) => {
                        const updated = { ...settings, emailJsServiceId: e.target.value };
                        setSettings(updated);
                        saveEmailSettings(updated);
                      }}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="Template ID"
                      value={settings.emailJsTemplateId || ''}
                      onChange={(e) => {
                        const updated = { ...settings, emailJsTemplateId: e.target.value };
                        setSettings(updated);
                        saveEmailSettings(updated);
                      }}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="Public Key"
                      value={settings.emailJsPublicKey || ''}
                      onChange={(e) => {
                        const updated = { ...settings, emailJsPublicKey: e.target.value };
                        setSettings(updated);
                        saveEmailSettings(updated);
                      }}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cron' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    scripts/cron-email-notifier.js
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? (lang === 'ar' ? 'تم النسخ!' : 'Copiato!') : (lang === 'ar' ? 'نسخ الأمر' : 'Copia')}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto text-slate-300 bg-slate-950/60 p-3 rounded-xl">
                  {cronCodeSnippet}
                </pre>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-2">
                <h4 className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  {lang === 'ar' ? 'كيف تعمل أتمتة الـ 24/7 دون فتح المتصفح؟' : 'Come funziona l\'automazione 24/7?'}
                </h4>
                <ul className="text-xs text-emerald-800 dark:text-emerald-300 list-disc list-inside space-y-1">
                  <li>
                    {lang === 'ar'
                      ? 'قمنا بتضمين ملف سكربت جاهز ومستقل في مجلد المشروع: scripts/cron-email-notifier.js'
                      : 'Lo script autonomo pronto all\'uso è già presente nella cartella scripts/'}
                  </li>
                  <li>
                    {lang === 'ar'
                      ? 'يمكنك جدولته في Windows Task Scheduler ليعمل يومياً كل صباح الساعة 8:00 صباحاً.'
                      : 'Puoi pianificarlo nell\'Utilità di pianificazione di Windows o con Linux Cron.'}
                  </li>
                  <li>
                    {lang === 'ar'
                      ? 'يمكن تشغيله مجاناً أيضاً عبر GitHub Actions بدون الحاجة لفتح جهاز الكمبيوتر الخاص بك!'
                      : 'Può essere eseguito gratuitamente anche su GitHub Actions a intervalli regolari.'}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {lang === 'ar' ? 'إغلاق' : 'Chiudi'}
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-500/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{lang === 'ar' ? 'حفظ التفضيلات' : 'Salva Impostazioni'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
