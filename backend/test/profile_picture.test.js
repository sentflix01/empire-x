/**
 * Halehame — Profile Picture & Cover Upload E2E Tests
 *
 * Tests the full pipeline:
 *   1. POST /api/upload            — file upload to storage
 *   2. PUT  /api/profiles/:id      — save avatar_url / cover_url
 *   3. GET  /api/profiles/me       — confirm persistence
 *   4. GET  /api/profiles/by-user/:userId — public endpoint also returns updated image
 */

const BASE = process.env.API_URL || 'http://localhost:3001';

let pass = 0, fail = 0;
const results = [];

function ok(label, value) {
  const icon = value ? '  ✅' : '  ❌';
  results.push({ icon, label, value });
  if (value) pass++; else fail++;
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Halehame — Profile Picture & Cover Upload Tests   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const fetch = (await import('node-fetch')).default;
  const FormData = (await import('form-data')).default;

  // ── Auth ───────────────────────────────────────────────────────────────────
  console.log('── Step 1: Authenticate ──');
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@halehame.app', password: 'Admin1234!' }),
  });
  const loginBody = await loginRes.json();
  const token = loginBody.access_token;

  ok('Login status 200', loginRes.status === 200);
  ok('access_token present', !!token);
  if (!token) { printResults(); return; }

  const authH = { Authorization: `Bearer ${token}` };

  // ── Fetch current profile ──────────────────────────────────────────────────
  console.log('\n── Step 2: Fetch current profile ──');
  const meRes = await fetch(`${BASE}/api/profiles/me`, { headers: authH });
  const profile = await meRes.json();
  ok('GET /api/profiles/me → 200', meRes.status === 200);
  ok('profile.id exists', !!profile.id);
  const profileId = profile.id;
  const userId = profile.user_id;  // login body only has access_token; userId lives in profile
  const originalAvatar = profile.avatar_url || '';
  const originalCover  = profile.cover_url  || '';
  console.log(`  profile id   : ${profileId}`);
  console.log(`  user_id      : ${userId}`);
  console.log(`  avatar_url   : ${originalAvatar || '(empty)'}`);
  console.log(`  cover_url    : ${originalCover  || '(empty)'}`);

  // ── Test /api/upload endpoint ──────────────────────────────────────────────
  console.log('\n── Step 3: POST /api/upload (single file) ──');
  // Minimal 1×1 white PNG (68 bytes)
  const pngBuf = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const form = new FormData();
  form.append('file', pngBuf, { filename: 'avatar-test.png', contentType: 'image/png' });

  const upRes = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { ...form.getHeaders(), ...authH },
    body: form,
  });
  const upBody = await upRes.json();
  console.log(`  status : ${upRes.status}`);
  console.log(`  body   : ${JSON.stringify(upBody).slice(0, 120)}`);

  const uploadConfigured = upRes.status === 200;
  const uploadNotConfigured = upRes.status === 503;

  if (uploadConfigured) {
    ok('Upload → 200 (cloud storage active)', true);
    ok('Upload returns url', !!upBody.url);
  } else if (uploadNotConfigured) {
    ok('Upload → 503 (no cloud storage — expected in dev/local)', true);
    console.log('  ℹ️  Cloud storage not configured. Skipping real-upload steps.');
    console.log('     Set SUPABASE_* or R2_* env vars on Railway to enable file uploads.');
  } else {
    ok(`Upload → unexpected status ${upRes.status}`, false);
  }

  // ── Update avatar_url and cover_url directly ───────────────────────────────
  console.log('\n── Step 4: PUT avatar_url + cover_url ──');
  const testAvatar = 'https://example.com/test-avatar-123.jpg';
  const testCover  = 'https://example.com/test-cover-123.jpg';

  const putRes = await fetch(`${BASE}/api/profiles/${profileId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authH },
    body: JSON.stringify({ avatar_url: testAvatar, cover_url: testCover }),
  });
  const putBody = await putRes.json();
  console.log(`  status      : ${putRes.status}`);
  console.log(`  avatar_url  : ${putBody.avatar_url}`);
  console.log(`  cover_url   : ${putBody.cover_url}`);

  ok('PUT /api/profiles/:id → 200', putRes.status === 200);
  ok('Response contains avatar_url', putBody.avatar_url === testAvatar);
  ok('Response contains cover_url',  putBody.cover_url  === testCover);

  // ── Verify persistence via GET /me ─────────────────────────────────────────
  console.log('\n── Step 5: Verify GET /api/profiles/me reflects update ──');
  const verRes = await fetch(`${BASE}/api/profiles/me`, { headers: authH });
  const verified = await verRes.json();
  console.log(`  avatar_url : ${verified.avatar_url}`);
  console.log(`  cover_url  : ${verified.cover_url}`);

  ok('GET /me → avatar_url persisted', verified.avatar_url === testAvatar);
  ok('GET /me → cover_url persisted',  verified.cover_url  === testCover);

  // ── Verify public endpoint also returns updated images ─────────────────────
  console.log('\n── Step 6: Verify GET /api/profiles/by-user/:userId ──');
  const pubRes = await fetch(`${BASE}/api/profiles/by-user/${userId}`, { headers: authH });
  const pub = await pubRes.json();
  console.log(`  status     : ${pubRes.status}`);
  console.log(`  avatar_url : ${pub.avatar_url}`);
  console.log(`  cover_url  : ${pub.cover_url}`);

  ok('GET /by-user/:id → 200', pubRes.status === 200);
  ok('Public endpoint → avatar_url correct', pub.avatar_url === testAvatar);
  ok('Public endpoint → cover_url correct',  pub.cover_url  === testCover);

  // ── Test clearing images (set to empty string) ─────────────────────────────
  console.log('\n── Step 7: Clear avatar (set to empty) ──');
  const clearRes = await fetch(`${BASE}/api/profiles/${profileId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authH },
    body: JSON.stringify({ avatar_url: '' }),
  });
  const cleared = await clearRes.json();
  ok('Clear avatar_url → 200', clearRes.status === 200);
  ok('avatar_url cleared to null/empty', !cleared.avatar_url);

  // ── Test security: another user cannot update profile ─────────────────────
  console.log('\n── Step 8: Security — wrong user cannot update ──');
  const login2 = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@halehame.app', password: 'Test1234!' }),
  });
  const body2 = await login2.json();
  const token2 = body2.access_token;
  if (token2) {
    const hackRes = await fetch(`${BASE}/api/profiles/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
      body: JSON.stringify({ avatar_url: 'https://evil.com/hack.jpg' }),
    });
    console.log(`  Attempt by wrong user → ${hackRes.status}`);
    ok('Wrong user PUT → 403 Forbidden', hackRes.status === 403);
  } else {
    ok('Second login available for security test', false);
  }

  // ── Test multiple images via /api/upload/multiple ─────────────────────────
  console.log('\n── Step 9: POST /api/upload/multiple ──');
  const form2 = new FormData();
  form2.append('files', pngBuf, { filename: 'img1.png', contentType: 'image/png' });
  form2.append('files', pngBuf, { filename: 'img2.png', contentType: 'image/png' });
  const upMultiRes = await fetch(`${BASE}/api/upload/multiple`, {
    method: 'POST',
    headers: { ...form2.getHeaders(), ...authH },
    body: form2,
  });
  const upMultiBody = await upMultiRes.json();
  console.log(`  status : ${upMultiRes.status}`);
  if (upMultiRes.status === 200) {
    ok('Multiple upload → 200', true);
    ok('Returns files array', Array.isArray(upMultiBody.files) && upMultiBody.files.length === 2);
  } else if (upMultiRes.status === 503) {
    ok('Multiple upload → 503 (no cloud storage — expected in dev)', true);
  } else {
    ok(`Multiple upload → unexpected ${upMultiRes.status}`, false);
  }

  // ── Restore original values ────────────────────────────────────────────────
  console.log('\n── Cleanup: Restore original profile images ──');
  await fetch(`${BASE}/api/profiles/${profileId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authH },
    body: JSON.stringify({ avatar_url: originalAvatar, cover_url: originalCover }),
  });
  console.log('  Original values restored ✓');

  printResults();
}

function printResults() {
  console.log('\n');
  results.forEach(r => console.log(`${r.icon} ${r.label}`));
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  Results: ${pass}/${pass + fail} passed, ${fail} failed${' '.repeat(37 - String(pass + fail + fail).length)}║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
