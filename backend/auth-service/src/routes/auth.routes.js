const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const passwordAuthController = require('../controllers/password-auth.controller');
const authenticate = require('../middlewares/authenticate');
const {
  validatePasswordRegister,
  validatePasswordLogin,
  validateRefreshToken,
  handleValidationErrors,
} = require('../validators/auth.validator');

function authLimiter(max, message, { skipSuccessfulRequests = false } = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { success: false, message },
  });
}

const credentialLimiter = authLimiter(10, 'ลองเข้าระบบบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่', { skipSuccessfulRequests: true });
const registrationLimiter = authLimiter(5, 'สมัครบัญชีบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่');

router.post('/register-password', registrationLimiter, validatePasswordRegister, handleValidationErrors, passwordAuthController.registerWithPassword);
router.post('/login-password', credentialLimiter, validatePasswordLogin, handleValidationErrors, passwordAuthController.loginWithPassword);

router.post('/refresh', validateRefreshToken, handleValidationErrors, authController.refresh);
router.post('/logout', validateRefreshToken, handleValidationErrors, authController.logout);

// Protected account/profile APIs
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, authController.updateMe);

module.exports = router;
