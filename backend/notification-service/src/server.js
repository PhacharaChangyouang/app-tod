require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const webpush = require('web-push');

const pool = require('./config/db');
const authenticate = require('./middlewares/authenticate');

const app = express();

const pushConfigured = Boolean(
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT
);

if (pushConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function ensureRuntimeSchema() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      related_id UUID,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      read_at TIMESTAMPTZ,
      dedupe_key VARCHAR(255) UNIQUE,
      scheduled_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(255)
  `);

  await pool.query(`
    ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
    ON push_subscriptions(user_id, enabled)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications(user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read
    ON notifications(user_id, is_read)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON notifications(created_at DESC)
  `);
}

async function sendPushToUser(userId, payload) {
  if (!pushConfigured || !userId || userId === 'system') {
    return { sent: 0, skipped: true };
  }

  const result = await pool.query(`
    SELECT id, endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE user_id = $1 AND enabled = true
  `, [userId]);

  let sent = 0;

  for (const subscription of result.rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload),
        { TTL: 3600 }
      );
      sent += 1;
    } catch (error) {
      console.error('Push delivery failed:', error.statusCode, error.message);

      if (error.statusCode === 404 || error.statusCode === 410) {
        await pool.query(
          'DELETE FROM push_subscriptions WHERE id = $1',
          [subscription.id]
        );
      }
    }
  }

  return { sent, skipped: false };
}

async function pushNotificationRow(row) {
  if (!row) return;

  await sendPushToUser(row.user_id, {
    notificationId: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedId: row.related_id || null,
    url: '/?aha_notification=1',
    actions: row.type === 'medicine_reminder'
      ? [
          { action: 'snooze', title: 'เลื่อน 10 นาที' },
          { action: 'taken', title: 'ทานยาแล้ว' },
        ]
      : [],
  });
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
    res.json({
      success: true,
      service: 'notification-service',
      status: 'ok',
      push: pushConfigured ? 'configured' : 'not_configured',
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

/* --------------------------------------------------------------------------
 * WEB PUSH
 * -------------------------------------------------------------------------- */

app.get('/api/push/status', authenticate, async (req, res) => {
  const result = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM push_subscriptions
    WHERE user_id = $1 AND enabled = true
  `, [req.user.id]);

  res.json({
    success: true,
    configured: pushConfigured,
    subscribed: result.rows[0].count > 0,
    subscriptions: result.rows[0].count,
    publicKey: pushConfigured ? process.env.VAPID_PUBLIC_KEY : null,
  });
});

app.post('/api/push/subscribe', authenticate, async (req, res) => {
  const { endpoint, keys } = req.body || {};

  if (!pushConfigured) {
    return res.status(503).json({
      success: false,
      message: 'Web Push is not configured on the server',
    });
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({
      success: false,
      message: 'A valid PushSubscription is required',
    });
  }

  try {
    const result = await pool.query(`
      INSERT INTO push_subscriptions
        (user_id, endpoint, p256dh, auth, user_agent, enabled, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, now())
      ON CONFLICT (endpoint)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        enabled = true,
        updated_at = now()
      RETURNING id, user_id, endpoint, enabled, updated_at
    `, [
      req.user.id,
      endpoint,
      keys.p256dh,
      keys.auth,
      req.headers['user-agent'] || null,
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to save push subscription' });
  }
});

app.delete('/api/push/subscribe', authenticate, async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) {
    return res.status(400).json({ success: false, message: 'endpoint is required' });
  }

  await pool.query(`
    DELETE FROM push_subscriptions
    WHERE endpoint = $1 AND user_id = $2
  `, [endpoint, req.user.id]);

  res.json({ success: true });
});

/* --------------------------------------------------------------------------
 * NOTIFICATIONS
 * -------------------------------------------------------------------------- */

app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, type, title, message, related_id, is_read,
             created_at, read_at, scheduled_at, delivered_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

app.get('/api/notifications/unread', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, type, title, message, related_id, is_read,
             created_at, scheduled_at, delivered_at
      FROM notifications
      WHERE user_id = $1 AND is_read = false
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch unread notifications' });
  }
});

app.get('/api/notifications/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM notifications
      WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch notification' });
  }
});

