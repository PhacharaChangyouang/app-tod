const tokenService = require('../services/token.service');

module.exports = function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const payload = tokenService.verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  req.user = {
    id: payload.id,
    phone: payload.phone,
    role: payload.role,
  };
  next();
};
