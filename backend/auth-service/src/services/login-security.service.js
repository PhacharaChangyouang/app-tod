const crypto = require('crypto');
const pool = require('../config/db');

const WINDOW_MINUTES = 15;

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      key_hash VARCHAR(64) PRIMARY KEY,
      attempts INT NOT NULL DEFAULT 0,
      first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      blocked_until TIMESTAMPTZ
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked_until ON login_attempts(blocked_until)');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_audit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(64) NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      success BOOLEAN NOT NULL,
      actor_hash VARCHAR(64) NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_audit_user_created ON auth_audit_events(user_id, created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_auth_audit_event_created ON auth_audit_events(event_type, created_at DESC)');
  const retentionDays = Math.min(Math.max(Number(process.env.AUDIT_RETENTION_DAYS || 180), 30), 365);
  await pool.query("DELETE FROM login_attempts WHERE first_attempt_at < now() - interval '24 hours'");
  await pool.query("DELETE FROM refresh_tokens WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '30 days'");
  await pool.query("DELETE FROM auth_audit_events WHERE created_at < now() - ($1 * interval '1 day')", [retentionDays]);
}

function digest(scope, value) {
  const key = process.env.AUDIT_HASH_KEY || process.env.INTERNAL_API_KEY || 'local-development-only-audit-key';
  return crypto.createHmac('sha256', key).update(`${scope}:${String(value || '').toLowerCase()}`).digest('hex');
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function keysFor(req, identifier, { accountLimit = 10, networkLimit = 50 } = {}) {
  return [
    { hash: digest('account', identifier), limit: accountLimit },
    { hash: digest('network', clientIp(req)), limit: networkLimit },
  ];
}

async function isBlocked(req, identifier, limits) {
  const keys = keysFor(req, identifier, limits);
  const { rows } = await pool.query(
    `SELECT 1 FROM login_attempts
     WHERE key_hash = ANY($1::varchar[]) AND blocked_until > now()
     LIMIT 1`,
    [keys.map((item) => item.hash)]
  );
  return rows.length > 0;
}

async function recordFailure(req, identifier, limits) {
  for (const item of keysFor(req, identifier, limits)) {
    await pool.query(
      `INSERT INTO login_attempts (key_hash, attempts, first_attempt_at, blocked_until)
       VALUES ($1, 1, now(), NULL)
       ON CONFLICT (key_hash) DO UPDATE SET
         attempts = CASE
           WHEN login_attempts.first_attempt_at < now() - ($3 * interval '1 minute') THEN 1
           ELSE login_attempts.attempts + 1
         END,
         first_attempt_at = CASE
           WHEN login_attempts.first_attempt_at < now() - ($3 * interval '1 minute') THEN now()
           ELSE login_attempts.first_attempt_at
         END,
         blocked_until = CASE
           WHEN (CASE
             WHEN login_attempts.first_attempt_at < now() - ($3 * interval '1 minute') THEN 1
             ELSE login_attempts.attempts + 1
           END) >= $2 THEN now() + ($3 * interval '1 minute')
           ELSE login_attempts.blocked_until
         END`,
      [item.hash, item.limit, WINDOW_MINUTES]
    );
  }
}

async function clearForAccount(identifier) {
  await pool.query('DELETE FROM login_attempts WHERE key_hash = $1', [digest('account', identifier)]);
}

async function audit(eventType, { userId = null, success, req, identifier = null, metadata = {} }) {
  try {
    await pool.query(
      `INSERT INTO auth_audit_events (event_type, user_id, success, actor_hash, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [eventType, userId, Boolean(success), digest('actor', `${clientIp(req)}:${identifier || ''}`), JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Auth audit write failed:', error.message);
  }
}

module.exports = { ensureSchema, isBlocked, recordFailure, clearForAccount, audit };
