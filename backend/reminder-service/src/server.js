require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const pool = require('./config/db');
const authenticate = require('./middlewares/authenticate');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

/*
 * Health Check
 */
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      success: true,
      service: 'reminder-service',
      status: 'ok'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'reminder-service',
      status: 'database_unavailable'
    });
  }
});

/*
 * GET /api/reminders
 * ดูรายการเตือนยาของ user ที่ login
 */
app.get('/api/reminders', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        medicine_name,
        dosage,
        reminder_time,
        frequency,
        start_date,
        end_date,
        is_active,
        created_at,
        updated_at
      FROM reminders
      WHERE user_id = $1
      ORDER BY reminder_time ASC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminders'
    });
  }
});

/*
 * GET /api/reminders/:id
 */
app.get('/api/reminders/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM reminders
      WHERE id = $1
        AND user_id = $2
      `,
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminder'
    });
  }
});

/*
 * POST /api/reminders
 */
app.post('/api/reminders', authenticate, async (req, res) => {
  const {
    medicine_name,
    dosage,
    reminder_time,
    frequency = 'daily',
    start_date,
    end_date
  } = req.body;

  if (!medicine_name || !reminder_time) {
    return res.status(400).json({
      success: false,
      message: 'medicine_name and reminder_time are required'
    });
  }

  if (!['daily', 'weekly'].includes(frequency)) {
    return res.status(400).json({
      success: false,
      message: 'frequency must be daily or weekly'
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO reminders (
        user_id,
        medicine_name,
        dosage,
        reminder_time,
        frequency,
        start_date,
        end_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        req.user.id,
        medicine_name,
        dosage || null,
        reminder_time,
        frequency,
        start_date || null,
        end_date || null
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to create reminder'
    });
  }
});

/*
 * PUT /api/reminders/:id
 */
app.put('/api/reminders/:id', authenticate, async (req, res) => {
  const {
    medicine_name,
    dosage,
    reminder_time,
    frequency,
    start_date,
    end_date
  } = req.body;

  try {
    if (frequency && !['daily', 'weekly'].includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: 'frequency must be daily or weekly'
      });
    }

    const result = await pool.query(
      `
      UPDATE reminders
      SET
        medicine_name = COALESCE($1, medicine_name),
        dosage = COALESCE($2, dosage),
        reminder_time = COALESCE($3, reminder_time),
        frequency = COALESCE($4, frequency),
        start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date),
        updated_at = now()
      WHERE id = $7
        AND user_id = $8
      RETURNING *
      `,
      [
        medicine_name,
        dosage,
        reminder_time,
        frequency,
        start_date,
        end_date,
        req.params.id,
        req.user.id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to update reminder'
    });
  }
});

/*
 * PATCH /api/reminders/:id/status
 */
app.patch(
  '/api/reminders/:id/status',
  authenticate,
  async (req, res) => {
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_active must be boolean'
      });
    }

    try {
      const result = await pool.query(
        `
        UPDATE reminders
        SET
          is_active = $1,
          updated_at = now()
        WHERE id = $2
          AND user_id = $3
        RETURNING *
        `,
        [
          is_active,
          req.params.id,
          req.user.id
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to update reminder status'
      });
    }
  }
);

/*
 * DELETE /api/reminders/:id
 */
app.delete('/api/reminders/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM reminders
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [
        req.params.id,
        req.user.id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      message: 'Reminder deleted'
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Failed to delete reminder'
    });
  }
});

const PORT = process.env.PORT || 3002;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Reminder service running on port ${PORT}`);
  });
}

module.exports = app;