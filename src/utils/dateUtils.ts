import { DocumentCategory, DocumentItem, DocumentStatus } from '../types';

export function getTodayOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates days remaining using UTC midnight timestamps to eliminate DST shifts.
 * Returns 999999 for permanent / no-expiry documents so they sort naturally at the end.
 */
export function getDaysRemaining(expiryDateStr?: string): number {
  if (!expiryDateStr) return 999999;

  const today = new Date();
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, month, day] = expiryDateStr.split('-').map(Number);
  if (!year || !month || !day) return 999999;

  const utcExpiry = Date.UTC(year, month - 1, day);
  return Math.round((utcExpiry - utcToday) / (1000 * 60 * 60 * 24));
}

/**
 * Compute document status dynamically based on custom reminder threshold and document flags:
 * - review: Document requires manual verification (needsReview)
 * - permanent: Permanent document without expiry (hasNoExpiry or empty expiry date)
 * - expired: Expired (< 0 days)
 * - critical: Expiring within urgent critical threshold (<= 15-30 days depending on lead time)
 * - expiring_soon: Expiring within custom reminder lead days (<= reminderDays)
 * - valid: Valid (> reminderDays)
 */
export function computeDocumentStatus(
  expiryDateStr?: string,
  reminderDays: number = 90,
  hasNoExpiry: boolean = false,
  needsReview: boolean = false
): DocumentStatus {
  if (needsReview) {
    return 'review';
  }
  if (hasNoExpiry || !expiryDateStr) {
    return 'permanent';
  }
  const days = getDaysRemaining(expiryDateStr);
  if (days < 0) return 'expired';

  // Dynamic critical threshold:
  // For long lead times (>= 60 days): critical is <= 30 days
  // For medium lead times (16-59 days): critical is <= 15 days
  // For short lead times (<= 15 days, e.g. DURC 10 days): critical is <= half period (max 5 days)
  const criticalThreshold =
    reminderDays >= 60 ? 30 : reminderDays > 15 ? 15 : Math.max(3, Math.floor(reminderDays / 2));

  if (days <= criticalThreshold) return 'critical';
  if (days <= reminderDays) return 'expiring_soon';
  return 'valid';
}

/**
 * Intelligent default reminder days per Italian document category and title hints:
 * - DURC: 10 days
 * - Visita Medica: 20 days
 * - Corsi Sicurezza / Formazione: 30 days (1 month)
 * - Contratto di Lavoro: 60 days (2 months)
 * - Permesso di Soggiorno: 60 days
 * - Carta d'Identità CIE: 90 days
 * - Assicurazione: 30 days
 * - Patente / Tessera Sanitaria: 60 days
 */
export function getDefaultReminderDays(cat?: DocumentCategory, title?: string): number {
  const t = (title || '').toLowerCase();
  if (cat === 'durc' || t.includes('durc')) return 10;
  if (cat === 'visita_medica' || t.includes('visita') || t.includes('idoneita') || t.includes('medica')) return 20;
  if (cat === 'corso_sicurezza' || t.includes('corso') || t.includes('sicurezza') || t.includes('formazione') || t.includes('attestato')) return 30;
  if (cat === 'contratto_lavoro' || t.includes('contratto')) return 60;
  if (cat === 'permesso_soggiorno') return 60;
  if (cat === 'carta_identita') return 90;
  if (cat === 'assicurazione') return 30;
  if (cat === 'patente') return 60;
  if (cat === 'tessera_sanitaria') return 60;
  return 30;
}

export function formatDateLocale(dateStr?: string, lang: 'ar' | 'it' = 'it'): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;

  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'it-IT', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export function formatRelativeDays(days: number, lang: 'ar' | 'it'): string {
  if (days >= 999900) {
    return lang === 'ar' ? 'صلاحية دائمة' : 'Senza scadenza';
  }
  if (days === 0) {
    return lang === 'ar' ? 'ينتهي اليوم!' : 'Scade oggi!';
  }
  if (days < 0) {
    const abs = Math.abs(days);
    return lang === 'ar' ? `منتهية منذ ${abs} يوم` : `Scaduto da ${abs} giorni`;
  }
  return lang === 'ar' ? `متبقي ${days} يوم` : `Mancano ${days} giorni`;
}

