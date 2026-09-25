jest.mock('../src/models/user.model', () => ({ findByPhone: jest.fn(), findById: jest.fn(), updatePin: jest.fn() }));
jest.mock('../src/services/token.service', () => ({
  generateAccessToken: jest.fn(() => 'access-token'),
  generateRefreshToken: jest.fn(async () => 'refresh-token'),
  revokeAllForUser: jest.fn(async () => undefined),
}));
jest.mock('../src/services/login-security.service', () => ({
  isBlocked: jest.fn(async () => false),
  recordFailure: jest.fn(async () => undefined),
  clearForAccount: jest.fn(async () => undefined),
  audit: jest.fn(async () => undefined),
}));
jest.mock('../src/services/pin.service', () => ({
  verifyPin: jest.fn(),
  hashPin: jest.fn(async () => 'p1$upgraded-hash'),
}));

const userModel = require('../src/models/user.model');
const tokenService = require('../src/services/token.service');
const loginSecurity = require('../src/services/login-security.service');
const pinService = require('../src/services/pin.service');
const controller = require('../src/controllers/pin-auth.controller');

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn(),
  };
}

describe('phone plus PIN authentication controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses a generic failure and records a distributed throttle event', async () => {
    userModel.findByPhone.mockResolvedValue({ id: 'user-1', pin_hash: 'stored' });
    pinService.verifyPin.mockResolvedValue({ valid: false, needsUpgrade: false });
    const req = { body: { phone: '0812345678', pin: '0000' }, ip: '127.0.0.1' };
    const res = response();
    await controller.loginWithPin(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'เบอร์โทรศัพท์หรือ PIN ไม่ถูกต้อง' });
    expect(loginSecurity.recordFailure).toHaveBeenCalledWith(req, 'pin:0812345678', { accountLimit: 5, networkLimit: 25 });
  });

  it('upgrades a legacy PIN hash only after successful verification', async () => {
    const user = { id: 'user-1', phone: '0812345678', role: 'elderly', pin_hash: 'legacy' };
    userModel.findByPhone.mockResolvedValue(user);
    pinService.verifyPin.mockResolvedValue({ valid: true, needsUpgrade: true });
    const req = { body: { phone: user.phone, pin: '4826' }, ip: '127.0.0.1' };
    const res = response();
    await controller.loginWithPin(req, res, jest.fn());
    expect(userModel.updatePin).toHaveBeenCalledWith(user.id, 'p1$upgraded-hash');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, accessToken: 'access-token', refreshToken: 'refresh-token' }));
  });

  it('revokes all refresh sessions after a PIN change', async () => {
    const user = { id: 'user-1', pin_hash: 'stored' };
    userModel.findById.mockResolvedValue(user);
    pinService.verifyPin.mockResolvedValue({ valid: true, needsUpgrade: false });
    const req = { user: { id: user.id }, body: { currentPin: '4826', newPin: '1357', confirmNewPin: '1357' }, ip: '127.0.0.1' };
    const res = response();
    await controller.changePin(req, res, jest.fn());
    expect(userModel.updatePin).toHaveBeenCalledWith(user.id, 'p1$upgraded-hash');
    expect(loginSecurity.clearForAccount).toHaveBeenCalledWith('pin-change:user-1');
    expect(tokenService.revokeAllForUser).toHaveBeenCalledWith(user.id);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, reauthRequired: true }));
  });

  it('counts an incorrect current PIN against the distributed change limit', async () => {
    const user = { id: 'user-1', pin_hash: 'stored' };
    userModel.findById.mockResolvedValue(user);
    pinService.verifyPin.mockResolvedValue({ valid: false, needsUpgrade: false });
    const req = { user: { id: user.id }, body: { currentPin: '0000', newPin: '1357', confirmNewPin: '1357' }, ip: '127.0.0.1' };
    const res = response();
    await controller.changePin(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(loginSecurity.recordFailure).toHaveBeenCalledWith(req, 'pin-change:user-1', { accountLimit: 5, networkLimit: 25 });
  });
});
