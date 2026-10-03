/**
 * seed-clean-images.js ? Remove posts with picsum image URLs from seed users.
 * picsum.photos returns random real photos (faces, landscapes) that are
 * inappropriate for a demo feed. Text posts look clean and professional.
 * Run: node db/seed-clean-images.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./poolJsShim.cjs');
const { assertSafeDevSeed } = require('./operationSafety');

async function clean() {
  assertSafeDevSeed();
  const client = await pool.connect();
  console.log('\n?? Cleaning picsum image posts from seed users...\n');
  try {
    // Delete image posts where image_url contains picsum.photos (random photos)
    const { rowCount } = await client.query(
      `DELETE FROM posts
       WHERE author_id IN (SELECT id FROM users WHERE is_seed = TRUE)
         AND image_url LIKE '%picsum.photos%'`
    );
    console.log(`? Deleted ${rowCount} picsum image posts`);

    // Also clean up any posts with null/empty content
    const { rowCount: r2 } = await client.query(
      `DELETE FROM posts
       WHERE author_id IN (SELECT id FROM users WHERE is_seed = TRUE)
         AND (content IS NULL OR TRIM(content) = '')`
    );
    console.log(`? Deleted ${r2} empty-content posts`);

    // Check remaining
    const { rows } = await client.query(
      `SELECT post_type, COUNT(*) as total, COUNT(image_url) as with_image
       FROM posts p
       JOIN users u ON u.id = p.author_id
       WHERE u.is_seed = TRUE
       GROUP BY post_type`
    );
    console.log('\nRemaining seed posts:');
    rows.forEach(r => console.log(`  ${r.post_type}: ${r.total} posts (${r.with_image} with image)`));

    console.log('\n? Done ? feed now shows clean text and promo posts only.\n');
  } catch (err) {
    console.error('? Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
clean();
