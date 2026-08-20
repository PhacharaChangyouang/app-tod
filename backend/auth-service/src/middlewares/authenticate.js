const tokenService = require('../services/token.service');

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });
  return list;
}

module.exports = function authenticate(req, res, next) {
  let token = null;

  // 1. Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } 
  // 2. Try to get token from cookies
  else if (req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.accessToken) {
      token = cookies.accessToken;
    }
  }

  // Allow internal service-to-service communication via Internal API Key
  const internalKey = req.headers['x-internal-api-key'];
  if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
    req.user = { id: 'system', role: 'system' };
    return next();
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
  }

  const payload = tokenService.verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
  }

  req.user = {
    id: payload.id,
    phone: payload.phone,
    role: payload.role,
  };
  next();
};
