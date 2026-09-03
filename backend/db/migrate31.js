/**
 * migrate31.js — conversation_participants junction table
 *
 * Why this migration exists:
 *   Previously, conversation participants were stored as a JSON array in the
 *   TEXT column `conversations.participant_ids`. Every participant lookup
 *   required a full-table scan with a jsonb cast:
 *     WHERE participant_ids::jsonb @> '["user-id"]'::jsonb
 *   No B-tree index can serve this query efficiently.
 *
 *   This migration creates a proper normalized junction table with a
 *   composite primary key (conversation_id, user_id) and an indexed
 *   lookup path on user_id — turning O(N) full scans into O(log N) lookups.
 *
 *   Additional columns:
 *     role        — 'admin' | 'member', supports group permission checks
 *     last_read_at — per-user read position, enables unread count queries
 *                    without scanning all messages
 *
 *   Data migration: reads every existing conversation's participant_ids JSON
 *   array and inserts one row per participant into conversation_participants.
 *   Safe to re-run: ON CONFLICT DO NOTHING on all inserts.
 *
 *   Backward compatibility:
 *     - The original participant_ids / participant_names columns are NOT
 *       dropped. Routes that haven't been updated yet continue to work.
 *     - A GIN index is added on participant_ids::jsonb so the legacy
 *       containment queries remain fast during the transition period.
 *     - Once all routes use the junction table, participant_ids can be
 *       dropped in a future migration (migrate33.js or later).
 *
 * Run standalone: node db/migrate31.js
 * Auto-run:       node db/migrate-all.js  (exports async function)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function migrate31(trackPool) {
  // When called by migrate-all.js, use the injected pool.
  // When run standalone, load pool directly via tsx.
  const pool = trackPool ?? require('./pool');
  const client = await pool.connect();
  try {
    console.log('migrate31: creating conversation_participants junction table...');
    await client.query('BEGIN');

    // ── 1. Create junction table ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        conversation_id  UUID        NOT NULL
                         REFERENCES conversations(id) ON DELETE CASCADE,
        user_id          UUID        NOT NULL
                         REFERENCES users(id)         ON DELETE CASCADE,
        role             TEXT        NOT NULL DEFAULT 'member'
                         CHECK (role IN ('admin', 'member')),
        last_read_at     TIMESTAMPTZ,
        joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (conversation_id, user_id)
      )
    `);

    // ── 2. Indexes ────────────────────────────────────────────────────────────
    // Primary lookup: "show all conversations for user X, newest first"
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conv_participants_user_joined
        ON conversation_participants(user_id, joined_at DESC)
    `);

    // Reverse lookup: "list all participants in conversation X"
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conv_participants_conv_id
        ON conversation_participants(conversation_id)
    `);

    // ── 3. Backward-compat GIN index on legacy participant_ids column ─────────
    // Keeps old-style WHERE participant_ids::jsonb @> ... queries fast while
    // the codebase transitions to the junction table.
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_participant_ids_gin
        ON conversations USING GIN ((participant_ids::jsonb))
    `);

    // ── 4. Migrate existing data from JSON arrays ─────────────────────────────
    console.log('migrate31: migrating participant data from participant_ids JSON...');

    const { rows: conversations } = await client.query(
      'SELECT id, participant_ids, admin_id FROM conversations WHERE participant_ids IS NOT NULL'
    );

    let migrated = 0;
    let skipped  = 0;

    for (const conv of conversations) {
      let ids;
      try {
        const parsed = Array.isArray(conv.participant_ids)
          ? conv.participant_ids
          : JSON.parse(conv.participant_ids);
        ids = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        skipped++;
        continue; // malformed JSON — skip this row
      }

      for (const uid of ids) {
        if (!uid || uid.length < 10) continue; // skip blank / malformed UUIDs
        const role = uid === String(conv.admin_id) ? 'admin' : 'member';
        try {
          await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_id, role)
             VALUES ($1, $2, $3)
             ON CONFLICT (conversation_id, user_id) DO NOTHING`,
            [conv.id, uid, role]
          );
          migrated++;
        } catch {
          // Foreign-key violation means the user was deleted — skip silently
          skipped++;
        }
      }
    }

    await client.query('COMMIT');
    console.log(
      `migrate31: complete — ${migrated} participant rows migrated, ${skipped} skipped`
    );
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('migrate31 failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Exported async function — picked up by migrate-all.js automatically
module.exports = migrate31;

// Allow standalone run: node db/migrate31.js
if (require.main === module) {
  const standalonePool = require('./pool');
  migrate31(standalonePool)
    .then(() => { standalonePool.end(); process.exit(0); })
    .catch(err => { console.error(err); standalonePool.end(); process.exit(1); });
}
