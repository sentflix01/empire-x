'use strict';

/**
 * migrate79 archives only the automated-test listings left on production
 * (audit DATA-03), never a real product with a similar name. Real Postgres.
 */
const { pool, createUser, createPublicBusiness, deleteUser, tag } = require('./helpers');
const migrate79 = require('../../db/migrate79');

let seller; let biz;
const insert = async (title) => (await pool.query(
  `INSERT INTO products (seller_id, business_id, title, price, currency, stock, status, category)
   VALUES ($1, $2, $3, 10, 'ETB', 1, 'active', 'food') RETURNING id`,
  [seller.id, biz.businessId, title],
)).rows[0].id;
const status = async (id) => (await pool.query('SELECT status FROM products WHERE id=$1', [id])).rows[0].status;

beforeAll(async () => {
  seller = await createUser();
  biz = await createPublicBusiness(seller.id);
});
afterAll(async () => { await deleteUser(seller.id); });

describe('migrate79', () => {
  it('archives exactly the test listings and nothing else', async () => {
    const e2e = await insert('E2E Test Product 1791119365676');
    const manual = await insert('Manual E2E Cod Product');
    const lookalikes = await Promise.all([
      insert('E2E Test Product'),                // no timestamp
      insert(`My E2E Test Product 1791 ${tag()}`), // prefix differs
      insert('Coffee beans for E2E testers'),
    ]);

    await migrate79(pool);

    expect(await status(e2e)).toBe('archived');
    expect(await status(manual)).toBe('archived');
    for (const id of lookalikes) expect(await status(id)).toBe('active');
    expect(await status(biz.productId)).toBe('active');

    await expect(migrate79(pool)).resolves.toBeUndefined();
  });
});
