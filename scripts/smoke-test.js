#!/usr/bin/env node
/**
 * scripts/smoke-test.js
 *
 * Post-deploy smoke test for Nodbusiness.
 * Verifies the backend is healthy and all critical services are connected.
 *
 * Usage:
 *   node scripts/smoke-test.js https://api.yourdomain.com
 *   node scripts/smoke-test.js https://api.yourdomain.com --verbose
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 */

'use strict';

const BACKEND_URL = process.argv[2];
const VERBOSE = process.argv.includes('--verbose');

if (!BACKEND_URL) {
  console.error('Usage: node scripts/smoke-test.js <backend-url>');
  console.error('Example: node scripts/smoke-test.js https://api.nodbusiness.app');
  process.exit(1);
}

const base = BACKEND_URL.replace(/\/$/, '');

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg)    { console.log(msg); }
function ok(msg)     { console.log(`  ✅ ${msg}`); }
function warn(msg)   { console.log(`  ⚠️  ${msg}`); }
function fail(msg)   { console.log(`  ❌ ${msg}`); }
function verbose(msg){ if (VERBOSE) console.log(`     ${msg}`); }

let passed = 0;
let warned = 0;
let failed = 0;

async function check(label, fn, { required = true } = {}) {
  try {
    const result = await fn();
    if (result.pass) {
      ok(`${label}${result.detail ? ` — ${result.detail}` : ''}`);
      passed++;
    } else {
      const msg = `${label}${result.detail ? ` — ${result.detail}` : ''}`;
      if (required) { fail(msg); failed++; }
      else          { warn(msg); warned++; }
    }
  } catch (err) {
    const msg = `${label} — ${err.message}`;
    if (required) { fail(msg); failed++; }
    else          { warn(msg); warned++; }
  }
}

async function fetchJSON(path, opts = {}) {
  const url = `${base}${path}`;
  verbose(`GET ${url}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000), ...opts });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, ok: res.ok, json, text };
}

// ── Checks ────────────────────────────────────────────────────────────────────

async function checkHealth() {
  const { status, json } = await fetchJSON('/health');
  if (status !== 200) return { pass: false, detail: `HTTP ${status}` };
  if (!json)          return { pass: false, detail: 'Response is not JSON' };
  verbose(JSON.stringify(json, null, 2));
  return { pass: json.status === 'ok', detail: `status=${json.status}` };
}

async function checkDatabase() {
  const { json } = await fetchJSON('/health');
  if (!json?.services) return { pass: false, detail: 'No services object in /health response' };
  const db = json.services.database;
  return { pass: db === 'connected', detail: `database=${db}` };
}

async function checkRedis() {
  const { json } = await fetchJSON('/health');
  if (!json?.services) return { pass: false, detail: 'No services object' };
  const redis = json.services.redis;
  // Redis is optional — warn if not connected but don't fail
  return { pass: redis === 'connected', detail: `redis=${redis}` };
}

async function checkStorage() {
  const { json } = await fetchJSON('/health');
  if (!json?.services) return { pass: false, detail: 'No services object' };
  const storage = json.services.storage;
  // Must be r2 or supabase in production — local disk is a warning
  const pass = storage === 'r2' || storage === 'supabase';
  return { pass, detail: `storage=${storage}` };
}

async function checkEmail() {
  const { json } = await fetchJSON('/health');
  if (!json?.services) return { pass: false, detail: 'No services object' };
  const email = json.services.email;
  const pass = email === 'resend' || email === 'smtp';
  return { pass, detail: `email=${email}` };
}

async function checkVersion() {
  const { json } = await fetchJSON('/health');
  if (!json?.version) return { pass: false, detail: 'No version in response' };
  return { pass: true, detail: `version=${json.version}` };
}

async function checkCORS() {
  // A preflight from a typical browser origin should not be blocked
  const url = `${base}/health`;
  verbose(`OPTIONS ${url}`);
  const res = await fetch(url, {
    method: 'OPTIONS',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'Origin': base.replace('api.', ''),
      'Access-Control-Request-Method': 'GET',
    },
  });
  // 200 or 204 is fine — 403 means CORS is blocking
  return {
    pass: res.status !== 403,
    detail: `preflight returned HTTP ${res.status}`,
  };
}

async function checkPublicProductsEndpoint() {
  const { status } = await fetchJSON('/api/products?limit=1');
  return { pass: status === 200, detail: `GET /api/products → HTTP ${status}` };
}

async function checkAuthEndpointExists() {
  // POST with empty body — should return 400/422 (validation), not 404/500
  const { status } = await fetchJSON('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return {
    pass: status === 400 || status === 422 || status === 401,
    detail: `POST /api/auth/login with empty body → HTTP ${status} (expected 400/422)`,
  };
}

async function checkNotFoundHandler() {
  const { status } = await fetchJSON('/api/this-route-does-not-exist-xyz');
  return { pass: status === 404, detail: `unknown route → HTTP ${status}` };
}

async function checkSSL() {
  if (!base.startsWith('https://')) {
    return { pass: false, detail: 'Backend URL does not use HTTPS' };
  }
  return { pass: true, detail: 'HTTPS confirmed' };
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function main() {
  log('');
  log(`🔍 Nodbusiness Smoke Test`);
  log(`   Target: ${base}`);
  log(`   Time:   ${new Date().toISOString()}`);
  log('');

  log('── Core health ──────────────────────────────');
  await check('HTTPS', checkSSL);
  await check('Health endpoint responds 200', checkHealth);
  await check('Version present', checkVersion);

  log('');
  log('── Services ─────────────────────────────────');
  await check('Database connected', checkDatabase);
  await check('Redis connected', checkRedis, { required: false });
  await check('File storage is R2 or Supabase (not local disk)', checkStorage);
  await check('Email configured (Resend or SMTP)', checkEmail, { required: false });

  log('');
  log('── API surface ──────────────────────────────');
  await check('CORS preflight passes', checkCORS);
  await check('Public products endpoint works', checkPublicProductsEndpoint);
  await check('Auth login endpoint exists', checkAuthEndpointExists);
  await check('404 handler returns 404', checkNotFoundHandler);

  log('');
  log('── Summary ──────────────────────────────────');
  log(`   ✅ Passed:  ${passed}`);
  if (warned > 0) log(`   ⚠️  Warnings: ${warned}`);
  if (failed > 0) log(`   ❌ Failed:  ${failed}`);
  log('');

  if (failed > 0) {
    log('❌ Smoke test FAILED — fix the issues above before going live.');
    process.exit(1);
  } else if (warned > 0) {
    log('⚠️  Smoke test passed with warnings. Review warnings before launch.');
    process.exit(0);
  } else {
    log('✅ All checks passed — backend is healthy and ready.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Unexpected error running smoke test:', err.message);
  process.exit(1);
});
