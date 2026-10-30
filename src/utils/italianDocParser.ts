import { DocumentCategory } from '../types';

export interface ParsedDocumentData {
  title?: string;
  category?: DocumentCategory;
  documentNumber?: string;
  holderName?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  notes?: string;
  confidenceScore: number;
  extractedFields: string[];
  rawText: string;
  isExpiryEstimated?: boolean;
}

const ITALIAN_AND_ENG_MONTHS: Record<string, string> = {
  // Italian
  gennaio: '01', gen: '01',
  febbraio: '02', feb: '02',
  marzo: '03', mar: '03',
  aprile: '04', apr: '04',
  maggio: '05', mag: '05',
  giugno: '06', giu: '06',
  luglio: '07', lug: '07',
  agosto: '08', ago: '08',
  settembre: '09', set: '09',
  ottobre: '10', ott: '10',
  novembre: '11', nov: '11',
  dicembre: '12', dic: '12',
  // English
  january: '01', jan: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06', jun: '06',
  july: '07', jul: '07',
  august: '08',
  september: '09', sep: '09',
  october: '10', oct: '10',
  november: '11',
  december: '12', dec: '12',
};

/**
 * Normalizes text and formats dates to YYYY-MM-DD
 * Supports:
 * - DD/MM/YYYY and MM/DD/YYYY (e.g. 01/16/2027 or 16/01/2027)
 * - YYYY-MM-DD (ISO)
 * - 2-digit years (e.g. 16/01/27 or 01/16/27)
 * - Textual Italian & English months (e.g. "16 Gennaio 2027", "January 16, 2027")
 * Handles comma, dot, slash, dash separators.
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // Pattern 1: ISO YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  const isoMatch = clean.match(/\b(19\d{2}|20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(isoMatch[2]).padStart(2, '0');
    const d = String(isoMatch[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Pattern 2: Two numbers + Year (DD/MM/YYYY or MM/DD/YYYY)
  const numMatch = clean.match(/\b(\d{1,2})[-/. ,](\d{1,2})[-/. ,](19\d{2}|20\d{2}|\d{2})\b/);
  if (numMatch) {
    const n1 = parseInt(numMatch[1], 10);
    const n2 = parseInt(numMatch[2], 10);
    let rawYear = numMatch[3];
    let year = rawYear;
    if (rawYear.length === 2) {
      const yrNum = parseInt(rawYear, 10);
      year = yrNum > 70 ? `19${rawYear}` : `20${rawYear}`;
    }

    let day = 0;
    let month = 0;

    if (n1 > 12 && n2 <= 12) {
      // Case A: n1 is Day (>12), n2 is Month (<=12) -> DD/MM/YYYY
      day = n1;
      month = n2;
    } else if (n1 <= 12 && n2 > 12) {
      // Case B: n1 is Month (<=12), n2 is Day (>12) -> MM/DD/YYYY (e.g. 01/16/2027)
      month = n1;
      day = n2;
    } else if (n1 <= 12 && n2 <= 12 && n1 >= 1 && n2 >= 1) {
      // Case C: Both <= 12 (ambiguous). Default to European / Italian standard (DD/MM/YYYY)
      day = n1;
      month = n2;
    } else {
      return null;
    }

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Pattern 3: Textual months (e.g. "16 Ottobre 2026", "16 OTT 2026", "January 16, 2027")
  const textMatch = clean.match(/\b(0?[1-9]|[12]\d|3[01])\s+([A-Za-z]{3,9})\s+(19\d{2}|20\d{2}|\d{2})\b/i);
  if (textMatch) {
    const day = String(textMatch[1]).padStart(2, '0');
    const monthWord = textMatch[2].toLowerCase();
    let year = textMatch[3];
    if (year.length === 2) {
      const yrNum = parseInt(year, 10);
      year = yrNum > 70 ? `19${year}` : `20${year}`;
    }
    const month = ITALIAN_AND_ENG_MONTHS[monthWord];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // Pattern 4: Month Name Day, Year (e.g. "Jan 16, 2027")
  const usTextMatch = clean.match(/\b([A-Za-z]{3,9})\s+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?,?\s+(19\d{2}|20\d{2}|\d{2})\b/i);
  if (usTextMatch) {
    const monthWord = usTextMatch[1].toLowerCase();
    const day = String(usTextMatch[2]).padStart(2, '0');
    let year = usTextMatch[3];
    if (year.length === 2) {
      const yrNum = parseInt(year, 10);
      year = yrNum > 70 ? `19${year}` : `20${year}`;
    }
    const month = ITALIAN_AND_ENG_MONTHS[monthWord];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Check if a date string is a birth date based on preceding context
 */
