import { DocumentItem, WhatsAppAlertSettings, Language } from '../types';
import { getDaysRemaining, computeDocumentStatus } from './dateUtils';
import { translations } from '../translations';

const WHATSAPP_SETTINGS_STORAGE_KEY = 'rinnovami_whatsapp_settings_v1';

export const DEFAULT_WHATSAPP_PHONES = [
  '+393331785636',
  '+393802633225',
  '+393298993363',
];

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppAlertSettings = {
  enabled: true,
  recipientPhone: '+393331785636',
  recipientPhones: DEFAULT_WHATSAPP_PHONES,
  leadDays: [90, 60, 30, 15, 7, 1],
  autoNotifyOnOpen: true,
  sendMethod: 'greenapi',
  webhookUrl: '',
  apiInstanceId: '710722786421',
  apiToken: '1bf9440a96a94c18a56eb9d2a719eede4a958933c8564aa5a2',
  lastNotifiedDate: undefined,
};

export function loadWhatsAppSettings(): WhatsAppAlertSettings {
  try {
    const raw = localStorage.getItem(WHATSAPP_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_WHATSAPP_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_WHATSAPP_SETTINGS,
      ...parsed,
      recipientPhone: parsed.recipientPhone || '+393331785636',
      recipientPhones:
        Array.isArray(parsed.recipientPhones) && parsed.recipientPhones.length > 0
          ? parsed.recipientPhones
          : DEFAULT_WHATSAPP_PHONES,
      apiInstanceId: parsed.apiInstanceId || '710722786421',
      apiToken: parsed.apiToken || '1bf9440a96a94c18a56eb9d2a719eede4a958933c8564aa5a2',
      sendMethod: parsed.sendMethod || 'greenapi',
    };
  } catch {
    return DEFAULT_WHATSAPP_SETTINGS;
  }
}

