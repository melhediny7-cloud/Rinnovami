import { describe, it, expect } from 'vitest';
import {
  normalizeDate,
  sanitizeDateCandidate,
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
      expect(result.hasNoExpiry).toBe(true);
    });

    it('sanitizes OCR date spaces and letter misreadings (O->0, l->1)', () => {
      expect(normalizeDate('15 / 09 / 2028')).toBe('2028-09-15');
      expect(normalizeDate('15 . 09 . 2028')).toBe('2028-09-15');
      expect(normalizeDate('31/12/2O28')).toBe('2028-12-31');
      expect(normalizeDate('l5/O9/2O28')).toBe('2028-09-15');
    });

    it('detects Tessera Sanitaria EHIC field 8 (European Health Insurance Card back side)', () => {
      const sampleBackTS = `
        TESSERA EUROPEA DI ASSICURAZIONE MALATTIA
        3 ROSSI
        4 MARIO
        5 01/01/1985
        6 12345678901234567890
        8. 31/12/2028
      `;
      const result = analyzeItalianDocumentText(sampleBackTS);
      expect(result.expiryDate).toBe('2028-12-31');
    });

    it('detects DURC INPS/INAIL with validity expiry date', () => {
      const sampleDurc = `
        DOCUMENTO UNICO DI REGOLARITA CONTRIBUTIVA
        DURC ONLINE
        Protocollo INPS_12345678
        Denominazione: EDIL COSTRUZIONI SRL
        Codice Fiscale: 01234567890
        Risulta regolare ai fini del DURC.
        Scadenza validità: 16/01/2027
      `;
      const result = analyzeItalianDocumentText(sampleDurc, 'DURC_INPS.pdf');
      expect(result.category).toBe('durc');
      expect(result.expiryDate).toBe('2027-01-16');
      expect(result.issuingAuthority).toBe('INPS - INAIL');
    });

    it('detects Permesso a tempo indeterminato (illimitata) without setting a fake expiration date', () => {
      const sampleIllimitato = `
        REPUBBLICA ITALIANA
        PERMESSO DI SOGGIORNO UE
        SOGGIORNANTE DI LUNGO PERIODO
        DURATA: ILLIMITATA
        COGNOME: ROSSI
        NOME: MARIO
        DATA DI RILASCIO: 10/05/2022
      `;
      const result = analyzeItalianDocumentText(sampleIllimitato);
      expect(result.hasNoExpiry).toBe(true);
      expect(result.expiryDate).toBeUndefined();
    });

    it('correctly classifies contract with worker permit references as contratto_lavoro (not permesso)', () => {
      const contractSample = `
        CONTRATTO DI SOGGIORNO PER LAVORO SUBORDINATO
        MODELLO UNILAV
        DATORE DI LAVORO: COSTRUZIONI MILANO SRL
        LAVORATORE: ELSHAHNA MOHAMED
        Titolare di Permesso di Soggiorno n. I22818654 scadenza 14/03/2033
        Tipologia: Contratto di lavoro a tempo determinato
        Data inizio: 01/07/2026
        Data fine rapporto: 31/12/2027
      `;
      const result = analyzeItalianDocumentText(contractSample, 'ELSHAHNA.pdf');
      expect(result.category).toBe('contratto_lavoro');
      expect(result.expiryDate).toBe('2027-12-31');
      expect(result.holderName).toBe('ELSHAHNA MOHAMED');
      expect(result.hasNoExpiry).toBe(false);
    });

    it('correctly detects permanent contract (tempo indeterminato) without expiry date', () => {
      const contractIndet = `
        LETTERA DI ASSUNZIONE - CONTRATTO DI LAVORO
        DATORE DI LAVORO: ABC LOGISTICA SPA
        LAVORATORE: ROSSI MARIO
        Si comunica l assunzione a tempo indeterminato con decorrenza dal 15/09/2026.
        Mansione: Magazziniere Livello 4 CCNL Trasporti
      `;
      const result = analyzeItalianDocumentText(contractIndet, 'Contratto_Rossi.pdf');
      expect(result.category).toBe('contratto_lavoro');
      expect(result.hasNoExpiry).toBe(true);
      expect(result.expiryDate).toBeUndefined();
    });

    it('correctly detects Visita Medica and next visit expiry date', () => {
      const visitaSample = `
        CENTRO DI MEDICINA DEL LAVORO
        GIUDIZIO DI IDONEITA ALLA MANSIONE
        SORVEGLIANZA SANITARIA EX D.LGS 81/08
        LAVORATORE: VERDI GIUSEPPE
        Mansione: Muratore
        Esito: IDONEO alla mansione specifica
        Data visita: 10/01/2026
        Prossima visita: 10/01/2027
      `;
      const result = analyzeItalianDocumentText(visitaSample, 'Visita_Idoneita.pdf');
      expect(result.category).toBe('visita_medica');
      expect(result.expiryDate).toBe('2027-01-10');
      expect(result.holderName).toBe('VERDI GIUSEPPE');
    });

    it('correctly detects Corso Sicurezza and refresher deadline', () => {
      const corsoSample = `
        ATTESTATO DI FREQUENZA E PROFITTO
        CORSO DI FORMAZIONE GENERALE E SPECIFICA DEI LAVORATORI
        SICUREZZA SUL LAVORO AI SENSI DEL D.LGS. 81/2008 E ACCORDO STATO-REGIONI
        Si attesta che: ROSSI MARIO
        Ha superato la verifica finale con esito positivo.
        Data rilascio: 15/05/2024
        Scadenza aggiornamento: 15/05/2029
      `;
      const result = analyzeItalianDocumentText(corsoSample, 'Attestato_Sicurezza.pdf');
      expect(result.category).toBe('corso_sicurezza');
      expect(result.expiryDate).toBe('2029-05-15');
      expect(result.holderName).toBe('ROSSI MARIO');
    });
  });
});
