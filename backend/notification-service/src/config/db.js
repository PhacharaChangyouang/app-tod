const { Pool } = require('pg');

const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD
    };

const pool = new Pool({
  ...connection,
  ...(process.env.NODE_ENV === 'production'
    ? {
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {})
});

module.exports = pool;
