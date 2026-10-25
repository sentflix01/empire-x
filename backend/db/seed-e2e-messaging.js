/**
 * Accounts and a clean slate for the two-person messaging E2E suite
 * (frontend-next/e2e/messaging.spec.ts). Local databases only.
 *
 *   ALLOW_E2E_SEED=1 E2E_MESSAGING_PASSWORD=<16+ chars> npm run seed:e2e:messaging
 *
 * Creates (or resets) three real-mode people:
 *   - buyer:  e2e-msg-buyer@nodbusiness.test
 *   - owner:  e2e-msg-owner@nodbusiness.test, with a paid public business,
 *             a published site and one active product
 *   - third:  e2e-msg-third@nodbusiness.test (requests, blocking, groups)
 * and removes their chats, blocks, mutes and follows so every run starts the same.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { assertSafeLocalDatabase } = require('./operationSafety');

const PEOPLE = {
  buyer: { email: 'e2e-msg-buyer@nodbusiness.test', name: 'Msg Buyer' },
  owner: { email: 'e2e-msg-owner@nodbusiness.test', name: 'Msg Owner' },
  third: { email: 'e2e-msg-third@nodbusiness.test', name: 'Msg Third' },
};
const BUSINESS = 'E2E Coffee House';
const PRODUCT = 'E2E Yirgacheffe 1kg';

function validate(env = process.env) {
  assertSafeLocalDatabase({
    connectionString: env.DATABASE_URL,
    nodeEnv: env.NODE_ENV,
    acknowledgement: env.ALLOW_E2E_SEED,
    acknowledgementName: 'ALLOW_E2E_SEED',
  });
  const pw = env.E2E_MESSAGING_PASSWORD;
  if (typeof pw !== 'string' || pw.length < 16 || pw.length > 128) {
    throw new Error('Set E2E_MESSAGING_PASSWORD to a unique password between 16 and 128 characters');
  }
}

async function seed(env = process.env) {
  validate(env);
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  const ids = {};
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(env.E2E_MESSAGING_PASSWORD, 10);
    for (const [key, p] of Object.entries(PEOPLE)) {
      const { rows: [u] } = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_verified, is_seed, is_demo, provider)
         VALUES ($1, $2, $3, 'user', TRUE, FALSE, FALSE, 'local')
         ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, full_name=EXCLUDED.full_name,
           role='user', is_verified=TRUE, is_seed=FALSE, is_demo=FALSE, provider='local'
         RETURNING id`,
        [p.email, hash, p.name],
      );
      ids[key] = u.id;
      const { rows: [profile] } = await client.query('SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1', [u.id]);
      if (profile) await client.query('UPDATE user_profiles SET display_name=$2 WHERE id=$1', [profile.id, p.name]);
      else await client.query(`INSERT INTO user_profiles (user_id, display_name, profile_type) VALUES ($1, $2, 'personal')`, [u.id, p.name]);
      // Defaults every run: anyone can message, receipts and presence on.
      await client.query(
        `UPDATE user_profiles SET message_policy='everyone', read_receipts=TRUE, presence_visibility='everyone' WHERE user_id=$1`,
        [u.id],
      );
      await client.query(`INSERT INTO wallets (user_id, balance, currency) VALUES ($1, 0, 'ETB') ON CONFLICT (user_id) DO NOTHING`, [u.id]);
    }
    const all = Object.values(ids);

    // A clean slate: their chats (and so their messages), blocks, mutes and follows.
    await client.query(
      `DELETE FROM conversations WHERE id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = ANY($1::uuid[]))`,
      [all],
    );
    await client.query('DELETE FROM blocks WHERE blocker_id = ANY($1::uuid[]) OR blocked_id = ANY($1::uuid[])', [all]);
    await client.query('DELETE FROM user_mutes WHERE muter_id = ANY($1::uuid[]) OR muted_id = ANY($1::uuid[])', [all]);
    await client.query('DELETE FROM follows WHERE follower_id = ANY($1::uuid[]) OR followed_id = ANY($1::uuid[])', [all]);
    await client.query("DELETE FROM notifications WHERE user_id = ANY($1::uuid[]) AND type = 'message'", [all]);

    // The owner's business: paid, public, with a published site and one product.
    let { rows: [biz] } = await client.query('SELECT id FROM businesses WHERE owner_id=$1 AND business_name=$2 LIMIT 1', [ids.owner, BUSINESS]);
    if (!biz) {
      ({ rows: [biz] } = await client.query(
        `INSERT INTO businesses (owner_id, business_name, business_category, visibility) VALUES ($1, $2, 'shop', 'public') RETURNING id`,
        [ids.owner, BUSINESS],
      ));
    }
    await client.query("UPDATE businesses SET visibility='public' WHERE id=$1", [biz.id]);
    const { rows: subs } = await client.query("SELECT 1 FROM business_subscriptions WHERE business_id=$1 AND status='active' AND current_period_end > NOW()", [biz.id]);
    if (!subs.length) {
      await client.query(
        `INSERT INTO business_subscriptions (business_id, tier, status, current_period_start, current_period_end)
         VALUES ($1, 'premium', 'active', NOW(), NOW() + INTERVAL '365 days')`,
        [biz.id],
      );
    }
    const { rows: sites } = await client.query('SELECT 1 FROM showrooms WHERE business_id=$1', [biz.id]);
    if (!sites.length) {
      await client.query(
        `INSERT INTO showrooms (owner_id, business_id, title, category, sections, status, slug)
         VALUES ($1, $2, $3, 'Food & Beverage', '[{"type":"hero"}]', 'published', 'e2e-coffee-house')`,
        [ids.owner, biz.id, BUSINESS],
      );
    }
    let { rows: [product] } = await client.query('SELECT id FROM products WHERE seller_id=$1 AND title=$2 LIMIT 1', [ids.owner, PRODUCT]);
    if (!product) {
      ({ rows: [product] } = await client.query(
        `INSERT INTO products (seller_id, business_id, title, price, currency, stock, status, category)
         VALUES ($1, $2, $3, 650, 'ETB', 50, 'active', 'food') RETURNING id`,
        [ids.owner, biz.id, PRODUCT],
      ));
    }
    await client.query("UPDATE products SET status='active', business_id=$2, stock=50 WHERE id=$1", [product.id, biz.id]);
    await client.query('COMMIT');
    console.log(`Messaging E2E ready: ${Object.values(PEOPLE).map((p) => p.email).join(', ')}; business "${BUSINESS}", product ${product.id}.`);
    return { ...ids, businessId: biz.id, productId: product.id };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed().catch((error) => {
    console.error(`Messaging E2E seed refused or failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { seed, PEOPLE, BUSINESS, PRODUCT };
