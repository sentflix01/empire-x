#!/usr/bin/env node
/**
 * Re-audit 2026-11-11 — access and edge-input checks on the endpoints added
 * since the 2026-11-05 audit, plus malformed-input checks. LOCAL ONLY.
 * Account A (seed e2e user), account B (same role), guest.
 *
 *   source ~/.nodbusiness-local/env.sh
 *   node note/2026-11-05-international-audit/scripts/reaudit-new-endpoints.mjs
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

const B_EMAIL = 'e2e-user-b@example.test';
const B_PASSWORD = randomBytes(12).toString('hex');
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query(
  `INSERT INTO users (email, password_hash, full_name, is_verified) VALUES ($1,$2,'E2E User B',TRUE)
   ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, is_verified=TRUE`,
  [B_EMAIL, await bcrypt.hash(B_PASSWORD, 10)]);

async function call(method, path, token, body, extraHeaders = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3002', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  let data; try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}
const login = async (email, password) => (await call('POST', '/api/auth/login', null, { email, password })).data?.access_token;

const A = await login(process.env.E2E_TEST_EMAIL, process.env.E2E_TEST_PASSWORD);
const B = await login(B_EMAIL, B_PASSWORD);
if (!A || !B) throw new Error('login failed');

const results = [];
const check = (name, r, ok, note) => results.push({ check: name, status: r.status, pass: ok.includes(r.status), note: note ?? r.data?.error ?? null });

// Fixtures: A owns a business and a product; B saves the product.
const biz = await call('POST', '/api/businesses', A, { business_name: `Reaudit Shop ${Date.now()}`, business_category: 'retail' });
const bizId = biz.data?.id ?? biz.data?.business?.id;
const prod = await call('POST', '/api/products', A, { title: 'Reaudit product', price: 10, stock: 3, business_id: bizId });
const prodId = prod.data?.id ?? prod.data?.product?.id;
await call('POST', '/api/saves/toggle', B, { target_id: prodId, target_type: 'product' });

// Saves for sellers (new 2026-11-09)
check('Guest reads my-products saves', await call('GET', '/api/saves/my-products'), [401]);
const mine = await call('GET', '/api/saves/my-products', A);
results.push({ check: 'A sees the save on own product, without saver identity', status: mine.status,
  pass: mine.status === 200 && Array.isArray(mine.data) && mine.data.some((s) => s.target_id === prodId) && mine.data.every((s) => !('user_id' in s)) });
const bView = await call('GET', `/api/saves/my-products?business_id=${bizId}`, B);
results.push({ check: "B asks for A's business saves", status: bView.status, pass: bView.status !== 200 || (Array.isArray(bView.data) && bView.data.length === 0) });
check('my-products with malformed business_id', await call('GET', '/api/saves/my-products?business_id=not-a-uuid', A), [400, 200]);
check('Save toggle with malformed target_id', await call('POST', '/api/saves/toggle', B, { target_id: 'not-a-uuid', target_type: 'product' }), [400, 404]);
const twice = await Promise.all([1, 2].map(() => call('POST', '/api/saves/toggle', B, { target_id: '00000000-0000-4000-8000-0000000000ee', target_type: 'product' })));
results.push({ check: 'Two simultaneous save toggles', status: twice.map((r) => r.status).join(','), pass: twice.every((r) => r.status < 500) });

// Verification documents and private files (F-013 fix)
check('Guest reads verification documents', await call('GET', '/api/verification/00000000-0000-4000-8000-000000000001/documents'), [401]);
check("B reads someone else's verification documents", await call('GET', '/api/verification/00000000-0000-4000-8000-000000000001/documents', B), [404]);
check('Private file without signature', await call('GET', '/api/private-files/verification/x.jpg'), [404]);
check('Private file path traversal', await call('GET', '/api/private-files/..%2f..%2f..%2fetc%2fpasswd?expires=9999999999&signature=x'), [400, 404]);

// MFA (new)
check('Guest reads MFA status', await call('GET', '/api/auth/mfa/status'), [401]);
check('B disables MFA without a code', await call('POST', '/api/auth/mfa/disable', B, {}), [400, 401, 403, 409, 503]);
check('B verifies MFA with garbage', await call('POST', '/api/auth/mfa/verify', null, { code: "' OR 1=1 --" }), [400, 401, 503]);

// Admin-only DevOps routes (new)
check('B reads devops error stats', await call('GET', '/api/devops/errors/stats', B), [403]);
check('B resolves all devops errors', await call('PATCH', '/api/devops/errors/resolve-all', B, {}), [403]);
check('B edits a devops version', await call('PUT', '/api/devops/versions/1.0.0', B, { notes: 'x' }), [403]);

// Name change (new): edge inputs
check('Name change: empty', await call('PUT', '/api/auth/update-name', B, { full_name: '   ' }), [400]);
check('Name change: 5,000 characters', await call('PUT', '/api/auth/update-name', B, { full_name: 'x'.repeat(5000) }), [400, 413]);
const html = await call('PUT', '/api/auth/update-name', B, { full_name: '<img src=x onerror=alert(1)>' });
results.push({ check: 'Name change: HTML stored as text (rendered escaped by React)', status: html.status, pass: html.status < 500, note: html.data?.user?.full_name ?? html.data?.full_name ?? null });
await call('PUT', '/api/auth/update-name', B, { full_name: 'E2E User B' });

// Uploads and AI (new)
check('Guest multi-upload', await call('POST', '/api/upload/multiple'), [401]);
check('Guest AI product description', await call('POST', '/api/ai/generate-description', null, { title: 'x' }), [401]);

// Product edge inputs
check('Product: negative price', await call('POST', '/api/products', A, { title: 'neg', price: -5, stock: 1, business_id: bizId }), [400]);
check('Product: price 1e20', await call('POST', '/api/products', A, { title: 'huge', price: 1e20, stock: 1, business_id: bizId }), [400]);
check('Product: price "abc"', await call('POST', '/api/products', A, { title: 'nan', price: 'abc', stock: 1, business_id: bizId }), [400]);
check('Product: stock -1', await call('POST', '/api/products', A, { title: 'negstock', price: 1, stock: -1, business_id: bizId }), [400]);
check('Product: whitespace title', await call('POST', '/api/products', A, { title: '   ', price: 1, stock: 1, business_id: bizId }), [400]);
const emoji = await call('POST', '/api/products', A, { title: 'ቡና ☕ قهوة 咖啡', price: 1.5, stock: 1, business_id: bizId });
results.push({ check: 'Product: Amharic, emoji, Arabic, CJK title round-trips', status: emoji.status, pass: (emoji.data?.title ?? emoji.data?.product?.title) === 'ቡና ☕ قهوة 咖啡' });

// Malformed requests
check('Malformed JSON body', await call('POST', '/api/products', A, '{"title": '), [400]);
check('Malformed UUID in path', await call('GET', '/api/products/not-a-uuid', A), [400, 404]);
check('1 MB+ JSON body', await call('POST', '/api/products', A, { title: 'x'.repeat(2_000_000), price: 1 }), [400, 413]);
check('Unknown API route', await call('GET', '/api/does-not-exist', A), [404]);

await db.end();
console.log(JSON.stringify({ ran_at: new Date().toISOString(), api: API, results }, null, 2));
process.exit(results.some((r) => r.pass === false) ? 1 : 0);
