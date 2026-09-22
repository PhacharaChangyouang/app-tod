require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const pool = require('./config/db');
const authenticate = require('./middlewares/authenticate');

const app = express();

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.use(helmet());

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://aha-frontend-production.up.railway.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without Origin
      // such as server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-internal-api-key',
    ],
  })
);

app.use(express.json());

/*
|--------------------------------------------------------------------------
| Internal API Authentication
|--------------------------------------------------------------------------
|
| ใช้สำหรับ service-to-service
| เช่น reminder-service -> notification-service
|
*/

function authenticateInternal(req, res, next) {
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!internalKey) {
    return res.status(500).json({
      success: false,
      message: 'INTERNAL_API_KEY is not configured',
    });
  }

  const requestKey = req.headers['x-internal-api-key'];

  if (!requestKey || requestKey !== internalKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid internal API key',
    });
  }

  req.user = {
    id: null,
    role: 'system',
  };

  next();
}

/*
|--------------------------------------------------------------------------
| Authentication for POST notification
|--------------------------------------------------------------------------
|
| รองรับทั้ง
|
| 1. Frontend -> JWT
| 2. Reminder Service -> Internal API Key
|
*/

function authenticateNotificationCreate(req, res, next) {
  const internalKey = process.env.INTERNAL_API_KEY;
  const requestKey = req.headers['x-internal-api-key'];

  if (
    internalKey &&
    requestKey &&
    requestKey === internalKey
  ) {
    req.user = {
      id: null,
      role: 'system',
    };

    return next();
  }

  return authenticate(req, res, next);
}

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
      status: 'ok',
    });
  } catch (error) {
    console.error(error);

    res.status(503).json({
      success: false,
      service: 'notification-service',
      status: 'database_unavailable',
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/notifications
|--------------------------------------------------------------------------
| ดู notification ของ user ที่ login
|--------------------------------------------------------------------------
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
          read_at,
          scheduled_at,
          delivered_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [req.user.id]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
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
          created_at,
          scheduled_at,
          delivered_at
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
        count: result.rowCount,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to fetch unread notifications',
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
          req.user.id,
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification',
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| POST /api/notifications
|--------------------------------------------------------------------------
|
| รองรับ:
|
| Frontend:
|   Authorization: Bearer <JWT>
|
| Internal service:
|   x-internal-api-key: <INTERNAL_API_KEY>
|
|--------------------------------------------------------------------------
*/

app.post(
  '/api/notifications',
  authenticateNotificationCreate,
  async (req, res) => {
    const {
      user_id,
      type,
      title,
      message,
      related_id,
      dedupe_key,
      scheduled_at,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'type, title and message are required',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Determine target user
    |--------------------------------------------------------------------------
    */

    let targetUserId;

    if (req.user.role === 'system') {
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'user_id is required for system notification',
        });
      }

      targetUserId = user_id;
    } else {
      targetUserId = req.user.id;
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
          dedupe_key,
          scheduled_at,
          delivered_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          now()
        )
        ON CONFLICT (dedupe_key)
        DO NOTHING
        RETURNING *
        `,
        [
          targetUserId,
          type,
          title,
          message,
          related_id || null,
          dedupe_key || null,
          scheduled_at || null,
        ]
      );

      res.status(201).json({
        success: true,
        duplicate: result.rowCount === 0,
        data: result.rows[0] || null,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to create notification',
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/notifications/:id/read
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
          req.user.id,
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
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
        updated: result.rowCount,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to mark notifications as read',
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
          req.user.id,
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found',
  });
});

/*
|--------------------------------------------------------------------------
| Error Handler
|--------------------------------------------------------------------------
*/

app.use((error, req, res, next) => {
  console.error(error);

  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS origin not allowed',
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

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