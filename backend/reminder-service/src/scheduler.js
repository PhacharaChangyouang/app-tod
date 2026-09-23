require('dotenv').config();

const pool = require('./config/db');

const TZ = 'Asia/Bangkok';
const MAX_LATE_MINUTES = 10;

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

function isSnoozeDue(reminder, nowDate = new Date()) {
  return Boolean(
    reminder.snooze_until &&
    new Date(reminder.snooze_until).getTime() <= nowDate.getTime()
  );
}

function scheduledDateTime(date, time) {
  return new Date(`${date}T${String(time).slice(0, 5)}:00+07:00`);
}

function isDue(reminder, now, nowDate = new Date()) {
  if (!reminder.is_active) return false;
  if (isSnoozeDue(reminder, nowDate)) return true;
  if (reminder.snooze_until) return false;
  if (reminder.start_date && String(reminder.start_date).slice(0,10) > now.date) return false;
  if (reminder.end_date && String(reminder.end_date).slice(0,10) < now.date) return false;

  const days = Array.isArray(reminder.days_of_week) ? reminder.days_of_week.map(String) : [];
  if (!days.includes(now.day)) return false;

  const scheduled = scheduledDateTime(now.date, reminder.reminder_time);
  const diffMinutes = Math.floor((nowDate.getTime() - scheduled.getTime()) / 60000);
  return diffMinutes >= 0 && diffMinutes <= MAX_LATE_MINUTES;
}

async function getRecipients(reminder) {
  const authUrl = process.env.AUTH_SERVICE_URL;
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!authUrl || !internalKey) {
    throw new Error('AUTH_SERVICE_URL and INTERNAL_API_KEY are required');
  }

  const response = await fetch(
    `${authUrl.replace(/\/$/, '')}/family/internal/${reminder.user_id}/recipients`,
    { headers: { 'x-internal-api-key': internalKey } }
  );

  if (!response.ok) throw new Error(`Recipient lookup failed: ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload.data) ? [...new Set(payload.data)] : [reminder.user_id];
}

async function notifyRecipients(reminder, triggerKey, { late = false } = {}) {
  const notificationUrl = process.env.NOTIFICATION_SERVICE_URL;
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!notificationUrl || !internalKey) {
    throw new Error('NOTIFICATION_SERVICE_URL and INTERNAL_API_KEY are required');
  }

  const recipients = await getRecipients(reminder);
  const title = late ? 'เลยเวลาทานยา' : triggerKey.startsWith('snooze:') ? 'ถึงเวลาทานยาอีกครั้ง' : 'ถึงเวลาเตือนยา';
  const message = late
    ? `ยังไม่ได้ยืนยันการทานยา ${reminder.medicine_name}${reminder.dosage ? ` (${reminder.dosage})` : ''} กรุณาตรวจสอบและยืนยันการทานยา`
    : `ถึงเวลาทานยา ${reminder.medicine_name}${reminder.dosage ? ` (${reminder.dosage})` : ''}`;

  for (const userId of recipients) {
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
          title,
          message,
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
  const nowDate = new Date();
  const result = await pool.query(`
    SELECT * FROM reminders
    WHERE is_active = true
      AND (start_date IS NULL OR start_date <= $1::date)
      AND (end_date IS NULL OR end_date >= $1::date)
  `, [now.date]);

  for (const reminder of result.rows) {
    const snoozeDue = isSnoozeDue(reminder, nowDate);
    if (!isDue(reminder, now, nowDate)) continue;

    const triggerKey = snoozeDue
      ? `snooze:${new Date(reminder.snooze_until).toISOString().slice(0, 16)}`
      : `${now.date}:${String(reminder.reminder_time).slice(0, 5)}`;

    if (reminder.last_triggered_key === triggerKey) continue;

    try {
      await notifyRecipients(reminder, triggerKey);
      await pool.query(`
        UPDATE reminders
        SET last_triggered_key = $1,
            last_late_triggered_key = NULL,
            snooze_until = CASE WHEN $2 THEN NULL ELSE snooze_until END,
            updated_at = now()
        WHERE id = $3 AND is_active = true
          AND (last_triggered_key IS DISTINCT FROM $1)
      `, [triggerKey, snoozeDue, reminder.id]);
      console.log(`Reminder sent: ${reminder.id} ${triggerKey}`);
    } catch (error) {
      console.error('Reminder notification failed (will retry):', error.message);
    }
  }
}

function getTriggerDateTime(reminder, nowDate) {
  const key = String(reminder.last_triggered_key || '');
  if (key.startsWith('snooze:')) {
    const value = key.slice('snooze:'.length);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const now = localParts(nowDate);
  const normalKey = `${now.date}:${String(reminder.reminder_time).slice(0, 5)}`;
  if (key !== normalKey) return null;
  return scheduledDateTime(now.date, reminder.reminder_time);
}

async function processLateReminders() {
  const nowDate = new Date();
  const now = localParts(nowDate);
  const result = await pool.query(`
    SELECT r.*
    FROM reminders r
    WHERE r.is_active = true
      AND (r.start_date IS NULL OR r.start_date <= $1::date)
      AND (r.end_date IS NULL OR r.end_date >= $1::date)
      AND r.last_triggered_key IS NOT NULL
      AND (r.last_late_triggered_key IS NULL)
  `, [now.date]);

  for (const reminder of result.rows) {
    const triggerAt = getTriggerDateTime(reminder, nowDate);
    if (!triggerAt) continue;

    const elapsedMinutes = Math.floor((nowDate.getTime() - triggerAt.getTime()) / 60000);
    if (elapsedMinutes < MAX_LATE_MINUTES) continue;

    const log = await pool.query(`
      SELECT 1 FROM reminder_logs
      WHERE reminder_id = $1
        AND user_id = $2
        AND scheduled_date = $3::date
        AND status = 'taken'
      LIMIT 1
    `, [reminder.id, reminder.user_id, now.date]);

    if (log.rowCount) continue;

    const lateKey = `late:${reminder.last_triggered_key}`;
    try {
      await notifyRecipients(reminder, lateKey, { late: true });
      await pool.query(`
        UPDATE reminders
        SET last_late_triggered_key = $1, updated_at = now()
        WHERE id = $2 AND is_active = true
          AND last_late_triggered_key IS DISTINCT FROM $1
      `, [lateKey, reminder.id]);
      console.log(`Late reminder sent: ${reminder.id} ${lateKey}`);
    } catch (error) {
      console.error('Late reminder notification failed (will retry):', error.message);
    }
  }
}

function startScheduler() {
  const run = () => Promise.all([
    processDueReminders(),
    processLateReminders(),
  ]).catch((error) => console.error('Scheduler error:', error));
  run();
  setInterval(run, 15 * 1000);
  console.log(`Reminder scheduler started (15s interval, Asia/Bangkok, ${MAX_LATE_MINUTES}m late alert)`);
}

module.exports = {
  startScheduler,
  processDueReminders,
  processLateReminders,
  localParts,
  isDue,
  isSnoozeDue,
};
