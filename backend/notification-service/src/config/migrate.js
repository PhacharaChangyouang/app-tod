require('dotenv').config();

const pool = require('./db');

async function migrate() {
  try {
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

        read_at TIMESTAMPTZ

        ,dedupe_key VARCHAR(255) UNIQUE
      );
    `);

    await pool.query(`
      ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(255) UNIQUE;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id
      ON notifications(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read
      ON notifications(user_id, is_read);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at
      ON notifications(created_at DESC);
    `);

    console.log('Notification migration completed');
  } catch (error) {
    console.error(
      'Notification migration failed:',
      error
    );

    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();