const { resetAdmin } = require('../scripts/reset-admin');

describe('admin reset safety', () => {
  it('refuses production, missing credentials, and weak passwords before database access', async () => {
    const dbPool = { query: jest.fn() };
    const local = {
      dbPool, nodeEnv: 'development', databaseUrl: 'postgresql://localhost/nodbusiness_dev',
      acknowledgement: '1', email: 'admin@example.test', password: 'a-long-unique-password',
    };
    await expect(resetAdmin({ ...local, nodeEnv: 'production' }))
      .rejects.toThrow(/disabled in production/i);
    await expect(resetAdmin({ ...local, password: undefined }))
      .rejects.toThrow(/ADMIN_NEW_PASSWORD/i);
    await expect(resetAdmin({ ...local, email: undefined }))
      .rejects.toThrow(/ADMIN_EMAIL/i);
    await expect(resetAdmin({ ...local, databaseUrl: 'postgresql://cloud.example.test/prod' }))
      .rejects.toThrow(/non-local database/i);
    await expect(resetAdmin({ ...local, acknowledgement: undefined }))
      .rejects.toThrow(/ALLOW_LOCAL_ADMIN_RESET/i);
    expect(dbPool.query).not.toHaveBeenCalled();
  });

  it('resets only the exact existing admin and never creates or returns a password', async () => {
    const dbPool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'admin-1' }] })
        .mockResolvedValueOnce({ rowCount: 1 }),
    };
    const result = await resetAdmin({
      dbPool,
      nodeEnv: 'development',
      databaseUrl: 'postgresql://localhost/nodbusiness_dev',
      acknowledgement: '1',
      email: ' Admin@Example.test ',
      password: 'a-unique-strong-password',
    });
    expect(result).toEqual({ success: true });
    expect(JSON.stringify(result)).not.toContain('a-unique-strong-password');
    expect(dbPool.query).toHaveBeenCalledTimes(2);
    expect(dbPool.query.mock.calls[0][0]).toContain("role = 'admin' AND lower(email) = lower($1)");
    expect(dbPool.query.mock.calls[1][0]).toContain("WHERE id = $2 AND role = 'admin'");
    expect(dbPool.query.mock.calls.some(([sql]) => /INSERT\s+INTO\s+users/i.test(sql))).toBe(false);
  });

  it('does not report success if the selected account changed during reset', async () => {
    const dbPool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'admin-1' }] })
        .mockResolvedValueOnce({ rowCount: 0 }),
    };
    await expect(resetAdmin({
      dbPool,
      nodeEnv: 'development',
      databaseUrl: 'postgresql://localhost/nodbusiness_dev',
      acknowledgement: '1',
      email: 'admin@example.test',
      password: 'a-unique-strong-password',
    })).rejects.toThrow(/changed during reset/i);
  });
});
