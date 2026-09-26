const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');
const tokenService = require('../services/token.service');
const loginSecurity = require('../services/login-security.service');
const pinService = require('../services/pin.service');

const PIN_LIMITS = { accountLimit: 5, networkLimit: 25 };
const DUMMY_PIN_HASH = bcrypt.hashSync('0000', 12);

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
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    priority: 'high',
  };
  res.cookie('accessToken', accessToken, { ...options, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...options, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

async function issueSession(res, user) {
  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = await tokenService.generateRefreshToken(user);
  setAuthCookies(res, accessToken, refreshToken);
  return { accessToken, refreshToken };
}

async function loginWithPin(req, res, next) {
  try {
    const phone = String(req.body.phone || '').trim();
    const pin = String(req.body.pin || '');
    const throttleKey = `pin:${phone}`;
    if (await loginSecurity.isBlocked(req, throttleKey, PIN_LIMITS)) {
      await loginSecurity.audit('pin_login_blocked', { success: false, req, identifier: phone });
      return res.status(429).json({ success: false, message: 'ลองเข้าระบบบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' });
    }

    const user = await userModel.findByPhone(phone);
    let verification;
    if (user?.pin_hash) verification = await pinService.verifyPin(pin, user.pin_hash);
    else {
      await bcrypt.compare(pin, DUMMY_PIN_HASH);
      verification = { valid: false, needsUpgrade: false };
    }

    if (!verification.valid) {
      await loginSecurity.recordFailure(req, throttleKey, PIN_LIMITS);
      await loginSecurity.audit('pin_login_failed', { userId: user?.id || null, success: false, req, identifier: phone });
      return res.status(401).json({ success: false, message: 'เบอร์โทรศัพท์หรือ PIN ไม่ถูกต้อง' });
    }

    if (verification.needsUpgrade) await userModel.updatePin(user.id, await pinService.hashPin(pin));
    await loginSecurity.clearForAccount(throttleKey);
    const session = await issueSession(res, user);
    await loginSecurity.audit('pin_login_succeeded', { userId: user.id, success: true, req, identifier: phone });
    return res.json({ success: true, user: publicUser(user), ...session });
  } catch (error) {
    return next(error);
  }
}

async function changePin(req, res, next) {
  try {
    const { currentPin, newPin, confirmNewPin } = req.body;
    const throttleKey = `pin-change:${req.user.id}`;
    if (await loginSecurity.isBlocked(req, throttleKey, PIN_LIMITS)) {
      await loginSecurity.audit('pin_change_blocked', { userId: req.user.id, success: false, req });
      return res.status(429).json({ success: false, message: 'ลองเปลี่ยน PIN บ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' });
    }
    if (newPin !== confirmNewPin) return res.status(400).json({ success: false, message: 'PIN ใหม่และการยืนยัน PIN ไม่ตรงกัน' });
    if (currentPin === newPin) return res.status(400).json({ success: false, message: 'PIN ใหม่ต้องไม่ซ้ำกับ PIN ปัจจุบัน' });

    const user = await userModel.findById(req.user.id);
    const verification = await pinService.verifyPin(String(currentPin), user?.pin_hash);
    if (!user || !verification.valid) {
      await loginSecurity.recordFailure(req, throttleKey, PIN_LIMITS);
      await loginSecurity.audit('pin_change_failed', { userId: req.user.id, success: false, req });
      return res.status(401).json({ success: false, message: 'PIN ปัจจุบันไม่ถูกต้อง' });
    }

    await userModel.updatePin(user.id, await pinService.hashPin(String(newPin)));
    await loginSecurity.clearForAccount(throttleKey);
    await tokenService.revokeAllForUser(user.id);
    await loginSecurity.audit('pin_change_succeeded', { userId: user.id, success: true, req });
    return res.json({ success: true, message: 'เปลี่ยน PIN เรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่', reauthRequired: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = { loginWithPin, changePin };
