import pool from '../db/pool';

// The test setup mocks pool, so we verify auditLog calls pool.query correctly
// and doesn't throw on errors.

// Re-import after pool mock is in place
const { auditLog } = require('../lib/auditLogger');

describe('Audit Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls pool.query with correct INSERT statement', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    await auditLog({
      actor_id: 'test-user-id',
      actor_email: 'test@example.com',
      action: 'credit',
      entity_type: 'wallet',
      entity_id: 'test-wallet-id',
      amount: 100,
      balance_before: 0,
      balance_after: 100,
      metadata: { description: 'test topup' },
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = (pool.query as jest.Mock).mock.calls[0];
    expect(sql).toContain('INSERT INTO audit_logs');
    expect(params).toContain('credit');
    expect(params).toContain('wallet');
    expect(params).toContain('test-user-id');
    expect(params).toContain('test@example.com');
    expect(params).toContain(100);
  });

  it('does not throw on DB errors', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(auditLog({
      action: 'test',
      entity_type: 'wallet',
    })).resolves.not.toThrow();
  });

  it('defaults currency to ETB', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    await auditLog({
      action: 'debit',
      entity_type: 'wallet',
      amount: 50,
    });

    const [, params] = (pool.query as jest.Mock).mock.calls[0];
    expect(params).toContain('ETB');
  });

  it('serializes metadata as JSON string', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

    await auditLog({
      action: 'refund',
      entity_type: 'wallet',
      metadata: { order_id: '123', reason: 'test' },
    });

    const [, params] = (pool.query as jest.Mock).mock.calls[0];
    const metadataParam = params.find((p: unknown) => typeof p === 'string' && p.includes('order_id'));
    expect(JSON.parse(metadataParam as string)).toEqual({ order_id: '123', reason: 'test' });
  });
});
