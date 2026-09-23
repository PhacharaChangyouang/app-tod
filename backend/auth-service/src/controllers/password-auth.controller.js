const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const userModel = require('../models/user.model');
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

async function registerWithPassword(req, res, next) {
  try {
    const {
      phone, firstName, lastName, email, username,
      password, confirmPassword, role, age, pin, termsAccepted,
    } = req.body;

    if (!termsAccepted) {
      return res.status(400).json({ success: false, message: 'กรุณายอมรับเงื่อนไขการใช้งานและนโยบายข้อมูลส่วนบุคคล' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' });
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(String(password || ''))) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีทั้งตัวอักษรภาษาอังกฤษกับตัวเลข' });
    }

    if (!/^\d{4}$/.test(String(pin || ''))) {
      return res.status(400).json({ success: false, message: 'PIN ต้องเป็นตัวเลข 4 หลัก' });
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
    const pinHash = await bcrypt.hash(String(pin), SALT_ROUNDS);

    const user = await userModel.createWithPassword({
      phone,
      name,
      age: age || null,
      role,
      pinHash,
      username: String(username).trim(),
      email: email ? String(email).trim().toLowerCase() : null,
      passwordHash,
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
    const user = await userModel.findByCredentials(String(identifier || '').trim());
    if (!user || !user.password_hash) {
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const valid = await bcrypt.compare(String(password || ''), user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง' });

    const { accessToken, refreshToken } = await issueSession(res, user);
    res.json({ success: true, user: publicUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerWithPassword, loginWithPassword };