export function saveWhatsAppSettings(settings: WhatsAppAlertSettings): void {
  try {
    localStorage.setItem(WHATSAPP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save WhatsApp settings:', err);
  }
}

/**
 * Normalizes phone numbers for WhatsApp API (e.g. "+39 333-123 4567" -> "393331234567")
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Format a WhatsApp message for a single document
 */
export function formatSingleDocWhatsAppMessage(
  doc: DocumentItem,
  lang: Language = 'ar'
): string {
  const days = getDaysRemaining(doc.expiryDate);
  const status = computeDocumentStatus(doc.expiryDate, doc.reminderDaysBefore);

  const isExpired = days < 0;
  const statusEmoji = isExpired ? '🔴' : days <= 15 ? '⚠️' : '🟡';
  const statusText = isExpired
    ? lang === 'ar' ? `منتهية منذ ${Math.abs(days)} يوماً!` : `Scaduto da ${Math.abs(days)} giorni!`
    : days === 0
    ? lang === 'ar' ? `تنتهي اليوم!` : `Scade oggi!`
    : lang === 'ar' ? `متبقي ${days} يوماً فقط` : `Mancano solo ${days} giorni`;

  if (lang === 'ar') {
    return (
      `🚨 *تنبيه صلاحية الوثيقة - Rinnovami | رينوفامي*\n\n` +
      `📄 *الوثيقة:* ${doc.title}\n` +
      `🔢 *رقم الوثيقة:* ${doc.documentNumber || 'غير مسجل'}\n` +
      `👤 *صاحب الوثيقة:* ${doc.holderName || '-'}\n` +
      `📅 *تاريخ الانتهاء:* ${doc.expiryDate}\n` +
      `${statusEmoji} *الحالة:* ${statusText}\n` +
      (doc.issuingAuthority ? `🏛️ *الجهة:* ${doc.issuingAuthority}\n` : '') +
      `\n💡 *تذكير:* يرجى البدء في إجراءات التجديد أو حجز موعد لتجنب أي تعطيل قانوني في إيطاليا.\n\n` +
      `_تم الإرسال عبر تطبيق Rinnovami_`
    );
  }

  return (
    `🚨 *Avviso Scadenza Documento - Rinnovami*\n\n` +
    `📄 *Documento:* ${doc.title}\n` +
    `🔢 *Numero:* ${doc.documentNumber || '-'}\n` +
    `👤 *Intestatario:* ${doc.holderName || '-'}\n` +
    `📅 *Data Scadenza:* ${doc.expiryDate}\n` +
    `${statusEmoji} *Stato:* ${statusText}\n` +
    (doc.issuingAuthority ? `🏛️ *Ente:* ${doc.issuingAuthority}\n` : '') +
    `\n💡 *Consiglio:* Avvia la pratica di rinnovo o prenota l'appuntamento per tempo.\n\n` +
    `_Inviato tramite Rinnovami_`
  );
}

/**
 * Format a comprehensive WhatsApp digest message containing all urgent/expiring documents
 */
export function formatAllDocsWhatsAppMessage(
  documents: DocumentItem[],
  lang: Language = 'ar',
  leadDays: number[] = [90, 60, 30, 15, 7, 1],
  isTest = false
): { message: string; urgentCount: number } {
  const maxDays = Math.max(...leadDays, 90);
  const todayStr = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isTest) {
    const testMsg =
      lang === 'ar'
        ? `✅ *رسالة تجريبية من Rinnovami | رينوفامي*\n\nتنبيهات الواتساب تعمل بنجاح! ستصلك تنبيهات دورية عند اقتراب انتهاء صلاحية أي ورقة رسمية.\n\n📅 التاريخ: ${todayStr}`
        : `✅ *Messaggio di Prova - Rinnovami*\n\nLe notifiche WhatsApp sono configurate correttamente!\n\n📅 Data: ${todayStr}`;
    return { message: testMsg, urgentCount: 0 };
  }

  const expired: DocumentItem[] = [];
  const critical: DocumentItem[] = [];
  const expiringSoon: DocumentItem[] = [];

  for (const doc of documents) {
    const days = getDaysRemaining(doc.expiryDate);
    const status = computeDocumentStatus(doc.expiryDate, doc.reminderDaysBefore);

    if (status === 'expired') {
      expired.push(doc);
    } else if (status === 'critical' || days <= 15) {
      critical.push(doc);
    } else if (days <= maxDays) {
      expiringSoon.push(doc);
    }
  }

  const urgentCount = expired.length + critical.length + expiringSoon.length;

  if (urgentCount === 0) {
    const allGoodMsg =
      lang === 'ar'
        ? `🎉 *تقرير Rinnovami:* جميع وثائقك الرسمية سارية المفعول ولا توجد أي أوراق قاربت على الانتهاء حالياً.`
        : `🎉 *Report Rinnovami:* Tutti i tuoi documenti sono in regola. Nessuna scadenza imminente!`;
    return { message: allGoodMsg, urgentCount: 0 };
  }

  let text =
    lang === 'ar'
      ? `🚨 *تقرير الوثائق الإيطالية العاجلة - Rinnovami*\n📅 ${todayStr}\n\nلديك *${urgentCount}* وثائق تتطلب انتباهك:\n\n`
      : `🚨 *Report Scadenze Documenti - Rinnovami*\n📅 ${todayStr}\n\nHai *${urgentCount}* documenti che richiedono attenzione:\n\n`;

  if (expired.length > 0) {
    text += lang === 'ar' ? `⚠️ *وثائق منتهية الصلاحية (${expired.length}):*\n` : `⚠️ *Documenti Scaduti (${expired.length}):*\n`;
    expired.forEach((doc, idx) => {
      const days = Math.abs(getDaysRemaining(doc.expiryDate));
      text += `${idx + 1}. *${doc.title}*\n   • الرقم: ${doc.documentNumber || '-'}\n   • منتهية منذ: *${days} يوماً*\n   • صاحب الوثيقة: ${doc.holderName || '-'}\n\n`;
    });
  }

  if (critical.length > 0) {
    text += lang === 'ar' ? `🔴 *وثائق حرجة - تنتهي خلال 15 يوماً (${critical.length}):*\n` : `🔴 *Scadenza Imminente - meno di 15 gg (${critical.length}):*\n`;
    critical.forEach((doc, idx) => {
      const days = getDaysRemaining(doc.expiryDate);
      text += `${idx + 1}. *${doc.title}*\n   • تاريخ الانتهاء: *${doc.expiryDate}*\n   • ⏳ *متبقي ${days} يوماً فقط!*\n   • الجهة: ${doc.issuingAuthority || '-'}\n\n`;
    });
  }

  if (expiringSoon.length > 0) {
    text += lang === 'ar' ? `🟡 *وثائق تنتهي خلال 30 يوماً (${expiringSoon.length}):*\n` : `🟡 *In Scadenza nei prossimi 30 gg (${expiringSoon.length}):*\n`;
    expiringSoon.forEach((doc, idx) => {
      const days = getDaysRemaining(doc.expiryDate);
      text += `${idx + 1}. *${doc.title}*\n   • تاريخ الانتهاء: *${doc.expiryDate}* (متبقي ${days} يوم)\n\n`;
    });
  }

  text +=
    lang === 'ar'
      ? `💡 *نصيحة هامة:* في إيطاليا، يُنصح بتجهيز Kit البيرميسو أو حجز موعد تجديد بطاقة الهوية ورخصة القيادة قبل 60-90 يوماً لتجنب أي تعقيدات قانونية.\n\n_تم الإنشاء عبر تطبيق Rinnovami | رينوفامي_`
      : `💡 *Promemoria:* Avvia la pratica per tempo per evitare sanzioni o disagi.\n\n_Generato tramite Rinnovami_`;

  return { message: text, urgentCount };
}

