/** Create deterministic, real-mode accounts for local Playwright E2E runs. */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { URL } = require('node:url');
const { assertSafeLocalDatabase } = require('./operationSafety');

function validate(env = process.env) {
  assertSafeLocalDatabase({
    connectionString: env.DATABASE_URL,
    nodeEnv: env.NODE_ENV,
    acknowledgement: env.ALLOW_E2E_SEED,
    acknowledgementName: 'ALLOW_E2E_SEED',
  });
  for (const key of ['E2E_TEST_PASSWORD', 'E2E_ADMIN_PASSWORD']) {
    if (typeof env[key] !== 'string' || env[key].length < 16 || env[key].length > 128) {
      throw new Error(`Set ${key} to a unique password between 16 and 128 characters`);
    }
  }
}

function databaseIdentity(raw) {
  const url = new URL(raw);
  return `${url.hostname.toLowerCase()}:${url.port || '5432'}${decodeURIComponent(url.pathname)}`;
}

function databaseRole(raw) {
  return decodeURIComponent(new URL(raw).username);
}

function connectionForSchema(raw, schema) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) throw new Error('Database schema must be a simple PostgreSQL schema name');
  const url = new URL(raw);
  url.searchParams.set('options', `-c search_path=${schema},pg_catalog`);
  return url.toString();
}

async function seed(env = process.env) {
  validate(env);
  const realSchema = env.DATABASE_SCHEMA || 'public';
  const demoSchema = env.DEMO_DB_SCHEMA || 'public';
  if (env.DEMO_DATABASE_URL) {
    assertSafeLocalDatabase({
      connectionString: env.DEMO_DATABASE_URL,
      nodeEnv: env.NODE_ENV,
      acknowledgement: env.ALLOW_E2E_SEED,
      acknowledgementName: 'ALLOW_E2E_SEED',
    });
    if (databaseIdentity(env.DATABASE_URL) === databaseIdentity(env.DEMO_DATABASE_URL)
      && (realSchema === demoSchema || databaseRole(env.DATABASE_URL) === databaseRole(env.DEMO_DATABASE_URL))) {
      throw new Error('A shared local database requires different schemas and different restricted login roles');
    }
  }
  const pool = new Pool({ connectionString: connectionForSchema(env.DATABASE_URL, realSchema), max: 1 });
  const fixtures = [
    { email: env.E2E_TEST_EMAIL || 'e2e-buyer@nodbusiness.test', password: env.E2E_TEST_PASSWORD, name: 'E2E Buyer', role: 'user' },
    { email: env.E2E_ADMIN_EMAIL || 'e2e-seller@nodbusiness.test', password: env.E2E_ADMIN_PASSWORD, name: 'E2E Seller', role: 'admin' },
  ];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const fixture of fixtures) {
      const hash = await bcrypt.hash(fixture.password, 10);
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_verified, is_seed, is_demo, provider)
         VALUES ($1, $2, $3, $4, TRUE, FALSE, FALSE, 'local')
         ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash,
           full_name=EXCLUDED.full_name, role=EXCLUDED.role, is_verified=TRUE,
           is_seed=FALSE, is_demo=FALSE, provider='local'
         RETURNING id`,
        [fixture.email, hash, fixture.name, fixture.role],
      );
      const userId = rows[0].id;
      const { rows: profiles } = await client.query('SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1', [userId]);
      if (profiles[0]) {
        await client.query('UPDATE user_profiles SET display_name=$2 WHERE id=$1', [profiles[0].id, fixture.name]);
      } else {
        await client.query(
          `INSERT INTO user_profiles (user_id, display_name, profile_type) VALUES ($1, $2, 'personal')`,
          [userId, fixture.name],
        );
      }
      await client.query(
        `INSERT INTO wallets (user_id, balance, currency) VALUES ($1, 0, 'ETB')
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      );
    }
    await client.query('COMMIT');
    console.log(`Local Real E2E accounts ready (${fixtures.map(({ email }) => email).join(', ')}).`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  // Mirror the buyer identity into the explicitly separate Demo database.
  // The same email and password exercise independent user IDs and sessions.
  if (env.DEMO_DATABASE_URL) {
    const demoPool = new Pool({ connectionString: connectionForSchema(env.DEMO_DATABASE_URL, demoSchema), max: 1 });
    const demoClient = await demoPool.connect();
    try {
      await demoClient.query('BEGIN');
      const buyer = fixtures[0];
      const hash = await bcrypt.hash(buyer.password, 10);
      const { rows } = await demoClient.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_verified, is_seed, is_demo, provider)
         VALUES ($1, $2, 'E2E Buyer Demo', 'user', TRUE, FALSE, TRUE, 'local')
         ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash,
           full_name=EXCLUDED.full_name, role='user', is_verified=TRUE,
           is_seed=FALSE, is_demo=TRUE, provider='local'
         RETURNING id`,
        [buyer.email, hash],
      );
      const userId = rows[0].id;
      const { rows: profiles } = await demoClient.query('SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1', [userId]);
      if (profiles[0]) {
        await demoClient.query('UPDATE user_profiles SET display_name=$2 WHERE id=$1', [profiles[0].id, 'E2E Buyer Demo']);
      } else {
        await demoClient.query(
          `INSERT INTO user_profiles (user_id, display_name, profile_type) VALUES ($1, 'E2E Buyer Demo', 'personal')`,
          [userId],
        );
      }
      await demoClient.query(
        `INSERT INTO wallets (user_id, balance, currency) VALUES ($1, 0, 'ETB')
         ON CONFLICT (user_id) DO NOTHING`,
        [userId],
      );
      await demoClient.query('COMMIT');
      console.log('Matching Demo E2E identity ready in the isolated Demo database.');
    } catch (error) {
      await demoClient.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      demoClient.release();
      await demoPool.end();
    }
  }
}

if (require.main === module) {
  seed().catch((error) => {
    console.error(`E2E seed refused or failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { seed, validate };
