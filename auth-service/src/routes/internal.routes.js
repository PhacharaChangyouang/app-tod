const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../utils/jwt');
const response = require('../utils/response');

router.post('/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return response.badRequest(res, 'Token is required');
  }

  try {
    const decoded = verifyAccessToken(token);
    return response.success(res, {
      valid: true,
      caregiver: { id: decoded.sub, role: decoded.role },
    });
  } catch (err) {
    return response.success(res, {
      valid: false,
      reason: err.name === 'TokenExpiredError' ? 'expired' : 'invalid',
    });
  }
});

module.exports = router;