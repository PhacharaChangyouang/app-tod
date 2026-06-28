const { verifyAccessToken } = require('../utils/jwt');
const Caregiver = require('../models/caregiver.model');
const response = require('../utils/response');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.unauthorized(res, 'Authorization header missing or malformed');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.caregiver = {
      id: decoded.sub,
      role: decoded.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return response.unauthorized(res, 'Access token expired');
    }
    logger.warn('Invalid token attempt', { error: err.message });
    return response.unauthorized(res, 'Invalid access token');
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.caregiver) {
    return response.unauthorized(res, 'Not authenticated');
  }
  if (!roles.includes(req.caregiver.role)) {
    return response.forbidden(res, 'Insufficient permissions');
  }
  next();
};

const authenticateWithDB = async (req, res, next) => {
  await authenticate(req, res, async () => {
    try {
      const caregiver = await Caregiver.findById(req.caregiver.id);
      if (!caregiver || !caregiver.is_active) {
        return response.unauthorized(res, 'Account not found or inactive');
      }
      req.caregiver = caregiver;
      next();
    } catch (err) {
      logger.error('DB auth check error', { error: err.message });
      return response.error(res, 'Authentication error');
    }
  });
};

module.exports = { authenticate, authorize, authenticateWithDB };