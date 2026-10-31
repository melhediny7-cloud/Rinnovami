# 📋 Rinnovami - Registro Modifiche (Changelog)

Tutte le modifiche rilevanti apportate a questo progetto sono documentate in questo file.

---

## [2.5.0] - 2026-10-31
### 🚀 Funzionalità Principali Aggiunte
- **PWA Nativa con Notifiche Locali Autonome**:
  - Implementazione completa di Service Worker (`public/sw.js`) con cache offline sicura (`rinnovami-pwa-v2`).
  - Integrazione Notifiche Locali del sistema operativo (`showLocalNotification`) con vibrazione e apertura automatica dell'app.
  - Verifica automatica scadenze ogni 60 minuti e al risveglio dell'app/tab.
- **Esportazione Calendario Avanzata con 6 Livelli di Allarme (VALARM)**:
  - Generazione di file `.ics` conformi RFC 5545 con 6 allarmi espliciti: `120`, `60`, `30`, `15`, `7` e `1` giorno prima della scadenza.
  - Aggiunta rapida con 1 clic a **Google Calendar** per ogni documento (`generateGoogleCalendarUrl`).
- **Archivio Documenti Permanente (Senza Scadenza)**:
  - Supporto per **Busta Paga**, **Certificazione Unica (CU/CUD)**, contratti a tempo indeterminato e atti notarili.
  - Tasto toggle "Documento Senza Scadenza / أرشيف دائم" con inserimento Anno di riferimento e Tag personalizzati.
  - Filtro dedicato "📁 Archivio Permanente / أرشيف دائم" nella barra di ricerca.
- **Isolamento Errori con React ErrorBoundary**:
  - Componente `<ErrorBoundary>` per prevenire crash a schermo bianco dell'applicazione in caso di eccezioni React.
- **Test Unitari Automatizzati con Vitest**:
  - Suite di test ad alta velocità per il calcolo delle scadenze (`tests/dateUtils.test.ts`) e per il motore OCR/MRZ italiano (`tests/italianDocParser.test.ts`).
  - Integrazione CI con **GitHub Actions** (`.github/workflows/ci.yml`).

---

## [2.4.0] - 2026-10-31
### 🔒 Sicurezza e Mappe
- **Autenticazione Biometrica WebAuthn (FaceID & TouchID)**:
  - Sblocco rapido dell'app con sensore biometrico del dispositivo senza dover digitare il PIN ogni volta.
- **Zero-Knowledge Cloud Sync (Sincronizzazione Cloud Cifrata End-to-End)**:
  - Cifratura client-side dei dati con AES-256-GCM e derivazione chiave PBKDF2 (100.000 iterazioni).
  - Generazione di QR Code di sincronizzazione per accoppiare telefoni e computer in totale privacy.
- **Mappa Interattiva degli Uffici di Rinnovo (Questure & Prefetture)**:
  - Guida ai requisiti, marche da bollo (€16), bollettini postali (€30.46) e numeri utili per le principali questure d'Italia.

---

## [2.3.0] - 2026-10-30
### 📱 Canali di Notifica Integrati
- **Notifiche WhatsApp Automatiche**:
  - Integrazione Green API per invio promemoria su chat WhatsApp con intestatario, giorni rimanenti e passaggi di rinnovo.
- **Notifiche Email via Webhook Make.com**:
  - Invio automatico di email formattate con tabella delle scadenze e allarmi critici.

---

## [2.0.0] - 2026-10-30
### 🔍 Motore OCR Italiano Intelligente
- **Riconoscimento Automatico MRZ (Machine Readable Zone)**:
  - Supporto per passaporti (TD3) e carte d'identità / permessi di soggiorno (TD1).
- **Elaborazione Immagini su Canvas**:
  - Filtro scala di grigi e contrasto dinamico per eliminare filigrane e sfondi colorati dei documenti.
- **Archiviazione Locale IndexedDB**:
  - Rimozione completa dei dati demo di default; salvataggio persistente e sicuro solo dei documenti caricati dall'utente.
