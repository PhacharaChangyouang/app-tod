const { body, validationResult } = require('express-validator');

const validatePhone = body('phone')
  .exists().withMessage('Phone is required')
  .trim().matches(/^0\d{9}$/).withMessage('Phone must be a 10-digit Thai number starting with 0');

const validateOtp = body('code')
  .exists().withMessage('OTP code is required')
  .trim().isNumeric().withMessage('OTP code must contain only digits')
  .isLength({ min: 6, max: 6 }).withMessage('OTP code must be exactly 6 digits');

const validatePin = body('pin')
  .exists().withMessage('PIN is required')
  .trim().isNumeric().withMessage('PIN must contain only digits')
  .isLength({ min: 4, max: 4 }).withMessage('PIN must be exactly 4 digits');

const validateRegister = [
  validatePhone,
  body('name').exists().withMessage('Name is required').trim().isLength({ min: 1 }),
  body('role').exists().withMessage('Role is required').trim().isIn(['elderly', 'caregiver']).withMessage('Role must be either elderly or caregiver'),
  body('age').optional({ checkFalsy: true }).isInt({ min: 0, max: 120 }).withMessage('Age must be a valid number'),
  validatePin,
];

const validateLogin = [validatePhone, validatePin];

const validatePasswordRegister = [
  body('phone').exists().trim().matches(/^0\d{9}$/).withMessage('Phone must be a 10-digit Thai number starting with 0'),
  body('firstName').exists().trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
  body('lastName').exists().trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
  body('username').exists().trim().matches(/^[A-Za-z0-9_.-]{4,30}$/).withMessage('Username must be 4-30 letters, numbers, dot, dash or underscore'),
  body('email').exists().trim().isEmail().withMessage('Email is required and must be valid'),
  body('password').exists().isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters'),
  body('confirmPassword').exists().withMessage('Password confirmation is required'),
  body('role').exists().isIn(['elderly', 'caregiver']).withMessage('Role must be elderly or caregiver'),
  body('age').optional({ checkFalsy: true }).isInt({ min: 1, max: 120 }).withMessage('Age must be a valid number'),
  body('pin').exists().matches(/^\d{4}$/).withMessage('PIN must be exactly 4 digits'),
  body('termsAccepted').custom((value) => value === true || value === 'true').withMessage('Terms must be accepted'),
];

const validatePasswordLogin = [
  body('identifier').exists().trim().isLength({ min: 1, max: 255 }).withMessage('Username or email is required'),
  body('password').exists().isLength({ min: 1, max: 72 }).withMessage('Password is required'),
];

const validateRefreshToken = body('refreshToken')
  .exists().withMessage('refreshToken is required')
  .trim().notEmpty().withMessage('refreshToken cannot be empty');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
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
