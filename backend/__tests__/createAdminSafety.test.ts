const { bootstrapLocalAccounts } = require('../db/create-admin');

describe('local development account bootstrap safety', () => {
  const config = {
    nodeEnv: 'development',
    databaseUrl: 'postgresql://localhost/nodbusiness_dev',
    acknowledgement: '1',
    adminPassword: 'unique-admin-password-2026',
    testPassword: 'unique-demo-password-2026',
  };

  it('requires local target, explicit acknowledgement, and unique passwords before connecting', async () => {
    const dbPool = { connect: jest.fn() };
    await expect(bootstrapLocalAccounts({ ...config, dbPool, nodeEnv: 'production' })).rejects.toThrow(/production/i);
    await expect(bootstrapLocalAccounts({ ...config, dbPool, databaseUrl: 'postgresql://db.example.test/prod' })).rejects.toThrow(/non-local database/i);
    await expect(bootstrapLocalAccounts({ ...config, dbPool, acknowledgement: undefined })).rejects.toThrow(/ALLOW_DEV_ACCOUNT_BOOTSTRAP/i);
    await expect(bootstrapLocalAccounts({ ...config, dbPool, adminPassword: 'weak' })).rejects.toThrow(/ADMIN_NEW_PASSWORD/i);
    expect(dbPool.connect).not.toHaveBeenCalled();
  });

  it('creates only missing accounts and marks the test identity as demo in one transaction', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'admin-id' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'demo-id' }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    const result = await bootstrapLocalAccounts({ ...config, dbPool: { connect: jest.fn().mockResolvedValue(client) } });

    expect(result).toEqual({ created: 2 });
    expect(client.query.mock.calls[1][0]).toContain('SELECT email, role, is_demo FROM users');
    expect(client.query.mock.calls[2][0]).toContain("'admin@nodbusiness.app', $1, 'Admin User', 'admin'");
    expect(client.query.mock.calls[3][0]).toContain("'test@nodbusiness.app', $1, 'Test User', 'user', TRUE, FALSE, TRUE");
    expect(client.query.mock.calls.some(([sql]) => /ON CONFLICT[\s\S]*role\s*=\s*'admin'/i.test(sql))).toBe(false);
    expect(client.query.mock.calls.at(-1)[0]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('refuses to change any pre-existing account and rolls the transaction back', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ email: 'admin@nodbusiness.app', role: 'user', is_demo: false }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    await expect(bootstrapLocalAccounts({ ...config, dbPool: { connect: jest.fn().mockResolvedValue(client) } }))
      .rejects.toThrow(/already exist/i);
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN', 'SELECT email, role, is_demo FROM users WHERE email = ANY($1::text[])', 'ROLLBACK',
    ]);
  });
});
