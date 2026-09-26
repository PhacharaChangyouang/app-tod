process.env.JWT_SECRET = 'test-access-secret-that-is-long-enough-123456789';
process.env.INTERNAL_API_KEY = 'test-internal-key-that-is-long-enough-123456789';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('sets baseline security headers and hides Express', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('security boundaries', () => {
  it('rejects protected endpoints without a token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('does not allow a user token to call internal family routes', async () => {
    const token = jwt.sign(
      { id: '11111111-1111-4111-8111-111111111111', role: 'caregiver' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', issuer: 'aha-auth-service', audience: 'aha-api', expiresIn: '5m' }
    );
    const res = await request(app)
      .get('/family/internal/22222222-2222-4222-8222-222222222222/recipients')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });

  it('rejects untrusted browser origins', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://attacker.example');
    expect(res.statusCode).toBe(403);
  });

  it('rejects oversized JSON bodies', async () => {
    const res = await request(app)
      .post('/auth/login-password')
      .set('Content-Type', 'application/json')
      .send({ identifier: 'a'.repeat(40000), password: 'Password123' });
    expect(res.statusCode).toBe(413);
  });

  it('does not expose legacy OTP authentication endpoints', async () => {
    const legacyEndpoints = [
      '/auth/request-otp',
      '/auth/verify-otp',
      '/auth/login-otp',
      '/auth/register',
      '/auth/me/change-phone',
    ];
    for (const endpoint of legacyEndpoints) {
      const res = await request(app).post(endpoint).send({});
      expect(res.statusCode).toBe(404);
    }
  });

  it('keeps phone plus PIN login and protected PIN change routes available', async () => {
    const login = await request(app).post('/auth/login').send({});
    expect(login.statusCode).toBe(400);
    const change = await request(app).post('/auth/me/change-pin').send({});
    expect(change.statusCode).toBe(401);
  });

  it('rejects registration when PIN confirmation does not match', async () => {
    const res = await request(app).post('/auth/register-password').send({
      phone: '0812345678', firstName: 'Test', lastName: 'User',
      username: 'testuser99', email: 'test99@example.com',
      password: 'SecurePassword123', confirmPassword: 'SecurePassword123',
      pin: '1234', confirmPin: '5678', role: 'elderly', age: 70,
      termsAccepted: true,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/PIN/);
  });

  it('rejects registration when password confirmation does not match', async () => {
    const res = await request(app).post('/auth/register-password').send({
      phone: '0812345678', firstName: 'Test', lastName: 'User',
      username: 'testuser99', email: 'test99@example.com',
      password: 'SecurePassword123', confirmPassword: 'DifferentPassword123',
      pin: '1234', confirmPin: '1234', role: 'elderly', age: 70,
      termsAccepted: true,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/รหัสผ่าน/);
  });

  it('requires an age for an elderly account', async () => {
    const res = await request(app).post('/auth/register-password').send({
      phone: '0812345678', firstName: 'Test', lastName: 'User',
      username: 'testuser99', email: 'test99@example.com',
      password: 'SecurePassword123', confirmPassword: 'SecurePassword123',
      pin: '1234', confirmPin: '1234', role: 'elderly',
      termsAccepted: true,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/อายุ/);
  });

  it('requires explicit acceptance of the legal terms', async () => {
    const res = await request(app).post('/auth/register-password').send({
      phone: '0812345678', firstName: 'Test', lastName: 'User',
      username: 'testuser99', email: 'test99@example.com',
      password: 'SecurePassword123', confirmPassword: 'SecurePassword123',
      pin: '1234', confirmPin: '1234', role: 'elderly', age: 70,
      termsAccepted: false,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/ยอมรับ/);
  });

  it('rate-limits repeated password login attempts', async () => {
    const statuses = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const res = await request(app).post('/auth/login-password').send({});
      statuses.push(res.statusCode);
    }
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(400));
    expect(statuses[10]).toBe(429);
  });
});
