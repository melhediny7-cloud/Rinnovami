/**
 * Rinnovami - 24/7 Automated Background Email Notifier
 * 
 * This standalone script can be run daily via:
 * 1. Windows Task Scheduler (e.g. every morning at 08:00 AM)
 * 2. Linux Cron (`0 8 * * * node scripts/cron-email-notifier.js`)
 * 3. Free GitHub Actions scheduled workflow (.github/workflows/alerts.yml)
 * 
 * Usage:
 *   node scripts/cron-email-notifier.js --backup=rinnovami-backup.json --to=your-email@example.com
 */

const fs = require('fs');
const path = require('path');

// Configuration via environment or arguments
const BACKUP_FILE = process.env.RINNOVAMI_BACKUP_PATH || process.argv.find(a => a.startsWith('--backup='))?.split('=')[1] || path.join(__dirname, '../rinnovami-backup.json');
const RECIPIENT_EMAIL = process.env.ALERT_EMAIL_TO || process.argv.find(a => a.startsWith('--to='))?.split('=')[1] || 'Greenimpianti225@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

function calculateDaysRemaining(expiryDateStr) {
  const [year, month, day] = expiryDateStr.split('-').map(Number);
  const expiryUtc = Date.UTC(year, month - 1, day);
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = expiryUtc - todayUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

async function run() {
  console.log('--- Rinnovami Background Alert Service ---');
  console.log(`Checking backup file: ${BACKUP_FILE}`);

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`Error: Backup file not found at ${BACKUP_FILE}`);
    console.log('Export your backup from Rinnovami (Download JSON icon) and place it here.');
    process.exit(1);
  }

  let documents = [];
  try {
    const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    documents = Array.isArray(parsed) ? parsed : (parsed.documents || []);
  } catch (e) {
    console.error('Failed to parse backup JSON:', e.message);
    process.exit(1);
  }

  const urgent = [];
  for (const doc of documents) {
    if (!doc.expiryDate) continue;
    const days = calculateDaysRemaining(doc.expiryDate);
    if (days <= 30) {
      urgent.push({
        title: doc.title,
        number: doc.documentNumber || 'N/A',
        holder: doc.holderName || 'N/A',
        expiryDate: doc.expiryDate,
        daysRemaining: days,
        isExpired: days < 0
      });
    }
  }

  if (urgent.length === 0) {
    console.log('All documents are valid. No alerts needed today!');
    return;
  }

  console.log(`Found ${urgent.length} urgent document(s):`);
  urgent.forEach(d => {
    console.log(` - ${d.title} (Scadenza: ${d.expiryDate}, Mancano: ${d.daysRemaining} gg)`);
  });

  const emailSubject = `🚨 [Rinnovami Alert] ${urgent.length} documenti richiedono attenzione!`;
  let emailBody = `Rinnovami - Promemoria Scadenze Documenti\n\n`;
  urgent.forEach(d => {
    emailBody += `• ${d.title}\n  Numero: ${d.number}\n  Intestatario: ${d.holder}\n  Scadenza: ${d.expiryDate} (${d.isExpired ? `Scaduto da ${Math.abs(d.daysRemaining)} gg` : `Mancano ${d.daysRemaining} gg`})\n\n`;
  });

  // If RESEND_API_KEY is available, send real email via Resend API
  if (RESEND_API_KEY) {
    console.log(`Dispatching email to ${RECIPIENT_EMAIL} via Resend...`);
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Rinnovami <alerts@resend.dev>',
          to: [RECIPIENT_EMAIL],
          subject: emailSubject,
          text: emailBody
        })
      });
      const data = await res.json();
      console.log('Email sent successfully:', data);
    } catch (err) {
      console.error('Failed to send email via Resend:', err.message);
    }
  } else {
    console.log('\n--- Prepared Notification Content ---');
    console.log(`To: ${RECIPIENT_EMAIL}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`Body:\n${emailBody}`);
    console.log('Tip: Set RESEND_API_KEY environment variable to automatically send emails via Resend API.');
  }
}

run();
