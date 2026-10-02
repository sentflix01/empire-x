/**
 * verify-db.js — Quick DB connection check used in CI before running migrations.
 * Exits 0 on success, 1 on failure with a clear error message.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

function getPoolOptions(url, env = process.env) {
  const tlsOverride = env.DATABASE_URL_REQUIRE_TLS;
  const needsSsl = tlsOverride === 'true' || (tlsOverride !== 'false' && (
    env.NODE_ENV === 'production' ||
    /supabase\.co|supabase\.com|sslmode=require|ssl=true/i.test(url)
  ));
  return {
    connectionString: url,
    ssl: needsSsl ? { rejectUnauthorized: env.DB_TLS_REJECT_UNAUTHORIZED !== 'false' } : false,
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
      console.error('    → SSL error. Add ?sslmode=require to DATABASE_URL or check provider docs.');
    }
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

module.exports = { getPoolOptions };

if (require.main === module) main();
