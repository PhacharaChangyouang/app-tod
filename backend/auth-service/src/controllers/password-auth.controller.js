const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const userModel = require('../models/user.model');
const tokenService = require('../services/token.service');
const loginSecurity = require('../services/login-security.service');
const pinService = require('../services/pin.service');

const SALT_ROUNDS = 12;
const LEGAL_VERSION = '2026-09-26';
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('AHA-dummy-password-not-an-account-2026', SALT_ROUNDS);

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
    path: '/',
    priority: 'high',
  };
  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

async function issueSession(res, user) {
  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = await tokenService.generateRefreshToken(user);
  setAuthCookies(res, accessToken, refreshToken);
  return { accessToken, refreshToken };
}

async function registerWithPassword(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.REGISTRATION_ENABLED !== 'true') {
      return res.status(403).json({ success: false, message: 'ระบบยังไม่เปิดรับการสมัครบัญชีสาธารณะ' });
    }

    const {
      phone, firstName, lastName, email, username,
      password, confirmPassword, pin, confirmPin, role, age, termsAccepted,
    } = req.body;

    if (!termsAccepted) {
      return res.status(400).json({ success: false, message: 'กรุณายอมรับเงื่อนไขการใช้งานและนโยบายข้อมูลส่วนบุคคล' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({ success: false, message: 'PIN และการยืนยัน PIN ไม่ตรงกัน' });
    }

    if (!/^\d{4}$/.test(String(pin || ''))) {
      return res.status(400).json({ success: false, message: 'PIN ต้องเป็นตัวเลข 4 หลัก' });
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{12,72}$/.test(String(password || '')) || Buffer.byteLength(String(password), 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมี 12–72 ไบต์ และมีทั้งตัวอักษรภาษาอังกฤษกับตัวเลข' });
    }

    const phoneUser = await userModel.findByPhone(phone);
    if (phoneUser) return res.status(409).json({ success: false, message: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว' });

    const usernameUser = await userModel.findByUsername(username);
    if (usernameUser) return res.status(409).json({ success: false, message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });

    if (email) {
      const { rows } = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
      if (rows.length) return res.status(409).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    const name = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const pinHash = await pinService.hashPin(String(pin));

    const user = await userModel.createWithPassword({
      phone,
      name,
      age: age || null,
      role,
      username: String(username).trim(),
      email: email ? String(email).trim().toLowerCase() : null,
      passwordHash,
      pinHash,
      legalVersion: LEGAL_VERSION,
    });

    const { accessToken, refreshToken } = await issueSession(res, user);
    res.status(201).json({ success: true, user: publicUser(user), accessToken, refreshToken });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'ข้อมูลบัญชีนี้ถูกใช้งานแล้ว' });
    next(err);
  }
}

async function loginWithPassword(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    if (await loginSecurity.isBlocked(req, normalizedIdentifier)) {
      await loginSecurity.audit('password_login_blocked', { success: false, req, identifier: normalizedIdentifier });
      return res.status(429).json({ success: false, message: 'ลองเข้าระบบบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' });
    }

    const user = await userModel.findByCredentials(normalizedIdentifier);
    if (!user || !user.password_hash) {
      await bcrypt.compare(String(password || ''), DUMMY_PASSWORD_HASH);
      await loginSecurity.recordFailure(req, normalizedIdentifier);
      await loginSecurity.audit('password_login_failed', { success: false, req, identifier: normalizedIdentifier });
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const valid = await bcrypt.compare(String(password || ''), user.password_hash);
    if (!valid) {
      await loginSecurity.recordFailure(req, normalizedIdentifier);
      await loginSecurity.audit('password_login_failed', { userId: user.id, success: false, req, identifier: normalizedIdentifier });
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง' });
    }

    await loginSecurity.clearForAccount(normalizedIdentifier);
    const { accessToken, refreshToken } = await issueSession(res, user);
    await loginSecurity.audit('password_login_succeeded', { userId: user.id, success: true, req, identifier: normalizedIdentifier });
    res.json({ success: true, user: publicUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerWithPassword, loginWithPassword };
