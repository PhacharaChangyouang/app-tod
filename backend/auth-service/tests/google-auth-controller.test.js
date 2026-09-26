process.env.JWT_SECRET = 'test-access-secret-that-is-long-enough-123456789';
process.env.GOOGLE_SIGNUP_SECRET = 'test-google-signup-secret-that-is-long-enough-987654321';
process.env.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));
jest.mock('../src/models/user.model');
jest.mock('../src/services/token.service');
jest.mock('../src/services/pin.service');

const jwt = require('jsonwebtoken');
const controller = require('../src/controllers/google-auth.controller');
const userModel = require('../src/models/user.model');
const tokenService = require('../src/services/token.service');
const pinService = require('../src/services/pin.service');

function response() {
  return {
    statusCode: 200,
    payload: null,
    cookies: [],
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
    cookie(name, value, options) { this.cookies.push({ name, value, options }); return this; },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  tokenService.generateAccessToken.mockReturnValue('access-token');
  tokenService.generateRefreshToken.mockResolvedValue('refresh-token');
  pinService.hashPin.mockResolvedValue('pin-hash');
});

test('returns a short-lived completion token for a new verified Google account', async () => {
  mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: 'google-123', email: 'New@Gmail.com', email_verified: true, name: 'New User', picture: 'https://example.com/avatar.jpg' }) });
  userModel.findByGoogleSub.mockResolvedValue(null);
  userModel.findByEmail.mockResolvedValue(null);
  const res = response();

  await controller.googleLogin({ body: { credential: 'x'.repeat(200) } }, res, jest.fn());

  expect(res.payload.requiresCompletion).toBe(true);
  expect(res.payload.profile.email).toBe('new@gmail.com');
  const decoded = jwt.verify(res.payload.signupToken, process.env.GOOGLE_SIGNUP_SECRET, { issuer: 'aha-auth-service', audience: 'aha-google-signup' });
  expect(decoded.sub).toBe('google-123');
});

test('links a verified Google identity to an existing email and issues the normal session', async () => {
  const existing = { id: 'user-1', email: 'member@example.com', phone: '0812345678', role: 'elderly', name: 'Member' };
  const linked = { ...existing, google_sub: 'google-456', avatar_url: 'https://example.com/p.jpg' };
  mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: 'google-456', email: existing.email, email_verified: true, hd: 'example.com', name: 'Member', picture: linked.avatar_url }) });
  userModel.findByGoogleSub.mockResolvedValue(null);
  userModel.findByEmail.mockResolvedValue(existing);
  userModel.linkGoogleIdentity.mockResolvedValue(linked);
  const res = response();

  await controller.googleLogin({ body: { credential: 'y'.repeat(200) } }, res, jest.fn());

  expect(userModel.linkGoogleIdentity).toHaveBeenCalledWith('user-1', expect.objectContaining({ googleSub: 'google-456' }));
  expect(res.payload.user.authProvider).toBe('google');
  expect(res.cookies).toHaveLength(2);
});

test('rejects Google accounts whose email is not verified', async () => {
  mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: 'google-789', email: 'unsafe@example.com', email_verified: false }) });
  const res = response();

  await controller.googleLogin({ body: { credential: 'z'.repeat(200) } }, res, jest.fn());

  expect(res.statusCode).toBe(401);
  expect(res.payload.success).toBe(false);
});

test('creates a complete AHA account only after required local fields are valid', async () => {
  const signupToken = jwt.sign({ sub: 'google-999', email: 'complete@example.com', name: 'Complete User', picture: null }, process.env.GOOGLE_SIGNUP_SECRET, { algorithm: 'HS256', issuer: 'aha-auth-service', audience: 'aha-google-signup', expiresIn: '10m' });
  userModel.findByGoogleSub.mockResolvedValue(null);
  userModel.findByEmail.mockResolvedValue(null);
  userModel.findByPhone.mockResolvedValue(null);
  userModel.createWithGoogle.mockResolvedValue({ id: 'user-2', phone: '0899999999', name: 'Complete User', age: 65, role: 'elderly', email: 'complete@example.com', google_sub: 'google-999' });
  const res = response();

  await controller.completeGoogleSignup({ body: { signupToken, phone: '0899999999', pin: '1234', confirmPin: '1234', role: 'elderly', age: 65, termsAccepted: true } }, res, jest.fn());

  expect(res.statusCode).toBe(201);
  expect(userModel.createWithGoogle).toHaveBeenCalledWith(expect.objectContaining({ googleSub: 'google-999', pinHash: 'pin-hash' }));
  expect(res.payload.user.email).toBe('complete@example.com');
});
