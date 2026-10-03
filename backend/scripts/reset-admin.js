/**
 * Reset an existing local admin account password.
 *
 * Required environment: ADMIN_EMAIL and ADMIN_NEW_PASSWORD (at least 16 chars).
 * This utility refuses production, never creates users, and never prints the
 * supplied password. Use the application's normal account recovery process
 * for hosted/production systems.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { assertSafeLocalDatabase } = require('../db/operationSafety');

async function resetAdmin({ dbPool, nodeEnv, databaseUrl, acknowledgement, email, password }) {
  assertSafeLocalDatabase({
    connectionString: databaseUrl,
    nodeEnv,
    acknowledgement,
    acknowledgementName: 'ALLOW_LOCAL_ADMIN_RESET',
  });
  const adminEmail = typeof email === 'string' ? email.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error('Set ADMIN_EMAIL to the exact existing admin email');
  }
  if (typeof password !== 'string' || password.length < 16 || password.length > 128) {
    throw new Error('Set ADMIN_NEW_PASSWORD to a unique password between 16 and 128 characters');
  }

  const { rows } = await dbPool.query(
    "SELECT id FROM users WHERE role = 'admin' AND lower(email) = lower($1) LIMIT 2",
    [adminEmail],
  );
  if (rows.length !== 1) throw new Error('Exactly one existing admin matching ADMIN_EMAIL must exist; no account was changed');

  const hash = await bcrypt.hash(password, 12);
  const updated = await dbPool.query(
    "UPDATE users SET password_hash = $1, is_verified = TRUE WHERE id = $2 AND role = 'admin' RETURNING id",
    [hash, rows[0].id],
  );
  if (updated.rowCount !== 1) throw new Error('The matching admin account changed during reset; no success was reported');
  return { success: true };
}

if (require.main === module) {
  const pool = require('../db/poolJsShim.cjs');
  resetAdmin({
    dbPool: pool,
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    acknowledgement: process.env.ALLOW_LOCAL_ADMIN_RESET,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_NEW_PASSWORD,
  }).then(() => {
    console.log('Existing admin password reset successfully. The password was not printed.');
  }).catch((error) => {
    console.error(`Admin reset refused or failed: ${error.message}`);
    process.exitCode = 1;
  }).finally(() => pool.end());
}

module.exports = { resetAdmin };
