const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const passwordAuthController = require('../controllers/password-auth.controller');
const authenticate = require('../middlewares/authenticate');
const {
  validatePhone,
  validateOtp,
  validateRegister,
  validateLogin,
  validatePasswordRegister,
  validatePasswordLogin,
  validateRefreshToken,
  handleValidationErrors,
} = require('../validators/auth.validator');

router.post('/request-otp', validatePhone, handleValidationErrors, authController.requestOtp);
router.post('/verify-otp', [validatePhone, validateOtp], handleValidationErrors, authController.verifyOtp);
router.post('/register', validateRegister, handleValidationErrors, authController.register);
router.post('/login', validateLogin, handleValidationErrors, authController.login);

// New credential flow. Existing OTP/PIN endpoints above remain unchanged.
router.post('/register-password', validatePasswordRegister, handleValidationErrors, passwordAuthController.registerWithPassword);
router.post('/login-password', validatePasswordLogin, handleValidationErrors, passwordAuthController.loginWithPassword);

router.post('/refresh', validateRefreshToken, handleValidationErrors, authController.refresh);
router.post('/logout', validateRefreshToken, handleValidationErrors, authController.logout);

// Protected account/profile APIs
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, authController.updateMe);
router.post('/me/change-pin', authenticate, authController.changePin);
router.post('/me/change-phone', authenticate, authController.changePhone);

module.exports = router;
