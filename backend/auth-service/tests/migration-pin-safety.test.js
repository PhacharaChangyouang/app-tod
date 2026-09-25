jest.mock('../src/config/db', () => ({ query: jest.fn(), end: jest.fn() }));
jest.mock('../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const pool = require('../src/config/db');
const migrate = require('../src/config/migrate');

describe('PIN schema migration safety', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('never issues a DROP COLUMN for pin_hash', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('information_schema.columns')) return { rows: [{ present: true }] };
      return { rows: [] };
    });
    await migrate({ closePool: false });
    const statements = pool.query.mock.calls.map(([sql]) => String(sql)).join('\n');
    expect(statements).not.toMatch(/DROP\s+COLUMN[^;]*pin_hash/i);
  });

  it('fails closed if pin_hash is missing on a populated production database', async () => {
    process.env.NODE_ENV = 'production';
    pool.query.mockImplementation(async (sql) => {
      const statement = String(sql);
      if (statement.includes('information_schema.columns')) return { rows: [{ present: false }] };
      if (statement.includes('COUNT(*)::int')) return { rows: [{ count: 3 }] };
      return { rows: [] };
    });
    await expect(migrate({ closePool: false })).rejects.toThrow('restore the column and hashes from backup');
    const statements = pool.query.mock.calls.map(([sql]) => String(sql));
    expect(statements.some((sql) => /ALTER TABLE users ADD COLUMN pin_hash/i.test(sql))).toBe(false);
  });
});
