import { ActivityLogItem, Language } from '../types';

const AUDIT_LOG_STORAGE_KEY = 'rinnovami_audit_logs_v1';
const MAX_LOG_ENTRIES = 500;

/**
 * Get device/user signature for audit logging
 */
function getDeviceSignature(): string {
  try {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile ? 'Smartphone (App Mobile)' : 'PC / Laptop (Browser)';
  } catch {
    return 'Utente Locale';
  }
}

/**
 * Load all activity log entries
 */
export function loadAuditLogs(): ActivityLogItem[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (!raw) return [];
    const list: ActivityLogItem[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Error loading audit logs:', err);
    return [];
  }
}

/**
 * Save activity log entries
 */
function saveAuditLogs(logs: ActivityLogItem[]): void {
  try {
    const trimmed = logs.slice(0, MAX_LOG_ENTRIES);
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Could not save audit logs:', err);
  }
}

/**
 * Log a new activity event
 */
export function logActivity(
  action: ActivityLogItem['action'],
  documentTitle: string,
  details?: string,
  documentId?: string
): ActivityLogItem {
  const newEntry: ActivityLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    action,
    documentTitle,
    documentId,
    timestamp: new Date().toISOString(),
    details,
    user: getDeviceSignature(),
  };

  const currentLogs = loadAuditLogs();
  currentLogs.unshift(newEntry); // Latest first
  saveAuditLogs(currentLogs);

  return newEntry;
}

/**
 * Clear all audit logs
 */
export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOG_STORAGE_KEY);
}

/**
 * Export audit logs as CSV file
 */
export function exportAuditLogsCSV(logs: ActivityLogItem[], lang: Language = 'it'): void {
  const headers = lang === 'ar'
    ? ['المعرف', 'نوع العملية', 'اسم المستند', 'التاريخ والوقت', 'التفاصيل', 'الجهاز/المستخدم']
    : ['ID', 'Azione', 'Titolo Documento', 'Data e Ora', 'Dettagli', 'Dispositivo/Utente'];

  const rows = logs.map((log) => [
    log.id,
    log.action,
    `"${(log.documentTitle || '').replace(/"/g, '""')}"`,
    new Date(log.timestamp).toLocaleString(lang === 'ar' ? 'ar-EG' : 'it-IT'),
    `"${(log.details || '').replace(/"/g, '""')}"`,
    `"${(log.user || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rinnovami-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
