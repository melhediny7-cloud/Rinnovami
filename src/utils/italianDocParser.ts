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
  hasNoExpiry?: boolean;
  needsReview?: boolean;
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
 * Smart OCR Sanitizer for Date Strings:
 * 1. Collapses whitespace around date separators (\s*[/.-]\s*): e.g. "15 / 09 / 2028" -> "15/09/2028"
 * 2. Fixes OCR letter confusions in numeric date fragments:
 *    - 'O', 'o', 'Q' -> '0'
 *    - 'I', 'l', '|', '!' -> '1'
 *    - 'S', 's' -> '5'
 *    - 'B' -> '8'
 */
export function sanitizeDateCandidate(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  // 1. Remove spaces around delimiters: e.g. "15 / 09 / 2028" -> "15/09/2028", "15 . 09 . 2028" -> "15.09.2028"
  str = str.replace(/([0-9a-zA-Z]+)\s*([/.\-,])\s*([0-9a-zA-Z]+)\s*([/.\-,])\s*([0-9a-zA-Z]+)/g, '$1$2$3$4$5');
  str = str.replace(/([0-9a-zA-Z]+)\s*([/.\-,])\s*([0-9a-zA-Z]+)/g, '$1$2$3');

  // 2. Fix OCR letter misreadings in date patterns: e.g. "31/12/2O28" -> "31/12/2028", "l5/O9/2O28" -> "15/09/2028"
  str = str.replace(/\b([0-9OIliSBs]{1,2})([/.\-,])([0-9OIliSBs]{1,2})([/.\-,])([0-9OIliSBs]{2,4})\b/g, (_m, p1, sep1, p2, sep2, p3) => {
    const fixDigits = (s: string) =>
      s
        .replace(/[OoQ]/g, '0')
        .replace(/[Il|!]/g, '1')
        .replace(/[Ss]/g, '5')
        .replace(/[B]/g, '8');
    return `${fixDigits(p1)}${sep1}${fixDigits(p2)}${sep2}${fixDigits(p3)}`;
  });

  return str;
}

/**
 * Normalizes text and formats dates to YYYY-MM-DD
 * Supports:
 * - DD/MM/YYYY and MM/DD/YYYY (e.g. 01/16/2027 or 16/01/2027)
 * - YYYY-MM-DD (ISO)
 * - 2-digit years (e.g. 16/01/27 or 01/16/27)
 * - Textual Italian & English months (e.g. "16 Gennaio 2027", "January 16, 2027")
 * Handles comma, dot, slash, dash separators and spaces around separators.
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const clean = sanitizeDateCandidate(dateStr);

  // Pattern 1: ISO YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  const isoMatch = clean.match(/\b(19\d{2}|20\d{2})\s*[-/.]\s*(0?[1-9]|1[0-2])\s*[-/.]\s*(0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(isoMatch[2]).padStart(2, '0');
    const d = String(isoMatch[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Pattern 2: Two numbers + Year (DD/MM/YYYY or MM/DD/YYYY)
  const numMatch = clean.match(/\b(\d{1,2})\s*[-/. ,]\s*(\d{1,2})\s*[-/. ,]\s*(19\d{2}|20\d{2}|\d{2})\b/);
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
  return /\b(nato|nata|nascita|data di nascita|nato il|nata il|nato a|nata a|\b3[.\s:,]+|data nascita|d\.?\s*nascita|date of birth)\b/.test(preceding);
}

/**
 * Check if a date string is a registration, transmission, communication, or contract start date
 */
function isPrecededByRegistrationOrStartContext(fullText: string, dateIndex: number): boolean {
  const windowStart = Math.max(0, dateIndex - 60);
  const preceding = fullText.slice(windowStart, dateIndex).toLowerCase();
  return /\b(trasmissione|invio|inviato|comunicazione|registrazione|registrato|stipula|stipulato|ricezione|ricevuto|protocollo|compilazione|sottoscrizione|data\s+inizio|inizio\s+rapporto|decorrenza|assunzione|assunto\s+il)\b/.test(
    preceding
  );
}

/**
 * Searches for all dates in a string, filtering out birth dates and optionally registration dates
 */
