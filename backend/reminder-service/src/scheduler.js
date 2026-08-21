const pool = require('./config/db');

function getThailandParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'long', hourCycle: 'h23'
  }).formatToParts(now).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    day: parts.weekday.toLowerCase()
  };
}

async function getRecipients(userId) {
  const response = await fetch(`http://aha-auth-service:3001/family/internal/${userId}/recipients`, {
    headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY }
  });
  if (!response.ok) throw new Error(`Recipient lookup failed: ${response.status}`);
  const body = await response.json();
  return body.data || [userId];
}

async function sendNotification(userId, reminder, occurrenceKey) {
  const response = await fetch('http://aha-notification-service:3003/api/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-api-key': process.env.INTERNAL_API_KEY
    },
    body: JSON.stringify({
      user_id: userId, type: 'reminder', title: 'ได้เวลาทานยาแล้ว!',
      message: `กรุณาทานยา ${reminder.medicine_name} ${reminder.dosage || ''}`,
      related_id: reminder.id, dedupe_key: `${userId}:${reminder.id}:${occurrenceKey}`
    })
  });
  if (!response.ok) throw new Error(`Notification failed: ${response.status}`);
}

async function checkAndTriggerReminders() {
  const thailand = getThailandParts();
  try {
    const result = await pool.query(
      `SELECT id, user_id, medicine_name, dosage, reminder_time, last_triggered_key
       FROM reminders
       WHERE is_active = true AND reminder_time <= $1::time AND $2 = ANY(days_of_week)
         AND (start_date IS NULL OR start_date <= $3::date)
         AND (end_date IS NULL OR end_date >= $3::date)
       ORDER BY reminder_time ASC`,
      [thailand.time, thailand.day, thailand.date]
    );

    for (const reminder of result.rows) {
      const scheduledKey = `${thailand.date}T${String(reminder.reminder_time).slice(0, 5)}`;
      if (reminder.last_triggered_key === scheduledKey) continue;
      try {
        const recipients = await getRecipients(reminder.user_id);
        for (const recipientId of recipients) await sendNotification(recipientId, reminder, scheduledKey);
        await pool.query(
          `UPDATE reminders SET last_triggered_key = $1, updated_at = now()
           WHERE id = $2 AND (last_triggered_key IS DISTINCT FROM $1)`,
          [scheduledKey, reminder.id]
        );
        console.log(`Reminder delivered: ${reminder.id} ${scheduledKey}`);
      } catch (error) {
        console.error('Failed to deliver reminder; will retry', reminder.id, error);
      }
    }
  } catch (error) {
    console.error('Scheduler Error:', error);
  }
}

function startScheduler() {
  console.log('Starting reminder scheduler with 5-second checks');
  checkAndTriggerReminders();
  setInterval(checkAndTriggerReminders, 5000);
}

module.exports = { startScheduler, checkAndTriggerReminders, getThailandParts };
