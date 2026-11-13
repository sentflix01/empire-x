/**
 * migrate26.js ? Mewacho group money collection tables
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS mewacho_groups (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          TEXT NOT NULL,
        description   TEXT,
        purpose       TEXT NOT NULL DEFAULT 'general',
        target_amount NUMERIC(14,2),
        cover_photo   TEXT,
        invite_code   TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 10),
        status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
        created_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mewacho_members (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id   UUID NOT NULL REFERENCES mewacho_groups(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','moderator','member')),
        joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (group_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mewacho_contributions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id        UUID NOT NULL REFERENCES mewacho_groups(id) ON DELETE CASCADE,
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
        payment_method  TEXT NOT NULL DEFAULT 'stripe',
        stripe_session_id TEXT,
        status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
        is_anonymous    BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mewacho_withdrawals (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id         UUID NOT NULL REFERENCES mewacho_groups(id) ON DELETE CASCADE,
        requested_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount           NUMERIC(14,2) NOT NULL CHECK (amount > 0),
        destination_type TEXT NOT NULL DEFAULT 'bank',
        destination_ref  TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
        requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
        approved_by      UUID[],
        note             TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mewacho_activity (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id   UUID NOT NULL REFERENCES mewacho_groups(id) ON DELETE CASCADE,
        user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
        type       TEXT NOT NULL CHECK (type IN ('contribution','message','withdrawal','system')),
        content    TEXT,
        metadata   JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_mewacho_members_group ON mewacho_members(group_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mewacho_members_user  ON mewacho_members(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mewacho_contrib_group ON mewacho_contributions(group_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mewacho_activity_group ON mewacho_activity(group_id, created_at DESC)`);

    await client.query('COMMIT');
    console.log('? Migration 26 complete ? Mewacho tables created.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('? Migration 26 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
