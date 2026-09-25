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

  it('does not expose legacy OTP or PIN authentication endpoints', async () => {
    const legacyEndpoints = [
      '/auth/request-otp',
      '/auth/verify-otp',
      '/auth/login-otp',
      '/auth/register',
      '/auth/login',
      '/auth/me/change-pin',
      '/auth/me/change-phone',
    ];
    for (const endpoint of legacyEndpoints) {
      const res = await request(app).post(endpoint).send({});
      expect(res.statusCode).toBe(404);
    }
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
