const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');
const otpService = require('../services/otp.service');
const tokenService = require('../services/token.service');

const SALT_ROUNDS = 10;

function publicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    age: user.age,
    role: user.role,
    username: user.username || null,
    email: user.email || null,
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };
  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

async function issueSession(res, user) {
  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = await tokenService.generateRefreshToken(user);
  setAuthCookies(res, accessToken, refreshToken);
  return { accessToken, refreshToken };
}

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

    if (!result.valid) return res.status(400).json({ success: false, message: result.reason });

    otpService.markPhoneVerified(phone);
    const user = await userModel.findByPhone(phone);
    if (user && !user.phone_verified) await userModel.setPhoneVerified(user.id);

    res.json({ success: true, verified: true, existingUser: Boolean(user), role: user?.role ?? null });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { phone, name, age, role, pin } = req.body;
    if (!otpService.isPhoneVerified(phone)) return res.status(400).json({ success: false, message: 'Phone number has not been verified' });

    const existingUser = await userModel.findByPhone(phone);
    if (existingUser) return res.status(409).json({ success: false, message: 'User already exists' });

    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
    const user = await userModel.create({ phone, name, age, role, pinHash });
    await userModel.setPhoneVerified(user.id);
    otpService.clearPhoneVerification(phone);

    const { accessToken, refreshToken } = await issueSession(res, user);
    res.status(201).json({ success: true, user: publicUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { phone, pin } = req.body;
    const user = await userModel.findByPhone(phone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const validPin = await bcrypt.compare(pin, user.pin_hash);
    if (!validPin) return res.status(401).json({ success: false, message: 'Invalid PIN' });

    const { accessToken, refreshToken } = await issueSession(res, user);
    res.json({ success: true, user: publicUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const { name, age, role } = req.body;
    if (role !== undefined && !['elderly', 'caregiver'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    if (age !== undefined && age !== null && (!Number.isInteger(Number(age)) || Number(age) < 1 || Number(age) > 120)) return res.status(400).json({ success: false, message: 'Invalid age' });

    const user = await userModel.updateProfile(req.user.id, {
      name: name === undefined ? null : String(name).trim().slice(0, 100),
      age: age === undefined || age === null || age === '' ? null : Number(age),
      role: role === undefined ? null : role,
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { accessToken, refreshToken } = await issueSession(res, user);
    res.json({ success: true, user: publicUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

async function changePin(req, res, next) {
  try {
    const { currentPin, newPin } = req.body;
    if (!/^\d{4}$/.test(String(newPin || ''))) return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });

    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const valid = await bcrypt.compare(String(currentPin || ''), user.pin_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Current PIN is incorrect' });

    const pinHash = await bcrypt.hash(String(newPin), SALT_ROUNDS);
    await userModel.updatePin(user.id, pinHash);
    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (err) {
    next(err);
  }
}

async function changePhone(req, res, next) {
  try {
    const { phone, code } = req.body;
    if (!/^0\d{9}$/.test(String(phone || ''))) return res.status(400).json({ success: false, message: 'Invalid phone number' });

    const existing = await userModel.findByPhone(phone);
    if (existing && existing.id !== req.user.id) return res.status(409).json({ success: false, message: 'Phone number is already in use' });

    const result = otpService.verifyOtp(phone, code);
    if (!result.valid) return res.status(400).json({ success: false, message: result.reason });

    otpService.markPhoneVerified(phone);
    const user = await userModel.updatePhone(req.user.id, phone);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    otpService.clearPhoneVerification(phone);

    const { accessToken, refreshToken } = await issueSession(res, user);
    res.json({ success: true, user: publicUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    let refreshToken = req.body.refreshToken;
    if (!refreshToken && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.split('=').map(c => c.trim());
        acc[name] = decodeURIComponent(value);
        return acc;
      }, {});
      refreshToken = cookies.refreshToken;
    }
    const payload = tokenService.verifyRefreshToken(refreshToken);
    if (!payload || !(await tokenService.isRefreshTokenValid(refreshToken))) return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });

    const user = await userModel.findById(payload.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    await tokenService.revokeRefreshToken(refreshToken);
    const session = await issueSession(res, user);
    res.json({ success: true, ...session, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    let refreshToken = req.body.refreshToken;
    if (!refreshToken && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.split('=').map(c => c.trim());
        acc[name] = decodeURIComponent(value);
        return acc;
      }, {});
      refreshToken = cookies.refreshToken;
    }
    if (refreshToken) await tokenService.revokeRefreshToken(refreshToken);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

module.exports = { requestOtp, verifyOtp, register, login, me, updateMe, changePin, changePhone, refresh, logout };
