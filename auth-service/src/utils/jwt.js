const jwt = require('jsonwebtoken');

const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'elderly-health-assistant',
    audience: 'aha-clients',
  });

const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: 'elderly-health-assistant',
    audience: 'aha-clients',
  });

const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'elderly-health-assistant',
    audience: 'aha-clients',
  });

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'elderly-health-assistant',
    audience: 'aha-clients',
  });

const getExpiryDate = (duration) => {
  const units = { d: 86400, h: 3600, m: 60, s: 1 };
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  return new Date(Date.now() + parseInt(match[1]) * units[match[2]] * 1000);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getExpiryDate,
};