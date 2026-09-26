const crypto = require('crypto');
const pool = require('../config/db');

const COOLDOWN_SECONDS = 2 * 60;
const DAILY_MAX = 3;
const DAILY_WINDOW_SECONDS = 24 * 60 * 60;

function hashKey(value) {
  const secret = process.env.JWT_SECRET || process.env.GOOGLE_SIGNUP_SECRET || 'aha-password-reset-rate-limit';
  return crypto.createHmac('sha256', secret).update(String(value)).digest('hex');
}

function clientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown').trim().toLowerCase();
}

function retryError(message, retryAfterSeconds) {
  const error = new Error(message);
  error.status = 429;
  error.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  return error;
}

async function consume(req, email) {
  const keys = [
    { type: 'email', hash: hashKey(`email:${email}`) },
    { type: 'ip', hash: hashKey(`ip:${clientIp(req)}`) },
  ];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock in a stable order so simultaneous requests cannot bypass limits.
    for (const key of [...keys].sort((a, b) => a.hash.localeCompare(b.hash))) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${key.type}:${key.hash}`]);
    }

    for (const key of keys) {
      const { rows } = await client.query(`
        SELECT
          EXTRACT(EPOCH FROM (now() - MAX(requested_at))) AS seconds_since_last,
          COUNT(*) FILTER (WHERE requested_at > now() - interval '24 hours')::int AS daily_count,
          EXTRACT(EPOCH FROM (MIN(requested_at) FILTER (WHERE requested_at > now() - interval '24 hours') + interval '24 hours' - now())) AS daily_retry
        FROM password_reset_attempts
        WHERE key_type = $1 AND key_hash = $2
          AND requested_at > now() - interval '24 hours'
      `, [key.type, key.hash]);
      const stats = rows[0] || {};
      const sinceLast = stats.seconds_since_last == null ? Number.NaN : Number(stats.seconds_since_last);
      if (Number.isFinite(sinceLast) && sinceLast < COOLDOWN_SECONDS) {
        throw retryError('กรุณารออย่างน้อย 2 นาทีก่อนขอลิงก์ใหม่', COOLDOWN_SECONDS - sinceLast);
      }
      if (Number(stats.daily_count || 0) >= DAILY_MAX) {
        throw retryError('คุณทำรายการเกินจำนวนที่กำหนด กรุณาลองใหม่ในภายหลัง', Number(stats.daily_retry) || DAILY_WINDOW_SECONDS);
      }
    }

    for (const key of keys) {
      await client.query('INSERT INTO password_reset_attempts (key_type, key_hash) VALUES ($1, $2)', [key.type, key.hash]);
    }
    await client.query('COMMIT');
    return { cooldownSeconds: COOLDOWN_SECONDS };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { consume, COOLDOWN_SECONDS, DAILY_MAX };
