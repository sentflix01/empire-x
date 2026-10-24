/**
 * migrate77.js - Attach unlinked products to their seller's business.
 *
 * Products listed from the normal "Add Product" form were saved without a
 * business_id, so checkout found no payment details (audit FUNC-03). New
 * products are now attached on create; this backfills existing ones.
 *
 * Only products with no business and no showroom are touched, and only when
 * the seller owns exactly one business (otherwise the choice is the seller's).
 * Idempotent: a second run finds nothing to update. No down step is needed:
 * checkout resolves the same business at read time either way.
 */
module.exports = async function migrate77(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(`
      UPDATE products p
         SET business_id = sole.id, updated_at = NOW()
        FROM (
          SELECT owner_id, (ARRAY_AGG(id))[1] AS id
            FROM businesses
           GROUP BY owner_id
          HAVING COUNT(*) = 1
        ) sole
       WHERE p.business_id IS NULL
         AND p.showroom_id IS NULL
         AND p.seller_id = sole.owner_id
    `);
    await client.query('COMMIT');
    console.log(`migrate77: linked ${rowCount} product(s) to their seller's business`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
