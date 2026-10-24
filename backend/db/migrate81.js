/**
 * migrate81.js - Messages: the business inbox.
 *
 * - conversations.business_id: a chat between a customer and a business (the
 *   owner answers from their Business inbox). One per customer and business,
 *   separate from any personal chat with the owner.
 * - messages.type: allows 'context', a card for the product, order, showroom
 *   or quote request the chat is about (a snapshot of its title and photo,
 *   never a price that could go stale; the card links to the live page). Also
 *   allows 'product' and 'order_update': the FEAT-004 cards were rejected by
 *   the old CHECK, so sharing a product in a chat failed.
 * - business_quick_replies: saved answers an owner taps to send (up to 20).
 * Idempotent: safe to re-run on every deploy.
 */
module.exports = async function migrate81(pool) {
  await pool.query(`
    ALTER TABLE conversations ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_conversations_business ON conversations(business_id) WHERE business_id IS NOT NULL;

    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
    ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('text', 'image', 'file', 'product', 'order_update', 'context'));

    CREATE TABLE IF NOT EXISTS business_quick_replies (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      text        TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_quick_replies_business ON business_quick_replies(business_id, position);
  `);
};
