require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pool = require('./config/db');
const authenticate = require('./middlewares/authenticate');
const caregiverRoutes = require('./caregiver.routes');
const { startScheduler } = require('./scheduler');

const app = express();

async function ensureRuntimeSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reminder_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reminder_id UUID NOT NULL,
      user_id UUID NOT NULL,
      scheduled_date DATE NOT NULL,
      scheduled_time TIME NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'taken'
        CHECK (status IN ('taken', 'skipped')),
      taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (reminder_id, scheduled_date, scheduled_time)
    )
  `);

  await pool.query(`
    ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ
  `);

  await pool.query(`
    ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS last_late_triggered_key VARCHAR(255)
  `);
}

app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://aha-frontend-production.up.railway.app',
  'https://aha.up.railway.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-api-key'],
}));

app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, service: 'reminder-service', status: 'ok' });
  } catch (error) {
    console.error(error);
    res.status(503).json({ success: false, service: 'reminder-service', status: 'database_unavailable' });
  }
});

app.get('/api/reminders', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, medicine_name, dosage, reminder_time, frequency,
             days_of_week, start_date, end_date, is_active,
             last_triggered_key, snooze_until, created_at, updated_at
      FROM reminders
      WHERE user_id = $1
      ORDER BY reminder_time ASC
    `, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch reminders' });
  }
});

app.get('/api/reminders/today', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.*,
        CASE WHEN l.id IS NOT NULL AND l.status = 'taken' THEN true ELSE false END AS taken,
        l.taken_at
      FROM reminders r
      LEFT JOIN reminder_logs l
        ON l.reminder_id = r.id
       AND l.user_id = r.user_id
       AND l.scheduled_date = (now() AT TIME ZONE 'Asia/Bangkok')::date
       AND l.scheduled_time = r.reminder_time
      WHERE r.user_id = $1
        AND r.is_active = true
        AND (r.start_date IS NULL OR r.start_date <= (now() AT TIME ZONE 'Asia/Bangkok')::date)
        AND (r.end_date IS NULL OR r.end_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date)
      ORDER BY r.reminder_time ASC
    `, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch today reminders' });
  }
});

app.post('/api/reminders/:id/taken', authenticate, async (req, res) => {
  try {
    const reminder = await pool.query(
      'SELECT * FROM reminders WHERE id = $1 AND user_id = $2 AND is_active = true',
      [req.params.id, req.user.id]
    );
    if (!reminder.rowCount) return res.status(404).json({ success: false, message: 'Reminder not found' });

    const result = await pool.query(`
      INSERT INTO reminder_logs (reminder_id, user_id, scheduled_date, scheduled_time, status, taken_at)
      VALUES ($1, $2, (now() AT TIME ZONE 'Asia/Bangkok')::date, $3, 'taken', now())
      ON CONFLICT (reminder_id, scheduled_date, scheduled_time)
      DO UPDATE SET status='taken', taken_at=now()
      RETURNING *
    `, [req.params.id, req.user.id, reminder.rows[0].reminder_time]);

    await pool.query(
      'UPDATE reminders SET snooze_until = NULL, updated_at = now() WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to mark medicine as taken' });
  }
});

app.post('/api/reminders/:id/snooze', authenticate, async (req, res) => {
  const minutes = Number(req.body?.minutes ?? 10);

  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
    return res.status(400).json({ success: false, message: 'minutes must be an integer between 1 and 120' });
  }

  try {
    const result = await pool.query(`
      UPDATE reminders
      SET snooze_until = now() + make_interval(mins => $1),
          updated_at = now()
      WHERE id = $2 AND user_id = $3 AND is_active = true
      RETURNING *
    `, [minutes, req.params.id, req.user.id]);

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.json({
      success: true,
      message: `Reminder snoozed for ${minutes} minutes`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to snooze reminder' });
  }
});

app.get('/api/reminders/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reminders WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch reminder' });
  }
});

app.post('/api/reminders', authenticate, async (req, res) => {
  const {
    medicine_name, dosage, reminder_time, frequency = 'daily',
    days_of_week = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
    start_date, end_date, is_active = true,
  } = req.body;

  if (!String(medicine_name || '').trim() || !reminder_time) {
    return res.status(400).json({ success: false, message: 'medicine_name and reminder_time are required' });
  }
  if (!['daily', 'weekly'].includes(frequency)) {
    return res.status(400).json({ success: false, message: 'frequency must be daily or weekly' });
  }
  if (!Array.isArray(days_of_week) || !days_of_week.length) {
    return res.status(400).json({ success: false, message: 'days_of_week must be a non-empty array' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO reminders
        (user_id, medicine_name, dosage, reminder_time, frequency, days_of_week, start_date, end_date, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
      req.user.id, String(medicine_name).trim(), dosage || null, reminder_time, frequency,
      days_of_week, start_date || null, end_date || null, Boolean(is_active),
    ]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create reminder' });
  }
});

app.put('/api/reminders/:id', authenticate, async (req, res) => {
  const {
    medicine_name, dosage, reminder_time, frequency,
    days_of_week, start_date, end_date, is_active,
  } = req.body;

  if (frequency && !['daily', 'weekly'].includes(frequency)) {
    return res.status(400).json({ success: false, message: 'frequency must be daily or weekly' });
  }

  try {
    const result = await pool.query(`
      UPDATE reminders
      SET medicine_name = COALESCE($1, medicine_name),
          dosage = COALESCE($2, dosage),
          reminder_time = COALESCE($3, reminder_time),
          frequency = COALESCE($4, frequency),
          days_of_week = COALESCE($5, days_of_week),
          start_date = COALESCE($6, start_date),
          end_date = COALESCE($7, end_date),
          is_active = COALESCE($8, is_active),
          updated_at = now()
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `, [
      medicine_name?.trim() || null, dosage === '' ? null : dosage ?? null,
      reminder_time || null, frequency || null, days_of_week || null,
      start_date || null, end_date || null,
      typeof is_active === 'boolean' ? is_active : null,
      req.params.id, req.user.id,
    ]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update reminder' });
  }
});

app.patch('/api/reminders/:id/status', authenticate, async (req, res) => {
  if (typeof req.body.is_active !== 'boolean') {
    return res.status(400).json({ success: false, message: 'is_active must be boolean' });
  }
  try {
    const result = await pool.query(
      'UPDATE reminders SET is_active=$1, snooze_until=NULL, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING *',
      [req.body.is_active, req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update reminder status' });
  }
});

app.delete('/api/reminders/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM reminders WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete reminder' });
  }
});

// Caregiver-only dashboard and medication management.
// These routes are mounted separately so the existing elderly reminder API stays unchanged.
app.use('/api/caregiver', caregiverRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'CORS origin not allowed' });
  }
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 3002;
if (require.main === module) {
  ensureRuntimeSchema()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Reminder service running on port ${PORT}`);
        startScheduler();
      });
    })
    .catch((error) => {
      console.error('Reminder runtime schema failed:', error);
      process.exit(1);
    });
}

module.exports = app;
