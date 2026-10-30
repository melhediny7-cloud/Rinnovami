import { DocumentItem, EmailAlertSettings, Language } from '../types';
import { getDaysRemaining, computeDocumentStatus } from './dateUtils';
import { translations } from '../translations';

const EMAIL_SETTINGS_STORAGE_KEY = 'rinnovami_email_alert_settings_v1';

export const DEFAULT_EMAIL_SETTINGS: EmailAlertSettings = {
  enabled: true,
  recipientEmail: 'Greenimpianti225@gmail.com',
  leadDays: [30, 15, 7, 1],
  autoNotifyOnOpen: true,
  sendMethod: 'mailto',
  webhookUrl: '',
  emailJsServiceId: '',
  emailJsTemplateId: '',
  emailJsPublicKey: '',
  lastNotifiedDate: undefined,
};

export function loadEmailSettings(): EmailAlertSettings {
  try {
    const raw = localStorage.getItem(EMAIL_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_EMAIL_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_EMAIL_SETTINGS,
      ...parsed,
      recipientEmail: parsed.recipientEmail || 'Greenimpianti225@gmail.com',
    };
  } catch {
    return DEFAULT_EMAIL_SETTINGS;
  }
}

export function saveEmailSettings(settings: EmailAlertSettings): void {
  try {
    localStorage.setItem(EMAIL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save email settings:', err);
  }
}

/**
 * Filter documents that require an alert based on configured lead days
 */
export function getExpiringDocumentsForAlert(
  documents: DocumentItem[],
  leadDays: number[] = [30, 15, 7, 1]
): {
  expired: DocumentItem[];
  critical: DocumentItem[];
  expiringSoon: DocumentItem[];
  allUrgent: DocumentItem[];
} {
  const maxDays = Math.max(...leadDays, 30);
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

  const allUrgent = [...expired, ...critical, ...expiringSoon];
  return { expired, critical, expiringSoon, allUrgent };
}

export interface FormattedReport {
  subject: string;
  plainText: string;
  htmlText: string;
  urgentCount: number;
}

/**
 * Format a rich bilingual email report of urgent and expiring documents
 */
export function formatEmailReport(
  documents: DocumentItem[],
  lang: Language = 'ar',
  recipientEmail = '',
  isTest = false
): FormattedReport {
  const t = translations[lang];
  const { expired, critical, expiringSoon, allUrgent } = getExpiringDocumentsForAlert(documents);

  const nowStr = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isTest) {
    const subject =
      lang === 'ar'
        ? `[Rinnovami] رسالة تجريبية: تنبيهات انتهاء صلاحية الوثائق الإيطالية`
        : `[Rinnovami] Email di Prova: Sistema Notifiche Scadenze Documenti`;

    const plainText =
      lang === 'ar'
        ? `مرحباً!\n\nهذه رسالة تجريبية من برنامج Rinnovami (رينوفامي).\nإعدادات التنبيهات البريدية الخاصة بك تعمل بنجاح إلى البريد: ${recipientEmail}\nالتاريخ: ${nowStr}\n\nإجمالي الوثائق المسجلة: ${documents.length}`
        : `Ciao!\n\nQuesta è un'email di prova dall'applicazione Rinnovami.\nLe tue notifiche via email sono configurate correttamente per: ${recipientEmail}\nData: ${nowStr}\n\nDocumenti monitorati: ${documents.length}`;

    const htmlText = `<div dir="${lang === 'ar' ? 'rtl' : 'ltr'}" style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #0284c7;">Rinnovami | رينوفامي</h2>
      <p style="font-size: 16px;">${plainText.replace(/\n/g, '<br/>')}</p>
    </div>`;

    return { subject, plainText, htmlText, urgentCount: 0 };
  }

  const urgentCount = allUrgent.length;
  const subject =
    lang === 'ar'
      ? `🚨 [تنبيه Rinnovami] لديك ${urgentCount} وثائق تحتاج إلى التجديد أو التدخل العاجل`
      : `🚨 [Avviso Rinnovami] Hai ${urgentCount} documenti in scadenza o scaduti`;

  // Build Plain Text
  let plain = lang === 'ar' ? `تقرير صلاحية الوثائق - Rinnovami\n` : `Report Scadenze Documenti - Rinnovami\n`;
  plain += `${nowStr}\n`;
  plain += `==============================================\n\n`;

  if (expired.length > 0) {
    plain += lang === 'ar' ? `⚠️ وثائق منتهية الصلاحية (${expired.length}):\n` : `⚠️ Documenti Scaduti (${expired.length}):\n`;
    expired.forEach((d) => {
      const days = Math.abs(getDaysRemaining(d.expiryDate));
      plain += `- ${d.title} [${d.documentNumber || 'بدون رقم'}] | ${d.expiryDate} (منتهية منذ ${days} يوم) | صاحب الوثيقة: ${d.holderName || '-'}\n`;
    });
    plain += `\n`;
  }

  if (critical.length > 0) {
    plain += lang === 'ar' ? `🔴 وثائق حرجة - تنتهي خلال أقل من 15 يوماً (${critical.length}):\n` : `🔴 Scadenza Imminente - meno di 15 giorni (${critical.length}):\n`;
    critical.forEach((d) => {
      const days = getDaysRemaining(d.expiryDate);
      plain += `- ${d.title} [${d.documentNumber || 'بدون رقم'}] | تاريخ الانتهاء: ${d.expiryDate} (متبقي ${days} يوم) | الجهة: ${d.issuingAuthority || '-'}\n`;
    });
    plain += `\n`;
  }

  if (expiringSoon.length > 0) {
    plain += lang === 'ar' ? `🟡 وثائق تقترب من الانتهاء (${expiringSoon.length}):\n` : `🟡 In Scadenza nei prossimi 30 giorni (${expiringSoon.length}):\n`;
    expiringSoon.forEach((d) => {
      const days = getDaysRemaining(d.expiryDate);
      plain += `- ${d.title} | تاريخ الانتهاء: ${d.expiryDate} (متبقي ${days} يوم)\n`;
    });
    plain += `\n`;
  }

  plain += `----------------------------------------------\n`;
  plain += lang === 'ar'
    ? `نصيحة: للوثائق الإيطالية الرسمية مثل Permesso di Soggiorno أو Carta d'Identità يُنصح بحجز الموعد أو تجهيز Kit قبل 60-90 يوماً من الانتهاء.\n\nتم الإنشاء بواسطة Rinnovami - رينوفامي`
    : `Consiglio: per documenti come Permesso di Soggiorno o CIE prenota l'appuntamento con 60-90 giorni di anticipo.\n\nGenerato da Rinnovami.`;

  // Build HTML representation
  const htmlRows = allUrgent
    .map((doc) => {
      const days = getDaysRemaining(doc.expiryDate);
      const isExp = days < 0;
      const isCrit = days >= 0 && days <= 15;
      const badgeBg = isExp ? '#ffe4e6' : isCrit ? '#fef3c7' : '#e0f2fe';
      const badgeColor = isExp ? '#be123c' : isCrit ? '#b45309' : '#0369a1';
      const badgeText = isExp
        ? lang === 'ar'
          ? `منتهية منذ ${Math.abs(days)} يوم`
          : `Scaduto da ${Math.abs(days)} gg`
        : lang === 'ar'
        ? `متبقي ${days} يوم`
        : `Mancano ${days} gg`;

      return `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${doc.title}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${doc.documentNumber || '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${doc.expiryDate}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
          <span style="background-color: ${badgeBg}; color: ${badgeColor}; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">
            ${badgeText}
          </span>
        </td>
      </tr>`;
    })
    .join('');

  const htmlText = `
  <div dir="${lang === 'ar' ? 'rtl' : 'ltr'}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="background: linear-gradient(135deg, #0284c7, #4f46e5); padding: 24px; color: white;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Rinnovami | رينوفامي</h1>
        <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">${t.appSubTitle}</p>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 15px; color: #334155;">
          ${
            lang === 'ar'
              ? `مرحباً، إليك التقرير التنبيهي الدوري لوثائقك الإيطالية المسجلة في Rinnovami:`
              : `Ciao, ecco il promemoria di riepilogo per i tuoi documenti italiani:`
          }
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #475569; text-align: ${lang === 'ar' ? 'right' : 'left'};">
              <th style="padding: 10px;">${lang === 'ar' ? 'الوثيقة' : 'Documento'}</th>
              <th style="padding: 10px;">${lang === 'ar' ? 'الرقم' : 'Numero'}</th>
              <th style="padding: 10px;">${lang === 'ar' ? 'الانتهاء' : 'Scadenza'}</th>
              <th style="padding: 10px;">${lang === 'ar' ? 'الحالة' : 'Stato'}</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
        </table>
        <div style="margin-top: 24px; padding: 14px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534; font-size: 13px;">
          💡 <strong>${lang === 'ar' ? 'تذكير هام:' : 'Promemoria:'}</strong>
          ${
            lang === 'ar'
              ? 'تأكد من حجز المواعيد مبكراً وتجديد رخص القيادة وتصاريح الإقامة لتفادي أي غرامات أو تعطيل قانوني.'
              : 'Assicurati di avviare le pratiche di rinnovo per tempo per evitare sanzioni.'
          }
        </div>
      </div>
    </div>
  </div>`;

  return { subject, plainText: plain, htmlText, urgentCount };
}

