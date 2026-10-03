/**
 * Bootstrap local development accounts only. This script cannot connect to a
 * hosted database, does not use default passwords, and never changes existing
 * accounts or roles.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { assertSafeLocalDatabase } = require('./operationSafety');

async function bootstrapLocalAccounts({ dbPool, databaseUrl, nodeEnv, acknowledgement, adminPassword, testPassword }) {
  assertSafeLocalDatabase({
    connectionString: databaseUrl,
    nodeEnv,
    acknowledgement,
    acknowledgementName: 'ALLOW_DEV_ACCOUNT_BOOTSTRAP',
  });
  for (const [label, password] of [['ADMIN_NEW_PASSWORD', adminPassword], ['TEST_ACCOUNT_PASSWORD', testPassword]]) {
    if (typeof password !== 'string' || password.length < 16 || password.length > 128) {
      throw new Error(`Set ${label} to a unique password between 16 and 128 characters`);
    }
  }

  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT email, role, is_demo FROM users WHERE email = ANY($1::text[])',
      [['admin@nodbusiness.app', 'test@nodbusiness.app']],
    );
    if (existing.rows.length) {
      throw new Error('One or more target accounts already exist; refusing to change or promote them');
    }

    const adminHash = await bcrypt.hash(adminPassword, 12);
    const testHash = await bcrypt.hash(testPassword, 12);
    const admin = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_verified, is_seed, is_demo, provider)
       VALUES ('admin@nodbusiness.app', $1, 'Admin User', 'admin', TRUE, FALSE, FALSE, 'local')
       RETURNING id`,
      [adminHash],
    );
    const demo = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_verified, is_seed, is_demo, provider)
       VALUES ('test@nodbusiness.app', $1, 'Test User', 'user', TRUE, FALSE, TRUE, 'local')
       RETURNING id`,
      [testHash],
    );
    await client.query(
      `INSERT INTO user_profiles (user_id, display_name, bio, profile_type, has_business_profile)
       VALUES ($1, 'Admin User', 'Platform administrator', 'personal', FALSE),
              ($2, 'Test User', 'Shared demo account', 'personal', FALSE)`,
      [admin.rows[0].id, demo.rows[0].id],
    );
    await client.query(
      `INSERT INTO wallets (user_id, balance, currency)
       VALUES ($1, 50000, 'ETB'), ($2, 5000, 'ETB') ON CONFLICT (user_id) DO NOTHING`,
      [admin.rows[0].id, demo.rows[0].id],
    );
    await client.query('COMMIT');
    return { created: 2 };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const pool = require('./poolJsShim.cjs');
  bootstrapLocalAccounts({
    dbPool: pool,
    databaseUrl: process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
    acknowledgement: process.env.ALLOW_DEV_ACCOUNT_BOOTSTRAP,
    adminPassword: process.env.ADMIN_NEW_PASSWORD,
    testPassword: process.env.TEST_ACCOUNT_PASSWORD,
  }).then(() => {
    console.log('Local admin and shared demo accounts created. Passwords were not printed.');
  }).catch((error) => {
    console.error(`Local account bootstrap refused or failed: ${error.message}`);
    process.exitCode = 1;
  }).finally(() => require('./poolJsShim.cjs').end());
}

module.exports = { bootstrapLocalAccounts };
