const { databaseTarget, validateExecution, cleanupSeedUsers } = require('../db/clean-seed-data');

describe('seed cleanup safety', () => {
  const target = databaseTarget('postgresql://safe-user:secret@localhost:5432/nodbusiness_dev');

  it('exposes database identity without exposing credentials', () => {
    expect(target).toEqual({ name: 'nodbusiness_dev', host: 'localhost', port: '5432' });
  });

  it('requires all explicit confirmations and rejects production', () => {
    expect(() => validateExecution({ execute: true, target, databaseConfirmation: 'wrong', nodeEnv: 'development', allowCleanup: '1' }))
      .toThrow(/exact target database/i);
    expect(() => validateExecution({ execute: true, target, databaseConfirmation: target.name, nodeEnv: 'production', allowCleanup: '1' }))
      .toThrow(/production/i);
    expect(() => validateExecution({ execute: true, target, databaseConfirmation: target.name, nodeEnv: 'development', allowCleanup: undefined }))
      .toThrow(/ALLOW_SEED_CLEANUP/i);
    expect(() => validateExecution({ execute: false, target, nodeEnv: 'production', allowCleanup: undefined })).not.toThrow();
  });

  it('refuses destructive cleanup on remote database hosts even when acknowledged', () => {
    const hosted = databaseTarget('postgresql://safe-user:secret@db.example.test:5432/nodbusiness');
    expect(() => validateExecution({
      execute: true, target: hosted, databaseConfirmation: hosted.name,
      nodeEnv: 'development', allowCleanup: '1',
    })).toThrow(/non-local database/i);
  });

  it('dry run only counts explicitly marked seed accounts', async () => {
    const dbPool = { query: jest.fn().mockResolvedValue({ rows: [{ count: 4 }] }) };
    await expect(cleanupSeedUsers(dbPool, { execute: false })).resolves.toEqual({ dryRun: true, count: 4 });
    expect(dbPool.query).toHaveBeenCalledWith('SELECT COUNT(*)::int AS count FROM users WHERE is_seed = TRUE');
    expect(dbPool.connect).toBeUndefined();
  });

  it('deletes only is_seed accounts in one transaction and rolls back failures', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'seed-1' }, { id: 'seed-2' }] })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    const dbPool = { connect: jest.fn().mockResolvedValue(client) };
    await expect(cleanupSeedUsers(dbPool, { execute: true })).resolves.toEqual({ dryRun: false, count: 2 });
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN', expect.stringContaining('UPDATE devops_items SET created_by = NULL'),
      'DELETE FROM users WHERE is_seed = TRUE RETURNING id', 'COMMIT',
    ]);
    expect(client.release).toHaveBeenCalledTimes(1);

    const failedClient = {
      query: jest.fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('foreign key restriction'))
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    await expect(cleanupSeedUsers({ connect: jest.fn().mockResolvedValue(failedClient) }, { execute: true }))
      .rejects.toThrow('foreign key restriction');
    expect(failedClient.query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN', expect.stringContaining('UPDATE devops_items SET created_by = NULL'),
      'DELETE FROM users WHERE is_seed = TRUE RETURNING id', 'ROLLBACK',
    ]);
    expect(failedClient.release).toHaveBeenCalledTimes(1);
  });
});
