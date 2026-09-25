require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

function assertProductionSecurity() {
  if (process.env.NODE_ENV !== 'production') return;
  const accessSecret = process.env.JWT_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';
  const internalKey = process.env.INTERNAL_API_KEY || '';
  if (accessSecret.length < 32 || refreshSecret.length < 32 || internalKey.length < 32) {
    throw new Error('Production secrets must each contain at least 32 characters');
  }
  if (accessSecret === refreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }
}

assertProductionSecurity();
app.listen(PORT, () => {
  logger.info(`auth-service listening on port ${PORT}`);
});
