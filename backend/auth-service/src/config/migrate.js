/**
 * Migration script — AHA auth tables
 * รันด้วย: npm run migrate
 */

require('dotenv').config();
const pool = require('./db');
const logger = require('../utils/logger');

async function migrate() {
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
    await pool.query(`ALTER TABLE users ALTER COLUMN pin_hash DROP NOT NULL`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users (LOWER(username)) WHERE username IS NOT NULL`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (LOWER(email)) WHERE email IS NOT NULL`);

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

    logger.info('Migration completed successfully');
  } catch (err) {
    logger.error('Migration failed', { error: err.message, stack: err.stack });
    console.error('Migration failed', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
