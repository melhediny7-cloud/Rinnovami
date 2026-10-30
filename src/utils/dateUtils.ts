import { DocumentItem, DocumentStatus } from '../types';

export function getTodayOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates days remaining using UTC midnight timestamps to eliminate DST (Daylight Saving Time) 1-hour shifts
 */
export function getDaysRemaining(expiryDateStr: string): number {
  if (!expiryDateStr) return 0;

  const today = new Date();
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, month, day] = expiryDateStr.split('-').map(Number);
  if (!year || !month || !day) return 0;

  const utcExpiry = Date.UTC(year, month - 1, day);
  return Math.round((utcExpiry - utcToday) / (1000 * 60 * 60 * 24));
}

/**
 * Compute document status dynamically ensuring all states (critical, expiring soon, valid)
 * are properly accessible even when reminder days is 15.
 */
export function computeDocumentStatus(expiryDateStr: string, reminderDays: number = 60): DocumentStatus {
  const days = getDaysRemaining(expiryDateStr);
  if (days < 0) return 'expired';

  // Critical threshold: if user set reminder to 15 days, critical is <= 5 days; otherwise <= 15 days
  const criticalThreshold = reminderDays <= 15 ? Math.max(1, Math.floor(reminderDays / 3)) : 15;

  if (days <= criticalThreshold) return 'critical';
  if (days <= reminderDays) return 'expiring_soon';
  return 'valid';
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

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY
  const euMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/);
  if (euMatch) {
    return `${euMatch[3]}-${String(euMatch[2]).padStart(2, '0')}-${String(euMatch[1]).padStart(2, '0')}`;
  }

  return null;
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
 * Generate RFC 5545 compliant .ics calendar content:
 * - DTEND is set to the NEXT DAY for all-day events (standard RFC requirement)
 * - Escapes special characters
 * - Uses Rinnovami PRODID
 */
export function generateICSContent(docs: DocumentItem[]): string {
  const events: string[] = [];

  docs.forEach((doc) => {
    if (!doc.expiryDate) return;
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
      // Alarms for 30 days before, 7 days before, 1 day before
      'BEGIN:VALARM',
      'TRIGGER:-P30D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Promemoria: ${doc.title} scade tra 30 giorni!`)}`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Urgente: ${doc.title} scade tra 7 giorni!`)}`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Critico: ${doc.title} scade domani!`)}`,
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