function isPrecededByBirthContext(fullText: string, dateIndex: number): boolean {
  const windowStart = Math.max(0, dateIndex - 45);
  const preceding = fullText.slice(windowStart, dateIndex).toLowerCase();
  return /\b(nato|nata|nascita|data di nascita|nato il|nata il|nato a|nata a)\b/.test(preceding);
}

/**
 * Searches for all dates in a string, filtering out birth dates
 */
export function findAllCandidateDates(text: string): { raw: string; normalized: string; isFuture: boolean }[] {
  const dates: { raw: string; normalized: string; isFuture: boolean }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Regex for numeric dates (supports DD/MM/YYYY and MM/DD/YYYY, with 4-digit or 2-digit years)
  const regexNum = /\b(\d{1,2})[-/. ,](\d{1,2})[-/. ,](19\d{2}|20\d{2}|\d{2})\b/g;
  let match: RegExpExecArray | null;

  while ((match = regexNum.exec(text)) !== null) {
    if (isPrecededByBirthContext(text, match.index)) {
      continue; // Skip birth date
    }

    const norm = normalizeDate(match[0]);
    if (norm) {
      const [y, m, d] = norm.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      dates.push({
        raw: match[0],
        normalized: norm,
        isFuture: dateObj >= today,
      });
    }
  }

  // Regex for ISO dates
  const regexIso = /\b(19\d{2}|20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g;
  while ((match = regexIso.exec(text)) !== null) {
    if (isPrecededByBirthContext(text, match.index)) {
      continue;
    }
    const norm = normalizeDate(match[0]);
    if (norm) {
      const [y, m, d] = norm.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      dates.push({
        raw: match[0],
        normalized: norm,
        isFuture: dateObj >= today,
      });
    }
  }

  // Regex for textual dates (Day Month Year)
  const regexText = /\b(0?[1-9]|[12]\d|3[01])\s+([A-Za-z]{3,9})\s+(19\d{2}|20\d{2}|\d{2})\b/gi;
  while ((match = regexText.exec(text)) !== null) {
    if (isPrecededByBirthContext(text, match.index)) {
      continue;
    }

    const norm = normalizeDate(match[0]);
    if (norm) {
      const [y, m, d] = norm.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      dates.push({
        raw: match[0],
        normalized: norm,
        isFuture: dateObj >= today,
      });
    }
  }

  // Regex for US textual dates (Month Day, Year)
  const regexUsText = /\b([A-Za-z]{3,9})\s+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?,?\s+(19\d{2}|20\d{2}|\d{2})\b/gi;
  while ((match = regexUsText.exec(text)) !== null) {
    if (isPrecededByBirthContext(text, match.index)) {
      continue;
    }

    const norm = normalizeDate(match[0]);
    if (norm) {
      const [y, m, d] = norm.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      dates.push({
        raw: match[0],
        normalized: norm,
        isFuture: dateObj >= today,
      });
    }
  }

  return dates;
}

/**
 * Parse MRZ (Machine Readable Zone) lines found in Italian ID cards, residence permits, and passports.
 * Returns extracted expiry date (YYYY-MM-DD), document number, and nationality.
 */
export function extractMRZData(text: string): {
  expiryDate?: string;
  documentNumber?: string;
  nationality?: string;
} | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().toUpperCase().replace(/«/g, '<').replace(/ /g, ''))
    .filter((l) => l.includes('<<') || l.length >= 28);

  for (const line of lines) {
    // TD1 line 2 (Permesso di Soggiorno and CIE): 6 digits (birth), 1 check, 1 sex, 6 digits (expiry), 1 check, 3 letters (nationality)
    const td1Match = line.match(/(\d{6})\d[MF<](\d{6})\d([A-Z]{3})/);
    if (td1Match) {
      const rawExpiry = td1Match[2];
      const yy = parseInt(rawExpiry.substring(0, 2), 10);
      const mm = rawExpiry.substring(2, 4);
      const dd = rawExpiry.substring(4, 6);
      const fullY = yy < 80 ? 2000 + yy : 1900 + yy;
      return {
        expiryDate: `${fullY}-${mm}-${dd}`,
        nationality: td1Match[3],
      };
    }

    // TD3 line 2 (Passports): 9 alphanumeric (number), 1 check, 3 letters, 6 digits (birth), 1 check, 1 sex, 6 digits (expiry)
    const td3Match = line.match(/([A-Z0-9<]{9})\d[A-Z]{3}(\d{6})\d[MF<](\d{6})\d/);
    if (td3Match) {
      const rawExpiry = td3Match[3];
      const yy = parseInt(rawExpiry.substring(0, 2), 10);
      const mm = rawExpiry.substring(2, 4);
      const dd = rawExpiry.substring(4, 6);
      const fullY = yy < 80 ? 2000 + yy : 1900 + yy;
      return {
        documentNumber: td3Match[1].replace(/</g, ''),
        expiryDate: `${fullY}-${mm}-${dd}`,
      };
    }
  }

  return null;
}

