/**
 * clean-seed-data.js
 * Removes ALL data created by the seed script (is_seed = TRUE users + all their content).
 * Keeps real user accounts (gmail etc.) and their data untouched.
 * Run: node db/clean-seed-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

async function run() {
  const client = await pool.connect();
  console.log('\n🧹 Cleaning all seed-generated data...\n');
  try {
    await client.query('BEGIN');

    // Get seed user IDs
    const { rows: seedUsers } = await client.query(
      `SELECT id FROM users WHERE is_seed = TRUE`
    );
    const seedIds = seedUsers.map(r => r.id);
    console.log(`Found ${seedIds.length} seed users to remove.`);

    if (seedIds.length === 0) {
      console.log('Nothing to clean.');
      await client.query('COMMIT');
      return;
    }

    // Delete all content owned by seed users
    const tables = [
      [`DELETE FROM post_hashtags   WHERE post_id IN (SELECT id FROM posts WHERE author_id = ANY($1))`, seedIds],
      [`DELETE FROM poll_votes      WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM comments        WHERE author_id = ANY($1)`, seedIds],
      [`DELETE FROM likes           WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM saves           WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM story_views     WHERE viewer_id = ANY($1)`, seedIds],
      [`DELETE FROM stories         WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM posts           WHERE author_id = ANY($1)`, seedIds],
      [`DELETE FROM price_alerts    WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM wishlists       WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM cart_items      WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE seller_id = ANY($1))`, seedIds],
      [`DELETE FROM reviews         WHERE reviewer_id = ANY($1)`, seedIds],
      [`DELETE FROM orders          WHERE buyer_id = ANY($1) OR seller_id = ANY($1)`, seedIds],
      [`DELETE FROM commissions     WHERE seller_id = ANY($1)`, seedIds],
      [`DELETE FROM coupons         WHERE seller_id = ANY($1)`, seedIds],
      [`DELETE FROM products        WHERE seller_id = ANY($1)`, seedIds],
      [`DELETE FROM businesses      WHERE owner_id = ANY($1)`, seedIds],
      [`DELETE FROM task_bids       WHERE bidder_id = ANY($1)`, seedIds],
      [`DELETE FROM task_bids       WHERE task_id IN (SELECT id FROM tasks WHERE requester_id = ANY($1))`, seedIds],
      [`DELETE FROM tasks           WHERE requester_id = ANY($1)`, seedIds],
      [`DELETE FROM messages        WHERE sender_id = ANY($1)`, seedIds],
      [`DELETE FROM job_applications WHERE applicant_id = ANY($1)`, seedIds],
      [`DELETE FROM jobs            WHERE poster_id = ANY($1)`, seedIds],
      [`DELETE FROM event_tickets   WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM events          WHERE organizer_id = ANY($1)`, seedIds],
      [`DELETE FROM course_enrollments WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM course_lessons  WHERE course_id IN (SELECT id FROM courses WHERE creator_id = ANY($1))`, seedIds],
      [`DELETE FROM courses         WHERE creator_id = ANY($1)`, seedIds],
      [`DELETE FROM follows         WHERE follower_id = ANY($1) OR followed_id = ANY($1)`, seedIds],
      [`DELETE FROM blocks          WHERE blocker_id = ANY($1) OR blocked_id = ANY($1)`, seedIds],
      [`DELETE FROM reports         WHERE reporter_id = ANY($1)`, seedIds],
      [`DELETE FROM notifications   WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM push_subscriptions WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = ANY($1))`, seedIds],
      [`DELETE FROM point_transactions WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM dismissed_suggestions WHERE requester_id = ANY($1) OR target_id = ANY($1)`, seedIds],
      [`DELETE FROM wallets         WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM user_profiles   WHERE user_id = ANY($1)`, seedIds],
      [`DELETE FROM users           WHERE id = ANY($1)`, seedIds],
    ];

    for (const [sql, params] of tables) {
      const { rowCount } = await client.query(sql, [params]);
      if (rowCount > 0) console.log(`  Deleted ${rowCount} rows — ${sql.split(' ').slice(2,4).join(' ')}`);
    }

    // Clean orphaned hashtags
    await client.query(`DELETE FROM hashtags WHERE id NOT IN (SELECT DISTINCT hashtag_id FROM post_hashtags)`);

    await client.query('COMMIT');
    console.log('\n✅ All seed data removed. Database is clean.\n');

    // Show what remains
    const { rows } = await client.query(
      `SELECT email, full_name, role FROM users ORDER BY role DESC, email`
    );
    console.log(`Remaining accounts (${rows.length}):`);
    rows.forEach(r => console.log(`  [${r.role}] ${r.email}  (${r.full_name || 'no name'})`));
    console.log('');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