/**
 * Intelligent date extractor from text / filename:
 * Looks for patterns like 2026-12-31, 31/12/2026, 31-12-2026, 31.12.2026
 */
export function extractPotentialDate(text: string): string | null {
  if (!text) return null;

  // Pattern 1: YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const euMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/);
  if (euMatch) {
    return `${euMatch[3]}-${String(euMatch[2]).padStart(2, '0')}-${String(euMatch[1]).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Normalize any date string into standard ISO YYYY-MM-DD
 */
export function normalizeDate(dateStr: string): string | null {
  return extractPotentialDate(dateStr);
}

/**
 * Escapes characters for iCalendar RFC 5545 compliance (\, ;, ,)
 */
function escapeICS(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generate RFC 5545 compliant .ics calendar content with 6 explicit VALARM triggers:
 * - 120 days before (-P120D)
 * - 60 days before (-P60D)
 * - 30 days before (-P30D)
 * - 15 days before (-P15D)
 * - 7 days before (-P7D)
 * - 1 day before (-P1D)
 */
export function generateICSContent(docs: DocumentItem[]): string {
  const events: string[] = [];

  docs.forEach((doc) => {
    if (doc.hasNoExpiry || !doc.expiryDate) return;
    const [y, m, d] = doc.expiryDate.split('-').map(Number);
    if (!y || !m || !d) return;

    const startStr = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;

    // RFC 5545: DTEND for all-day events MUST be the following day (start + 1 day)
    const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
    const nextY = nextDay.getUTCFullYear();
    const nextM = String(nextDay.getUTCMonth() + 1).padStart(2, '0');
    const nextD = String(nextDay.getUTCDate()).padStart(2, '0');
    const endStr = `${nextY}${nextM}${nextD}`;

    const uid = `${doc.id}@rinnovami.app`;
    const summary = escapeICS(`⚠️ Scadenza / انتهاء: ${doc.title} (${doc.holderName || 'Doc'})`);
    const description = escapeICS(
      `Promemoria scadenza documento.\nNumero: ${doc.documentNumber || 'N/A'}\nEnte: ${doc.issuingAuthority || 'N/A'}\nNote: ${doc.notes || ''}`
    );

    const event = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${startStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      // 120 days before
      'BEGIN:VALARM',
      'TRIGGER:-P120D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Promemoria anticipato (120 gg): ${doc.title} scade tra 120 giorni!`)}`,
      'END:VALARM',
      // 60 days before
      'BEGIN:VALARM',
      'TRIGGER:-P60D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Promemoria (60 gg): ${doc.title} scade tra 60 giorni!`)}`,
      'END:VALARM',
      // 30 days before
      'BEGIN:VALARM',
      'TRIGGER:-P30D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Promemoria importante (30 gg): ${doc.title} scade tra 30 giorni!`)}`,
      'END:VALARM',
      // 15 days before
      'BEGIN:VALARM',
      'TRIGGER:-P15D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Attenzione (15 gg): ${doc.title} scade tra 15 giorni!`)}`,
      'END:VALARM',
      // 7 days before
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Urgente (7 gg): ${doc.title} scade tra 7 giorni!`)}`,
      'END:VALARM',
      // 1 day before
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Critico (domani): ${doc.title} scade domani!`)}`,
      'END:VALARM',
      'END:VEVENT'
    ].join('\r\n');

    events.push(event);
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rinnovami//Document Expiry Calendar//IT_AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Rinnovami Reminders',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Generate 1-click Google Calendar Event URL with document reminder details
 */
export function generateGoogleCalendarUrl(doc: DocumentItem): string {
  if (doc.hasNoExpiry || !doc.expiryDate) return '';
  const [y, m, d] = doc.expiryDate.split('-').map(Number);
  const dateStr = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;

  const title = encodeURIComponent(`⚠️ Rinnovami: Scadenza ${doc.title}`);
  const details = encodeURIComponent(
    `Promemoria Scadenza Documento Ufficiale.\nIntestatario: ${doc.holderName || 'N/A'}\nNumero: ${doc.documentNumber || 'N/A'}\nEnte: ${doc.issuingAuthority || 'N/A'}\nNote: ${doc.notes || ''}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}&sf=true&output=xml`;
}
