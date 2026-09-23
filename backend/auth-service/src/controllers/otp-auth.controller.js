const userModel = require('../models/user.model');
const otpService = require('../services/otp.service');
const tokenService = require('../services/token.service');

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

async function loginWithOtp(req, res, next) {
  try {
    const { phone, code } = req.body;
    const result = otpService.verifyOtp(phone, code);
    if (!result.valid) return res.status(400).json({ success: false, message: result.reason });

    const user = await userModel.findByPhone(phone);
    if (!user) return res.status(404).json({ success: false, message: 'ไม่พบบัญชีนี้ กรุณาสมัครสมาชิกก่อน' });

    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = await tokenService.generateRefreshToken(user);
    setAuthCookies(res, accessToken, refreshToken);
    otpService.clearPhoneVerification(phone);

    res.json({ success: true, user: publicUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

module.exports = { loginWithOtp };
