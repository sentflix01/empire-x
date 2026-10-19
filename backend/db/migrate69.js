/**
 * migrate69.js - Messages: read state, requests, mute, archive, delete for me.
 *
 * conversation_participants (one row per person per chat) gains:
 *   - last_delivered_at: the newest message that reached this person's app (✓✓)
 *   - accepted_at: NULL while a first message from someone you don't follow
 *     waits in Requests; set when you accept or reply
 *   - muted_until: no notifications until then ('infinity' = always)
 *   - archived_at: moved out of the main list until a new message arrives
 *   - hidden_before: "Delete chat for me" - you no longer see older messages
 * user_profiles.read_receipts: off hides "Seen" both ways.
 * message_hidden: "Delete for me" on single messages.
 *
 * Idempotent: safe to re-run on every deploy. Chats that existed before
 * requests are marked accepted only on the run that adds the column, so a
 * later re-run never accepts a real pending request.
 */
module.exports = async function migrate69(pool) {
  const { rows: [had] } = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'conversation_participants' AND column_name = 'accepted_at'
    ) AS present
  `);
  await pool.query(`
    ALTER TABLE conversation_participants
      ADD COLUMN IF NOT EXISTS last_delivered_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS accepted_at       TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS muted_until       TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS archived_at       TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS hidden_before     TIMESTAMPTZ;

    ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS read_receipts BOOLEAN NOT NULL DEFAULT TRUE;

    CREATE TABLE IF NOT EXISTS message_hidden (
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, message_id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
  `);
  if (!had.present) {
    await pool.query('UPDATE conversation_participants SET accepted_at = joined_at, last_delivered_at = last_read_at WHERE accepted_at IS NULL');
  }
};
