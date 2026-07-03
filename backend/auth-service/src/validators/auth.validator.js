const { body, validationResult } = require('express-validator');

const validatePhone = body('phone')
  .exists()
  .withMessage('Phone is required')
  .trim()
  .matches(/^0\d{9}$/)
  .withMessage('Phone must be a 10-digit Thai number starting with 0');

const validateOtp = body('code')
  .exists()
  .withMessage('OTP code is required')
  .trim()
  .isNumeric()
  .withMessage('OTP code must contain only digits')
  .isLength({ min: 6, max: 6 })
  .withMessage('OTP code must be exactly 6 digits');

const validatePin = body('pin')
  .exists()
  .withMessage('PIN is required')
  .trim()
  .isNumeric()
  .withMessage('PIN must contain only digits')
  .isLength({ min: 4, max: 4 })
  .withMessage('PIN must be exactly 4 digits');

const validateRegister = [
  validatePhone,
  body('name').exists().withMessage('Name is required').trim().isLength({ min: 1 }),
  body('age')
    .exists()
    .withMessage('Age is required')
    .isInt({ min: 0, max: 120 })
    .withMessage('Age must be a valid number'),
  body('role')
    .exists()
    .withMessage('Role is required')
    .trim()
    .isIn(['elderly', 'caregiver'])
    .withMessage('Role must be either elderly or caregiver'),
  validatePin,
];

const validateLogin = [validatePhone, validatePin];

const validateRefreshToken = body('refreshToken')
  .exists()
  .withMessage('refreshToken is required')
  .trim()
  .notEmpty()
  .withMessage('refreshToken cannot be empty');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

module.exports = {
  validatePhone,
  validateOtp,
  validatePin,
  validateRegister,
  validateLogin,
  validateRefreshToken,
  handleValidationErrors,
};
