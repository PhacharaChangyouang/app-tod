const { body, validationResult } = require('express-validator');

const validatePhone = body('phone')
  .exists().withMessage('Phone is required')
  .bail()
  .trim()
  .matches(/^0\d{9}$/).withMessage('Phone must be a 10-digit Thai number starting with 0');

const validateOtp = body('code')
  .exists().withMessage('OTP code is required')
  .bail()
  .trim().isNumeric().withMessage('OTP code must contain only digits')
  .isLength({ min: 6, max: 6 }).withMessage('OTP code must be exactly 6 digits');

const validatePin = body('pin')
  .exists().withMessage('PIN is required')
  .bail()
  .trim().isNumeric().withMessage('PIN must contain only digits')
  .isLength({ min: 4, max: 4 }).withMessage('PIN must be exactly 4 digits');

const validateRegister = [
  validatePhone,
  body('name').exists().withMessage('Name is required').bail().trim().isLength({ min: 1 }),
  body('role').exists().withMessage('Role is required').bail().trim().isIn(['elderly', 'caregiver']).withMessage('Role must be either elderly or caregiver'),
  body('age').optional({ checkFalsy: true }).isInt({ min: 0, max: 120 }).withMessage('Age must be a valid number'),
  validatePin,
];

const validateLogin = [validatePhone, validatePin];

const validatePasswordRegister = [
  body('phone').exists().withMessage('กรุณากรอกเบอร์โทรศัพท์').bail().trim()
    .matches(/^0\d{9}$/).withMessage('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0'),
  body('firstName').exists().withMessage('กรุณากรอกชื่อ').bail().trim()
    .isLength({ min: 1, max: 50 }).withMessage('ชื่อมีความยาวไม่ถูกต้อง'),
  body('lastName').exists().withMessage('กรุณากรอกนามสกุล').bail().trim()
    .isLength({ min: 1, max: 50 }).withMessage('นามสกุลมีความยาวไม่ถูกต้อง'),
  body('username').exists().withMessage('กรุณากรอกชื่อผู้ใช้').bail().trim()
    .matches(/^[A-Za-z0-9]{4,30}$/).withMessage('ชื่อผู้ใช้ต้องมี 4–30 ตัว และใช้ภาษาอังกฤษหรือตัวเลขเท่านั้น'),
  body('email').exists().withMessage('กรุณากรอกอีเมล').bail().trim()
    .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
  body('password').exists().withMessage('กรุณากรอกรหัสผ่าน').bail()
    .isLength({ min: 8, max: 72 }).withMessage('รหัสผ่านต้องมี 8–72 ตัวอักษร'),
  body('confirmPassword').exists().withMessage('กรุณายืนยันรหัสผ่าน').bail()
    .isLength({ min: 8, max: 72 }).withMessage('การยืนยันรหัสผ่านไม่ถูกต้อง'),
  body('role').exists().withMessage('กรุณาเลือกประเภทบัญชี').bail().trim()
    .isIn(['elderly', 'caregiver']).withMessage('ประเภทบัญชีไม่ถูกต้อง'),
  body('age').optional({ checkFalsy: true })
    .isInt({ min: 1, max: 120 }).withMessage('อายุต้องอยู่ระหว่าง 1–120 ปี'),
  body('pin').exists().withMessage('กรุณาตั้ง PIN 4 หลัก').bail()
    .matches(/^\d{4}$/).withMessage('PIN ต้องเป็นตัวเลข 4 หลัก'),
  body('termsAccepted').custom((value) => value === true || value === 'true')
    .withMessage('กรุณายอมรับเงื่อนไขการใช้งานและนโยบายข้อมูลส่วนบุคคล'),
];

const validatePasswordLogin = [
  body('identifier').exists().withMessage('กรุณากรอกชื่อผู้ใช้หรืออีเมล').bail().trim()
    .isLength({ min: 1, max: 255 }),
  body('password').exists().withMessage('กรุณากรอกรหัสผ่าน').bail()
    .isLength({ min: 1, max: 72 }),
];

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
  validatePhone,
  validateOtp,
  validatePin,
  validateRegister,
  validateLogin,
  validatePasswordRegister,
  validatePasswordLogin,
  validateRefreshToken,
  handleValidationErrors,
};
