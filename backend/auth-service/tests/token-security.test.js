process.env.JWT_SECRET = 'test-access-secret-that-is-long-enough-123456789';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough-987654321';

jest.mock('../src/config/db', () => ({ query: jest.fn(async () => ({ rows: [], rowCount: 1 })) }));

const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const tokenService = require('../src/services/token.service');

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  phone: '0800000000',
  role: 'elderly',
};

describe('JWT security policy', () => {
  beforeEach(() => pool.query.mockClear());

  it('issues access tokens with the required issuer, audience and algorithm', () => {
    const token = tokenService.generateAccessToken(user);
    const decoded = jwt.decode(token, { complete: true });
    expect(decoded.header.alg).toBe('HS256');
    expect(decoded.payload.iss).toBe('aha-auth-service');
    expect(decoded.payload.aud).toBe('aha-api');
    expect(decoded.payload.jti).toBeTruthy();
    expect(tokenService.verifyAccessToken(token)?.id).toBe(user.id);
  });

  it('rejects a correctly signed token without required claims', () => {
    const weak = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '5m' });
    expect(tokenService.verifyAccessToken(weak)).toBeNull();
  });

  it('creates distinct refresh tokens for concurrent sessions', async () => {
    const [first, second] = await Promise.all([
      tokenService.generateRefreshToken(user),
      tokenService.generateRefreshToken(user),
    ]);
    expect(first).not.toBe(second);
    expect(tokenService.verifyRefreshToken(first)?.aud).toBe('aha-refresh');
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});
