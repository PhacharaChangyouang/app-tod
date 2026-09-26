/**
 * Migration script — AHA auth tables
 * รันด้วย: npm run migrate
 */

require('dotenv').config();
const pool = require('./db');
const logger = require('../utils/logger');

async function migrate({ closePool = true } = {}) {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100),
        age INT,
        role VARCHAR(20) NOT NULL CHECK (role IN ('elderly', 'caregiver')),
        pin_hash VARCHAR(255),
        phone_verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(20)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
    // PIN authentication remains supported. Never silently recreate an empty
    // column over an active production database because lost hashes require a
    // backup restore, not a schema-only repair.
    const pinColumn = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'pin_hash'
      ) AS present
    `);
    if (!pinColumn.rows[0]?.present) {
      const userCount = await pool.query('SELECT COUNT(*)::int AS count FROM users');
      if (process.env.NODE_ENV === 'production' && Number(userCount.rows[0]?.count || 0) > 0) {
        throw new Error('PIN migration blocked: pin_hash is missing on a populated production database; restore the column and hashes from backup before deployment');
      }
      await pool.query(`ALTER TABLE users ADD COLUMN pin_hash VARCHAR(255)`);
    }
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users (LOWER(username)) WHERE username IS NOT NULL`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (LOWER(email)) WHERE email IS NOT NULL`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub_unique ON users (google_sub) WHERE google_sub IS NOT NULL`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS family_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requested_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (requester_id, requested_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiry ON password_reset_tokens(expires_at)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        key_hash VARCHAR(64) PRIMARY KEY,
        attempts INT NOT NULL DEFAULT 0,
        first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        blocked_until TIMESTAMPTZ
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked_until ON login_attempts(blocked_until)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(64) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        success BOOLEAN NOT NULL,
        actor_hash VARCHAR(64) NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_auth_audit_user_created ON auth_audit_events(user_id, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_auth_audit_event_created ON auth_audit_events(event_type, created_at DESC)`);

    // Remove only expired operational records. User accounts, active sessions,
    // family links and security evidence are intentionally preserved.
    await pool.query(`DELETE FROM password_reset_tokens WHERE expires_at <= now() OR used_at IS NOT NULL`);
    await pool.query(`DELETE FROM refresh_tokens WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '30 days'`);
    await pool.query(`DELETE FROM login_attempts WHERE first_attempt_at < now() - interval '24 hours'`);

    logger.info('Migration completed successfully');
  } catch (err) {
    logger.error('Migration failed', { error: err.message, stack: err.stack });
    throw err;
  } finally {
    if (closePool) await pool.end();
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error('Migration failed', error);
    process.exit(1);
  });
}

module.exports = migrate;
