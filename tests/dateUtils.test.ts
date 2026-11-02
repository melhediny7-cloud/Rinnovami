import { describe, it, expect } from 'vitest';
import {
  getTodayOffset,
  getDaysRemaining,
  computeDocumentStatus,
  formatDateLocale,
  formatRelativeDays,
  extractPotentialDate,
  normalizeDate,
  generateICSContent,
  generateGoogleCalendarUrl
} from '../src/utils/dateUtils';
import { DocumentItem } from '../src/types';

describe('dateUtils - Scadenza & Data Intelligence', () => {
  it('correctly calculates offset dates in YYYY-MM-DD format', () => {
    const offset0 = getTodayOffset(0);
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(offset0).toBe(expected);
  });

  it('calculates days remaining without Daylight Saving Time drift', () => {
    const targetDate = getTodayOffset(45);
    const remaining = getDaysRemaining(targetDate);
    expect(remaining).toBe(45);
  });

  it('returns 999999 for empty or undefined expiry dates (permanent documents)', () => {
    expect(getDaysRemaining('')).toBe(999999);
    expect(getDaysRemaining(undefined)).toBe(999999);
  });

  it('correctly categorizes document status according to the Italian lead times', () => {
    // Valid: > 90 days
    expect(computeDocumentStatus(getTodayOffset(100))).toBe('valid');

    // Expiring soon: 31 to 90 days
    expect(computeDocumentStatus(getTodayOffset(75))).toBe('expiring_soon');
    expect(computeDocumentStatus(getTodayOffset(90))).toBe('expiring_soon');

    // Critical: 0 to 30 days
    expect(computeDocumentStatus(getTodayOffset(20))).toBe('critical');
    expect(computeDocumentStatus(getTodayOffset(0))).toBe('critical');

    // Expired: < 0 days
    expect(computeDocumentStatus(getTodayOffset(-5))).toBe('expired');

    // Permanent: hasNoExpiry = true
    expect(computeDocumentStatus(getTodayOffset(10), 60, true)).toBe('permanent');
    expect(computeDocumentStatus('', 60, true)).toBe('permanent');
  });

  it('correctly uses dynamic custom reminderDaysBefore for specific documents like DURC, Visita Medica, etc.', () => {
    // DURC (10 days lead time): 75 days remaining must be VALID, not expiring soon!
    expect(computeDocumentStatus(getTodayOffset(75), 10)).toBe('valid');
    expect(computeDocumentStatus(getTodayOffset(15), 10)).toBe('valid');
    expect(computeDocumentStatus(getTodayOffset(9), 10)).toBe('expiring_soon');
    expect(computeDocumentStatus(getTodayOffset(4), 10)).toBe('critical');

    // Visita Medica (20 days lead time):
    expect(computeDocumentStatus(getTodayOffset(25), 20)).toBe('valid');
    expect(computeDocumentStatus(getTodayOffset(18), 20)).toBe('expiring_soon');
    expect(computeDocumentStatus(getTodayOffset(10), 20)).toBe('critical');

    // Review flag overrides normal status:
    expect(computeDocumentStatus(getTodayOffset(10), 60, false, true)).toBe('review');
  });

  it('formats dates in Italian and Arabic locales', () => {
    const testDate = '2026-10-31';
    const formattedIt = formatDateLocale(testDate, 'it');
    const formattedAr = formatDateLocale(testDate, 'ar');

    expect(formattedIt).toContain('2026');
    expect(formattedIt.toLowerCase()).toContain('ottobre');
    expect(formattedAr.includes('2026') || formattedAr.includes('٢٠٢٦')).toBe(true);
    expect(formattedAr).toContain('أكتوبر');
  });

  it('formats relative remaining days in Arabic and Italian', () => {
    expect(formatRelativeDays(0, 'it')).toBe('Scade oggi!');
    expect(formatRelativeDays(0, 'ar')).toBe('ينتهي اليوم!');
    expect(formatRelativeDays(15, 'it')).toBe('Mancano 15 giorni');
    expect(formatRelativeDays(15, 'ar')).toBe('متبقي 15 يوم');
    expect(formatRelativeDays(-3, 'it')).toBe('Scaduto da 3 giorni');
    expect(formatRelativeDays(-3, 'ar')).toBe('منتهية منذ 3 يوم');
    expect(formatRelativeDays(999999, 'it')).toBe('Senza scadenza');
    expect(formatRelativeDays(999999, 'ar')).toBe('صلاحية دائمة');
  });

  it('extracts and normalizes various date patterns from text', () => {
    expect(extractPotentialDate('Scadenza: 31/12/2027')).toBe('2027-12-31');
    expect(extractPotentialDate('Data: 15-08-2028')).toBe('2028-08-15');
    expect(extractPotentialDate('Valido fino al 2029-05-20')).toBe('2029-05-20');
    expect(normalizeDate('Scade il 01/01/2030')).toBe('2030-01-01');
    expect(normalizeDate('Nessuna data trovata')).toBeNull();
  });

  it('generates compliant iCalendar .ics with all 6 VALARM triggers (120, 60, 30, 15, 7, 1 days)', () => {
    const mockDoc: DocumentItem = {
      id: 'doc-test-123',
      title: 'Permesso di Soggiorno',
      category: 'permesso_soggiorno',
      status: 'valid',
      expiryDate: '2027-06-30',
      holderName: 'Mario Rossi',
      documentNumber: 'I01234567',
      issuingAuthority: 'Questura di Milano',
      reminderDaysBefore: 60,
      createdAt: '2026-10-31T00:00:00Z',
      updatedAt: '2026-10-31T00:00:00Z'
    };

    const ics = generateICSContent([mockDoc]);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Rinnovami//Document Expiry Calendar//IT_AR');
    expect(ics).toContain('SUMMARY:⚠️ Scadenza / انتهاء: Permesso di Soggiorno (Mario Rossi)');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270630');
    expect(ics).toContain('DTEND;VALUE=DATE:20270701'); // All day RFC requirement: start + 1

    // Verify all 6 VALARM triggers
    expect(ics).toContain('TRIGGER:-P120D');
    expect(ics).toContain('TRIGGER:-P60D');
    expect(ics).toContain('TRIGGER:-P30D');
    expect(ics).toContain('TRIGGER:-P15D');
    expect(ics).toContain('TRIGGER:-P7D');
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('skips permanent documents in ICS export without crashing', () => {
    const permanentDoc: DocumentItem = {
      id: 'doc-perm-1',
      title: 'Busta Paga Ottobre 2026',
      category: 'busta_paga',
      status: 'permanent',
      hasNoExpiry: true,
      createdAt: '2026-10-31T00:00:00Z',
      updatedAt: '2026-10-31T00:00:00Z'
    };

    const ics = generateICSContent([permanentDoc]);
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('generates valid Google Calendar URL', () => {
    const mockDoc: DocumentItem = {
      id: 'doc-test-url',
      title: 'Carta Identità',
      category: 'carta_identita',
      status: 'valid',
      expiryDate: '2028-11-15',
      holderName: 'Giuseppe Verdi',
      createdAt: '2026-10-31T00:00:00Z',
      updatedAt: '2026-10-31T00:00:00Z'
    };

    const url = generateGoogleCalendarUrl(mockDoc);
    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('dates=20281115/20281115');
    expect(url).toContain('Carta');
  });
});
