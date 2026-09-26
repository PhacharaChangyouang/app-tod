const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const passwordAuthController = require('../controllers/password-auth.controller');
const pinAuthController = require('../controllers/pin-auth.controller');
const googleAuthController = require('../controllers/google-auth.controller');
const authenticate = require('../middlewares/authenticate');
const {
  validatePasswordRegister,
  validatePasswordLogin,
  validatePinLogin,
  validatePinChange,
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
const pinCredentialLimiter = authLimiter(25, 'ลองเข้าระบบด้วย PIN บ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่', { skipSuccessfulRequests: true });
const pinChangeLimiter = authLimiter(25, 'ลองเปลี่ยน PIN บ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่', { skipSuccessfulRequests: true });
const registrationLimiter = authLimiter(5, 'สมัครบัญชีบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่');
const googleLimiter = authLimiter(10, 'เข้าสู่ระบบด้วย Google บ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่', { skipSuccessfulRequests: true });

router.post('/register-password', registrationLimiter, validatePasswordRegister, handleValidationErrors, passwordAuthController.registerWithPassword);
router.post('/login-password', credentialLimiter, validatePasswordLogin, handleValidationErrors, passwordAuthController.loginWithPassword);
// Kept at /login for compatibility with active phone+PIN clients.
router.post('/login', pinCredentialLimiter, validatePinLogin, handleValidationErrors, pinAuthController.loginWithPin);
router.post('/google', googleLimiter, googleAuthController.googleLogin);
router.post('/google/complete', registrationLimiter, googleAuthController.completeGoogleSignup);

router.post('/refresh', validateRefreshToken, handleValidationErrors, authController.refresh);
router.post('/logout', validateRefreshToken, handleValidationErrors, authController.logout);

// Protected account/profile APIs
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, authController.updateMe);
router.post('/me/change-pin', authenticate, pinChangeLimiter, validatePinChange, handleValidationErrors, pinAuthController.changePin);

module.exports = router;
