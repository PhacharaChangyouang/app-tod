const express = require('express');
const pool = require('./config/db');
const authenticate = require('./middlewares/authenticate');

const router = express.Router();
const TZ = 'Asia/Bangkok';

async function linkedElderly(req) {
  if (req.user.role !== 'caregiver') return [];
  const authUrl = process.env.AUTH_SERVICE_URL;
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!authUrl || !internalKey) throw new Error('AUTH_SERVICE_URL and INTERNAL_API_KEY are required');

  const response = await fetch(
    `${authUrl.replace(/\/$/, '')}/family/internal/${req.user.id}/elderly`,
    { headers: { 'x-internal-api-key': internalKey } }
  );
  if (!response.ok) throw new Error(`Linked elderly lookup failed: ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

router.get('/summary', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'caregiver') {
      return res.status(403).json({ success: false, message: 'เฉพาะบัญชีผู้ดูแลเท่านั้น' });
    }

    const elderly = await linkedElderly(req);
    if (!elderly.length) return res.json({ success: true, data: { elderly: [], today: [], history: [] } });

    const ids = elderly.map((item) => item.user_id);
    const today = await pool.query(`
      SELECT r.id AS reminder_id, r.user_id, r.medicine_name, r.dosage,
             r.reminder_time, r.is_active,
             CASE WHEN l.id IS NOT NULL AND l.status = 'taken' THEN true ELSE false END AS taken,
             l.status AS log_status, l.taken_at
      FROM reminders r
      LEFT JOIN reminder_logs l
        ON l.reminder_id = r.id
       AND l.user_id = r.user_id
       AND l.scheduled_date = (now() AT TIME ZONE '${TZ}')::date
       AND l.scheduled_time = r.reminder_time
      WHERE r.user_id = ANY($1::uuid[])
        AND r.is_active = true
        AND (r.start_date IS NULL OR r.start_date <= (now() AT TIME ZONE '${TZ}')::date)
        AND (r.end_date IS NULL OR r.end_date >= (now() AT TIME ZONE '${TZ}')::date)
      ORDER BY r.user_id, r.reminder_time
    `, [ids]);

    const history = await pool.query(`
      SELECT l.id, l.user_id, l.reminder_id, r.medicine_name, r.dosage,
             l.scheduled_date, l.scheduled_time, l.status, l.taken_at
      FROM reminder_logs l
      JOIN reminders r ON r.id = l.reminder_id
      WHERE l.user_id = ANY($1::uuid[])
        AND l.scheduled_date >= ((now() AT TIME ZONE '${TZ}')::date - 6)
      ORDER BY l.scheduled_date DESC, l.scheduled_time DESC
    `, [ids]);

    const elderlyMap = new Map(elderly.map((person) => [person.user_id, person]));
    res.json({
      success: true,
      data: {
        elderly,
        today: today.rows.map((row) => ({ ...row, person: elderlyMap.get(row.user_id) || null })),
        history: history.rows.map((row) => ({ ...row, person: elderlyMap.get(row.user_id) || null })),
      },
    });
  } catch (error) {
    console.error('Caregiver summary failed:', error);
    res.status(500).json({ success: false, message: 'โหลดข้อมูลผู้สูงอายุที่ดูแลไม่สำเร็จ' });
  }
});

module.exports = router;
