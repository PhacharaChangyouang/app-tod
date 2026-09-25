const { Pool } = require('pg');
const logger = require('../utils/logger');

const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
    };
const ssl = process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false'
  ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      ...(process.env.DB_CA_CERT ? { ca: process.env.DB_CA_CERT.replace(/\\n/g, '\n') } : {}),
    }
  : undefined;

const pool = new Pool({
  ...connection,
  ...(ssl ? { ssl } : {}),
  max: Number(process.env.DB_POOL_MAX || 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 10000,
  query_timeout: 12000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle DB client', { error: err.message });
});

module.exports = pool;