/**
 * Dispatch email through user's chosen method
 */
export async function dispatchEmailAlert(
  settings: EmailAlertSettings,
  documents: DocumentItem[],
  lang: Language = 'ar',
  isTest = false
): Promise<{ success: boolean; message: string }> {
  if (!settings.recipientEmail && settings.sendMethod !== 'webhook') {
    return {
      success: false,
      message: lang === 'ar' ? 'يرجى إدخال عنوان البريد الإلكتروني أولاً.' : 'Inserisci prima un indirizzo email.',
    };
  }

  const report = formatEmailReport(documents, lang, settings.recipientEmail, isTest);

  // If there are no urgent documents and this is not a test, inform user
  if (report.urgentCount === 0 && !isTest) {
    return {
      success: true,
      message:
        lang === 'ar'
          ? 'رائع! لا توجد أي وثائق منتهية أو قاربت على الانتهاء حالياً.'
          : 'Ottimo! Nessun documento in scadenza o scaduto al momento.',
    };
  }

  // Method 1: Webhook API (Zapier, Make, n8n, Resend, or custom backend)
  if (settings.sendMethod === 'webhook') {
    if (!settings.webhookUrl) {
      return {
        success: false,
        message: lang === 'ar' ? 'يرجى إدخال رابط الـ Webhook.' : 'Inserisci l\'URL del Webhook.',
      };
    }

    try {
      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: settings.recipientEmail,
          subject: report.subject,
          text: report.plainText,
          html: report.htmlText,
          urgentCount: report.urgentCount,
          documents: documents.map((d) => ({
            id: d.id,
            title: d.title,
            expiryDate: d.expiryDate,
            daysRemaining: getDaysRemaining(d.expiryDate),
            holderName: d.holderName,
            documentNumber: d.documentNumber,
          })),
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
      }

      // Mark notified
      saveEmailSettings({
        ...settings,
        lastNotifiedDate: new Date().toISOString().slice(0, 10),
      });

      return {
        success: true,
        message:
          lang === 'ar'
            ? 'تم إرسال التنبيه عبر الـ Webhook بنجاح!'
            : 'Avviso inviato con successo tramite Webhook!',
      };
    } catch (err: any) {
      return {
        success: false,
        message:
          lang === 'ar'
            ? `فشل إرسال الـ Webhook: ${err.message}`
            : `Errore invio Webhook: ${err.message}`,
      };
    }
  }

  // Method 2: EmailJS direct client-side integration
  if (settings.sendMethod === 'emailjs') {
    if (!settings.emailJsServiceId || !settings.emailJsTemplateId || !settings.emailJsPublicKey) {
      return {
        success: false,
        message:
          lang === 'ar'
            ? 'يرجى ملء بيانات EmailJS (Service ID, Template ID, Public Key).'
            : 'Compila tutti i parametri EmailJS richiesti.',
      };
    }

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: settings.emailJsServiceId,
          template_id: settings.emailJsTemplateId,
          user_id: settings.emailJsPublicKey,
          template_params: {
            to_email: settings.recipientEmail,
            subject: report.subject,
            message: report.plainText,
            html_message: report.htmlText,
            urgent_count: report.urgentCount,
            date: new Date().toLocaleDateString(),
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Status ${response.status}`);
      }

      saveEmailSettings({
        ...settings,
        lastNotifiedDate: new Date().toISOString().slice(0, 10),
      });

      return {
        success: true,
        message:
          lang === 'ar'
            ? 'تم إرسال البريد الإلكتروني عبر EmailJS بنجاح!'
            : 'Email inviata con successo tramite EmailJS!',
      };
    } catch (err: any) {
      return {
        success: false,
        message:
          lang === 'ar'
            ? `فشل إرسال EmailJS: ${err.message}`
            : `Errore invio EmailJS: ${err.message}`,
      };
    }
  }

  // Method 3: Standard mailto link
  const mailtoUrl = `mailto:${encodeURIComponent(settings.recipientEmail)}?subject=${encodeURIComponent(
    report.subject
  )}&body=${encodeURIComponent(report.plainText)}`;

  window.open(mailtoUrl, '_blank');

  saveEmailSettings({
    ...settings,
    lastNotifiedDate: new Date().toISOString().slice(0, 10),
  });

  return {
    success: true,
    message:
      lang === 'ar'
        ? 'تم فتح تطبيق البريد الخاص بك بمسودة التقرير الجاهزة للإرسال!'
        : 'Aperto il client email con la bozza pronta da inviare!',
  };
}
