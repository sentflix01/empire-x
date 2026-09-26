require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS onboarding_mode TEXT
        CHECK (onboarding_mode IS NULL OR onboarding_mode IN ('demo', 'real'))
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS demo_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'ended', 'expired', 'cleaned')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        ended_at TIMESTAMPTZ,
        cleaned_at TIMESTAMPTZ,
        cleanup_error TEXT
      )
    `);
    await client.query('ALTER TABLE demo_sessions DROP CONSTRAINT IF EXISTS demo_sessions_user_id_fkey');
    await client.query('ALTER TABLE demo_sessions DROP CONSTRAINT IF EXISTS demo_sessions_user_id_key');
    await client.query('CREATE INDEX IF NOT EXISTS idx_demo_sessions_expiry ON demo_sessions(status, expires_at)');
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_demo_sessions_one_active_user ON demo_sessions(user_id) WHERE status = 'active'`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS demo_session_ai_usage (
        session_id UUID NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('generate', 'chat')),
        hour_bucket TIMESTAMPTZ NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (session_id, action, hour_bucket)
      )
    `);
    await client.query('COMMIT');
    console.log('Migration 40 complete — onboarding preference and sandbox sessions are available.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration 40 failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
