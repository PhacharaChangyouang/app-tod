const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/password-reset.controller');

const router = express.Router();
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'คำขอรีเซ็ตรหัสผ่านมากเกินไป กรุณาลองใหม่ภายหลัง' },
});

router.post('/forgot-password', controller.requestReset);
router.post('/reset-password', resetLimiter, controller.resetPassword);

module.exports = router;
