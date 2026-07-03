const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// TODO (รอบหน้า): test /auth/request-otp, /auth/verify-otp, /auth/register, /auth/login
