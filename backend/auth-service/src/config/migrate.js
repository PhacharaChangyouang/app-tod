/**
 * Migration script — สร้างตาราง users (phone-based auth)
 *
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
        pin_hash VARCHAR(255) NOT NULL,
        phone_verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // เก็บ refresh token แบบ hash (ไม่เก็บ token ดิบ) ผูกกับ user
    // เดิม refresh token เก็บใน memory (Set) เท่านั้น -> restart server แล้วหายหมด
    // ทำให้ user ทุกคนต้อง login ใหม่หลัง deploy/restart ทุกครั้ง
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

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    `);

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