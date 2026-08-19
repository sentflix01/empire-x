/**
 * cleanup-seed-data.js
 * Removes all faker/seeded data (nodbusiness.test users and all their content)
 * Keeps: admin@nodbusiness.app and test@nodbusiness.app accounts and their data.
 *
 * Run: node db/cleanup-seed-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('./pool');

async function cleanup() {
  const client = await pool.connect();
  console.log('\n🧹 Nodbusiness — Cleaning all faker/seed data...\n');

  try {
    await client.query('BEGIN');

    // ── Step 1: Truncate all content tables (CASCADE handles FKs) ─────────
    console.log('🗑  Truncating all content tables...');
    await client.query(`
      TRUNCATE TABLE
        delivery_updates, return_requests, price_alerts, product_variants,
        cart_items, wishlists, commissions, poll_votes, post_hashtags, hashtags, coupons,
        push_subscriptions, point_transactions, course_enrollments, course_lessons,
        job_applications, event_tickets,
        saves, reports, blocks, wallet_transactions,
        story_views, stories,
        messages, conversations, task_bids, tasks,
        comments, likes, follows, notifications,
        orders, reviews, products, showrooms, businesses,
        jobs, events, courses, posts
      RESTART IDENTITY CASCADE
    `);
    console.log('  ✅ Content tables cleared.\n');

    // ── Step 2: Delete all seeded test users (nodbusiness.test domain) ─────────
    console.log('👥 Deleting seeded test users...');
    const { rowCount: profilesDeleted } = await client.query(`
      DELETE FROM user_profiles
      WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@nodbusiness.test'
      )
    `);
    const { rowCount: walletsDeleted } = await client.query(`
      DELETE FROM wallets
      WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@nodbusiness.test'
      )
    `);
    const { rowCount: usersDeleted } = await client.query(
      `DELETE FROM users WHERE email LIKE '%@nodbusiness.test' RETURNING email`
    );
    console.log(`  ✅ Deleted ${usersDeleted} seeded users, ${profilesDeleted} profiles, ${walletsDeleted} wallets.\n`);

    // ── Step 3: Reset wallet balances for kept accounts ────────────────────
    console.log('💰 Resetting dev account wallets...');
    await client.query(`
      UPDATE wallets w SET balance = CASE
        WHEN u.role = 'admin' THEN 50000
        ELSE 5000
      END
      FROM users u
      WHERE w.user_id = u.id
        AND u.email IN ('admin@nodbusiness.app', 'test@nodbusiness.app')
    `);

    // Ensure wallets exist for dev accounts (in case they were accidentally deleted)
    await client.query(`
      INSERT INTO wallets (user_id, balance, currency)
      SELECT id, CASE WHEN role = 'admin' THEN 50000 ELSE 5000 END, 'ETB'
      FROM users
      WHERE email IN ('admin@nodbusiness.app', 'test@nodbusiness.app')
        AND id NOT IN (SELECT user_id FROM wallets)
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✅ Dev account wallets reset.\n');

    // ── Step 4: Verify what's left ─────────────────────────────────────────
    const { rows: remaining } = await client.query(`
      SELECT u.email, u.full_name, u.role, w.balance
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ORDER BY u.role DESC, u.email
    `);

    await client.query('COMMIT');

    console.log('✅ Cleanup complete! Remaining accounts:\n');
    console.table(remaining.map(r => ({
      email: r.email,
      name: r.full_name,
      role: r.role,
      wallet: `${r.balance} ETB`,
    })));
    console.log('\n🚀 App is ready for development with clean data.\n');
    console.log('   Admin:   admin@nodbusiness.app / Admin1234!');
    console.log('   Tester:  test@nodbusiness.app  / Test1234!\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();
