'use strict';

/**
 * Legacy published sites without a Business profile (owner decision 1,
 * 2026-10-16): migrate59 gives each real owner one profile with a free period,
 * and the lifecycle job emails each owner once.
 */
const pool = require('../helpers/mockPool');
const migrate59 = require('../../db/migrate59');
const { buildLegacyGrantHtml } = require('../../scripts/business-subscription-lifecycle');

function mockClient(sites) {
  const client = { query: jest.fn(), release: jest.fn() };
  client.query.mockImplementation(async (sql) => {
    if (/FROM showrooms/.test(sql) && /FOR UPDATE/.test(sql)) return { rows: sites };
    if (/INSERT INTO businesses/.test(sql)) return { rows: [{ id: 'biz-1', business_name: sites[0]?.title }] };
    return { rows: [], rowCount: 1 };
  });
  return client;
}

beforeEach(() => { pool.query.mockReset(); pool.connect.mockReset(); });

describe('migrate59', () => {
  it('does nothing when every published site already has a business', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await migrate59(pool);
    expect(pool.connect).not.toHaveBeenCalled();
    const ownerQuery = pool.query.mock.calls.find(([sql]) => /GROUP BY s.owner_id/.test(sql))[0];
    expect(ownerQuery).toMatch(/is_demo = FALSE AND u.is_seed = FALSE/);
    expect(ownerQuery).toMatch(/business_id IS NULL AND s.status = 'published'/);
  });

  it('creates one business per owner, links their sites and grants the tier the sections need', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ owner_id: 'owner-1' }] });
    const client = mockClient([
      { id: 's2', title: 'Second Site', category: 'Beauty & Personal Care', sections: JSON.stringify([{ type: 'hero' }, { type: 'inventory_catalog' }]) },
      { id: 's1', title: 'Clothing', category: 'Business & Commerce', sections: JSON.stringify([{ type: 'hero' }]) },
    ]);
    pool.connect.mockResolvedValueOnce(client);
    await migrate59(pool);
    const calls = client.query.mock.calls;
    const insertBiz = calls.find(([sql]) => /INSERT INTO businesses/.test(sql));
    expect(insertBiz[1].slice(1, 3)).toEqual(['Second Site', 'service']);
    const grant = calls.find(([sql]) => /INSERT INTO business_subscriptions/.test(sql));
    expect(grant[1]).toEqual(['biz-1', 'pro', migrate59.LEGACY_GRANT_MONTHS]);
    expect(grant[0]).toMatch(/ON CONFLICT \(business_id\) DO NOTHING/);
    expect(calls.some(([sql]) => /UPDATE showrooms SET business_id/.test(sql))).toBe(true);
    expect(calls.some(([sql]) => /INSERT INTO notifications/.test(sql))).toBe(true);
    expect(calls.at(-1)[0]).toBe('COMMIT');
  });

  it('rolls back an owner whose migration fails', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ owner_id: 'owner-1' }] });
    const client = mockClient([{ id: 's1', title: 'Shop', category: 'Business & Commerce', sections: '[]' }]);
    client.query.mockImplementation(async (sql) => {
      if (/FOR UPDATE/.test(sql)) return { rows: [{ id: 's1', title: 'Shop', category: 'x', sections: '[]' }] };
      if (/INSERT INTO businesses/.test(sql)) throw new Error('boom');
      return { rows: [] };
    });
    pool.connect.mockResolvedValueOnce(client);
    await expect(migrate59(pool)).rejects.toThrow('boom');
    expect(client.query.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });
});

describe('legacy Business profile email', () => {
  it('escapes the business name and states the free period end', () => {
    const html = buildLegacyGrantHtml('<b>Shop</b>', '2026-11-15T00:00:00Z', 'https://nodbusiness.app/business/subscription?businessId=1');
    expect(html).toContain('&lt;b&gt;Shop&lt;/b&gt;');
    expect(html).toMatch(/free until <strong>/);
  });
});
