require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');
const { cleanExpiredTokens } = require('./models/caregiver.model');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT, 10) || 3001;

const start = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`Auth Service running on port ${PORT}`, {
      env: process.env.NODE_ENV,
      port: PORT,
    });
  });

  setInterval(async () => {
    try {
      const deleted = await cleanExpiredTokens();
      if (deleted > 0) {
        logger.info(`Cleaned ${deleted} expired refresh tokens`);
      }
    } catch (err) {
      logger.error('Token cleanup failed', { error: err.message });
    }
  }, 60 * 60 * 1000);

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  logger.error('Failed to start Auth Service', { error: err.message });
  process.exit(1);
});