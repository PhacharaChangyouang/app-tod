require('dotenv').config();

const express = require('express');
const helmet = require('helmet');

const pool = require('./config/db');
const authenticate = require('./middlewares/authenticate');

const app = express();

app.use(helmet());
app.use(express.json());

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      success: true,
      service: 'notification-service',
      status: 'ok'
    });
  } catch (error) {
    console.error(error);

    res.status(503).json({
      success: false,
      service: 'notification-service',
      status: 'database_unavailable'
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/notifications
|--------------------------------------------------------------------------
| ดู notification ของ user ที่ login
*/

app.get(
  '/api/notifications',
  authenticate,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          type,
          title,
          message,
          related_id,
          is_read,
          created_at,
          read_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
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
        message: 'Failed to fetch notifications'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/notifications/unread
|--------------------------------------------------------------------------
*/

app.get(
  '/api/notifications/unread',
  authenticate,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          type,
          title,
          message,
          related_id,
          is_read,
          created_at
        FROM notifications
        WHERE user_id = $1
          AND is_read = false
        ORDER BY created_at DESC
        `,
        [req.user.id]
      );

      res.json({
        success: true,
        data: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to fetch unread notifications'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/notifications/:id
|--------------------------------------------------------------------------
*/

app.get(
  '/api/notifications/:id',
  authenticate,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT *
        FROM notifications
        WHERE id = $1
          AND user_id = $2
        `,
        [
          req.params.id,
          req.user.id
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
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
        message: 'Failed to fetch notification'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/notifications
|--------------------------------------------------------------------------
| สร้าง notification
|
| ใช้ได้ทั้งจาก frontend/internal service
|--------------------------------------------------------------------------
*/

app.post(
  '/api/notifications',
  authenticate,
  async (req, res) => {
    const {
      user_id,
      type,
      title,
      message,
      related_id,
      dedupe_key
    } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'type, title and message are required'
      });
    }

    try {
      const result = await pool.query(
        `
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_id,
          dedupe_key
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING *
        `,
        [
          req.user.role === 'system' ? user_id : req.user.id,
          type,
          title,
          message,
          related_id || null,
          dedupe_key || null
        ]
      );

      res.status(201).json({
        success: true,
        duplicate: result.rowCount === 0,
        data: result.rows[0] || null
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to create notification'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/notifications/:id/read
|--------------------------------------------------------------------------
| อ่าน notification หนึ่งรายการ
|--------------------------------------------------------------------------
*/

app.patch(
  '/api/notifications/:id/read',
  authenticate,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        UPDATE notifications
        SET
          is_read = true,
          read_at = now()
        WHERE id = $1
          AND user_id = $2
        RETURNING *
        `,
        [
          req.params.id,
          req.user.id
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
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
        message: 'Failed to mark notification as read'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/notifications/read-all
|--------------------------------------------------------------------------
*/

app.patch(
  '/api/notifications/read-all',
  authenticate,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        UPDATE notifications
        SET
          is_read = true,
          read_at = now()
        WHERE user_id = $1
          AND is_read = false
        `,
        [req.user.id]
      );

      res.json({
        success: true,
        message: 'All notifications marked as read',
        updated: result.rowCount
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to mark notifications as read'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE /api/notifications/:id
|--------------------------------------------------------------------------
*/

app.delete(
  '/api/notifications/:id',
  authenticate,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        DELETE FROM notifications
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
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 3003;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `Notification service running on port ${PORT}`
    );
  });
}

module.exports = app;