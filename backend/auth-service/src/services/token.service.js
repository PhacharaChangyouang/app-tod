require('dotenv').config();
const jwt = require('jsonwebtoken');

const refreshTokenStore = new Set();

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
}

function generateRefreshToken(user) {
  const token = jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    }
  );

  saveRefreshToken(token);
  return token;
}

function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}

function verifyAccessToken(token) {
  return verifyToken(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return verifyToken(token, process.env.JWT_REFRESH_SECRET);
}

function saveRefreshToken(token) {
  refreshTokenStore.add(token);
}

function isRefreshTokenValid(token) {
  return refreshTokenStore.has(token);
}

function revokeRefreshToken(token) {
  refreshTokenStore.delete(token);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
};
