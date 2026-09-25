jest.mock('../src/models/user.model', () => ({
  updateProfile: jest.fn(),
}));

jest.mock('../src/services/token.service', () => ({
  generateAccessToken: jest.fn(() => 'access-token'),
  generateRefreshToken: jest.fn(async () => 'refresh-token'),
}));

const userModel = require('../src/models/user.model');
const authController = require('../src/controllers/auth.controller');

describe('profile authorization boundaries', () => {
  it('ignores attempts to change the account role through profile updates', async () => {
    userModel.updateProfile.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      phone: '0800000000',
      name: 'Test User',
      age: 70,
      role: 'elderly',
    });
    const req = {
      user: { id: '11111111-1111-4111-8111-111111111111', role: 'elderly' },
      body: { name: 'Test User', age: 70, role: 'caregiver' },
    };
    const res = {
      cookie: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await authController.updateMe(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(userModel.updateProfile).toHaveBeenCalledWith(req.user.id, {
      name: 'Test User',
      age: 70,
    });
    expect(res.json.mock.calls[0][0].user.role).toBe('elderly');
  });
});
