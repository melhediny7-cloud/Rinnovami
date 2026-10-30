export type DocumentCategory =
  | 'permesso_soggiorno'
  | 'carta_identita'
  | 'passaporto'
  | 'patente'
  | 'tessera_sanitaria'
  | 'assicurazione'
  | 'contratto_affitto'
  | 'contratto_lavoro'
  | 'visura_camerale'
  | 'certificato'
  | 'altro';

export type DocumentStatus = 'valid' | 'expiring_soon' | 'critical' | 'expired';

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  documentNumber: string;
  holderName: string;
  issueDate?: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  issuingAuthority?: string;
  notes?: string;
  reminderDaysBefore: number; // e.g., 90, 60, 30, 15
  fileData?: string; // Base64 data URL
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  isDemo?: boolean;
  needsReview?: boolean; // Flagged when document was auto-imported and needs date verification
  createdAt: string;
  updatedAt: string;
}

export type Language = 'ar' | 'it';

export interface RenewalTip {
  category: DocumentCategory;
  titleAr: string;
  titleIt: string;
  stepsAr: string[];
  stepsIt: string[];
  importantNoticeAr: string;
  importantNoticeIt: string;
  links?: { label: string; url: string }[];
}

export interface EmailAlertSettings {
  enabled: boolean;
  recipientEmail: string;
  leadDays: number[]; // e.g. [30, 15, 7, 1]
  autoNotifyOnOpen: boolean;
  sendMethod: 'mailto' | 'webhook' | 'emailjs';
  webhookUrl?: string;
  emailJsServiceId?: string;
  emailJsTemplateId?: string;
  emailJsPublicKey?: string;
  lastNotifiedDate?: string; // YYYY-MM-DD
}

export interface WhatsAppAlertSettings {
  enabled: boolean;
  recipientPhone: string; // primary phone e.g. +393331785636
  recipientPhones: string[]; // e.g. ['+393331785636', '+393802633225', '+393298993363']
  leadDays: number[]; // e.g. [30, 15, 7, 1]
  autoNotifyOnOpen: boolean;
  sendMethod: 'direct' | 'webhook' | 'greenapi' | 'ultramsg';
  webhookUrl?: string;
  apiInstanceId?: string;
  apiToken?: string;
  lastNotifiedDate?: string; // YYYY-MM-DD
}
