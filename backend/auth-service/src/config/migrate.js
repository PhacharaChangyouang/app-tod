/**
 * Migration script — สร้างตาราง users (phone-based auth)
 *
 * รันด้วย: npm run migrate
 */

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

    logger.info('Migration completed successfully');
  } catch (err) {
    logger.error('Migration failed', { error: err.message });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
