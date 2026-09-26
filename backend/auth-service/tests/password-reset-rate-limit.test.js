const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(async () => ({ query: mockQuery, release: mockRelease }));

jest.mock('../src/config/db', () => ({ connect: mockConnect }));

const limiter = require('../src/services/password-reset-rate-limit.service');

function stats({ secondsSinceLast = null, dailyCount = 0, dailyRetry = null } = {}) {
  return { rows: [{ seconds_since_last: secondsSinceLast, daily_count: dailyCount, daily_retry: dailyRetry }] };
}

beforeEach(() => {
  mockQuery.mockReset();
  mockRelease.mockClear();
  mockConnect.mockClear();
  mockQuery.mockImplementation(async (sql) => {
    if (String(sql).includes('SELECT\n          EXTRACT')) return stats();
    return { rows: [], rowCount: 1 };
  });
});

test('records one attempt for both the normalized email and IP', async () => {
  await expect(limiter.consume({ ip: '203.0.113.8' }, 'member@example.com')).resolves.toEqual({ cooldownSeconds: 120 });
  const inserts = mockQuery.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO password_reset_attempts'));
  expect(inserts).toHaveLength(2);
  expect(mockQuery).toHaveBeenCalledWith('COMMIT');
  expect(mockRelease).toHaveBeenCalledTimes(1);
});

test('blocks a repeated email or IP during the two-minute cooldown', async () => {
  let statsCalls = 0;
  mockQuery.mockImplementation(async (sql) => {
    if (String(sql).includes('SELECT\n          EXTRACT')) {
      statsCalls += 1;
      return statsCalls === 1 ? stats({ secondsSinceLast: 30, dailyCount: 1, dailyRetry: 86370 }) : stats();
    }
    return { rows: [], rowCount: 1 };
  });
  await expect(limiter.consume({ ip: '203.0.113.8' }, 'member@example.com')).rejects.toMatchObject({ status: 429, retryAfterSeconds: 90 });
  expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
});

test('blocks the fourth request in a rolling 24-hour window', async () => {
  let statsCalls = 0;
  mockQuery.mockImplementation(async (sql) => {
    if (String(sql).includes('SELECT\n          EXTRACT')) {
      statsCalls += 1;
      return statsCalls === 1 ? stats({ secondsSinceLast: 180, dailyCount: 3, dailyRetry: 7200 }) : stats();
    }
    return { rows: [], rowCount: 1 };
  });
  await expect(limiter.consume({ ip: '203.0.113.8' }, 'member@example.com')).rejects.toMatchObject({ status: 429, retryAfterSeconds: 7200 });
  expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
});
