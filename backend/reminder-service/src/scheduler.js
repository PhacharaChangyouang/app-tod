require('dotenv').config();

const pool = require('./config/db');

const TZ = 'Asia/Bangkok';
const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
    day: new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(date).toLowerCase(),
  };
}

function isDue(reminder, now) {
  if (!reminder.is_active) return false;
  if (reminder.start_date && String(reminder.start_date).slice(0,10) > now.date) return false;
  if (reminder.end_date && String(reminder.end_date).slice(0,10) < now.date) return false;

  const days = Array.isArray(reminder.days_of_week) ? reminder.days_of_week.map(String) : [];
  if (!days.includes(now.day)) return false;

  return String(reminder.reminder_time).slice(0,5) === now.time;
}

async function notifyRecipients(reminder, triggerKey) {
  const authUrl = process.env.AUTH_SERVICE_URL;
  const notificationUrl = process.env.NOTIFICATION_SERVICE_URL;
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!authUrl || !notificationUrl || !internalKey) {
    throw new Error('AUTH_SERVICE_URL, NOTIFICATION_SERVICE_URL and INTERNAL_API_KEY are required');
  }

  const recipientsResponse = await fetch(
    `${authUrl.replace(/\/$/, '')}/family/internal/${reminder.user_id}/recipients`,
    { headers: { 'x-internal-api-key': internalKey } }
  );
  if (!recipientsResponse.ok) {
    throw new Error(`Recipient lookup failed: ${recipientsResponse.status}`);
  }

  const recipients = await recipientsResponse.json();
  const ids = Array.isArray(recipients.data) ? [...new Set(recipients.data)] : [reminder.user_id];

  for (const userId of ids) {
    const response = await fetch(
      `${notificationUrl.replace(/\/$/, '')}/api/notifications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': internalKey,
        },
        body: JSON.stringify({
          user_id: userId,
          type: 'medicine_reminder',
          title: 'ถึงเวลาเตือนยา',
          message: `ถึงเวลาทานยา ${reminder.medicine_name}${reminder.dosage ? ` (${reminder.dosage})` : ''}`,
          related_id: reminder.id,
          dedupe_key: `reminder:${reminder.id}:${userId}:${triggerKey}`,
        }),
      }
    );
    if (!response.ok) throw new Error(`Notification create failed: ${response.status}`);
  }
}

async function processDueReminders() {
  const now = localParts();
  const result = await pool.query(`
    SELECT * FROM reminders
    WHERE is_active = true
      AND (start_date IS NULL OR start_date <= $1::date)
      AND (end_date IS NULL OR end_date >= $1::date)
  `, [now.date]);

  for (const reminder of result.rows) {
    if (!isDue(reminder, now)) continue;

    const triggerKey = `${now.date}:${now.time}`;
    // ส่งก่อน แล้วค่อยบันทึก last_triggered_key
    // เพื่อให้ถ้า Notification Service ล่ม ระบบจะ retry ในรอบถัดไป
    // Notification Service มี dedupe_key ป้องกันการส่งซ้ำ
    if (reminder.last_triggered_key === triggerKey) continue;

    try {
      await notifyRecipients(reminder, triggerKey);

      await pool.query(`
        UPDATE reminders
        SET last_triggered_key = $1, updated_at = now()
        WHERE id = $2 AND is_active = true
          AND (last_triggered_key IS DISTINCT FROM $1)
      `, [triggerKey, reminder.id]);

      console.log(`Reminder sent: ${reminder.id} ${triggerKey}`);
    } catch (error) {
      console.error('Reminder notification failed (will retry):', error.message);
    }
  }
}

function startScheduler() {
  const run = () => processDueReminders().catch((error) => console.error('Scheduler error:', error));
  run();
  setInterval(run, 30 * 1000);
  console.log('Reminder scheduler started (30s interval, Asia/Bangkok)');
}

module.exports = { startScheduler, processDueReminders, localParts, isDue };
