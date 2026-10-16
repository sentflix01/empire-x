'use strict';

/** Seed helpers for database-backed tests. Every row is tagged so tests clean up after themselves. */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../../db/poolJsShim.cjs');

const tag = () => crypto.randomBytes(4).toString('hex');

async function createUser({ demo = false } = {}) {
  const t = tag();
  const { rows: [user] } = await pool.query(
    `INSERT INTO users (email, full_name, provider, is_verified, is_demo) VALUES ($1, 'DB Test', 'local', TRUE, $2) RETURNING id, email`,
    [`dbtest-${t}@example.test`, demo],
  );
  await pool.query(`INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'DB Test')`, [user.id]);
  return user;
}

/** A paid public business with a published site and an active product. */
async function createPublicBusiness(ownerId, { visibility = 'public' } = {}) {
  const t = tag();
  const { rows: [biz] } = await pool.query(
    `INSERT INTO businesses (owner_id, business_name, business_category, visibility) VALUES ($1, $2, 'shop', $3) RETURNING id`,
    [ownerId, `DB Test Shop ${t}`, visibility],
  );
  await pool.query(
    `INSERT INTO business_subscriptions (business_id, tier, status, current_period_start, current_period_end)
     VALUES ($1, 'premium', 'active', NOW(), NOW() + INTERVAL '30 days')`,
    [biz.id],
  );
  const { rows: [site] } = await pool.query(
    `INSERT INTO showrooms (owner_id, business_id, title, category, sections, status, slug)
     VALUES ($1, $2, $3, 'Business & Commerce', '[{"type":"hero"}]', 'published', $4) RETURNING id, slug`,
    [ownerId, biz.id, `DB Test Site ${t}`, `db-test-site-${t}`],
  );
  const { rows: [product] } = await pool.query(
    `INSERT INTO products (seller_id, business_id, title, price, currency, stock, status, category)
     VALUES ($1, $2, $3, 250, 'ETB', 10, 'active', 'food') RETURNING id`,
    [ownerId, biz.id, `DB Test Coffee ${t}`],
  );
  return { businessId: biz.id, siteId: site.id, slug: site.slug, productId: product.id };
}

function accessToken(userId) {
  return jwt.sign({ sub: userId, type: 'access', demo: false }, process.env.JWT_SECRET, { expiresIn: '10m', jwtid: crypto.randomUUID() });
}

async function deleteUser(userId) {
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}

module.exports = { pool, createUser, createPublicBusiness, accessToken, deleteUser, tag };
