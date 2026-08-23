/** alerts.ts — threshold evaluator (MONITORING.md made executable) */
const { evaluate } = require('../lib/alerts');
jest.mock('../db/pool', () => require('./helpers/mockPool'));
process.env.JWT_SECRET = 'test';

const base = { errorsLastHour: 0, paymentAttempts24h: 0, paymentFailures24h: 0, lastBackupAt: new Date().toISOString(), redisConfigured: true };

describe('evaluate()', () => {
  test('healthy inputs -> no alerts', () => {
    expect(evaluate(base)).toEqual([]);
  });
  test('error spike thresholds: 50 => SEV2, 100 => SEV1', () => {
    expect(evaluate({ ...base, errorsLastHour: 50 })).toEqual([expect.objectContaining({ key: 'error_spike', severity: 'SEV2' })]);
    expect(evaluate({ ...base, errorsLastHour: 100 })[0].severity).toBe('SEV1');
  });
  test('payment success gates need >=10 attempts', () => {
    expect(evaluate({ ...base, paymentAttempts24h: 5, paymentFailures24h: 5 })).toEqual([]);
    const r = evaluate({ ...base, paymentAttempts24h: 100, paymentFailures24h: 8 });
    expect(r[0]).toMatchObject({ key: 'payment_success', severity: 'SEV2' });
    const r2 = evaluate({ ...base, paymentAttempts24h: 100, paymentFailures24h: 20 });
    expect(r2[0].severity).toBe('SEV1');
  });
  test('backup staleness ladder + missing backup', () => {
    const stale = evaluate({ ...base, lastBackupAt: new Date(Date.now() - 30 * 3600e3).toISOString() });
    expect(stale[0]).toMatchObject({ key: 'backup_stale', severity: 'SEV3' });
    const veryStale = evaluate({ ...base, lastBackupAt: new Date(Date.now() - 60 * 3600e3).toISOString() });
    expect(veryStale[0].severity).toBe('SEV2');
    expect(evaluate({ ...base, lastBackupAt: null })[0].key).toBe('backup_missing');
  });
  test('redis down is SEV3', () => {
    expect(evaluate({ ...base, redisConfigured: false })[0]).toMatchObject({ key: 'redis_down', severity: 'SEV3' });
  });
});
