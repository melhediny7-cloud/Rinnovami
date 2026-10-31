import { describe, it, expect } from 'vitest';
import {
  normalizeDate,
  findAllCandidateDates,
  extractMRZData,
  analyzeItalianDocumentText
} from '../src/utils/italianDocParser';

describe('italianDocParser - Document Analysis & OCR Parser', () => {
  describe('normalizeDate', () => {
    it('normalizes ISO dates', () => {
      expect(normalizeDate('2028-06-15')).toBe('2028-06-15');
      expect(normalizeDate('2027/12/31')).toBe('2027-12-31');
    });

    it('normalizes standard European DD/MM/YYYY dates', () => {
      expect(normalizeDate('25/04/2027')).toBe('2027-04-25');
      expect(normalizeDate('05.10.2028')).toBe('2028-10-05');
      expect(normalizeDate('12-08-2026')).toBe('2026-08-12');
    });

    it('normalizes Italian textual month names', () => {
      expect(normalizeDate('16 Gennaio 2028')).toBe('2028-01-16');
      expect(normalizeDate('30 Giugno 2027')).toBe('2027-06-30');
      expect(normalizeDate('15 Dicembre 2029')).toBe('2029-12-15');
    });

    it('returns null for strings without valid dates', () => {
      expect(normalizeDate('Repubblica Italiana')).toBeNull();
      expect(normalizeDate('')).toBeNull();
    });
  });

  describe('extractMRZData (TD1 and TD3 Machine Readable Zones)', () => {
    it('accurately parses 3-line TD1 format used on Italian Carta d Identita Elettronica (CIE)', () => {
      const td1Sample = `
        IDITA12345678<9<<<<<<<<<<<<<<<
        8501015M2810312ITA<<<<<<<<<<<4
        ROSSI<<MARIO<<<<<<<<<<<<<<<<<<
      `;

      const mrz = extractMRZData(td1Sample);
      expect(mrz).not.toBeNull();
      if (mrz) {
        expect(mrz.documentNumber).toBe('12345678');
        expect(mrz.holderName).toBe('ROSSI MARIO');
        expect(mrz.expiryDate).toBe('2028-10-31');
      }
    });

    it('accurately parses 2-line TD3 format used on Italian Passports', () => {
      const td3Sample = `
        P<ITAROSSI<<MARIO<<<<<<<<<<<<<<<<<<<<<<<<<<<
        YA12345672ITA8501015M3010318<<<<<<<<<<<<<<02
      `;

      const mrz = extractMRZData(td3Sample);
      expect(mrz).not.toBeNull();
      if (mrz) {
        expect(mrz.documentNumber).toBe('YA1234567');
        expect(mrz.holderName).toBe('ROSSI MARIO');
        expect(mrz.expiryDate).toBe('2030-10-31');
      }
    });
  });

  describe('analyzeItalianDocumentText', () => {
    it('detects Permesso di Soggiorno with Questura authority and expiry date', () => {
      const sampleText = `
        REPUBBLICA ITALIANA
        MINISTERO DELL'INTERNO
        PERMESSO DI SOGGIORNO
        QUESTURA DI MILANO
        COGNOME: ROSSI
        NOME: MARIO
        NUMERO DOCUMENTO: I09876543
        DATA DI SCADENZA: 15/09/2028
        MOTIVO: LAVORO SUBORDINATO
      `;

      const result = analyzeItalianDocumentText(sampleText, 'Permesso.pdf');
      expect(result.category).toBe('permesso_soggiorno');
      expect(result.expiryDate).toBe('2028-09-15');
      expect(result.issuingAuthority?.toLowerCase()).toContain('milano');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
    });

    it('detects Patente di Guida with document number and MIT authority', () => {
      const samplePatente = `
        REPUBBLICA ITALIANA
        PATENTE DI GUIDA
        1. ROSSI
        2. MARIO
        3. 01/01/1985
        4a. 10/05/2023
        4b. 10/05/2033
        4c. M.I.T. - U.C.O.
        5. U12345678A
      `;

      const result = analyzeItalianDocumentText(samplePatente);
      expect(result.category).toBe('patente');
      expect(result.expiryDate).toBe('2033-05-10');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(60);
    });

    it('detects Tessera Sanitaria and extracts Codice Fiscale', () => {
      const sampleTS = `
        REPUBBLICA ITALIANA
        TESSERA SANITARIA
        CARTA NAZIONALE DEI SERVIZI
        CODICE FISCALE: RSSMRA85M01H501Z
        COGNOME: ROSSI
        NOME: MARIO
        SCADENZA: 31/12/2029
      `;

      const result = analyzeItalianDocumentText(sampleTS);
      expect(result.category).toBe('tessera_sanitaria');
      expect(result.expiryDate).toBe('2029-12-31');
      expect(result.documentNumber).toBe('RSSMRA85M01H501Z');
    });

    it('detects Busta Paga as permanent document category', () => {
      const sampleBusta = `
        AZIENDA SPA
        PROSPETTO PAGA - CEDOLINO
        MESE: OTTOBRE 2026
        DIPENDENTE: ROSSI MARIO
        MATRICOLA: 12345
        NETTO DEL MESE: 1.850,00
      `;

      const result = analyzeItalianDocumentText(sampleBusta, 'Busta_Paga_10_2026.pdf');
      expect(result.category).toBe('busta_paga');
    });
  });
});
