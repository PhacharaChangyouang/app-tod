const pool = require('./config/db');

async function checkAndTriggerReminders() {
  try {
    // Note: In production, consider timezone, idempotency (flagging as sent), and message queues
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // "HH:MM"

    const result = await pool.query(
      `
      SELECT id, user_id, medicine_name, dosage
      FROM reminders
      WHERE is_active = true
        AND reminder_time = $1
      `,
      [currentTime]
    );

    for (const reminder of result.rows) {
      // Internal call to notification-service
      try {
        await fetch('http://aha-notification-service:3003/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': process.env.INTERNAL_API_KEY
          },
          body: JSON.stringify({
            type: 'reminder',
            title: 'ได้เวลาทานยาแล้ว!',
            message: `กรุณาทานยา ${reminder.medicine_name} ${reminder.dosage || ''}`,
            related_id: reminder.id
          })
        });
      } catch (err) {
        console.error('Failed to send notification for reminder', reminder.id, err);
      }
    }
  } catch (error) {
    console.error('Scheduler Error:', error);
  }
}

function startScheduler() {
  console.log('Starting reminder scheduler...');
  // Check every 1 minute
  setInterval(checkAndTriggerReminders, 60000);
}

module.exports = { startScheduler };
