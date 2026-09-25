jest.mock('../src/config/db', () => ({ query: jest.fn() }));
jest.mock('../src/models/user.model', () => ({}));
jest.mock('../src/services/token.service', () => ({}));

const controller = require('../src/controllers/password-auth.controller');

describe('registration security boundary', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRegistrationEnabled = process.env.REGISTRATION_ENABLED;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalRegistrationEnabled === undefined) delete process.env.REGISTRATION_ENABLED;
    else process.env.REGISTRATION_ENABLED = originalRegistrationEnabled;
  });

  it('keeps public registration closed by default in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REGISTRATION_ENABLED;
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await controller.registerWithPassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });
});
