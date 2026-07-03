const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const {
  validatePhone,
  validateOtp,
  validateRegister,
  validateLogin,
  validateRefreshToken,
  handleValidationErrors,
} = require('../validators/auth.validator');

router.post('/request-otp', validatePhone, handleValidationErrors, authController.requestOtp);
router.post('/verify-otp', [validatePhone, validateOtp], handleValidationErrors, authController.verifyOtp);
router.post('/register', validateRegister, handleValidationErrors, authController.register);
router.post('/login', validateLogin, handleValidationErrors, authController.login);
router.post('/refresh', validateRefreshToken, handleValidationErrors, authController.refresh);
router.post('/logout', validateRefreshToken, handleValidationErrors, authController.logout);

module.exports = router;
