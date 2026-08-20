const jwt = require('jsonwebtoken');

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

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.accessToken) {
      token = cookies.accessToken;
    }
  }

  const internalKey = req.headers['x-internal-api-key'];
  if (internalKey && internalKey === process.env.INTERNAL_API_KEY) {
    req.user = { id: 'system', role: 'system' };
    return next();
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      phone: payload.phone,
      role: payload.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
  }
};