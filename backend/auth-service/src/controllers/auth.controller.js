const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');
const otpService = require('../services/otp.service');
const tokenService = require('../services/token.service');

const SALT_ROUNDS = 10;

async function requestOtp(req, res, next) {
  try {
    const { phone } = req.body;
    const result = await otpService.sendOtp(phone);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { phone, code } = req.body;
    const result = otpService.verifyOtp(phone, code);

    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    otpService.markPhoneVerified(phone);

    const user = await userModel.findByPhone(phone);
    if (user && !user.phone_verified) {
      await userModel.setPhoneVerified(user.id);
    }

    res.json({ success: true, verified: true });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { phone, name, age, role, pin } = req.body;

    if (!otpService.isPhoneVerified(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number has not been verified' });
    }

    const existingUser = await userModel.findByPhone(phone);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
    const user = await userModel.create({ phone, name, age, role, pinHash });
    await userModel.setPhoneVerified(user.id);
    otpService.clearPhoneVerification(phone);

    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        age: user.age,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { phone, pin } = req.body;
    const user = await userModel.findByPhone(phone);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const validPin = await bcrypt.compare(pin, user.pin_hash);
    if (!validPin) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);

    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        age: user.age,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const payload = tokenService.verifyRefreshToken(refreshToken);

    if (!payload || !tokenService.isRefreshTokenValid(refreshToken)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await userModel.findById(payload.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    tokenService.revokeRefreshToken(refreshToken);

    const accessToken = tokenService.generateAccessToken(user);
    const newRefreshToken = tokenService.generateRefreshToken(user);

    res.json({ success: true, accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    tokenService.revokeRefreshToken(refreshToken);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requestOtp,
  verifyOtp,
  register,
  login,
  refresh,
  logout,
};
