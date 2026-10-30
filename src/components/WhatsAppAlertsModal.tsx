import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  BellRing, 
  Check, 
  Sliders, 
  Terminal, 
  Copy, 
  ExternalLink,
  Phone,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { DocumentItem, WhatsAppAlertSettings, Language } from '../types';
import { 
  loadWhatsAppSettings, 
  saveWhatsAppSettings, 
  dispatchWhatsAppAlert, 
  formatAllDocsWhatsAppMessage,
  cleanPhoneNumber 
} from '../utils/whatsappAlertService';
import { getExpiringDocumentsForAlert } from '../utils/emailAlertService';

interface WhatsAppAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  lang: Language;
  onToast: (msg: string) => void;
}

export const WhatsAppAlertsModal: React.FC<WhatsAppAlertsModalProps> = ({
  isOpen,
  onClose,
  documents,
  lang,
  onToast,
}) => {
  const [settings, setSettings] = useState<WhatsAppAlertSettings>(loadWhatsAppSettings);
  const [activeTab, setActiveTab] = useState<'settings' | 'integrations' | 'cron'>('settings');
  const [isSending, setIsSending] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(loadWhatsAppSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const { allUrgent, expired, critical, expiringSoon } = getExpiringDocumentsForAlert(
    documents,
    settings.leadDays
  );

  const handleSave = () => {
    saveWhatsAppSettings(settings);
    onToast(lang === 'ar' ? 'تم حفظ إعدادات تنبيهات واتساب!' : 'Impostazioni WhatsApp salvate!');
  };

  const handleSendAlert = async (isTest = false) => {
    setIsSending(true);
    try {
      const result = await dispatchWhatsAppAlert(settings, documents, lang, isTest);
      onToast(result.message);
      if (result.success) {
        setSettings(loadWhatsAppSettings());
      }
    } catch (err: any) {
      onToast(err.message || 'حدث خطأ أثناء الإرسال');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendToPhone = async (phone: string, isTest = false) => {
    setIsSending(true);
    try {
      const customSettings = { ...settings, recipientPhone: phone };
      const result = await dispatchWhatsAppAlert(customSettings, documents, lang, isTest);
      onToast(result.message);
    } catch (err: any) {
      onToast(err.message || 'حدث خطأ أثناء الإرسال');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendToAllPhones = async (isTest = false) => {
    setIsSending(true);
    const phones = settings.recipientPhones && settings.recipientPhones.length > 0
      ? settings.recipientPhones
      : ['+393331785636', '+393802633225', '+393298993363'];

    try {
      for (const p of phones) {
        const customSettings = { ...settings, recipientPhone: p };
        await dispatchWhatsAppAlert(customSettings, documents, lang, isTest);
      }
      onToast(
        lang === 'ar'
          ? 'تم فتح تقارير الواتساب للأرقام الثلاثة المعتمدة بنجاح!'
          : 'Aperte le chat WhatsApp per tutti i 3 numeri registrati!'
      );
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
      saveWhatsAppSettings(updated);
      return updated;
    });
  };

  const cleanPhone = cleanPhoneNumber(settings.recipientPhone);
  const cronCodeSnippet = `// تشغيل تنبيه واتساب التلقائي عبر Node.js:
// 1. صدّر النسخة الاحتياطية باسم rinnovami-backup.json
// 2. نفّذ الأمر التالي:
node scripts/cron-whatsapp-notifier.js --backup=rinnovami-backup.json --phone=+${cleanPhone || '393331234567'}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cronCodeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header with WhatsApp branding */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-md">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {lang === 'ar' ? 'تنبيهات ورسائل واتساب' : 'Notifiche WhatsApp'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                  WhatsApp Direct
                </span>
              </div>
              <p className="text-xs text-white/85">
                {lang === 'ar' 
                  ? 'إرسال رسائل تذكير عاجلة لوثائقك الإيطالية مباشرة إلى رقم هاتفك' 
                  : 'Invia promemoria istantanei per i tuoi documenti italiani su WhatsApp'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-6 gap-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{lang === 'ar' ? 'رقم الهاتف والإرسال' : 'Numero & Invio'}</span>
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'integrations'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-teal-500" />
            <span>{lang === 'ar' ? 'بوابات الإرسال التلقائي' : 'Gateway WhatsApp'}</span>
          </button>

          <button
            onClick={() => setActiveTab('cron')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'cron'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-500" />
            <span>{lang === 'ar' ? 'أتمتة خلفية 24/7' : 'Automazione 24/7'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'settings' && (
            <>
              {/* Pre-configured WhatsApp Recipient Numbers */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                  {lang === 'ar' ? 'أرقام الواتساب المعتمدة لتلقي التنبيهات:' : 'Numeri WhatsApp Destinatari Registrati:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { phone: '+393331785636', formatted: '+39 333 178 5636', tag: lang === 'ar' ? 'الرقم 1' : 'Numero 1' },
                    { phone: '+393802633225', formatted: '+39 380 263 3225', tag: lang === 'ar' ? 'الرقم 2' : 'Numero 2' },
                    { phone: '+393298993363', formatted: '+39 329 899 3363', tag: lang === 'ar' ? 'الرقم 3' : 'Numero 3' },
                  ].map((item) => (
                    <div 
                      key={item.phone}
                      className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col justify-between gap-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                          {item.tag}
                        </span>
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">
                        {item.formatted}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendToPhone(item.phone, false)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all hover:scale-[1.02]"
                      >
                        <Send className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'إرسال فوري' : 'Invia Subito'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recipient Phone Number */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  {lang === 'ar' ? 'أو أدخل رقماً آخر:' : 'Oppure inserisci un altro numero:'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={settings.recipientPhone}
                    onChange={(e) => {
                      const updated = { ...settings, recipientPhone: e.target.value };
                      setSettings(updated);
                      saveWhatsAppSettings(updated);
                    }}
                    placeholder="+39 333 123 4567"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                  />
                  <Phone className="absolute end-3 top-3 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Alert Lead Times */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                  {lang === 'ar' ? 'توقيتات رسائل التذكير' : 'Giorni di Anticipo Promemoria'}
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
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>{lang === 'ar' ? item.labelAr : item.labelIt}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Urgent Summary & Instant WhatsApp Launch */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                      {lang === 'ar' ? 'تقرير الواتساب الجاهز الآن' : 'Riepilogo WhatsApp Disponibile'}
                    </h4>
                    <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 mt-0.5">
                      {lang === 'ar'
                        ? `لديك ${allUrgent.length} وثائق عاجلة سيتم تنسيقها تلقائياً بأشكال تعبيرية وخط عريض ونصوص قانونية إيطالية.`
                        : `Hai ${allUrgent.length} documenti urgenti pronti per essere inviati su WhatsApp.`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSendToAllPhones(false)}
                    disabled={isSending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/25 disabled:opacity-50 transition-all hover:scale-[1.01]"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>
                      {isSending
                        ? (lang === 'ar' ? 'جارٍ الفتح...' : 'Apertura in corso...')
                        : (lang === 'ar' ? 'إرسال لجميع الأرقام الـ 3 دفعة واحدة' : 'Invia a Tutti i 3 Numeri')}
                    </span>
                  </button>

                  <button
                    onClick={() => handleSendAlert(false)}
                    disabled={isSending}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'للرقم الرئيسي' : 'Al Principale'}</span>
                  </button>

                  <button
                    onClick={() => handleSendAlert(true)}
                    disabled={isSending}
                    className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    {lang === 'ar' ? 'رسالة تجريبية' : 'Test'}
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                  {lang === 'ar' ? 'اختر طريقة إرسال الواتساب' : 'Modalità di Invio WhatsApp'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'direct', title: 'واتساب المباشر (wa.me)', desc: 'مجاني وفوري، يفتح تطبيقك بضغطة زر' },
                    { id: 'greenapi', title: 'Green API السحابي', desc: 'إرسال أوتوماتيكي بدون تدخل يدوي' },
                    { id: 'webhook', title: 'Webhook خارجي', desc: 'Zapier, Make, n8n, UltraMsg' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const updated = { ...settings, sendMethod: m.id as any };
                        setSettings(updated);
                        saveWhatsAppSettings(updated);
                      }}
                      className={`p-3 rounded-2xl border text-start transition-all ${
                        settings.sendMethod === m.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.title}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {settings.sendMethod === 'greenapi' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'ar' ? 'إعدادات بوابة Green API' : 'Parametri Green API'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'تتيح لك خدمة Green API ربط رقمك وإرسال رسائل واتساب برمجياً بالكامل.'
                      : 'Green API consente l\'invio programmatico di messaggi WhatsApp.'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Instance ID (e.g. 1101823456)"
                      value={settings.apiInstanceId || ''}
                      onChange={(e) => {
                        const updated = { ...settings, apiInstanceId: e.target.value };
                        setSettings(updated);
                        saveWhatsAppSettings(updated);
                      }}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="password"
                      placeholder="API Token Instance"
                      value={settings.apiToken || ''}
                      onChange={(e) => {
                        const updated = { ...settings, apiToken: e.target.value };
                        setSettings(updated);
                        saveWhatsAppSettings(updated);
                      }}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              )}

              {settings.sendMethod === 'webhook' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'ar' ? 'رابط Webhook المخصص' : 'URL Webhook Personalizzato'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'يمكنك ربط هذا الرابط مع Zapier أو Make.com لإرسال رسائل واتساب عبر Twilio أو Meta WhatsApp Business API.'
                      : 'Inoltra il payload a Zapier o Make per gestire l\'invio via Twilio o Meta Business.'}
                  </p>
                  <input
                    type="url"
                    value={settings.webhookUrl || ''}
                    onChange={(e) => {
                      const updated = { ...settings, webhookUrl: e.target.value };
                      setSettings(updated);
                      saveWhatsAppSettings(updated);
                    }}
                    placeholder="https://hook.eu1.make.com/whatsapp-alert"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'cron' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    scripts/cron-whatsapp-notifier.js
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
                  {lang === 'ar' ? 'كيف تعمل أتمتة الواتساب اليومية؟' : 'Come funziona l\'automazione WhatsApp?'}
                </h4>
                <ul className="text-xs text-emerald-800 dark:text-emerald-300 list-disc list-inside space-y-1">
                  <li>
                    {lang === 'ar'
                      ? 'السكربت المستقل موجود مسبقاً في: scripts/cron-whatsapp-notifier.js'
                      : 'Lo script autonomo è presente in: scripts/cron-whatsapp-notifier.js'}
                  </li>
                  <li>
                    {lang === 'ar'
                      ? 'يفحص تلقائياً ملف النسخة الاحتياطية كل صباح، ويستخرج الأوراق التي قاربت على الانتهاء.'
                      : 'Verifica il backup ogni mattina ed estrae i documenti in scadenza.'}
                  </li>
                  <li>
                    {lang === 'ar'
                      ? 'يرسل رسالة تنبيهية مباشرة إلى رقم هاتفك المسجل على واتساب.'
                      : 'Invia il messaggio direttamente al tuo WhatsApp.'}
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
            className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-500/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{lang === 'ar' ? 'حفظ إعدادات واتساب' : 'Salva Impostazioni'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
