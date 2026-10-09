/** Add an explicit canonical-user link for isolated Demo workspace identities. */
module.exports = async function migrate46(pool) {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_owner_id UUID');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_workspace_owner_id ON users(workspace_owner_id) WHERE workspace_owner_id IS NOT NULL');
};