export function findAllCandidateDates(
  text: string,
  options?: { filterRegistration?: boolean }
): { raw: string; normalized: string; isFuture: boolean }[] {
  const dates: { raw: string; normalized: string; isFuture: boolean }[] = [];
  const seenNorm = new Set<string>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Regex for numeric dates (supports DD/MM/YYYY and MM/DD/YYYY, with 4-digit or 2-digit years, and spaces)
  const regexNum = /\b(\d{1,2})\s*[-/. ,]\s*(\d{1,2})\s*[-/. ,]\s*(19\d{2}|20\d{2}|\d{2})\b/g;
  let match: RegExpExecArray | null;

  while ((match = regexNum.exec(text)) !== null) {
    if (isPrecededByBirthContext(text, match.index)) {
      continue; // Skip birth date
    }
    if (options?.filterRegistration && isPrecededByRegistrationOrStartContext(text, match.index)) {
      continue; // Skip registration/start date when searching for expiry
    }

    const norm = normalizeDate(match[0]);
    if (norm && !seenNorm.has(norm)) {
      seenNorm.add(norm);
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
  const regexIso = /\b(19\d{2}|20\d{2})\s*[-/.]\s*(0?[1-9]|1[0-2])\s*[-/.]\s*(0?[1-9]|[12]\d|3[01])\b/g;
  while ((match = regexIso.exec(text)) !== null) {
    if (isPrecededByBirthContext(text, match.index)) {
      continue;
    }
    if (options?.filterRegistration && isPrecededByRegistrationOrStartContext(text, match.index)) {
      continue;
    }
    const norm = normalizeDate(match[0]);
    if (norm && !seenNorm.has(norm)) {
      seenNorm.add(norm);
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
    if (options?.filterRegistration && isPrecededByRegistrationOrStartContext(text, match.index)) {
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
    if (options?.filterRegistration && isPrecededByRegistrationOrStartContext(text, match.index)) {
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
  holderName?: string;
  birthDate?: string;
} | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().toUpperCase().replace(/«/g, '<').replace(/ /g, ''))
    .filter((l) => l.includes('<') && l.length >= 25);

  let expiryDate: string | undefined;
  let documentNumber: string | undefined;
  let nationality: string | undefined;
  let holderName: string | undefined;
  let birthDate: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // TD1 Line 1: [ICA][A-Z0-9<]{1}[A-Z]{3}([A-Z0-9<]{9})
    const td1Line1 = line.match(/^[ICA][A-Z0-9<]{1}[A-Z]{3}([A-Z0-9<]{9})/);
    if (td1Line1 && !documentNumber) {
      documentNumber = td1Line1[1].replace(/</g, '');
    }

    // TD1 Line 2: (\d{6})\d[MF<](\d{6})\d([A-Z]{3})
    const td1Line2 = line.match(/(\d{6})\d[MF<](\d{6})\d([A-Z]{3})/);
    if (td1Line2) {
      const rawBirth = td1Line2[1];
      const byy = parseInt(rawBirth.substring(0, 2), 10);
      const bfullY = byy < 40 ? 2000 + byy : 1900 + byy;
      birthDate = `${bfullY}-${rawBirth.substring(2, 4)}-${rawBirth.substring(4, 6)}`;

      const rawExpiry = td1Line2[2];
      const eyy = parseInt(rawExpiry.substring(0, 2), 10);
      const efullY = eyy < 80 ? 2000 + eyy : 1900 + eyy;
      expiryDate = `${efullY}-${rawExpiry.substring(2, 4)}-${rawExpiry.substring(4, 6)}`;
      nationality = td1Line2[3];
    }

    // TD1 Line 3: Name line (Surname<<Name)
    if (line.includes('<<') && /^[A-Z<]{20,}$/.test(line) && !line.startsWith('P<') && !line.startsWith('I<') && !line.startsWith('ID') && !/\d/.test(line)) {
      const parts = line.split('<<').filter(Boolean);
      if (parts.length >= 2) {
        holderName = `${parts[0].replace(/</g, ' ').trim()} ${parts[1].replace(/</g, ' ').trim()}`.trim();
      }
    }

    // TD3 Passport:
    // Line 1: P<[A-Z]{3}([A-Z<]+)
    const td3Line1 = line.match(/^P<[A-Z]{3}([A-Z0-9<]+)/);
    if (td3Line1) {
      const rawNames = td3Line1[1].split('<<');
      if (rawNames.length >= 2) {
        const surname = rawNames[0].replace(/</g, ' ').trim();
        const given = rawNames[1].replace(/</g, ' ').trim();
        holderName = `${surname} ${given}`.trim();
      }
    }

    // TD3 Line 2: ([A-Z0-9<]{9})\d[A-Z]{3}(\d{6})\d[MF<](\d{6})\d
    const td3Line2 = line.match(/([A-Z0-9<]{9})\d[A-Z]{3}(\d{6})\d[MF<](\d{6})\d/);
    if (td3Line2) {
      documentNumber = td3Line2[1].replace(/</g, '');
      const rawExpiry = td3Line2[3];
      const yy = parseInt(rawExpiry.substring(0, 2), 10);
      const fullY = yy < 80 ? 2000 + yy : 1900 + yy;
      expiryDate = `${fullY}-${rawExpiry.substring(2, 4)}-${rawExpiry.substring(4, 6)}`;
    }
  }

  if (expiryDate || documentNumber || holderName) {
    return {
      expiryDate,
      documentNumber,
      nationality,
      holderName,
      birthDate,
    };
  }
  return null;
}

/**
 * Clean holder name by stripping common form table headers (e.g. "Sesso", "Data di nascita", "Luogo")
 */
export function cleanNameCandidate(raw?: string): string | undefined {
  if (!raw) return undefined;
  let str = raw.split(/\r?\n/)[0];
  str = str
    .replace(
      /\b(sesso|data|nascita|luogo|comune|provincia|cittadinanza|codice|fiscale|nato|residenza|domicilio|rilascio|scadenza|questura|firma|qualifica|mansione|livello|datore|lavoratore|sede|ditta|societa)\b.*/i,
      ''
    )
    .trim();
  str = str.replace(/[^A-Za-zÀ-ÿ\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (str.length < 2 || str.length > 35) return undefined;
  if (/^(nome|cognome|datore|lavoratore|dipendente|firma|nato|sesso|data|comune|provincia)$/i.test(str)) return undefined;
  return str;
}

/**
 * Intelligent extraction of holder name tailored to document category
 */
export function extractCleanHolderName(text: string, category: DocumentCategory): string | undefined {
  // 1. In employment contracts: check worker / employee name first (Quadro C / Lavoratore)
  if (category === 'contratto_lavoro') {
    const workerSection = text.match(/(?:quadro\s*[c3]|dati\s+(?:del\s+)?lavoratore|il\s+lavoratore|lavoratore)[\s\S]{1,500}/i);
    if (workerSection) {
      const wText = workerSection[0];
      const wCog = wText.match(/cognome\s*[:.-]?\s*([A-Za-zÀ-ÿ\s'-]{2,35})/i);
      const wNom = wText.match(/nome\s*[:.-]?\s*([A-Za-zÀ-ÿ\s'-]{2,35})/i);
      const c = cleanNameCandidate(wCog ? wCog[1] : undefined);
      const n = cleanNameCandidate(wNom ? wNom[1] : undefined);
      if (c && n) return `${c} ${n}`;
      if (c) return c;
      if (n) return n;
    }

    const workerMatch = text.match(
      /(?:lavoratore(?:\s+subordinato)?|dipendente|nominativo\s+lavoratore|lavoratore\s*:|cognome\s+e\s+nome(?:\s+del\s+lavoratore)?)\s*[:.-]?\s*([A-Za-zÀ-ÿ\s'-]{3,35})/i
    );
    if (workerMatch) {
      const candidate = cleanNameCandidate(workerMatch[1]);
      if (candidate) return candidate;
    }
  }

  // 2. In courses: check participant / corsista
  if (category === 'corso_sicurezza') {
    const corsistaMatch = text.match(
      /(?:rilasciato\s+a|si\s+attesta\s+che|attestato\s+a|partecipante|corsista)\s*[:.-]?\s*([A-Za-zÀ-ÿ\s'-]{3,35})/i
    );
    if (corsistaMatch) {
      const candidate = cleanNameCandidate(corsistaMatch[1]);
      if (candidate) return candidate;
    }
  }

  // 3. In medical visits: check worker / patient
  if (category === 'visita_medica') {
    const pazienteMatch = text.match(
      /(?:lavoratore|dipendente|paziente|visita\s+del\s+lavoratore)\s*[:.-]?\s*([A-Za-zÀ-ÿ\s'-]{3,35})/i
    );
    if (pazienteMatch) {
      const candidate = cleanNameCandidate(pazienteMatch[1]);
      if (candidate) return candidate;
    }
  }

  // 4. Standard Italian Cognome + Nome lines
  const cognomeMatch = text.match(/(?:1\.\s*cognome|\bcognome\b)[\s:]+([A-Za-zÀ-ÿ\s'-]{2,35})/i);
  const nomeMatch = text.match(/(?:2\.\s*nome|\bnome\b)[\s:]+([A-Za-zÀ-ÿ\s'-]{2,35})/i);

  const c = cleanNameCandidate(cognomeMatch ? cognomeMatch[1] : undefined);
  const n = cleanNameCandidate(nomeMatch ? nomeMatch[1] : undefined);

  if (c && n) return `${c} ${n}`;
  if (c) return c;
  if (n) return n;

  return undefined;
}

/**
 * Core Italian Document Analyzer with strict regex boundaries, multi-page dossier detection,
 * and robust contract / course / medical / residence permit separation.
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
  let hasNoExpiry = false;
  let needsReview = false;

  // 1. PRIMARY MULTI-PAGE & ORGANIZATIONAL DOCUMENT DETECTION
  // Check for Employment Contract, Medical Visit, Course, DURC, Payroll before standalone ID cards.
  // This guarantees a contract that quotes or attaches a worker's permit is classified as a CONTRACT.
  const isEmploymentContract =
    /\b(CONTRATTO DI SOGGIORNO|CONTRATTO DI LAVORO|LETTERA DI ASSUNZIONE|MODELLO UNILAV|UNILAV|UNISOMM|UNIFICATO[- ]?LAV|COMUNICAZIONE OBBLIGATORIA|MINISTERO DEL LAVORO|CENTRO PER L['’]?IMPIEGO|MODELLO Q)\b/.test(upper) ||
    (/\bDATORE DI LAVORO\b/.test(upper)) ||
    (/\bDATORE\b/.test(upper) && (/\bLAVORATORE\b/.test(upper) || /\bMANSIONE\b/.test(upper) || /\bASSUNTO\b/.test(upper) || /\bDIPENDENTE\b/.test(upper))) ||
    (/\b(RAPPORTO DI LAVORO|LAVORO DOMESTICO)\b/.test(upper)) ||
    (/\bLAVORO SUBORDINATO\b/.test(upper) && (/\bCONTRATTO\b/.test(upper) || /\bCCNL\b/.test(upper) || /\bASSUNZION[EI]\b/.test(upper) || /\bMANSION[EI]\b/.test(upper) || /\bDATORE\b/.test(upper) || /\bQUALIFICA\b/.test(upper) || /\bTEMPO (?:IN)?DETERMINATO\b/.test(upper))) ||
    (/\bTEMPO (?:IN)?DETERMINATO\b/.test(upper) && (/\bCONTRATTO\b/.test(upper) || /\bCCNL\b/.test(upper) || /\bASSUNZIONE\b/.test(upper) || /\bMANSION[EI]\b/.test(upper) || /\bLAVORO\b/.test(upper) || /\bINIZIO RAPPORTO\b/.test(upper))) ||
    (/\bSPORTELLO UNICO\b/.test(upper) && /\bSOGGIORNO\b/.test(upper) && /\bLAVORO\b/.test(upper)) ||
    (fileName && /contratto|unilav|assunzione/i.test(fileName));

  const isVisitaMedica =
    /\bVISITA MEDICA\b/.test(upper) ||
    /\bGIUDIZIO DI IDONEIT[AÀ]\b/.test(upper) ||
    /\bMEDICO COMPETENTE\b/.test(upper) ||
    /\bSORVEGLIANZA SANITARIA\b/.test(upper) ||
    /\bIDONEIT[AÀ] ALLA MANSIONE\b/.test(upper) ||
    /\bMEDICINA DEL LAVORO\b/.test(upper) ||
    (fileName && /visita[-_ ]?medica|idoneita/i.test(fileName));

  const isCorsoSicurezza =
    /\bCORSO DI FORMAZIONE\b/.test(upper) ||
    /\bATTESTATO DI FREQUENZA\b/.test(upper) ||
    /\bATTESTATO DI PARTECIPAZIONE\b/.test(upper) ||
    /\bSICUREZZA SUL LAVORO\b/.test(upper) ||
    /\bD\.?LGS\.?\s*(?:N\.?\s*)?81\/(?:20)?08\b/.test(upper) ||
    /\bACCORDO STATO[- ]REGIONI\b/.test(upper) ||
    /\bPRIMO SOCCORSO\b/.test(upper) ||
    /\bANTINCENDIO\b/.test(upper) ||
    /\bRLS\b/.test(upper) ||
    /\bRSPP\b/.test(upper) ||
    (fileName && /corso|sicurezza|attestato/i.test(fileName));

  const isDurc =
    /\bDURC\b/.test(upper) ||
    /\bDOCUMENTO UNICO DI REGOLARIT[AÀ] CONTRIBUTIVA\b/.test(upper) ||
    (/\bREGOLARIT[AÀ] CONTRIBUTIVA\b/.test(upper) && (/\bINPS\b/.test(upper) || /\bINAIL\b/.test(upper))) ||
    (fileName && /durc/i.test(fileName));

  const isBustaPaga =
    /\bBUSTA PAGA\b/.test(upper) ||
    /\bCEDOLINO\b/.test(upper) ||
    /\bPROSPETTO PAGA\b/.test(upper) ||
    (fileName && /busta[-_ ]?paga|cedolino/i.test(fileName));

  const isCertificazioneUnica =
    /\bCERTIFICAZIONE UNICA\b/.test(upper) ||
    /\bMODELLO CU\b/.test(upper) ||
    /\bC\.U\.\b/.test(upper) ||
    /\bCUD\b/.test(upper) ||
    (fileName && /certificazione[-_ ]?unica|modello[-_ ]?cu|cud/i.test(fileName));

  const isAssicurazione =
    /\bCERTIFICATO DI ASSICURAZIONE\b/.test(upper) ||
    /\bPOLIZZA RCA\b/.test(upper) ||
    /\bCONTRATTO DI ASSICURAZIONE\b/.test(upper) ||
    (/\bASSICURAZIONE\b/.test(upper) && (/\bVEICOLI\b/.test(upper) || /\bMASSIMALE\b/.test(upper)));

  const isContrattoAffitto =
    /\bCONTRATTO DI LOCAZIONE\b/.test(upper) ||
    /\bCONTRATTO DI AFFITTO\b/.test(upper) ||
    (fileName && /locazione|affitto/i.test(fileName));

  if (isEmploymentContract) {
    category = 'contratto_lavoro';
    title = 'Contratto di Lavoro';
    extractedFields.push('Categoria: Contratto di Lavoro');
    confidence += 45;
  } else if (isVisitaMedica) {
    category = 'visita_medica';
    title = 'Visita Medica di Idoneità';
    extractedFields.push('Categoria: Visita Medica');
    confidence += 45;
  } else if (isCorsoSicurezza) {
    category = 'corso_sicurezza';
    title = 'Attestato Corso Sicurezza';
    extractedFields.push('Categoria: Corso Sicurezza');
    confidence += 45;
  } else if (isDurc) {
    category = 'durc';
    title = 'DURC - Regolarità Contributiva';
    issuingAuthority = 'INPS - INAIL';
    extractedFields.push('Categoria: DURC INPS/INAIL');
    confidence += 45;
  } else if (isBustaPaga) {
    category = 'busta_paga';
    title = 'Busta Paga';
    hasNoExpiry = true;
    extractedFields.push('Categoria: Busta Paga (Permanente)');
    confidence += 45;
  } else if (isCertificazioneUnica) {
    category = 'certificazione_unica';
    title = 'Certificazione Unica (CU)';
    hasNoExpiry = true;
    extractedFields.push('Categoria: Certificazione Unica (Permanente)');
    confidence += 45;
  } else if (isAssicurazione) {
    category = 'assicurazione';
    title = 'Assicurazione Auto (RCA)';
    extractedFields.push('Categoria: Assicurazione');
    confidence += 40;
  } else if (isContrattoAffitto) {
    category = 'contratto_affitto';
    title = 'Contratto di Locazione';
    extractedFields.push('Categoria: Contratto Affitto');
    confidence += 40;
  } else if (
    /\bPERMESSO DI SOGGIORNO\b/.test(upper) ||
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
  } else if (/\bPASSAPORTO\b/.test(upper) || /\bPASSPORT\b/.test(upper)) {
    category = 'passaporto';
    title = 'Passaporto';
    extractedFields.push('Categoria: Passaporto');
    confidence += 35;
  }

  // 1b. MRZ (Machine Readable Zone) handling:
  // If the document is a standalone ID card (Permesso, CIE, Passaporto), MRZ is 100% authoritative.
  // If the document is a CONTRACT or COURSE, any attached MRZ belongs to an identity photocopy, so do NOT use it for the contract's expiry!
  const mrz = extractMRZData(text);
  const isStandaloneCard =
    category === 'permesso_soggiorno' ||
    category === 'carta_identita' ||
    category === 'passaporto' ||
    category === 'altro';

  if (mrz) {
    if (isStandaloneCard && mrz.expiryDate) {
      expiryDate = mrz.expiryDate;
      extractedFields.push(`Data Scadenza (MRZ automatica): ${expiryDate}`);
      confidence += 45;
    }
    if (isStandaloneCard && mrz.documentNumber && !documentNumber) {
      documentNumber = mrz.documentNumber;
      extractedFields.push(`Numero Documento (MRZ): ${documentNumber}`);
    }
    if (mrz.holderName && !holderName) {
      const cleanMrzName = cleanNameCandidate(mrz.holderName);
      if (cleanMrzName) {
        holderName = cleanMrzName;
        extractedFields.push(`Intestatario: ${holderName}`);
      }
    }
  }

  // 1c. Check if Document is Permanent / Without Expiry (Illimitata / A tempo indeterminato / Unilav A01.00)
  const isPermanent =
    /\b(?:DURATA\s*:\s*)?ILLIMITAT[AO]\b/.test(upper) ||
    /\bA\s+TEMPO\s+INDETERMINATO\b/.test(upper) ||
    /\bTEMPO\s+INDETERMINATO\b/.test(upper) ||
    /\bA01\.00\b/.test(upper) ||
    /\bA\.01\.00\b/.test(upper) ||
    /\bA01\b/.test(upper) ||
    /\bNON\s+(?:È|E['’])\s*PREVISTA\s+(?:UNA\s+)?DATA\s+(?:DI\s+)?FINE\b/.test(upper) ||
    /\bSOGGIORNANTE\s+DI\s+LUNGO\s+PERIODO\b/.test(upper) ||
    /\bSENZA\s+SCADENZA\b/.test(upper) ||
    category === 'busta_paga' ||
    category === 'certificazione_unica';

  if (isPermanent) {
    hasNoExpiry = true;
    expiryDate = undefined;
    extractedFields.push('Validità: Documento Permanente / Senza Scadenza');
    confidence += 25;
  }

  // 1d. Extract Category-Specific Dates:
  // For Employment Contract:
  if (category === 'contratto_lavoro') {
    // 1. Check explicit permanent vs temporary markers
    const isExplicitIndeterminato =
      /\bA01\.00\b/i.test(text) ||
      /\bA\.01\.00\b/i.test(text) ||
      /\bA01\b/i.test(text) ||
      /\b(?:A\s+)?TEMPO\s+INDETERMINATO\b/i.test(text) ||
      /\bNON\s+(?:È|E['’])\s*PREVISTA\s+(?:UNA\s+)?DATA\s+(?:DI\s+)?FINE\b/i.test(text) ||
      /\bDURATA\s*:\s*INDETERMINAT[AO]\b/i.test(text) ||
      /\bSENZA\s+(?:TERMINE|SCADENZA)\b/i.test(text);

    const isExplicitDeterminato =
      /\bA02\.00\b/i.test(text) ||
      /\bA\.02\.00\b/i.test(text) ||
      /\bA02\b/i.test(text) ||
      /\b(?:A\s+)?TEMPO\s+DETERMINATO\b/i.test(text) ||
      /\bCONTRATTO\s+A\s+TERMINE\b/i.test(text) ||
      /\bPROROGA\b/i.test(text);

    if (isExplicitIndeterminato && !isExplicitDeterminato) {
      hasNoExpiry = true;
      expiryDate = undefined;
      title = 'Contratto di Lavoro a Tempo Indeterminato';
      extractedFields.push('Validità: Contratto a Tempo Indeterminato (Permanente)');
    }

    // 2. Extract Registration / Transmission Date (Data Invio / Trasmissione / Registrazione)
    // To ensure this filing/metadata date is NEVER confused with expiryDate
    const regMatch = text.match(
      /(?:data\s*(?:di)?\s*trasmissione|data\s*(?:di)?\s*invio|data\s*(?:di)?\s*comunicazione|data\s*(?:di)?\s*registrazione|data\s*(?:di)?\s*stipula|data\s*(?:di)?\s*ricezione|comunicazione\s+inviata\s+il|trasmesso\s+il|inviato\s+il|protocollo\s*(?:n\.?|numero)?\s*[A-Za-z0-9\-_/]+\s+del|ricevuta\s+del)[\s/:,\-A-Za-z.()]{0,35}?([0-3]?\d\s*[-/. ,]\s*[0-3]?\d\s*[-/. ,]\s*(?:19\d{2}|20\d{2}|\d{2})|\d{4}\s*[-/.]\s*[0-1]?\d\s*[-/.]\s*[0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))/i
    );
    let registrationDate: string | undefined;
    if (regMatch && regMatch[1]) {
      registrationDate = normalizeDate(regMatch[1]) ?? undefined;
      if (registrationDate) {
        issueDate = registrationDate;
        extractedFields.push(`Data Registrazione/Invio: ${registrationDate}`);
      }
    }

    // 3. Extract Contract Start Date (Data Inizio / Assunzione)
    const contractStartMatch = text.match(
      /(?:data\s*(?:di)?\s*assunzione|data\s*(?:di)?\s*inizio(?:\s*rapporto)?|decorrenza(?:\s*dal)?|assunto\s+il)[\s/:,\-A-Za-z.()]{0,40}?([0-3]?\d\s*[-/. ,]\s*[0-3]?\d\s*[-/. ,]\s*(?:19\d{2}|20\d{2}|\d{2})|\d{4}\s*[-/.]\s*[0-1]?\d\s*[-/.]\s*[0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))/i
    );
    let startDate: string | undefined;
    if (contractStartMatch && contractStartMatch[1]) {
      startDate = normalizeDate(contractStartMatch[1]) ?? undefined;
      if (startDate) {
        issueDate = startDate;
        extractedFields.push(`Data Inizio Assunzione: ${startDate}`);
      }
    }

    // 4. Search for Contract End Date (if not permanent)
    if (!hasNoExpiry) {
      // Priority 4a: Explicit contract termination markers
      const contractEndMatch = text.match(
        /(?:data\s*(?:di)?\s*fine(?:\s*rapporto)?|data\s*(?:di)?\s*termine(?:\s*rapporto)?|data\s*cessazione(?:\s*rapporto)?|termine\s*(?:del)?\s*rapporto|termine\s*(?:del)?\s*contratto|fine\s+rapporto|scadenza\s*(?:del)?\s*contratto|fino\s+al|fino\s+alla\s+data\s+del|con\s+scadenza\s+il|al\s+giorno)[\s/:,\-A-Za-z.()]{0,40}?([0-3]?\d\s*[-/. ,]\s*[0-3]?\d\s*[-/. ,]\s*(?:19\d{2}|20\d{2}|\d{2})|\d{4}\s*[-/.]\s*[0-1]?\d\s*[-/.]\s*[0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))/i
      );
      if (contractEndMatch && contractEndMatch[1]) {
        const norm = normalizeDate(contractEndMatch[1]);
        if (norm && norm !== registrationDate && norm !== startDate) {
          expiryDate = norm;
          title = 'Contratto di Lavoro a Tempo Determinato';
          extractedFields.push(`Data Fine Contratto: ${norm}`);
          confidence += 35;
        }
      }

      // Priority 4b: Table structure (Data inizio ... Data fine ... followed by dates)
      if (!expiryDate) {
        const tableMatch = text.match(
          /(?:data\s*inizio|inizio)[\s\S]{1,40}?(?:data\s*fine|termine|fine)[\s\S]{1,60}?([0-3]?\d[-/. ,][0-3]?\d[-/. ,](?:19\d{2}|20\d{2}|\d{2}))[\s\S]{1,40}?([0-3]?\d[-/. ,][0-3]?\d[-/. ,](?:19\d{2}|20\d{2}|\d{2}))/i
        );
        if (tableMatch) {
          const dStart = normalizeDate(tableMatch[1]);
          const dEnd = normalizeDate(tableMatch[2]);
          if (dEnd && dEnd !== dStart && dEnd !== registrationDate) {
            expiryDate = dEnd;
            title = 'Contratto di Lavoro a Tempo Determinato';
            extractedFields.push(`Data Fine Contratto (Tabella): ${dEnd}`);
            confidence += 30;
          }
        }
      }

      // Priority 4c: "dal ... al ..." range
      if (!expiryDate) {
        const dalAlMatch = text.match(
          /\bdal\s+([0-3]?\d[-/. ,][0-3]?\d[-/. ,](?:19\d{2}|20\d{2}|\d{2}))\s+al\s+([0-3]?\d[-/. ,][0-3]?\d[-/. ,](?:19\d{2}|20\d{2}|\d{2}))/i
        );
        if (dalAlMatch) {
          const dEnd = normalizeDate(dalAlMatch[2]);
          if (dEnd && dEnd !== registrationDate && dEnd !== startDate) {
            expiryDate = dEnd;
            title = 'Contratto di Lavoro a Tempo Determinato';
            extractedFields.push(`Data Fine Contratto (dal/al): ${dEnd}`);
            confidence += 30;
          }
        }
      }

      // 5. Final contract evaluation:
      // If no valid termination date was found:
      // If not explicitly temporary, Italian contracts are permanent (Tempo Indeterminato) by default.
      if (!expiryDate) {
        if (!isExplicitDeterminato) {
          hasNoExpiry = true;
          expiryDate = undefined;
          title = 'Contratto di Lavoro (Indeterminato)';
          extractedFields.push('Validità: Contratto a Tempo Indeterminato (Nessun termine apposto)');
        } else {
          // Explicitly temporary but end date requires user input
          expiryDate = undefined;
          needsReview = true;
          title = 'Contratto di Lavoro a Tempo Determinato';
          notes = 'عقد محدد المدة - يرجى مراجعة وتحديد تاريخ نهاية العقد يدوياً';
          extractedFields.push('⚠️ Richiede verifica manuale data termine contratto');
        }
      }
    }
  }

  // For Visita Medica:
  if (category === 'visita_medica' && !expiryDate) {
    const medMatch = text.match(
      /(?:prossima\s*visita|scadenza(?:\s*idoneit[àa])?|valido\s*fino\s*al|validit[àa]\s*fino\s*al|rinnovo\s*entro\s*il|entro\s*il)[\s/:,\-A-Za-z.()]{0,40}?([0-3]?\d\s*[-/. ,]\s*[0-3]?\d\s*[-/. ,]\s*(?:19\d{2}|20\d{2}|\d{2})|\d{4}\s*[-/.]\s*[0-1]?\d\s*[-/.]\s*[0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))/i
    );
    if (medMatch && medMatch[1]) {
      const norm = normalizeDate(medMatch[1]);
      if (norm) {
        expiryDate = norm;
        extractedFields.push(`Data Prossima Visita Medica: ${norm}`);
        confidence += 35;
      }
    }
  }

  // For Corso Sicurezza:
  if (category === 'corso_sicurezza' && !expiryDate) {
    const corsoMatch = text.match(
      /(?:scadenza\s*aggiornamento|aggiornamento\s*entro|valido\s*fino\s*al|validit[àa]\s*fino\s*al|scadenza|scade\s*il)[\s/:,\-A-Za-z.()]{0,40}?([0-3]?\d\s*[-/. ,]\s*[0-3]?\d\s*[-/. ,]\s*(?:19\d{2}|20\d{2}|\d{2})|\d{4}\s*[-/.]\s*[0-1]?\d\s*[-/.]\s*[0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))/i
    );
    if (corsoMatch && corsoMatch[1]) {
      const norm = normalizeDate(corsoMatch[1]);
      if (norm) {
        expiryDate = norm;
        extractedFields.push(`Data Scadenza Corso: ${norm}`);
        confidence += 35;
      }
    }
  }

  // 2. Extract Range "dal ... al ..." (Common in Italian permits, DURC and insurance)
  if (!expiryDate && !hasNoExpiry) {
    const rangeMatch = text.match(
      /\b(?:valido\s+)?(?:dal|da|from)\s+([0-3]?\d\s*[-/. ,]\s*[0-3]?\d\s*[-/. ,]\s*(?:19\d{2}|20\d{2}|\d{2})|\d{4}\s*[-/.]\s*[0-1]?\d\s*[-/.]\s*[0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))\s+\b(?:al|a|fino al|to|until)\s+([0-3]?\d\s*[-/. ,]\s*[0-3]?\d\s*[-/. ,]\s*(?:19\d{2}|20\d{2}|\d{2})|\d{4}\s*[-/.]\s*[0-1]?\d\s*[-/.]\s*[0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))/i
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

  // 3. Extract Expiry Date with flexible context (including Tessera Sanitaria 8, DURC, Visita Medica, CIE 4b)
  if (!expiryDate && !hasNoExpiry) {
    const expiryContextMatch = text.match(
      /(?:data\s*(?:di)?\s*scadenza|scadenza\s*(?:\/|\s*e\s*|\s*-\s*)?\s*expiry(?:\s*date)?|scadenza|scad\.|scade\s+il|scade|valido\s+fino\s+al|valida\s+fino\s+al|validit[àa]\s+fino\s+al|fino\s+al|entro\s+il|val\.\s*al|fine\s+validit[àa]|\b4b[.\s:,]+|\b8[.\s:,]+(?:scadenza|valido\s+fino\s+al)?|\b8\s+scadenza|\b6\.\s*scadenza|prossima\s+visita|scadenza\s+durc|valid\s+until|expiry\s*(?:date)?|expires\s*(?:on)?|تاريخ\s*(?:انتهاء\s*الصلاحية|الانتهاء|النفاذ)|صالح\s*(?:حتى|إلى))[\s/:,\-A-Za-z.()]{0,60}?([0-3]?\d\s*[-/. ,]\s*[0-3]?\d\s*[-/. ,]\s*(?:19\d{2}|20\d{2}|\d{2})|\d{4}\s*[-/.]\s*[0-1]?\d\s*[-/.]\s*[0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))/i
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
  if (!expiryDate && !hasNoExpiry) {
    const insuranceMatch = text.match(
      /\balle\s+ore\s*(?:24|12|00)(?::00)?\s+(?:del\s+)?([0-3]?\d\s*[-/. ,]\s*[0-3]?\d\s*[-/. ,]\s*(?:19\d{2}|20\d{2}|\d{2}))/i
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
      /(?<![a-zA-Z])(?:data di rilascio|data rilascio|data emissione|data di emissione|rilasciato il|rilasciata il|rilascio|emesso il|emessa il|in data|valido dal|del|4a[.\s:,]+|date of issue|issued on|issue date|تاريخ الإصدار|تاريخ الاصدار|تاريخ التحرير)[\s/:,\-A-Za-z.()]{0,40}?([0-3]?\d\s*[-/. ,]\s*[0-3]?\d\s*[-/. ,]\s*(?:19\d{2}|20\d{2}|\d{2})|\d{4}\s*[-/.]\s*[0-1]?\d\s*[-/.]\s*[0-3]?\d|[0-3]?\d\s+[a-z]{3,9}\s+(?:19\d{2}|20\d{2}|\d{2}))/i
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

  // 5. Smart Fallback with explicit verification flag (needsReview)
  // For Employment Contracts: NEVER guess a random date as expiry (it might be registration/protocol date).
  if (!expiryDate && !hasNoExpiry) {
    if (category === 'contratto_lavoro') {
      hasNoExpiry = true;
      needsReview = true;
      extractedFields.push('⚠️ Data fine contratto non rilevata - Impostato come permanente con verifica manuale');
    } else {
      const candidateDates = findAllCandidateDates(text, { filterRegistration: true });
      if (candidateDates.length > 0) {
        const futureDates = candidateDates.filter((d) => d.isFuture);
        if (futureDates.length > 0) {
          futureDates.sort((a, b) => a.normalized.localeCompare(b.normalized));
          expiryDate = futureDates[futureDates.length - 1].normalized;
          isExpiryEstimated = true;
          needsReview = true;
          extractedFields.push(`⚠️ Data Scadenza presunta: ${expiryDate} (richiede verifica)`);
          confidence += 20;
        } else {
          candidateDates.sort((a, b) => a.normalized.localeCompare(b.normalized));
          expiryDate = candidateDates[candidateDates.length - 1].normalized;
          isExpiryEstimated = true;
          needsReview = true;
          extractedFields.push(`⚠️ Data Scadenza presunta: ${expiryDate} (richiede verifica)`);
          confidence += 15;
        }
      } else {
        needsReview = true;
        isExpiryEstimated = true;
        extractedFields.push('⚠️ Nessuna data di scadenza rilevata - Richiede verifica manuale');
      }
    }
  }

  // 5b. Safety Verification: Expiry date CAN NEVER be identical to issue / registration date
  if (expiryDate && issueDate && expiryDate === issueDate) {
    expiryDate = undefined;
    if (category === 'contratto_lavoro') {
      hasNoExpiry = true;
      needsReview = true;
    } else {
      needsReview = true;
    }
    extractedFields.push('⚠️ Data scadenza coincidente con data registrazione/rilascio - Rimossa per sicurezza');
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
    const questuraMatch = text.match(/\bquestura(?:\s+(?:di|d'|di\s+rilascio|competente))?\s*[:.-]?\s*([A-Za-zÀ-ÿ'-]{3,20})/i);
    if (questuraMatch) {
      const city = questuraMatch[1].trim();
      if (!/^(rilascio|competente|provinciale|stranieri)$/i.test(city)) {
        issuingAuthority = `Questura di ${city}`;
        extractedFields.push(`Ente: ${issuingAuthority}`);
        confidence += 10;
      } else {
        issuingAuthority = 'Questura';
        extractedFields.push(`Ente: Questura`);
        confidence += 10;
      }
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
  if (!holderName) {
    const cleanExtractedName = extractCleanHolderName(text, category);
    if (cleanExtractedName) {
      holderName = cleanExtractedName;
      extractedFields.push(`Intestatario: ${holderName}`);
      confidence += 15;
    }
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
    durc: 'DURC - Regolarità Contributiva',
    visita_medica: 'Visita Medica Idoneità',
    corso_sicurezza: 'Corso Sicurezza sul Lavoro',
    busta_paga: 'Busta Paga',
    certificazione_unica: 'Certificazione Unica (CU)',
    visura_camerale: 'Visura Camerale',
    certificato: 'Certificato Ufficiale',
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
      } else if (cleanFn.includes('durc')) {
        category = 'durc';
      } else if (cleanFn.includes('visita') || cleanFn.includes('idoneita') || cleanFn.includes('medica')) {
        category = 'visita_medica';
      } else if (cleanFn.includes('corso') || cleanFn.includes('sicurezza') || cleanFn.includes('attestato')) {
        category = 'corso_sicurezza';
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
    hasNoExpiry,
    needsReview,
  };
}
