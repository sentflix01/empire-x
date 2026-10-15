/** Persist the billing currency for each business subscription. */
module.exports = async function migrate51(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE business_subscriptions
        ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ETB'
    `);
    await client.query(`
      ALTER TABLE business_subscriptions
        DROP CONSTRAINT IF EXISTS business_subscriptions_currency_check
    `);
    await client.query(`
      ALTER TABLE business_subscriptions
        ADD CONSTRAINT business_subscriptions_currency_check
        CHECK (currency IN ('ETB', 'USD'))
    `);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
