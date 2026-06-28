const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authenticateWithDB } = require('../middleware/auth.middleware');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
} = require('../middleware/validation.middleware');

router.post('/register', registerValidation,    authController.register);
router.post('/login',    loginValidation,        authController.login);
router.post('/refresh',                          authController.refresh);

router.post ('/logout',       authenticate,        authController.logout);
router.get  ('/me',           authenticate,        authController.me);
router.patch('/me',           authenticate,        updateProfileValidation,   authController.updateProfile);
router.patch('/me/password',  authenticateWithDB,  changePasswordValidation,  authController.changePassword);

module.exports = router;