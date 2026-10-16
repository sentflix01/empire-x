/**
 * migrate55.js - Link posts to a destination and to the showroom they announce.
 * When a business publishes its site, an announcement post (one per showroom)
 * goes to followers' feeds with a "Visit site" link. Deleting the showroom
 * (e.g. the Day-10 subscription deletion) removes its announcement.
 */
module.exports = async function migrate55(pool) {
  await pool.query(`
    ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS link_url TEXT,
      ADD COLUMN IF NOT EXISTS showroom_id UUID REFERENCES showrooms(id) ON DELETE CASCADE;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_showroom_announcement ON posts(showroom_id) WHERE showroom_id IS NOT NULL;
  `);
};
