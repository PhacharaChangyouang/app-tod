jest.mock('../src/config/db', () => ({ query: jest.fn() }));
jest.mock('../src/models/user.model', () => ({
  findByCredentials: jest.fn(),
}));
jest.mock('../src/services/token.service', () => ({}));
jest.mock('../src/services/login-security.service', () => ({
  isBlocked: jest.fn(async () => false),
  audit: jest.fn(async () => undefined),
  recordFailure: jest.fn(async () => undefined),
  clearForAccount: jest.fn(async () => undefined),
}));

const bcrypt = require('bcryptjs');
const userModel = require('../src/models/user.model');
const loginSecurity = require('../src/services/login-security.service');
const controller = require('../src/controllers/password-auth.controller');

test('returns a specific error for a Google-only account without recording a failed password attempt', async () => {
  userModel.findByCredentials.mockResolvedValue({
    id: 'google-user-1',
    email: 'member@gmail.com',
    google_sub: 'google-subject',
    password_hash: null,
  });
  jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
  const req = { body: { identifier: 'Member@gmail.com', password: 'not-used' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  await controller.loginWithPassword(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({
    success: false,
    error: 'OAUTH_ACCOUNT',
    message: 'อีเมลนี้เชื่อมต่อกับบัญชี Google กรุณาเข้าสู่ระบบด้วยปุ่ม Sign in with Google ด้านล่าง',
  });
  expect(loginSecurity.recordFailure).not.toHaveBeenCalled();
  expect(loginSecurity.audit).toHaveBeenCalledWith('password_login_oauth_account', expect.objectContaining({ userId: 'google-user-1' }));
  expect(next).not.toHaveBeenCalled();
});

test('keeps normal password handling for an account that is also linked to Google', async () => {
  userModel.findByCredentials.mockResolvedValue({
    id: 'linked-user-1',
    email: 'linked@example.com',
    google_sub: 'google-subject',
    password_hash: 'existing-password-hash',
  });
  bcrypt.compare.mockResolvedValue(false);
  const req = { body: { identifier: 'linked@example.com', password: 'wrong-password' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  await controller.loginWithPassword(req, res, jest.fn());

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ success: false, message: 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง' });
  expect(loginSecurity.recordFailure).toHaveBeenCalledWith(req, 'linked@example.com');
});
