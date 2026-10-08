/**
 * verify-db.js — Quick DB connection check used in CI before running migrations.
 * Exits 0 on success, 1 on failure with a clear error message.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('node:fs');

function getPoolOptions(url, env = process.env) {
  const tlsOverride = env.DATABASE_URL_REQUIRE_TLS;
  const needsSsl = tlsOverride === 'true' || env.NODE_ENV === 'production' ||
    /supabase\.co|supabase\.com|sslmode=require|ssl=true/i.test(url);
  let connectionString = url;
  const caFile = env.DB_SSL_CA_FILE;
  if (needsSsl && connectionString) {
    const parsed = new URL(connectionString);
    // node-postgres replaces the explicit `ssl` object when SSL parameters are
    // present in the URI. Keep the policy and CA exclusively in `ssl` below.
    for (const key of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
      parsed.searchParams.delete(key);
    }
    connectionString = parsed.toString();
  }
  return {
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: true, ...(caFile ? { ca: fs.readFileSync(caFile, 'utf8') } : {}) } : false,
    connectionTimeoutMillis: 10_000,
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌  DATABASE_URL is not set.');
    console.error('    Set it in: GitHub → Settings → Environments → production → DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool(getPoolOptions(url));

  try {
    await pool.query('SELECT 1');
    console.log('✅  DB connection OK');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌  DB connection failed:', err.message);
    if (err.message.includes('password authentication')) {
      console.error('    → Wrong password in DATABASE_URL.');
      console.error('    → Update the secret: GitHub → Settings → Environments → production → DATABASE_URL');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('ENETUNREACH')) {
      console.error('    → Host unreachable. Check the hostname in DATABASE_URL.');
      console.error('    → If using Supabase, use the pooler URL: aws-0-REGION.pooler.supabase.com:6543');
    } else if (err.message.includes('SSL') || err.message.includes('certificate')) {
      console.error('    → TLS verification failed. Check the database hostname and configure DB_SSL_CA_FILE with the trusted provider root CA PEM.');
    }
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

module.exports = { getPoolOptions };

if (require.main === module) main();
