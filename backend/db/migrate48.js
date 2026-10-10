/** Mark short-lived visitor-created Demo sessions for account cleanup. */
module.exports = async function migrate48(pool) {
  await pool.query(`
    ALTER TABLE demo_sessions
      ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE
  `);
};
