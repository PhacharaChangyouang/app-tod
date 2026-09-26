const userModel = require('../models/user.model');
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
    path: '/',
    priority: 'high',
  };
  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

async function issueSession(res, user) {
  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = await tokenService.generateRefreshToken(user);
  setAuthCookies(res, accessToken, refreshToken);
  return { accessToken, refreshToken };
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
    const { name, age } = req.body;
    if (age !== undefined && age !== null && (!Number.isInteger(Number(age)) || Number(age) < 1 || Number(age) > 120)) return res.status(400).json({ success: false, message: 'Invalid age' });

    const user = await userModel.updateProfile(req.user.id, {
      name: name === undefined ? null : String(name).trim().slice(0, 100),
      age: age === undefined || age === null || age === '' ? null : Number(age),
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user: publicUser(user) });
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
    const clearOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' };
    res.clearCookie('accessToken', clearOptions);
    res.clearCookie('refreshToken', clearOptions);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

module.exports = { me, updateMe, refresh, logout };
