const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/password-reset.controller');

const router = express.Router();
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'คำขอรีเซ็ตรหัสผ่านมากเกินไป กรุณาลองใหม่ภายหลัง' },
});

router.post('/forgot-password', limiter, controller.requestReset);
router.post('/reset-password', limiter, controller.resetPassword);

module.exports = router;
