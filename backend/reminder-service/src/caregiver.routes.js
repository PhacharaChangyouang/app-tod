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

function hasLinkedElderly(people, elderlyId) {
  return people.some((person) => String(person.user_id) === String(elderlyId));
}

async function notifyElderly(req, elderlyId, reminderId, action, detail) {
  const notificationUrl = process.env.NOTIFICATION_SERVICE_URL;
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!notificationUrl || !internalKey) return;

  const response = await fetch(
    `${notificationUrl.replace(/\/$/, '')}/api/notifications`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': internalKey,
      },
      body: JSON.stringify({
        user_id: elderlyId,
        type: 'caregiver_medicine_change',
        title: 'มีการเปลี่ยนแปลงตารางยา',
        message: `ผู้ดูแล${action}รายการยา${detail ? `: ${detail}` : ''} กรุณาตรวจสอบว่าข้อมูลถูกต้อง`,
        related_id: reminderId || null,
        dedupe_key: `caregiver-change:${req.user.id}:${elderlyId}:${reminderId || 'new'}:${Date.now()}`,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Caregiver notification failed: ${response.status} ${text}`);
  }
}

function validateReminderPayload(body, { partial = false } = {}) {
  const medicineName = String(body.medicine_name ?? '').trim();
  const time = String(body.reminder_time ?? '').trim();
  const frequency = body.frequency ?? 'daily';
  const days = body.days_of_week ?? ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

  if (!partial && (!medicineName || !time)) return 'medicine_name and reminder_time are required';
  if (partial && body.medicine_name !== undefined && !medicineName) return 'medicine_name cannot be empty';
  if (body.reminder_time !== undefined && !/^([01]\d|2[0-3]):[0-5]\d/.test(time)) return 'reminder_time must be HH:MM';
  if (!['daily', 'weekly'].includes(frequency)) return 'frequency must be daily or weekly';
  if (body.days_of_week !== undefined && (!Array.isArray(days) || !days.length)) return 'days_of_week must be a non-empty array';
  return null;
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

router.post('/reminders', authenticate, async (req, res) => {
  if (req.user.role !== 'caregiver') return res.status(403).json({ success: false, message: 'เฉพาะบัญชีผู้ดูแลเท่านั้น' });
  const validation = validateReminderPayload(req.body);
  if (validation) return res.status(400).json({ success: false, message: validation });

  try {
    const elderly = await linkedElderly(req);
    const targetId = req.body.elderly_user_id;
    if (!targetId || !hasLinkedElderly(elderly, targetId)) {
      return res.status(403).json({ success: false, message: 'ผู้สูงอายุรายนี้ไม่ได้เชื่อมต่อกับคุณ' });
    }

    const {
      medicine_name, dosage, reminder_time, frequency = 'daily',
      days_of_week = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
      start_date, end_date, is_active = true,
    } = req.body;

    const result = await pool.query(`
      INSERT INTO reminders
        (user_id, medicine_name, dosage, reminder_time, frequency, days_of_week, start_date, end_date, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [targetId, medicine_name.trim(), dosage || null, reminder_time, frequency, days_of_week, start_date || null, end_date || null, Boolean(is_active)]);

    const reminder = result.rows[0];
    await notifyElderly(req, targetId, reminder.id, 'เพิ่ม', `${reminder.medicine_name} เวลา ${String(reminder.reminder_time).slice(0,5)}`);
    res.status(201).json({ success: true, data: reminder });
  } catch (error) {
    console.error('Caregiver create reminder failed:', error);
    res.status(500).json({ success: false, message: 'ผู้ดูแลเพิ่มรายการยาไม่สำเร็จ' });
  }
});

router.put('/reminders/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'caregiver') return res.status(403).json({ success: false, message: 'เฉพาะบัญชีผู้ดูแลเท่านั้น' });
  const validation = validateReminderPayload(req.body, { partial: true });
  if (validation) return res.status(400).json({ success: false, message: validation });

  try {
    const elderly = await linkedElderly(req);
    const current = await pool.query('SELECT * FROM reminders WHERE id = $1', [req.params.id]);
    if (!current.rowCount) return res.status(404).json({ success: false, message: 'ไม่พบรายการยา' });
    if (!hasLinkedElderly(elderly, current.rows[0].user_id)) return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขรายการยานี้' });

    const body = req.body;
    const result = await pool.query(`
      UPDATE reminders
      SET medicine_name = COALESCE($1, medicine_name),
          dosage = CASE WHEN $2::text IS NULL THEN dosage ELSE NULLIF($2::text, '') END,
          reminder_time = COALESCE($3, reminder_time),
          frequency = COALESCE($4, frequency),
          days_of_week = COALESCE($5, days_of_week),
          start_date = CASE WHEN $6::text IS NULL THEN start_date ELSE NULLIF($6::text, '')::date END,
          end_date = CASE WHEN $7::text IS NULL THEN end_date ELSE NULLIF($7::text, '')::date END,
          is_active = COALESCE($8, is_active),
          snooze_until = NULL,
          updated_at = now()
      WHERE id = $9
      RETURNING *
    `, [
      body.medicine_name !== undefined ? String(body.medicine_name).trim() : null,
      body.dosage !== undefined ? String(body.dosage) : null,
      body.reminder_time || null,
      body.frequency || null,
      body.days_of_week || null,
      body.start_date !== undefined ? String(body.start_date) : null,
      body.end_date !== undefined ? String(body.end_date) : null,
      typeof body.is_active === 'boolean' ? body.is_active : null,
      req.params.id,
    ]);

    const updated = result.rows[0];
    await notifyElderly(req, updated.user_id, updated.id, 'แก้ไข', `${updated.medicine_name} เวลา ${String(updated.reminder_time).slice(0,5)}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Caregiver update reminder failed:', error);
    res.status(500).json({ success: false, message: 'ผู้ดูแลแก้ไขรายการยาไม่สำเร็จ' });
  }
});

router.delete('/reminders/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'caregiver') return res.status(403).json({ success: false, message: 'เฉพาะบัญชีผู้ดูแลเท่านั้น' });

  try {
    const elderly = await linkedElderly(req);
    const current = await pool.query('SELECT * FROM reminders WHERE id = $1', [req.params.id]);
    if (!current.rowCount) return res.status(404).json({ success: false, message: 'ไม่พบรายการยา' });
    const reminder = current.rows[0];
    if (!hasLinkedElderly(elderly, reminder.user_id)) return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ลบรายการยานี้' });

    await pool.query('DELETE FROM reminders WHERE id = $1', [req.params.id]);
    await notifyElderly(req, reminder.user_id, reminder.id, 'ลบ', `${reminder.medicine_name} เวลา ${String(reminder.reminder_time).slice(0,5)}`);
    res.json({ success: true, message: 'ลบรายการยาแล้ว' });
  } catch (error) {
    console.error('Caregiver delete reminder failed:', error);
    res.status(500).json({ success: false, message: 'ผู้ดูแลลบรายการยาไม่สำเร็จ' });
  }
});

module.exports = router;
