/**
 * remove-faker-data.js
 * Deletes all faker/seed generated users and all their content.
 * Keeps only real accounts (gmail.com, real emails — not test domains).
 *
 * Run: node db/remove-faker-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

async function run() {
  const client = await pool.connect();
  console.log('\n🧹 Nodbusiness — Removing all faker/seed data...\n');

  try {
    await client.query('BEGIN');

    // ── Step 1: Identify faker seed user IDs ──────────────────────────────
    const { rows: seedUsers } = await client.query(`
      SELECT id FROM users
      WHERE email LIKE '%@empirex.test'
         OR email LIKE '%@nodbusiness.test'
         OR email LIKE 'e2etest%@test.com'
         OR email LIKE 'perf_%@test.com'
         OR email LIKE 'qa-register-%@example.test'
    `);
    const seedIds = seedUsers.map(r => r.id);
    console.log(`Found ${seedIds.length} seed user IDs to clean up.`);

    if (seedIds.length === 0) {
      console.log('  ✅ No seed users found — nothing to clean.\n');
      await client.query('COMMIT');
      return;
    }

    // ── Step 2: Delete content owned by seed users ─────────────────────────
    // Order matters — delete dependents before parents
    console.log('🗑  Deleting seed-user content...');

    // Posts and their dependents
    await client.query(`DELETE FROM post_hashtags WHERE post_id IN (SELECT id FROM posts WHERE author_id = ANY($1))`, [seedIds]);
    await client.query(`DELETE FROM poll_votes WHERE poll_id IN (SELECT id FROM polls WHERE author_id = ANY($1))`, [seedIds]);
    await client.query(`DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE author_id = ANY($1)) OR author_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM likes WHERE user_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM saves WHERE user_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM story_views WHERE viewer_id = ANY($1)`,[seedIds]);
    await client.query(`DELETE FROM stories WHERE user_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM posts WHERE author_id = ANY($1)`, [seedIds]);

    // Products + orders owned by seed users
    await client.query(`DELETE FROM price_alerts WHERE user_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM wishlists WHERE user_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM cart_items WHERE user_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE seller_id = ANY($1))`, [seedIds]);
    await client.query(`DELETE FROM reviews WHERE reviewer_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM orders WHERE buyer_id = ANY($1) OR seller_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM commissions WHERE seller_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM coupons WHERE seller_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM products WHERE seller_id = ANY($1)`, [seedIds]);

    // Businesses + showrooms owned by seed users (real user showrooms are preserved)
    await client.query(`DELETE FROM showrooms WHERE owner_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM businesses WHERE owner_id = ANY($1)`, [seedIds]);

    // Tasks
    await client.query(`DELETE FROM task_bids WHERE bidder_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM task_bids WHERE task_id IN (SELECT id FROM tasks WHERE requester_id = ANY($1))`, [seedIds]);
    await client.query(`DELETE FROM tasks WHERE requester_id = ANY($1)`, [seedIds]);

    // Messages / conversations
    await client.query(`DELETE FROM messages WHERE sender_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM conversations WHERE participant_ids::text SIMILAR TO ANY(ARRAY(SELECT '%' || id::text || '%' FROM users WHERE id = ANY($1)))`, [seedIds]);

    // Jobs, events, courses
    await client.query(`DELETE FROM job_applications WHERE applicant_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM jobs WHERE poster_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM event_tickets WHERE user_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM events WHERE organizer_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM course_enrollments WHERE user_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM courses WHERE instructor_id = ANY($1)`, [seedIds]);

    // Social graph
    await client.query(`DELETE FROM follows WHERE follower_id = ANY($1) OR following_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM blocks WHERE blocker_id = ANY($1) OR blocked_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM reports WHERE reporter_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM notifications WHERE user_id = ANY($1)`, [seedIds]);
    await client.query(`DELETE FROM push_subscriptions WHERE user_id = ANY($1)`, [seedIds]);

    // Wallet
    await client.query(`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = ANY($1))`, [seedIds]);
    await client.query(`DELETE FROM point_transactions WHERE user_id = ANY($1)`, [seedIds]);

    // Hashtags with no posts left
    await client.query(`DELETE FROM hashtags WHERE id NOT IN (SELECT DISTINCT hashtag_id FROM post_hashtags)`);
    // Coupons orphaned
    await client.query(`DELETE FROM coupons WHERE seller_id = ANY($1)`, [seedIds]);

    console.log('  ✅ Seed-user content deleted.\n');

    // ── Step 3: Delete the seed users themselves ──────────────────────────
    console.log('👥 Deleting seed/test users...');
    const { rows: deleted } = await client.query(`
      DELETE FROM users
      WHERE id = ANY($1)
      RETURNING email
    `, [seedIds]);
    console.log(`  ✅ Deleted ${deleted.length} seed/test users:`);
    deleted.forEach(r => console.log(`     - ${r.email}`));

    // ── Step 4: Reset wallets for real accounts ────────────────────────────
    console.log('\n💰 Resetting admin wallet balance...');
    await client.query(`
      UPDATE wallets w
      SET balance = CASE WHEN u.role = 'admin' THEN 50000 ELSE 5000 END
      FROM users u
      WHERE w.user_id = u.id
        AND (u.email LIKE '%@nodbusiness.app' OR u.email LIKE '%@empirex.app')
    `);
    console.log('  ✅ Done.\n');

    // ── Step 5: Show remaining accounts ───────────────────────────────────
    const { rows: remaining } = await client.query(`
      SELECT u.email, u.full_name, u.role, COALESCE(w.balance::text, 'no wallet') as wallet
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ORDER BY u.role DESC, u.email
    `);

    await client.query('COMMIT');

    console.log(`✅ Cleanup complete! ${remaining.length} account(s) remaining:\n`);
    console.table(remaining.map(r => ({
      email:  r.email,
      name:   r.full_name || '(no name)',
      role:   r.role,
      wallet: r.wallet + ' ETB',
    })));
    console.log('\n🚀 Database is clean.\n');

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