/**
 * Generate a direct wa.me link for WhatsApp Web or WhatsApp Mobile App
 */
export function generateWhatsAppUrl(phone: string, text: string): string {
  const clean = cleanPhoneNumber(phone);
  const encoded = encodeURIComponent(text);
  if (clean) {
    return `https://wa.me/${clean}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

/**
 * Send an alert via user's preferred WhatsApp method
 */
export async function dispatchWhatsAppAlert(
  settings: WhatsAppAlertSettings,
  documents: DocumentItem[],
  lang: Language = 'ar',
  isTest = false
): Promise<{ success: boolean; message: string }> {
  const { message, urgentCount } = formatAllDocsWhatsAppMessage(
    documents,
    lang,
    settings.leadDays,
    isTest
  );

  // Method 1: Webhook API (Zapier, Make, n8n, etc.)
  if (settings.sendMethod === 'webhook') {
    if (!settings.webhookUrl) {
      return {
        success: false,
        message: lang === 'ar' ? 'يرجى إدخال رابط Webhook للواتساب.' : 'Inserisci l\'URL del Webhook.',
      };
    }

    try {
      const res = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhoneNumber(settings.recipientPhone),
          message,
          urgentCount,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Webhook error status ${res.status}`);
      }

      saveWhatsAppSettings({
        ...settings,
        lastNotifiedDate: new Date().toISOString().slice(0, 10),
      });

      return {
        success: true,
        message:
          lang === 'ar'
            ? 'تم إرسال تنبيه الواتساب عبر Webhook بنجاح!'
            : 'Notifica WhatsApp inviata con successo tramite Webhook!',
      };
    } catch (err: any) {
      return {
        success: false,
        message:
          lang === 'ar'
            ? `فشل إرسال Webhook: ${err.message}`
            : `Errore Webhook: ${err.message}`,
      };
    }
  }

  // Method 2: Green API (Popular direct WhatsApp gateway)
  if (settings.sendMethod === 'greenapi') {
    if (!settings.apiInstanceId || !settings.apiToken) {
      return {
        success: false,
        message:
          lang === 'ar'
            ? 'يرجى إدخال Instance ID و API Token لـ Green API.'
            : 'Compila tutti i parametri richiesti per Green API.',
      };
    }

    try {
      const phonesToSend = settings.recipientPhones && settings.recipientPhones.length > 0
        ? settings.recipientPhones
        : [settings.recipientPhone || '393331785636'];

      // Green API uses the first 4 digits of idInstance as the api subdomain (e.g. 7107 -> https://7107.api.greenapi.com)
      const subDomain = settings.apiInstanceId.slice(0, 4) || '7107';
      const url = `https://${subDomain}.api.greenapi.com/waInstance${settings.apiInstanceId}/sendMessage/${settings.apiToken}`;

      let sentCount = 0;
      for (const phone of phonesToSend) {
        const cleanPhone = cleanPhoneNumber(phone);
        if (!cleanPhone) continue;
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: `${cleanPhone}@c.us`,
              message,
            }),
          });
          if (res.ok) sentCount++;
        } catch (e) {
          console.warn(`Failed sending WhatsApp to ${cleanPhone}:`, e);
        }
      }

      saveWhatsAppSettings({
        ...settings,
        lastNotifiedDate: new Date().toISOString().slice(0, 10),
      });

      return {
        success: true,
        message:
          lang === 'ar'
            ? `تم إرسال رسائل الواتساب آلياً عبر Green API بنجاح إلى (${sentCount || 1}) أرقام!`
            : `Inviati messaggi WhatsApp via Green API a (${sentCount || 1}) numeri!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message:
          lang === 'ar'
            ? `فشل إرسال Green API: ${err.message}`
            : `Errore Green API: ${err.message}`,
      };
    }
  }

  // Method 3: Direct wa.me Deep-Link (Default, free & zero config)
  const waUrl = generateWhatsAppUrl(settings.recipientPhone, message);
  window.open(waUrl, '_blank');

  saveWhatsAppSettings({
    ...settings,
    lastNotifiedDate: new Date().toISOString().slice(0, 10),
  });

  return {
    success: true,
    message:
      lang === 'ar'
        ? 'تم فتح تطبيق واتساب بتقرير التنبيه الجاهز للإرسال!'
        : 'Aperto WhatsApp con il report pronto da inviare!',
  };
}

/**
 * One-click helper to send a WhatsApp reminder for an individual document
 */
export function sendSingleDocWhatsApp(
  doc: DocumentItem,
  phone = '',
  lang: Language = 'ar'
): void {
  const msg = formatSingleDocWhatsAppMessage(doc, lang);
  const url = generateWhatsAppUrl(phone, msg);
  window.open(url, '_blank');
}
