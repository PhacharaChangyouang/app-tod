require('dotenv').config();
const { pool } = require('./database');
const logger = require('../utils/logger');

const migrate = async () => {
  const client = await pool.connect();

  try {
    logger.info('Running migrations...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS caregivers (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(100) NOT NULL,
        email       VARCHAR(255) UNIQUE NOT NULL,
        password    VARCHAR(255) NOT NULL,
        phone       VARCHAR(20),
        role        VARCHAR(20) NOT NULL DEFAULT 'caregiver'
                    CHECK (role IN ('caregiver', 'admin')),
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
        token        TEXT NOT NULL UNIQUE,
        expires_at   TIMESTAMPTZ NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_caregivers_email
        ON caregivers(email);

      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_caregiver
        ON refresh_tokens(caregiver_id);

      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
        ON refresh_tokens(token);
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS set_updated_at ON caregivers;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON caregivers
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);

    await client.query('COMMIT');
    logger.info('Migrations completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Migration failed', { error: err.message });
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch((err) => {
  logger.error('Unhandled migration error', { error: err.message });
  process.exit(1);
});