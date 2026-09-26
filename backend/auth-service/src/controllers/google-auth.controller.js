const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const userModel = require('../models/user.model');
const tokenService = require('../services/token.service');
const pinService = require('../services/pin.service');

const LEGAL_VERSION = '2026-09-26';
const GOOGLE_SIGNUP_AUDIENCE = 'aha-google-signup';
const googleClient = new OAuth2Client();

function publicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    age: user.age,
    role: user.role,
    username: user.username || null,
    email: user.email || null,
    avatarUrl: user.avatar_url || null,
    authProvider: user.google_sub ? 'google' : 'local',
  };
}

function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', priority: 'high' };
}

async function issueSession(res, user) {
  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = await tokenService.generateRefreshToken(user);
  res.cookie('accessToken', accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions(), maxAge: 30 * 24 * 60 * 60 * 1000 });
  return { accessToken, refreshToken };
}

function signupSecret() {
  return process.env.GOOGLE_SIGNUP_SECRET || process.env.JWT_SECRET;
}

async function verifyGoogleCredential(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    const error = new Error('Google Login is not configured');
    error.status = 503;
    throw error;
  }
  if (typeof credential !== 'string' || credential.length < 100 || credential.length > 8192) {
    const error = new Error('Invalid Google credential');
    error.status = 400;
    throw error;
  }
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  const email = String(payload?.email || '').trim().toLowerCase();
  const googleIsAuthoritative = email.endsWith('@gmail.com') || Boolean(payload?.hd);
  if (!payload?.sub || !email || payload.email_verified !== true || !googleIsAuthoritative) {
    const error = new Error('Google account email is not verified');
    error.status = 401;
    throw error;
  }
  return {
    sub: String(payload.sub),
    email,
    name: String(payload.name || '').trim().slice(0, 100),
    picture: typeof payload.picture === 'string' && payload.picture.startsWith('https://') ? payload.picture.slice(0, 2048) : null,
  };
}

async function googleLogin(req, res, next) {
  try {
    const profile = await verifyGoogleCredential(req.body?.credential);
    let user = await userModel.findByGoogleSub(profile.sub);

    if (!user) {
      user = await userModel.findByEmail(profile.email);
      if (user) user = await userModel.linkGoogleIdentity(user.id, { googleSub: profile.sub, avatarUrl: profile.picture });
    }

    if (user) {
      const session = await issueSession(res, user);
      return res.json({ success: true, user: publicUser(user), ...session });
    }

    const signupToken = jwt.sign(profile, signupSecret(), {
      algorithm: 'HS256', issuer: 'aha-auth-service', audience: GOOGLE_SIGNUP_AUDIENCE, expiresIn: '10m',
    });
    return res.json({
      success: true,
      requiresCompletion: true,
      signupToken,
      profile: { email: profile.email, name: profile.name, picture: profile.picture },
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    if (/Token used too late|Invalid token signature|Wrong recipient|No pem found/i.test(error.message || '')) {
      return res.status(401).json({ success: false, message: 'ไม่สามารถยืนยันบัญชี Google ได้ กรุณาลองใหม่' });
    }
    next(error);
  }
}

async function completeGoogleSignup(req, res, next) {
  try {
    const { signupToken, phone, pin, confirmPin, role, age, termsAccepted } = req.body || {};
    let profile;
    try {
      profile = jwt.verify(signupToken, signupSecret(), {
        algorithms: ['HS256'], issuer: 'aha-auth-service', audience: GOOGLE_SIGNUP_AUDIENCE,
      });
    } catch (_) {
      return res.status(401).json({ success: false, message: 'ขั้นตอนสมัครด้วย Google หมดอายุ กรุณาเริ่มใหม่' });
    }
    if (!/^0\d{9}$/.test(String(phone || ''))) return res.status(400).json({ success: false, message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0' });
    if (!/^\d{4}$/.test(String(pin || '')) || pin !== confirmPin) return res.status(400).json({ success: false, message: 'PIN ต้องเป็นตัวเลข 4 หลักและตรงกันทั้งสองช่อง' });
    if (!['elderly', 'caregiver'].includes(role)) return res.status(400).json({ success: false, message: 'กรุณาเลือกประเภทบัญชี' });
    const normalizedAge = age === '' || age == null ? null : Number(age);
    if (role === 'elderly' && (!Number.isInteger(normalizedAge) || normalizedAge < 1 || normalizedAge > 120)) return res.status(400).json({ success: false, message: 'กรุณาระบุอายุ 1–120 ปี' });
    if (termsAccepted !== true) return res.status(400).json({ success: false, message: 'กรุณายอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว' });

    const existingGoogle = await userModel.findByGoogleSub(profile.sub);
    const existingEmail = await userModel.findByEmail(profile.email);
    if (existingGoogle || existingEmail) return res.status(409).json({ success: false, message: 'บัญชีนี้ถูกสร้างแล้ว กรุณากลับไปเข้าสู่ระบบด้วย Google อีกครั้ง' });
    if (await userModel.findByPhone(phone)) return res.status(409).json({ success: false, message: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว' });

    const pinHash = await pinService.hashPin(String(pin));
    const user = await userModel.createWithGoogle({
      phone, name: profile.name, age: normalizedAge, role, email: profile.email,
      pinHash, googleSub: profile.sub, avatarUrl: profile.picture, legalVersion: LEGAL_VERSION,
    });
    const session = await issueSession(res, user);
    return res.status(201).json({ success: true, user: publicUser(user), ...session });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ success: false, message: 'อีเมลหรือเบอร์โทรศัพท์นี้ถูกใช้งานแล้ว' });
    next(error);
  }
}

module.exports = { googleLogin, completeGoogleSignup, verifyGoogleCredential };
