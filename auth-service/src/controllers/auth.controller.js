const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const Caregiver = require('../models/caregiver.model');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getExpiryDate,
} = require('../utils/jwt');
const response = require('../utils/response');
const logger = require('../utils/logger');

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.badRequest(res, 'Validation failed', errors.array());
  }

  const { name, email, password, phone } = req.body;

  try {
    const existing = await Caregiver.findByEmail(email);
    if (existing) {
      return response.conflict(res, 'An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const caregiver = await Caregiver.create({ name, email, password: hashedPassword, phone });

    const payload = { sub: caregiver.id, role: caregiver.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await Caregiver.saveRefreshToken({
      caregiverId: caregiver.id,
      token: refreshToken,
      expiresAt: getExpiryDate(process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
    });

    logger.info('Caregiver registered', { caregiverId: caregiver.id, email });

    return response.created(res, { caregiver, accessToken, refreshToken }, 'Registration successful');
  } catch (err) {
    logger.error('Register error', { error: err.message });
    return response.error(res, 'Registration failed. Please try again.');
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.badRequest(res, 'Validation failed', errors.array());
  }

  const { email, password } = req.body;

  try {
    const caregiver = await Caregiver.findByEmail(email);
    if (!caregiver) {
      return response.unauthorized(res, 'Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, caregiver.password);
    if (!passwordMatch) {
      return response.unauthorized(res, 'Invalid email or password');
    }

    const payload = { sub: caregiver.id, role: caregiver.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await Caregiver.saveRefreshToken({
      caregiverId: caregiver.id,
      token: refreshToken,
      expiresAt: getExpiryDate(process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
    });

    const { password: _pw, ...caregiverData } = caregiver;

    logger.info('Caregiver logged in', { caregiverId: caregiver.id });

    return response.success(res, { caregiver: caregiverData, accessToken, refreshToken }, 'Login successful');
  } catch (err) {
    logger.error('Login error', { error: err.message });
    return response.error(res, 'Login failed. Please try again.');
  }
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return response.badRequest(res, 'Refresh token is required');
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    const stored = await Caregiver.findRefreshToken(refreshToken);
    if (!stored || !stored.caregiver_active) {
      return response.unauthorized(res, 'Invalid or expired refresh token');
    }

    await Caregiver.deleteRefreshToken(refreshToken);

    const payload = { sub: decoded.sub, role: decoded.role };
    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    await Caregiver.saveRefreshToken({
      caregiverId: decoded.sub,
      token: newRefreshToken,
      expiresAt: getExpiryDate(process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
    });

    return response.success(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return response.unauthorized(res, 'Invalid or expired refresh token');
    }
    logger.error('Refresh error', { error: err.message });
    return response.error(res, 'Token refresh failed');
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  const { all } = req.query;

  try {
    if (all === 'true') {
      await Caregiver.deleteAllRefreshTokens(req.caregiver.id);
      logger.info('All sessions revoked', { caregiverId: req.caregiver.id });
      return response.success(res, null, 'All sessions logged out');
    }

    if (refreshToken) {
      await Caregiver.deleteRefreshToken(refreshToken);
    }

    logger.info('Caregiver logged out', { caregiverId: req.caregiver.id });
    return response.success(res, null, 'Logged out successfully');
  } catch (err) {
    logger.error('Logout error', { error: err.message });
    return response.error(res, 'Logout failed');
  }
};

const me = async (req, res) => {
  try {
    const caregiver = await Caregiver.findById(req.caregiver.id);
    if (!caregiver) {
      return response.notFound(res, 'Account not found');
    }
    return response.success(res, { caregiver });
  } catch (err) {
    logger.error('Me error', { error: err.message });
    return response.error(res, 'Failed to fetch profile');
  }
};

const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.badRequest(res, 'Validation failed', errors.array());
  }

  const { name, phone } = req.body;

  try {
    const caregiver = await Caregiver.updateProfile(req.caregiver.id, { name, phone });
    if (!caregiver) {
      return response.notFound(res, 'Account not found');
    }
    return response.success(res, { caregiver }, 'Profile updated');
  } catch (err) {
    logger.error('Update profile error', { error: err.message });
    return response.error(res, 'Failed to update profile');
  }
};

const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.badRequest(res, 'Validation failed', errors.array());
  }

  const { currentPassword, newPassword } = req.body;

  try {
    const caregiver = await Caregiver.findByEmail(req.caregiver.email);
    const match = await bcrypt.compare(currentPassword, caregiver.password);
    if (!match) {
      return response.unauthorized(res, 'Current password is incorrect');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await Caregiver.updatePassword(req.caregiver.id, hashed);
    await Caregiver.deleteAllRefreshTokens(req.caregiver.id);

    logger.info('Password changed', { caregiverId: req.caregiver.id });
    return response.success(res, null, 'Password changed. Please log in again.');
  } catch (err) {
    logger.error('Change password error', { error: err.message });
    return response.error(res, 'Failed to change password');
  }
};

module.exports = { register, login, refresh, logout, me, updateProfile, changePassword };