/**
 * Rinnovami - 24/7 Automated WhatsApp Background Notifier
 * 
 * Can be run daily via:
 * 1. Windows Task Scheduler (e.g. every day at 08:30 AM)
 * 2. Linux Cron (`30 8 * * * node scripts/cron-whatsapp-notifier.js`)
 * 3. GitHub Actions scheduled workflow
 * 
 * Usage:
 *   node scripts/cron-whatsapp-notifier.js --backup=rinnovami-backup.json --phone=+393331234567
 */

const fs = require('fs');
const path = require('path');

const BACKUP_FILE = process.env.RINNOVAMI_BACKUP_PATH || process.argv.find(a => a.startsWith('--backup='))?.split('=')[1] || path.join(__dirname, '../rinnovami-backup.json');
const RECIPIENT_PHONE = process.env.ALERT_PHONE_TO || process.argv.find(a => a.startsWith('--phone='))?.split('=')[1] || '+393331234567';
const GREEN_API_INSTANCE = process.env.GREEN_API_INSTANCE;
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN;

function calculateDaysRemaining(expiryDateStr) {
  const [year, month, day] = expiryDateStr.split('-').map(Number);
  const expiryUtc = Date.UTC(year, month - 1, day);
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = expiryUtc - todayUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function cleanPhone(p) {
  return p.replace(/[^0-9]/g, '');
}

async function run() {
  console.log('--- Rinnovami Background WhatsApp Notifier ---');
  console.log(`Checking backup: ${BACKUP_FILE}`);

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`Backup file not found at ${BACKUP_FILE}`);
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
    console.log('No expiring documents found today.');
    return;
  }

  console.log(`Found ${urgent.length} urgent document(s) for WhatsApp reminder.`);

  let msg = `🚨 *تنبيه Rinnovami - تذكير بمواعيد تجديد الوثائق*\n\nلديك *${urgent.length}* وثائق بحاجة للتجديد:\n\n`;
  urgent.forEach((d, i) => {
    const statusText = d.isExpired ? `منتهية منذ ${Math.abs(d.daysRemaining)} يوم!` : `متبقي ${d.daysRemaining} يوم`;
    msg += `${i + 1}. *${d.title}*\n   • الرقم: ${d.number}\n   • الانتهاء: *${d.expiryDate}* (${statusText})\n\n`;
  });
  msg += `💡 يرجى البدء في حجز المواعيد مبكراً.\n_تطبيق Rinnovami_`;

  const phone = cleanPhone(RECIPIENT_PHONE);

  // If Green API configured, send directly via API
  if (GREEN_API_INSTANCE && GREEN_API_TOKEN) {
    console.log(`Sending WhatsApp message to ${phone} via Green API...`);
    try {
      const url = `https://api.green-api.com/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${phone}@c.us`,
          message: msg
        })
      });
      const data = await res.json();
      console.log('WhatsApp message sent successfully:', data);
    } catch (err) {
      console.error('Failed to send WhatsApp message:', err.message);
    }
  } else {
    console.log('\n--- WhatsApp Message Preview ---');
    console.log(`To: +${phone}`);
    console.log(`Message:\n${msg}`);
    console.log('\nDirect WhatsApp Link:\n' + `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
    console.log('\nTip: Set GREEN_API_INSTANCE and GREEN_API_TOKEN for fully automatic WhatsApp delivery.');
  }
}

run();
