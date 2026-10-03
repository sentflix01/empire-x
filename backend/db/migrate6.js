require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');

const schema = `
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_post_type_check;
ALTER TABLE posts ADD CONSTRAINT posts_post_type_check
  CHECK (post_type IN ('text','image','product','task','event','poll'));
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migration 6...');
    await client.query(schema);
    console.log('? Migration 6 complete.');
  } catch (err) {
    console.error('? Migration 6 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
