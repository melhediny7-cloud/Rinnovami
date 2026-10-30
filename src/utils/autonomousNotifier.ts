import { DocumentItem, Language } from '../types';
import { loadEmailSettings, getExpiringDocumentsForAlert, dispatchEmailAlert } from './emailAlertService';
import { loadWhatsAppSettings, dispatchWhatsAppAlert } from './whatsappAlertService';
import { logActivity } from './auditLogger';

const LAST_AUTO_ALERT_KEY = 'rinnovami_last_auto_alert_date';

export interface AutoCheckResult {
  triggered: boolean;
  count: number;
  reason?: 'already_sent_today' | 'no_urgent_docs' | 'disabled' | 'dispatched';
  message: string;
}

/**
 * Autonomous check that runs in the background.
 * Inspects documents and automatically dispatches alert notifications (Make.com Email + Green API WhatsApp)
 * if there are documents expiring soon, without requiring manual user intervention.
 */
export async function checkAndDispatchAutonomousAlerts(
  documents: DocumentItem[],
  lang: Language = 'ar',
  force = false
): Promise<AutoCheckResult> {
  const settings = loadEmailSettings();
  const whatsAppSettings = loadWhatsAppSettings();

  // If email notifications disabled, stop
  if (!settings.enabled && !whatsAppSettings.enabled) {
    return {
      triggered: false,
      count: 0,
      reason: 'disabled',
      message: lang === 'ar' ? 'التنبيهات التلقائية معطلة في الإعدادات.' : 'Notifiche disabilitate.',
    };
  }

  // Find urgent documents (lead days: default 30, 15, 7, 3, 1)
  const { allUrgent } = getExpiringDocumentsForAlert(documents, settings.leadDays || [30, 15, 7, 3, 1]);

  if (allUrgent.length === 0) {
    return {
      triggered: false,
      count: 0,
      reason: 'no_urgent_docs',
      message: lang === 'ar' ? 'جميع الوثائق سارية ولا توجد مواعيد عاجلة اليوم.' : 'Nessun documento in scadenza oggi.',
    };
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const lastAlertDate = localStorage.getItem(LAST_AUTO_ALERT_KEY);

  // If already sent today and not forced, avoid spamming
  if (!force && lastAlertDate === todayStr) {
    return {
      triggered: false,
      count: allUrgent.length,
      reason: 'already_sent_today',
      message:
        lang === 'ar'
          ? `تم إرسال تنبيه آلي مسبقاً اليوم (${allUrgent.length} وثائق قيد المتابعة).`
          : `Avviso già inviato per oggi (${allUrgent.length} documenti monitorati).`,
    };
  }

  // Dispatch alert to Webhook / Email automatically
  try {
    let emailResult = { success: false, message: '' };
    if (settings.enabled) {
      emailResult = await dispatchEmailAlert(settings, documents, lang, false);
    }

    // Also dispatch WhatsApp automatically via Green API if configured
    if (whatsAppSettings.enabled && whatsAppSettings.sendMethod === 'greenapi' && whatsAppSettings.apiToken) {
      await dispatchWhatsAppAlert(whatsAppSettings, documents, lang, false).catch((e) => {
        console.warn('Auto WhatsApp dispatch warning:', e);
      });
    }
    
    // Save last alert date
    localStorage.setItem(LAST_AUTO_ALERT_KEY, todayStr);

    // Audit log
    logActivity(
      'export',
      lang === 'ar' ? 'تنبيه ذكي شامل' : 'Avviso Automatico Smart',
      lang === 'ar'
        ? `أرسل البرنامج تنبيهاً ذاتياً بـ (${allUrgent.length}) وثائق للإيميل والواتساب للأرقام المعتمدة.`
        : `Inviato avviso automatico per (${allUrgent.length}) documenti a Email e WhatsApp.`
    );

    const successMsg =
      lang === 'ar'
        ? `🤖 تنبيه ذكي تلقائي: رصد البرنامج (${allUrgent.length}) وثائق قاربت على الانتهاء وأرسل إشعاراً للإيميل والواتساب.`
        : `🤖 Smart Alert: Rilevati (${allUrgent.length}) documenti in scadenza. Notifiche inviate a Email e WhatsApp.`;

    return {
      triggered: true,
      count: allUrgent.length,
      reason: 'dispatched',
      message: successMsg,
    };
  } catch (err: any) {
    return {
      triggered: false,
      count: allUrgent.length,
      message: err.message || 'خطأ أثناء الإرسال التلقائي',
    };
  }
}

/**
 * Check if today's auto-alert has already been sent
 */
export function isTodayAlertAlreadySent(): boolean {
  const todayStr = new Date().toISOString().slice(0, 10);
  return localStorage.getItem(LAST_AUTO_ALERT_KEY) === todayStr;
}

/**
 * Get date of last autonomous alert
 */
export function getLastAutoAlertDate(): string | null {
  return localStorage.getItem(LAST_AUTO_ALERT_KEY);
}
