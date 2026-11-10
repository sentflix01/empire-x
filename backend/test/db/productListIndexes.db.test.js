'use strict';

/**
 * migrate89/90: the public product list (newest first) and trending (most
 * viewed) are served by partial indexes instead of a scan and sort of every
 * public product. Checks the indexes exist and are valid, that re-running the
 * migration is harmless, and that the planner can use them for the exact
 * ORDER BY the routes send. Sequential scans and explicit sorts are disabled
 * so a small test table cannot hide an index that cannot deliver the order.
 */
const { pool } = require('./helpers');
const migrate89 = require('../../db/migrate89');
const migrate90 = require('../../db/migrate90');

const NAMES = ['idx_products_public_created', 'idx_products_public_views'];

const ORDER_ONLY = ['enable_seqscan', 'enable_bitmapscan', 'enable_sort'];

async function plan(sql, off = ORDER_ONLY) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const setting of off) await client.query(`SET LOCAL ${setting} = off`);
    const { rows } = await client.query(`EXPLAIN (COSTS OFF) ${sql}`);
    await client.query('ROLLBACK');
    return rows.map((r) => r['QUERY PLAN']).join('\n');
  } finally {
    client.release();
  }
}

beforeAll(async () => {
  await migrate89(pool);
  await migrate90(pool);
});

it('creates both indexes as valid partial indexes over public products', async () => {
  const { rows } = await pool.query(
    `SELECT c.relname, i.indisvalid, pg_get_indexdef(i.indexrelid) AS def
       FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
      WHERE c.relname = ANY($1) ORDER BY c.relname`,
    [NAMES],
  );
  expect(rows.map((r) => r.relname)).toEqual(NAMES);
  for (const row of rows) {
    expect(row.indisvalid).toBe(true);
    expect(row.def).toMatch(/WHERE \(status = ANY \(ARRAY\['active'::text, 'sold_out'::text\]\)\)/);
  }
});

it('is safe to run again', async () => {
  await expect(migrate89(pool)).resolves.toBeUndefined();
});

it('serves the newest-first list order and its keyset cursor', async () => {
  const sql = `SELECT p.id FROM products p
    WHERE p.status IN ('active','sold_out') AND (p.created_at, p.id) < (NOW(), '00000000-0000-4000-8000-000000000000'::uuid)
    ORDER BY p.created_at DESC, p.id DESC LIMIT 24`;
  expect(await plan(sql)).toContain('idx_products_public_created');
});

it('serves trending (active, most viewed) and the -view_count sort', async () => {
  expect(await plan(`SELECT id FROM products WHERE status='active' ORDER BY view_count DESC LIMIT 8`))
    .toContain('idx_products_public_views');
  expect(await plan(`SELECT p.id FROM products p WHERE p.status IN ('active','sold_out') ORDER BY p.view_count DESC, p.id DESC LIMIT 24`))
    .toContain('idx_products_public_views');
});

it('migrate90: search can find ILIKE matches through trigram indexes, and re-runs safely', async () => {
  await expect(migrate90(pool)).resolves.toBeUndefined();
  const sql = `SELECT p.id FROM products p
    WHERE p.title ILIKE '%zzqx%' OR p.description ILIKE '%zzqx%' OR p.category ILIKE '%zzqx%'`;
  // GIN is read through a bitmap scan: rule out the other access paths.
  const planText = await plan(sql, ['enable_seqscan', 'enable_indexscan']);
  for (const name of ['idx_products_title_trgm', 'idx_products_description_trgm', 'idx_products_category_trgm']) {
    expect(planText).toContain(name);
  }
});
