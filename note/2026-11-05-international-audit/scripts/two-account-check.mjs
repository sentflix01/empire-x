#!/usr/bin/env node
/**
 * Two-account object-level authorization check (OWASP API1:2023) — LOCAL ONLY.
 * Account A creates resources; account B (same role) tries to read/change them.
 *
 *   source ~/.nodbusiness-local/env.sh
 *   node note/2026-11-05-international-audit/scripts/two-account-check.mjs
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

async function ensureUserB() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const hash = await bcrypt.hash(B_PASSWORD, 10);
  await db.query(
    `INSERT INTO users (email, password_hash, full_name, is_verified) VALUES ($1,$2,'E2E User B',TRUE)
     ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, is_verified=TRUE`, [B_EMAIL, hash]);
  await db.end();
}

async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3002', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data; try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

async function login(email, password) {
  const r = await call('POST', '/api/auth/login', null, { email, password });
  if (!r.data?.access_token) throw new Error(`login failed for ${email}: ${r.status}`);
  return r.data.access_token;
}

await ensureUserB();
const A = await login(process.env.E2E_TEST_EMAIL, process.env.E2E_TEST_PASSWORD);
const B = await login(B_EMAIL, B_PASSWORD);

const results = [];
const record = (name, r, okStatuses) => results.push({ check: name, status: r.status, pass: okStatuses.includes(r.status), error: r.data?.error ?? null });

const biz = await call('POST', '/api/businesses', A, { business_name: 'Audit Shop A', business_category: 'retail' });
const bizId = biz.data?.id ?? biz.data?.business?.id;
results.push({ setup: 'A creates business', status: biz.status, id: bizId ?? null, error: biz.data?.error ?? biz.data?.message ?? null });
const prod = await call('POST', '/api/products', A, { title: 'Audit product A', price: 10, stock: 1, ...(bizId ? { business_id: bizId } : {}) });
const prodId = prod.data?.id ?? prod.data?.product?.id;
results.push({ setup: 'A creates product', status: prod.status, id: prodId ?? null, error: prod.data?.error ?? prod.data?.message ?? null });

if (bizId) {
  record('B updates A business', await call('PUT', `/api/businesses/${bizId}`, B, { business_name: 'Taken over' }), [403, 404]);
  record('B lists A payment accounts', await call('GET', `/api/businesses/${bizId}/payment-accounts`, B), [403, 404]);
  record('B adds payment account to A business', await call('POST', `/api/businesses/${bizId}/payment-accounts`, B, { method: 'bank', provider_name: 'X', account_name: 'X', account_number: '1' }), [403, 404]);
  record('Guest lists A payment accounts', await call('GET', `/api/businesses/${bizId}/payment-accounts`, null), [401]);
}
if (prodId) {
  record('B updates A product', await call('PUT', `/api/products/${prodId}`, B, { title: 'Taken over' }), [403, 404]);
  record('B deletes A product', await call('DELETE', `/api/products/${prodId}`, B), [403, 404]);
  const after = await call('GET', `/api/products/${prodId}`, A);
  results.push({ check: 'A product unchanged after B attempts', status: after.status, pass: after.data?.title === 'Audit product A' || after.data?.product?.title === 'Audit product A' });
}
record('B reads admin users', await call('GET', '/api/admin/users', B), [403]);
record('B reads devops errors', await call('GET', '/api/devops/errors', B), [403]);

console.log(JSON.stringify({ ran_at: new Date().toISOString(), api: API, results }, null, 2));
process.exit(results.some((r) => r.pass === false) ? 1 : 0);