app.post('/api/notifications', authenticate, async (req, res) => {
  const {
    user_id,
    type,
    title,
    message,
    related_id,
    dedupe_key,
    scheduled_at,
  } = req.body;

  if (!type || !title || !message) {
    return res.status(400).json({ success: false, message: 'type, title and message are required' });
  }

  const targetUserId = req.user.role === 'system' ? user_id : req.user.id;

  if (!targetUserId) {
    return res.status(400).json({ success: false, message: 'user_id is required for system notification' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO notifications
        (user_id, type, title, message, related_id, dedupe_key, scheduled_at, delivered_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,now())
      ON CONFLICT (dedupe_key) DO NOTHING
      RETURNING *
    `, [
      targetUserId,
      type,
      title,
      message,
      related_id || null,
      dedupe_key || null,
      scheduled_at || null,
    ]);

    const row = result.rows[0] || null;

    if (row) {
      await pushNotificationRow(row);
    }

    res.status(201).json({
      success: true,
      duplicate: result.rowCount === 0,
      data: row,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create notification' });
  }
});

app.post('/api/notifications/emergency', authenticate, async (req, res) => {
  const {
    message = 'มีการขอความช่วยเหลือฉุกเฉินจากผู้ใช้ AHA',
    latitude,
    longitude,
    accuracy,
  } = req.body;

  const authUrl = process.env.AUTH_SERVICE_URL;
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!authUrl || !internalKey) {
    return res.status(500).json({ success: false, message: 'Emergency service integration is not configured' });
  }

  try {
    let recipientIds = [];
    try {
      const recipientsResponse = await fetch(
        `${authUrl.replace(/\/$/, '')}/family/internal/${req.user.id}/recipients`,
        { headers: { 'x-internal-api-key': internalKey } }
      );
      if (recipientsResponse.ok) {
        const recipientsPayload = await recipientsResponse.json();
        if (Array.isArray(recipientsPayload.data) && recipientsPayload.data.length) {
          recipientIds = [...new Set(recipientsPayload.data)]
            .filter((userId) => String(userId) !== String(req.user.id));
        }
      } else {
        const lookupBody = await recipientsResponse.text();
        console.error('Emergency recipient lookup failed:', recipientsResponse.status, lookupBody);
        return res.status(502).json({
          success: false,
          code: 'EMERGENCY_RECIPIENT_LOOKUP_FAILED',
          message: 'ระบบเชื่อมต่อผู้ดูแลขัดข้อง กรุณาลองใหม่อีกครั้ง',
        });
      }
    } catch (lookupError) {
      console.error('Emergency recipient lookup error:', lookupError);
      return res.status(502).json({
        success: false,
        code: 'EMERGENCY_RECIPIENT_LOOKUP_FAILED',
        message: 'ระบบเชื่อมต่อผู้ดูแลขัดข้อง กรุณาลองใหม่อีกครั้ง',
      });
    }

    if (!recipientIds.length) {
      return res.status(404).json({
        success: false,
        code: 'NO_ACCEPTED_FAMILY_CONNECTION',
        message: 'บัญชีนี้ยังไม่มีผู้ใช้ฝั่งตรงข้ามที่เชื่อมต่อและยืนยันแล้ว',
      });
    }

    const locationText = latitude != null && longitude != null
      ? ` ตำแหน่ง: https://www.google.com/maps?q=${latitude},${longitude}${accuracy ? ` (คลาดเคลื่อนประมาณ ${Math.round(accuracy)} ม.)` : ''}`
      : ' ไม่พบตำแหน่ง GPS';

    const created = [];

    for (const userId of recipientIds) {
      const result = await pool.query(`
        INSERT INTO notifications
          (user_id, type, title, message, dedupe_key, delivered_at)
        VALUES ($1, 'emergency', $2, $3, $4, now())
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING *
      `, [
        userId,
        'แจ้งเหตุฉุกเฉินจากผู้ใช้ที่เชื่อมต่อ',
        `${message}${locationText}`,
        `emergency:${req.user.id}:${userId}:${Date.now()}`,
      ]);

      if (result.rowCount) {
        created.push(result.rows[0]);
        await pushNotificationRow(result.rows[0]);
      }
    }

    res.status(201).json({
      success: true,
      notified: created.length,
      recipients: recipientIds.length,
      data: created,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to send emergency notification' });
  }
});

app.patch('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE notifications
      SET is_read = true, read_at = now()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [req.params.id, req.user.id]);

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
});

app.patch('/api/notifications/read-all', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE notifications
      SET is_read = true, read_at = now()
      WHERE user_id = $1 AND is_read = false
    `, [req.user.id]);

    res.json({ success: true, message: 'All notifications marked as read', updated: result.rowCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
  }
});

app.delete('/api/notifications/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [req.params.id, req.user.id]);

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

app.use((error, req, res, next) => {
  console.error(error);
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'CORS origin not allowed' });
  }
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 3003;

if (require.main === module) {
  ensureRuntimeSchema()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Notification service running on port ${PORT}`);
        console.log(`Web Push: ${pushConfigured ? 'configured' : 'NOT CONFIGURED'}`);
      });
    })
    .catch((error) => {
      console.error('Notification runtime schema failed:', error);
      process.exit(1);
    });
}

module.exports = app;
