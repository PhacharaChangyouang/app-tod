const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-tests';
process.env.INTERNAL_API_KEY = 'test-internal-key-that-is-long-enough';
process.env.AUTH_SERVICE_URL = 'http://auth.test';
process.env.NOTIFICATION_SERVICE_URL = 'http://notification.test';

jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const pool = require('../src/config/db');
const app = require('../src/server');

function token(role = 'caregiver', id = '11111111-1111-4111-8111-111111111111') {
  return jwt.sign({ id, phone: '0800000000', role }, process.env.JWT_SECRET, { expiresIn: '5m' });
}

describe('reminder security boundaries', () => {
  beforeEach(() => {
    pool.query.mockReset();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    delete global.fetch;
  });

  it('rejects caregiver summary without authentication', async () => {
    const res = await request(app).get('/api/caregiver/summary');
    expect(res.statusCode).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects an elderly account from caregiver-only APIs', async () => {
    const res = await request(app)
      .get('/api/caregiver/summary')
      .set('Authorization', `Bearer ${token('elderly')}`);
    expect(res.statusCode).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects an invalid medication time before database access', async () => {
    const res = await request(app)
      .put('/api/caregiver/reminders/22222222-2222-4222-8222-222222222222')
      .set('Authorization', `Bearer ${token()}`)
      .send({ reminder_time: '99:99' });
    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('prevents a caregiver from editing an unlinked elderly account', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: '22222222-2222-4222-8222-222222222222', user_id: '33333333-3333-4333-8333-333333333333' }],
    });

    const res = await request(app)
      .put('/api/caregiver/reminders/22222222-2222-4222-8222-222222222222')
      .set('Authorization', `Bearer ${token()}`)
      .send({ reminder_time: '09:30', dosage: null });

    expect(res.statusCode).toBe(403);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(String(pool.query.mock.calls[0][0])).toMatch(/^SELECT \* FROM reminders/);
  });

  it('accepts a null dosage when a linked caregiver creates a reminder', async () => {
    const elderlyId = '33333333-3333-4333-8333-333333333333';
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ user_id: elderlyId }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: '22222222-2222-4222-8222-222222222222', user_id: elderlyId, medicine_name: 'ยาทดสอบ', dosage: null, reminder_time: '09:30:00' }],
    });

    const res = await request(app)
      .post('/api/caregiver/reminders')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        elderly_user_id: elderlyId,
        medicine_name: 'ยาทดสอบ',
        dosage: null,
        reminder_time: '09:30',
        frequency: 'daily',
      });

    expect(res.statusCode).toBe(201);
    expect(pool.query.mock.calls[0][1][2]).toBeNull();
  });
});