/**
 * Core Italian Document Analyzer with strict regex boundaries, dal..al parsing, and false positive guards
 */
export function analyzeItalianDocumentText(text: string, fileName?: string): ParsedDocumentData {
  const upper = text.toUpperCase();
  const extractedFields: string[] = [];
  let confidence = 0;

  let category: DocumentCategory = 'altro';
  let title = '';
  let documentNumber: string | undefined = undefined;
  let holderName: string | undefined = undefined;
  let issueDate: string | undefined = undefined;
  let expiryDate: string | undefined = undefined;
  let issuingAuthority: string | undefined = undefined;
  let notes: string | undefined = undefined;
  let isExpiryEstimated = false;

  // 0. Check MRZ (Machine Readable Zone) first for 100% reliable extraction
  const mrz = extractMRZData(text);
  if (mrz?.expiryDate) {
    expiryDate = mrz.expiryDate;
    extractedFields.push(`Data Scadenza (MRZ automatica): ${expiryDate}`);
    confidence += 45;
    if (mrz.documentNumber && !documentNumber) {
      documentNumber = mrz.documentNumber;
      extractedFields.push(`Numero Documento (MRZ): ${documentNumber}`);
    }
  }

  // 1. Detect Category with strict boundaries
  if (
    /\bPERMESSO DI SOGGIORNO\b/.test(upper) ||
    /\bTITOLO DI SOGGIORNO\b/.test(upper) ||
    /\bCARTA DI SOGGIORNO\b/.test(upper) ||
    /\bSOGGIORNANTE DI LUNGO PERIODO\b/.test(upper) ||
    (/\bQUESTURA\b/.test(upper) && /\bSTRANIERI\b/.test(upper))
  ) {
    category = 'permesso_soggiorno';
    title = 'Permesso di Soggiorno';
    extractedFields.push('Categoria: Permesso di Soggiorno');
    confidence += 35;
  } else if (
    /\bCARTA D'?IDENTIT[AÀ]\b/.test(upper) ||
    /\bC\.I\.E\.\b/.test(upper) ||
    (/\bREPUBBLICA ITALIANA\b/.test(upper) && /\bCOMUNE DI\b/.test(upper) && !/\bPATENTE\b/.test(upper))
  ) {
    category = 'carta_identita';
    title = "Carta d'Identità Elettronica (CIE)";
    extractedFields.push("Categoria: Carta d'Identità");
    confidence += 35;
  } else if (
    /\bPATENTE DI GUIDA\b/.test(upper) ||
    /\bMINISTERO DELLE INFRASTRUTTURE E DEI TRASPORTI\b/.test(upper) ||
    (/\bREPUBBLICA ITALIANA\b/.test(upper) && /\bPATENTE\b/.test(upper))
  ) {
    category = 'patente';
    title = 'Patente di Guida';
    extractedFields.push('Categoria: Patente di Guida');
    confidence += 35;
  } else if (
    /\bTESSERA SANITARIA\b/.test(upper) ||
    /\bCARTA NAZIONALE DEI SERVIZI\b/.test(upper) ||
    /\bSERVIZIO SANITARIO NAZIONALE\b/.test(upper) ||
    (/\bTEAM\b/.test(upper) && /\bTESSERA\b/.test(upper))
  ) {
    category = 'tessera_sanitaria';
    title = 'Tessera Sanitaria (TEAM)';
    extractedFields.push('Categoria: Tessera Sanitaria');
    confidence += 35;
  } else if (
    /\bCERTIFICATO DI ASSICURAZIONE\b/.test(upper) ||
    /\bPOLIZZA RCA\b/.test(upper) ||
    /\bCONTRATTO DI ASSICURAZIONE\b/.test(upper) ||
    (/\bASSICURAZIONE\b/.test(upper) && /\bVEICOLI\b/.test(upper))
  ) {
    category = 'assicurazione';
    title = 'Assicurazione Auto (RCA)';
    extractedFields.push('Categoria: Assicurazione');
    confidence += 35;
  } else if (/\bPASSAPORTO\b/.test(upper) || /\bPASSPORT\b/.test(upper)) {
    category = 'passaporto';
    title = 'Passaporto';
    extractedFields.push('Categoria: Passaporto');
    confidence += 35;
  } else if (/\bCONTRATTO DI LOCAZIONE\b/.test(upper) || /\bCONTRATTO DI AFFITTO\b/.test(upper)) {
    category = 'contratto_affitto';
    title = 'Contratto di Locazione';
    extractedFields.push('Categoria: Contratto Affitto');
    confidence += 30;
  } else if (/\bUNILAV\b/.test(upper) || /\bCONTRATTO DI LAVORO\b/.test(upper) || /\bBUSTA PAGA\b/.test(upper)) {
    category = 'contratto_lavoro';
    title = 'Contratto di Lavoro';
    extractedFields.push('Categoria: Contratto di Lavoro');
    confidence += 30;
  }

  // 2. Extract Range "dal ... al ..." (Common in Italian permits and insurance)
  if (!expiryDate) {
    const rangeMatch = text.match(
      /\b(?:valido\s+)?(?:dal|da|from)\s+([0-3]?\d[-/. ,][0-3]?\d[-/. ,](?:19\d{2}|20\d{2}|\d{2})|\d{4}[-/.][0-1]?\d[-/.][0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))\s+\b(?:al|a|fino al|to|until)\s+([0-3]?\d[-/. ,][0-3]?\d[-/. ,](?:19\d{2}|20\d{2}|\d{2})|\d{4}[-/.][0-1]?\d[-/.][0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))/i
    );

    if (rangeMatch) {
      const normIssue = normalizeDate(rangeMatch[1]);
      const normExpiry = normalizeDate(rangeMatch[2]);
      if (normIssue) {
        issueDate = normIssue;
        extractedFields.push(`Data Inizio/Rilascio (dal): ${normIssue}`);
        confidence += 15;
      }
      if (normExpiry) {
        expiryDate = normExpiry;
        extractedFields.push(`Data Scadenza (al): ${normExpiry}`);
        confidence += 30;
      }
    }
  }

  // 3. Extract Expiry Date with flexible context (allows English translations and multiline labels)
  if (!expiryDate) {
    const expiryContextMatch = text.match(
      /(?:data\s*(?:di)?\s*scadenza|scadenza\s*(?:\/|\s*e\s*|\s*-\s*)?\s*expiry(?:\s*date)?|scadenza|scad\.|scade\s+il|scade|valido\s+fino\s+al|valida\s+fino\s+al|fino\s+al|entro\s+il|val\.\s*al|fine\s+validit[àa]|\b4b[.\s:,]+|valid\s+until|expiry\s*(?:date)?|expires\s*(?:on)?|تاريخ\s*(?:انتهاء\s*الصلاحية|الانتهاء|النفاذ)|صالح\s*(?:حتى|إلى))[\s/:,\-A-Za-z.()]{0,60}?([0-3]?\d[-/. ,][0-3]?\d[-/. ,](?:19\d{2}|20\d{2}|\d{2})|\d{4}[-/.][0-1]?\d[-/.][0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))/i
    );

    if (expiryContextMatch && expiryContextMatch[1]) {
      const matchIdx = expiryContextMatch.index || 0;
      if (!isPrecededByBirthContext(text, matchIdx)) {
        const norm = normalizeDate(expiryContextMatch[1]);
        if (norm) {
          expiryDate = norm;
          extractedFields.push(`Data Scadenza: ${norm}`);
          confidence += 30;
        }
      }
    }
  }

  // 3b. Extract Car Insurance Expiry Formula ("alle ore 24 del DD/MM/YYYY")
  if (!expiryDate) {
    const insuranceMatch = text.match(
      /\balle\s+ore\s*(?:24|12|00)(?::00)?\s+(?:del\s+)?([0-3]?\d[-/. ,][0-3]?\d[-/. ,](?:19\d{2}|20\d{2}|\d{2}))/i
    );
    if (insuranceMatch && insuranceMatch[1]) {
      const norm = normalizeDate(insuranceMatch[1]);
      if (norm) {
        expiryDate = norm;
        extractedFields.push(`Data Scadenza Polizza (ore 24): ${norm}`);
        confidence += 30;
      }
    }
  }

  // 4. Extract Issue Date with strict boundaries
  if (!issueDate) {
    const issueContextMatch = text.match(
      /(?<![a-zA-Z])(?:data di rilascio|data rilascio|data emissione|data di emissione|rilasciato il|rilasciata il|rilascio|emesso il|emessa il|in data|valido dal|del|4a[.\s:,]+|date of issue|issued on|issue date|تاريخ الإصدار|تاريخ الاصدار|تاريخ التحرير)[\s/:,\-A-Za-z.()]{0,40}?([0-3]?\d[-/. ,][0-3]?\d[-/. ,](?:19\d{2}|20\d{2}|\d{2})|\d{4}[-/.][0-1]?\d[-/.][0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))/i
    );

    if (issueContextMatch && issueContextMatch[1]) {
      const matchIdx = issueContextMatch.index || 0;
      if (!isPrecededByBirthContext(text, matchIdx)) {
        const norm = normalizeDate(issueContextMatch[1]);
        if (norm) {
          issueDate = norm;
          extractedFields.push(`Data Rilascio: ${norm}`);
          confidence += 10;
        }
      }
    }
  }

  // 5. Automatic Fallback: Automatically detect and confirm the expiry date without requiring manual review
  if (!expiryDate) {
    const candidateDates = findAllCandidateDates(text);
    if (candidateDates.length > 0) {
      const futureDates = candidateDates.filter((d) => d.isFuture);
      if (futureDates.length > 0) {
        futureDates.sort((a, b) => a.normalized.localeCompare(b.normalized));
        expiryDate = futureDates[futureDates.length - 1].normalized;
        isExpiryEstimated = false; // Confirmed automatically
        extractedFields.push(`Data Scadenza rilevata automaticamente: ${expiryDate}`);
        confidence += 25;
      } else {
        candidateDates.sort((a, b) => a.normalized.localeCompare(b.normalized));
        expiryDate = candidateDates[candidateDates.length - 1].normalized;
        isExpiryEstimated = false; // Confirmed automatically
        extractedFields.push(`Data Scadenza rilevata automaticamente: ${expiryDate}`);
        confidence += 20;
      }
    }
  }

  // 6. Extract Document Number
  // Permesso: Starts with I followed by digits
  const permessoNumMatch = upper.match(/\b(I\d{7,9}[A-Z]?)\b/);
  if (category === 'permesso_soggiorno' && permessoNumMatch) {
    documentNumber = permessoNumMatch[1];
    extractedFields.push(`Numero Documento: ${documentNumber}`);
    confidence += 15;
  }

  // CIE: 2 letters, 5 numbers, 2 letters
  const cieNumMatch = upper.match(/\b([A-Z]{2}\d{5}[A-Z]{2})\b/);
  if ((category === 'carta_identita' || !documentNumber) && cieNumMatch) {
    documentNumber = cieNumMatch[1];
    extractedFields.push(`Numero CIE: ${documentNumber}`);
    confidence += 15;
  }

  // Patente: field 5
  const patenteNumMatch = upper.match(/5[.\s]+([A-Z0-9]{8,11})\b/);
  if (category === 'patente' && patenteNumMatch) {
    documentNumber = patenteNumMatch[1].trim();
    extractedFields.push(`Numero Patente: ${documentNumber}`);
    confidence += 15;
  }

  // Codice Fiscale
  const cfMatch = upper.match(/\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b/);
  if (cfMatch) {
    if (!documentNumber) {
      documentNumber = cfMatch[1];
    }
    extractedFields.push(`Codice Fiscale: ${cfMatch[1]}`);
    confidence += 10;
  }

  // 7. Extract Issuing Authority
  // Check driving license 4c field (e.g., 4c. MIT-UCO)
  const patente4cMatch = text.match(/4c[.\s:,]+([A-Za-z0-9\s.-]{2,30})/i);
  if (category === 'patente' && patente4cMatch) {
    const rawAuth = patente4cMatch[1].trim();
    if (/MIT|UCO|MCTC/i.test(rawAuth)) {
      issuingAuthority = `Ministero delle Infrastrutture e dei Trasporti (${rawAuth.toUpperCase()})`;
    } else {
      issuingAuthority = rawAuth;
    }
    extractedFields.push(`Ente (4c): ${issuingAuthority}`);
    confidence += 15;
  }

  if (!issuingAuthority) {
    const questuraMatch = text.match(/\bquestura\s+(?:di\s+)?([A-Za-zÀ-ÿ\s'-]{3,25})/i);
    if (questuraMatch) {
      issuingAuthority = `Questura di ${questuraMatch[1].trim()}`;
      extractedFields.push(`Ente: ${issuingAuthority}`);
      confidence += 10;
    } else {
      const comuneMatch = text.match(/\bcomune\s+(?:di\s+)?([A-Za-zÀ-ÿ\s'-]{3,25})/i);
      if (comuneMatch) {
        issuingAuthority = `Comune di ${comuneMatch[1].trim()}`;
        extractedFields.push(`Ente: ${issuingAuthority}`);
        confidence += 10;
      } else {
        const prefetturaMatch = text.match(/\bprefettura\s+(?:di\s+)?([A-Za-zÀ-ÿ\s'-]{3,25})/i);
        if (prefetturaMatch) {
          issuingAuthority = `Prefettura di ${prefetturaMatch[1].trim()}`;
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (
          /\bMINISTERO DELLE INFRASTRUTTURE\b/.test(upper) ||
          /\bMIT\b/.test(upper) ||
          /\bMIT-UCO\b/.test(upper) ||
          /\bMOTORIZZAZIONE CIVILE\b/.test(upper) ||
          /\bM\.?C\.?T\.?C\.?\b/.test(upper)
        ) {
          issuingAuthority = 'Ministero delle Infrastrutture e dei Trasporti (MIT)';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\bAGENZIA DELLE ENTRATE\b/.test(upper)) {
          issuingAuthority = 'Agenzia delle Entrate';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\bMINISTERO DELL'INTERNO\b/.test(upper)) {
          issuingAuthority = "Ministero dell'Interno";
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\b(?:AZIENDA SANITARIA|ASL|ATS|AUSL)\b/.test(upper)) {
          issuingAuthority = 'Azienda Sanitaria Locale (ASL)';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\b(?:ALLIANZ|ALLIANZ DIRECT)\b/.test(upper)) {
          issuingAuthority = 'Allianz Assicurazioni';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\b(?:ASSICURAZIONI GENERALI|GENERALI|GENERTEL)\b/.test(upper)) {
          issuingAuthority = 'Generali Assicurazioni';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\b(?:UNIPOLSAI|UNIPOL)\b/.test(upper)) {
          issuingAuthority = 'UnipolSai Assicurazioni';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\b(?:PRIMA ASSICURAZIONI|PRIMA\.IT)\b/.test(upper)) {
          issuingAuthority = 'Prima Assicurazioni';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\b(?:AXA|AXA ASSICURAZIONI)\b/.test(upper)) {
          issuingAuthority = 'AXA Assicurazioni';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\b(?:ZURICH|ZURICH CONNECT)\b/.test(upper)) {
          issuingAuthority = 'Zurich Insurance';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\b(?:LINEAR ASSICURAZIONI|LINEAR)\b/.test(upper)) {
          issuingAuthority = 'Linear Assicurazioni';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\b(?:POSTE ITALIANE|POSTE VITA)\b/.test(upper)) {
          issuingAuthority = 'Poste Italiane';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\bINPS\b/.test(upper)) {
          issuingAuthority = 'INPS';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else if (/\bINAIL\b/.test(upper)) {
          issuingAuthority = 'INAIL';
          extractedFields.push(`Ente: ${issuingAuthority}`);
          confidence += 10;
        } else {
          // Explicit label check
          const explicitAuthMatch = text.match(/(?:\brilasciato da|\bemesso da|\bautorit[àa]|\bente emittente|الجهة المصدرة)[\s:]+([A-Za-zÀ-ÿ0-9\s.-]{3,35})/i);
          if (explicitAuthMatch) {
            issuingAuthority = explicitAuthMatch[1].trim().split('\n')[0];
            extractedFields.push(`Ente: ${issuingAuthority}`);
            confidence += 10;
          }
        }
      }
    }
  }

  // 8. Extract Holder Name
  const cognomeMatch = text.match(/(?:1\.\s*cognome|\bcognome\b)[\s:]+([A-Za-zÀ-ÿ\s'-]{2,30})/i);
  const nomeMatch = text.match(/(?:2\.\s*nome|\bnome\b)[\s:]+([A-Za-zÀ-ÿ\s'-]{2,30})/i);

  if (cognomeMatch && nomeMatch) {
    const c = cognomeMatch[1].trim().split('\n')[0];
    const n = nomeMatch[1].trim().split('\n')[0];
    holderName = `${c} ${n}`;
    extractedFields.push(`Intestatario: ${holderName}`);
    confidence += 15;
  } else if (cognomeMatch) {
    holderName = cognomeMatch[1].trim().split('\n')[0];
    extractedFields.push(`Cognome: ${holderName}`);
    confidence += 5;
  }

  // 9. Filename hints and Smart Title Synthesis
  const categoryLabels: Record<string, string> = {
    permesso_soggiorno: 'Permesso di Soggiorno',
    carta_identita: "Carta d'Identità CIE",
    patente: 'Patente di Guida',
    tessera_sanitaria: 'Tessera Sanitaria',
    assicurazione: 'Assicurazione Auto',
    passaporto: 'Passaporto',
    contratto_affitto: 'Contratto di Locazione',
    contratto_lavoro: 'Contratto di Lavoro',
    altro: fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Documento Ufficiale'
  };

  if (!title || title === 'Nuovo Documento') {
    if (fileName) {
      const cleanFn = fileName.replace(/\.[^/.]+$/, '').toLowerCase();
      if (cleanFn.includes('permesso') || cleanFn.includes('soggiorno')) {
        category = 'permesso_soggiorno';
      } else if (cleanFn.includes('carta') || cleanFn.includes('cie') || cleanFn.includes('identita')) {
        category = 'carta_identita';
      } else if (cleanFn.includes('patente')) {
        category = 'patente';
      } else if (cleanFn.includes('tessera') || cleanFn.includes('sanitaria')) {
        category = 'tessera_sanitaria';
      } else if (cleanFn.includes('assicurazione') || cleanFn.includes('rca')) {
        category = 'assicurazione';
      }
    }

    const catName = categoryLabels[category] || 'Documento';
    if (holderName) {
      title = `${catName} - ${holderName}`;
    } else if (documentNumber) {
      title = `${catName} (${documentNumber})`;
    } else {
      title = catName;
    }
  }

  return {
    title: title || (category !== 'altro' ? category : 'Nuovo Documento'),
    category,
    documentNumber,
    holderName,
    issueDate,
    expiryDate,
    issuingAuthority,
    notes,
    confidenceScore: Math.min(confidence, 100),
    extractedFields,
    rawText: text,
    isExpiryEstimated,
  };
}
