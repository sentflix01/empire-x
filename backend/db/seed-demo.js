/** Seed a small, idempotent user/business fixture into the isolated Demo DB. */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { URL } = require('node:url');
const { Pool } = require('pg');
const fs = require('node:fs');

function identity(raw) {
  const url = new URL(raw);
  return `${url.hostname.replace(/^\[|\]$/g, '').toLowerCase()}:${url.port || '5432'}/${decodeURIComponent(url.pathname.replace(/^\//, ''))}`;
}

function name(raw) {
  return decodeURIComponent(new URL(raw).pathname.replace(/^\//, ''));
}

function role(raw) {
  return decodeURIComponent(new URL(raw).username);
}

const demoUrl = process.env.DEMO_DATABASE_URL;
const realUrl = process.env.DATABASE_URL;
const dbArg = process.argv.find((arg) => arg.startsWith('--database='))?.slice('--database='.length);
const sharedDatabase = Boolean(demoUrl && realUrl && identity(demoUrl) === identity(realUrl));
const demoSchema = process.env.DEMO_DB_SCHEMA || (sharedDatabase ? '' : 'public');
const realSchema = process.env.DATABASE_SCHEMA || 'public';
if (!demoUrl || !realUrl || (sharedDatabase && (!demoSchema || demoSchema === realSchema || role(demoUrl) === role(realUrl)))) {
  console.error('Refusing Demo seed: use separate databases, or configure a separate schema and restricted role for Demo.');
  process.exit(1);
}
const schemaArg = process.argv.find((arg) => arg.startsWith('--schema='))?.slice('--schema='.length);
if (process.env.ALLOW_DEMO_SEED !== '1' || !process.argv.includes('--execute') || dbArg !== name(demoUrl) || (sharedDatabase && schemaArg !== demoSchema)) {
  console.error(`Refusing Demo seed: set ALLOW_DEMO_SEED=1 and pass --execute --database=<exact Demo database name>${sharedDatabase ? ' --schema=<exact Demo schema>' : ''}.`);
  process.exit(1);
}

const demoConnection = new URL(demoUrl);
demoConnection.searchParams.set('options', `-c search_path=${demoSchema},pg_catalog`);
const tlsOverride = process.env.DEMO_DATABASE_URL_REQUIRE_TLS;
const remote = !['localhost', '127.0.0.1', '::1', 'postgres'].includes(demoConnection.hostname.replace(/^\[|\]$/g, '').toLowerCase());
const needsSsl = tlsOverride === 'true' || (tlsOverride !== 'false' && (process.env.NODE_ENV === 'production' || remote)) ||
  /supabase\.co|supabase\.com|sslmode=require|ssl=true/i.test(demoUrl);
const caFile = process.env.DEMO_DB_SSL_CA_FILE;
if (needsSsl) {
  demoConnection.searchParams.set('sslmode', 'verify-full');
  if (caFile) demoConnection.searchParams.set('sslrootcert', caFile);
}
const pool = new Pool({
  connectionString: demoConnection.toString(),
  ssl: needsSsl ? { rejectUnauthorized: true, ...(caFile ? { ca: fs.readFileSync(caFile, 'utf8') } : {}) } : false,
  max: 1,
});
const fixtures = [
  { email: 'seed.abebe@demo.nodbusiness.app', name: 'Abebe Girma', business: 'Bole Fashion House', category: 'Fashion', template: 'fashion-clothing-store' },
  { email: 'seed.tigist@demo.nodbusiness.app', name: 'Tigist Haile', business: 'Kategna Kitchen', category: 'Food & Dining', template: 'restaurant' },
  { email: 'seed.dawit@demo.nodbusiness.app', name: 'Dawit Bekele', business: 'Addis Creative Studio', category: 'Creative Services', template: 'portfolio' },
  { email: 'seed.mekdes@demo.nodbusiness.app', name: 'Mekdes Tadesse', business: 'Bole Wellness Clinic', category: 'Health', template: 'clinic' },
  { email: 'seed.yonas@demo.nodbusiness.app', name: 'Yonas Alemu', business: 'EthioTech Solutions', category: 'Technology', template: 'agency' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const fixture of fixtures) {
      const { rows: userRows } = await client.query(
        `INSERT INTO users (email, full_name, role, is_verified, is_demo, is_seed, provider)
         VALUES ($1, $2, 'user', TRUE, TRUE, FALSE, 'local')
         ON CONFLICT (email) DO UPDATE SET full_name=EXCLUDED.full_name, is_demo=TRUE, is_seed=FALSE
         RETURNING id`,
        [fixture.email, fixture.name],
      );
      const userId = userRows[0].id;
      const { rows: profiles } = await client.query('SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1', [userId]);
      if (profiles[0]) {
        await client.query(
          `UPDATE user_profiles SET display_name=$2, profile_type='business', has_business_profile=TRUE,
             business_name=$3, business_category=$4, business_template=$5, business_description=$6, updated_at=NOW()
           WHERE id=$1`,
          [profiles[0].id, fixture.name, fixture.business, fixture.category, fixture.template, `${fixture.business} is a sample Demo business.`],
        );
      } else {
        await client.query(
          `INSERT INTO user_profiles (user_id, display_name, profile_type, has_business_profile, business_name,
             business_category, business_template, business_description)
           VALUES ($1, $2, 'business', TRUE, $3, $4, $5, $6)`,
          [userId, fixture.name, fixture.business, fixture.category, fixture.template, `${fixture.business} is a sample Demo business.`],
        );
      }
      await client.query(
        `INSERT INTO businesses (owner_id, business_name, business_category, business_template, business_description)
         SELECT $1, $2, $3, $4, $5
         WHERE NOT EXISTS (SELECT 1 FROM businesses WHERE owner_id=$1 AND business_name=$2)`,
        [userId, fixture.business, fixture.category, fixture.template, `${fixture.business} is a sample Demo business.`],
      );
    }
    await client.query('COMMIT');
    console.log(`Demo seed completed for ${identity(demoUrl)} (${fixtures.length} sample accounts and businesses).`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error(`Demo seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(async (error) => {
  console.error(`Demo seed failed: ${error.message}`);
  process.exitCode = 1;
  await pool.end();
});
