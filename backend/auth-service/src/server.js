require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');
const loginSecurity = require('./services/login-security.service');
const migrate = require('./config/migrate');

const PORT = process.env.PORT || 3001;

function assertProductionSecurity() {
  if (process.env.NODE_ENV !== 'production') return;
  const accessSecret = process.env.JWT_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';
  const internalKey = process.env.INTERNAL_API_KEY || '';
  const pinPepper = process.env.PIN_PEPPER || '';
  const weak = (value) => value.length < 48 || /replace|change|example|development|password|secret/i.test(value) || new Set(value).size < 12;
  if (weak(accessSecret) || weak(refreshSecret) || weak(internalKey) || weak(pinPepper)) {
    throw new Error('Production secrets must be random, non-placeholder values with at least 48 characters');
  }
  if (new Set([accessSecret, refreshSecret, internalKey, pinPepper]).size !== 4) {
    throw new Error('JWT_SECRET, JWT_REFRESH_SECRET, INTERNAL_API_KEY and PIN_PEPPER must all be different');
  }
  if (!String(process.env.FRONTEND_URL || '').startsWith('https://')) {
    throw new Error('FRONTEND_URL must use HTTPS in production');
  }
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    throw new Error('RESEND_API_KEY and MAIL_FROM are required for password recovery in production');
  }
  if (process.env.GOOGLE_CLIENT_ID) {
    const googleSignupSecret = process.env.GOOGLE_SIGNUP_SECRET || '';
    if (weak(googleSignupSecret) || [accessSecret, refreshSecret, internalKey, pinPepper].includes(googleSignupSecret)) {
      throw new Error('GOOGLE_SIGNUP_SECRET must be a distinct random value with at least 48 characters when Google Login is enabled');
    }
  }
}

assertProductionSecurity();
Promise.resolve()
  .then(() => migrate({ closePool: false }))
  .then(() => loginSecurity.ensureSchema())
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`auth-service listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('auth security schema failed', { error: error.message });
    process.exit(1);
  });
