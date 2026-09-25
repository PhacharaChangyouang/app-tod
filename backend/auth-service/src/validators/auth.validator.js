const { body, validationResult } = require('express-validator');

const validatePhone = body('phone').exists().withMessage('กรุณากรอกเบอร์โทรศัพท์').bail().trim()
  .matches(/^0\d{9}$/).withMessage('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0');
const validatePin = body('pin').exists().withMessage('กรุณากรอก PIN').bail()
  .matches(/^\d{4}$/).withMessage('PIN ต้องเป็นตัวเลข 4 หลัก');

const validatePasswordRegister = [
  validatePhone,
  body('firstName').exists().withMessage('กรุณากรอกชื่อ').bail().trim()
    .isLength({ min: 1, max: 50 }).withMessage('ชื่อมีความยาวไม่ถูกต้อง'),
  body('lastName').exists().withMessage('กรุณากรอกนามสกุล').bail().trim()
    .isLength({ min: 1, max: 50 }).withMessage('นามสกุลมีความยาวไม่ถูกต้อง'),
  body('username').exists().withMessage('กรุณากรอกชื่อผู้ใช้').bail().trim()
    .matches(/^[A-Za-z0-9]{4,30}$/).withMessage('ชื่อผู้ใช้ต้องมี 4–30 ตัว และใช้ภาษาอังกฤษหรือตัวเลขเท่านั้น'),
  body('email').exists().withMessage('กรุณากรอกอีเมล').bail().trim()
    .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
  body('password').exists().withMessage('กรุณากรอกรหัสผ่าน').bail()
    .custom((value) => Buffer.byteLength(String(value), 'utf8') >= 12 && Buffer.byteLength(String(value), 'utf8') <= 72)
    .withMessage('รหัสผ่านต้องมีขนาด 12–72 ไบต์'),
  body('confirmPassword').exists().withMessage('กรุณายืนยันรหัสผ่าน').bail()
    .custom((value) => Buffer.byteLength(String(value), 'utf8') >= 12 && Buffer.byteLength(String(value), 'utf8') <= 72)
    .withMessage('การยืนยันรหัสผ่านไม่ถูกต้อง'),
  validatePin,
  body('confirmPin').exists().withMessage('กรุณายืนยัน PIN').bail()
    .matches(/^\d{4}$/).withMessage('การยืนยัน PIN ต้องเป็นตัวเลข 4 หลัก')
    .custom((value, { req }) => value === req.body.pin).withMessage('PIN และการยืนยัน PIN ไม่ตรงกัน'),
  body('role').exists().withMessage('กรุณาเลือกประเภทบัญชี').bail().trim()
    .isIn(['elderly', 'caregiver']).withMessage('ประเภทบัญชีไม่ถูกต้อง'),
  body('age').optional({ checkFalsy: true })
    .isInt({ min: 1, max: 120 }).withMessage('อายุต้องอยู่ระหว่าง 1–120 ปี'),
  body('termsAccepted').custom((value) => value === true || value === 'true')
    .withMessage('กรุณายอมรับเงื่อนไขการใช้งานและนโยบายข้อมูลส่วนบุคคล'),
];

const validatePasswordLogin = [
  body('identifier').exists().withMessage('กรุณากรอกชื่อผู้ใช้หรืออีเมล').bail().trim()
    .isLength({ min: 1, max: 255 }),
  body('password').exists().withMessage('กรุณากรอกรหัสผ่าน').bail()
    .custom((value) => Buffer.byteLength(String(value), 'utf8') >= 1 && Buffer.byteLength(String(value), 'utf8') <= 72),
];

const validatePinLogin = [validatePhone, validatePin];
const validatePinChange = [
  body('currentPin').exists().withMessage('กรุณากรอก PIN ปัจจุบัน').bail().matches(/^\d{4}$/).withMessage('PIN ปัจจุบันต้องเป็นตัวเลข 4 หลัก'),
  body('newPin').exists().withMessage('กรุณากรอก PIN ใหม่').bail().matches(/^\d{4}$/).withMessage('PIN ใหม่ต้องเป็นตัวเลข 4 หลัก'),
  body('confirmNewPin').exists().withMessage('กรุณายืนยัน PIN ใหม่').bail().matches(/^\d{4}$/).withMessage('การยืนยัน PIN ต้องเป็นตัวเลข 4 หลัก')
    .custom((value, { req }) => value === req.body.newPin).withMessage('PIN ใหม่และการยืนยัน PIN ไม่ตรงกัน'),
];

// Refresh token may be sent in the request body OR stored in the httpOnly cookie.
// Keep it optional here because auth.controller.js already supports both sources.
const validateRefreshToken = body('refreshToken')
  .optional({ checkFalsy: true })
  .isString().withMessage('Refresh token must be a string')
  .trim()
  .isLength({ min: 1 }).withMessage('Refresh token is required');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'ข้อมูลที่ส่งมาไม่ถูกต้อง',
      errors: errors.array().map((error) => ({
        field: error.path || error.param,
        message: error.msg,
      })),
    });
  }
  next();
}

module.exports = {
  validatePinLogin,
  validatePinChange,
  validatePasswordRegister,
  validatePasswordLogin,
  validateRefreshToken,
  handleValidationErrors,
};
