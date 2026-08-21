require('dotenv').config();

const pool = require('./db');

async function migrate() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        user_id UUID NOT NULL,

        medicine_name VARCHAR(150) NOT NULL,

        dosage VARCHAR(100),

        reminder_time TIME NOT NULL,

        frequency VARCHAR(20) NOT NULL DEFAULT 'daily'
          CHECK (frequency IN ('daily', 'weekly')),

        days_of_week TEXT[] NOT NULL DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],

        start_date DATE,

        end_date DATE,

        is_active BOOLEAN NOT NULL DEFAULT true,

        last_triggered_key VARCHAR(32),

        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await pool.query(`
      ALTER TABLE reminders
      ADD COLUMN IF NOT EXISTS days_of_week TEXT[] NOT NULL DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    `);

    await pool.query(`
      ALTER TABLE reminders
      ADD COLUMN IF NOT EXISTS last_triggered_key VARCHAR(32);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reminders_user_id
      ON reminders(user_id);
    `);

    console.log('Reminder migration completed');
  } catch (error) {
    console.error('Reminder migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();