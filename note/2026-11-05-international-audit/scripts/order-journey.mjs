#!/usr/bin/env node
/**
 * Wave 3 — direct-order journey and abuse checks, LOCAL ONLY.
 * Seller A (with an active plan and a payment account), member buyer B,
 * unrelated user C, and a guest.
 *
 *   source ~/.nodbusiness-local/env.sh
 *   node note/2026-11-05-international-audit/scripts/order-journey.mjs
 *
 * Fixture note: the subscription row is written directly to the local DB,
 * because paying for a plan needs the payment provider. Everything else goes
 * through the public API exactly as the app calls it.
 */
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'http://127.0.0.1:3001';
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(process.env.DATABASE_URL ?? '')) throw new Error('Local database only');
const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '../../../backend/package.json'));
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

async function ensureUser(email, name) {
  const password = randomBytes(12).toString('hex');
  await db.query(`INSERT INTO users (email, password_hash, full_name, is_verified) VALUES ($1,$2,$3,TRUE)
    ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, is_verified=TRUE`, [email, await bcrypt.hash(password, 10), name]);
  return password;
}
async function call(method, path, token, body) {
  const res = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3002', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}
const login = async (email, password) => (await call('POST', '/api/auth/login', null, { email, password })).data?.access_token;

const results = [];
const check = (name, ok, detail) => results.push({ check: name, pass: Boolean(ok), ...detail });

const A = await login(process.env.E2E_TEST_EMAIL, process.env.E2E_TEST_PASSWORD);
const B = await login('e2e-buyer-b@example.test', await ensureUser('e2e-buyer-b@example.test', 'Buyer B'));
const C = await login('e2e-other-c@example.test', await ensureUser('e2e-other-c@example.test', 'Other C'));

// ── Seller setup ────────────────────────────────────────────────────────────
const biz = (await call('POST', '/api/businesses', A, { business_name: 'ሱቅ Audit Shop 🛍️', business_category: 'retail' })).data;
await db.query(`INSERT INTO business_subscriptions (business_id, tier, status, current_period_end)
  VALUES ($1,'normal','active',NOW()+INTERVAL '30 days')
  ON CONFLICT (business_id) DO UPDATE SET tier='normal', status='active', current_period_end=NOW()+INTERVAL '30 days'`, [biz.id]);
const acct = await call('POST', `/api/businesses/${biz.id}/payment-accounts`, A, { method: 'mobile_money', provider_name: 'Test wallet', account_name: 'Audit Seller', account_number: '0000000000' });
const prod = (await call('POST', '/api/products', A, { title: 'ቡና Coffee ☕ test', price: 100, stock: 2, status: 'active', business_id: biz.id })).data;
check('setup: business, plan fixture, payment account, product', biz?.id && acct.status === 201 && prod?.id, { account_status: acct.status });
check('Unicode (Amharic + emoji) round-trips in business and product names',
  biz?.business_name === 'ሱቅ Audit Shop 🛍️' && prod?.title === 'ቡና Coffee ☕ test', { business_name: biz?.business_name, title: prod?.title });
check('guest can now view the product (paid public business)', (await call('GET', `/api/products/${prod.id}`)).status === 200, {});

// ── Input validation and tampering ─────────────────────────────────────────
const buyer = { buyer_name: 'አበበ Buyer', buyer_phone: '+251911000000', buyer_email: 'guest-buyer@example.test' };
for (const q of [0, -1, 1.5, 3, 10001, '1; DROP TABLE orders']) {
  const r = await call('POST', '/api/direct-orders', B, { product_id: prod.id, quantity: q, ...buyer });
  check(`quantity ${JSON.stringify(q)} rejected`, r.status === 422 || r.status === 400, { status: r.status, error: r.data?.error });
}
const bad = await call('POST', '/api/direct-orders', B, { product_id: prod.id, quantity: 1, ...buyer, buyer_phone: 'abc' });
check('invalid phone rejected', bad.status === 422, { status: bad.status });

// ── Member order with a tampered price ─────────────────────────────────────
const o1 = await call('POST', '/api/direct-orders', B, { product_id: prod.id, quantity: 1, ...buyer, unit_price: 1, total_price: 1, price: 1 });
const order1 = o1.data?.order ?? o1.data;
check('member order created; client-sent price ignored', o1.status === 201 && Number(order1?.total_price) === 100, { status: o1.status, total_price: order1?.total_price, order_status: order1?.status });
const stockAfter1 = (await db.query('SELECT stock FROM products WHERE id=$1', [prod.id])).rows[0]?.stock;
check('stock reserved at order time (2 → 1)', Number(stockAfter1) === 1, { stock: stockAfter1 });

// ── Cross-account access on the order ──────────────────────────────────────
const id1 = order1?.id;
check('unrelated user C cannot read the receipt', [403, 404].includes((await call('GET', `/api/direct-orders/${id1}/receipt`, C)).status), {});
check('unrelated user C cannot confirm payment', [403, 404].includes((await call('POST', `/api/direct-orders/${id1}/confirm-payment`, C)).status), {});
check('buyer B cannot confirm their own payment', [403, 404].includes((await call('POST', `/api/direct-orders/${id1}/confirm-payment`, B)).status), {});
check('guest cannot confirm payment', (await call('POST', `/api/direct-orders/${id1}/confirm-payment`, null)).status === 401, {});
const rep = await call('POST', `/api/direct-orders/${id1}/report-payment`, B, {});
check('buyer reports payment', rep.status === 200, { status: rep.status, order_status: rep.data?.order?.status, error: rep.data?.error });
const conf = await call('POST', `/api/direct-orders/${id1}/confirm-payment`, A);
check('seller confirms payment → paid', conf.status === 200 && conf.data?.order?.status === 'paid', { status: conf.status, order_status: conf.data?.order?.status });
const conf2 = await call('POST', `/api/direct-orders/${id1}/confirm-payment`, A);
check('second confirmation is refused (idempotent state machine)', conf2.status === 409, { status: conf2.status });

// ── Race for the last unit ─────────────────────────────────────────────────
const race = await Promise.all([B, C].map((t, i) => call('POST', '/api/direct-orders', t, { product_id: prod.id, quantity: 1, ...buyer, buyer_email: `race${i}@example.test` })));
const created = race.filter((r) => r.status === 201).length;
const stockAfterRace = (await db.query('SELECT stock FROM products WHERE id=$1', [prod.id])).rows[0]?.stock;
check('two concurrent orders for the last unit: exactly one succeeds, stock never negative', created === 1 && Number(stockAfterRace) === 0, { statuses: race.map((r) => r.status), stock: stockAfterRace });

// ── Guest order via private link ───────────────────────────────────────────
await db.query("UPDATE products SET stock=5, status='active' WHERE id=$1", [prod.id]); // the race sold the last unit, which marks it sold_out
const g = await call('POST', '/api/direct-orders', null, { product_id: prod.id, quantity: 1, ...buyer });
const link = g.data?.order_url ?? '';
const token = g.data?.access_token ?? String(link).split('/order/')[1];
check('guest order created with a private link', g.status === 201 && token, { status: g.status, has_token: Boolean(token), token_length: token ? token.length : 0 });
if (token) {
  check('guest link opens the order', (await call('GET', `/api/direct-orders/link/${token}`)).status === 200, {});
  check('altered guest token is rejected', (await call('GET', `/api/direct-orders/link/${token.slice(0, -2)}xx`)).status === 404, {});
  const view = (await call('GET', `/api/direct-orders/link/${token}`)).data;
  check('guest view does not expose seller internals or token hash', !JSON.stringify(view ?? {}).includes('access_token_hash'), {});
}

await db.end();
console.log(JSON.stringify({ ran_at: new Date().toISOString(), api: API, results }, null, 2));
process.exit(results.some((r) => !r.pass) ? 1 : 0);
