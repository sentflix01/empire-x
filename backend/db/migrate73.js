// migrate73: add metadata JSONB column to messages (product/order_update card types)
'use strict';

module.exports = async function migrate73(pool) {
  await pool.query(
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB`,
  );
};
