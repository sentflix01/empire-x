/**
 * e2e.test.js — Empire X End-to-End API Test Suite
 * Tests frontend-next ↔ backend connectivity and all key endpoints.
 * Run: node test/e2e.test.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const https = require('https');

const BASE = 'http://localhost:3001';
let passed = 0;
let failed = 0;
const failures = [];

// ── Minimal HTTP client ───────────────────────────────────────────────────────
function request(method, path, { body, token, origin } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (origin) headers['Origin'] = origin;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: raw, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Assertion helpers ─────────────────────────────────────────────────────────
function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
    failures.push(`${label}${detail ? ': ' + detail : ''}`);
  }
}

function section(name) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${name}`);
  console.log('─'.repeat(60));
}

// ── Unique test email ─────────────────────────────────────────────────────────
const RUN_ID = Date.now();
const TEST_EMAIL = `e2e_${RUN_ID}@empirex.test`;
const TEST_PASS  = 'TestPass123!';
let TOKEN = null;
let USER_ID = null;
let PROFILE_ID = null;
let POST_ID = null;
let PRODUCT_ID = null;
let NOTIF_ID = null;

// ── Pull OTP from backend stdout via DB query ─────────────────────────────────
const pool = require('../db/pool');

async function getOtpFromDb(email) {
  const { rows } = await pool.query(
    'SELECT otp_code FROM users WHERE email = $1', [email.toLowerCase()]
  );
  return rows[0]?.otp_code || null;
}

async function run() {
  // ── 1. HEALTH & CORS ───────────────────────────────────────────────────────
  section('1. Health & CORS');

  const health = await request('GET', '/health');
  assert('GET /health returns 200', health.status === 200);
  assert('Database connected', health.body?.services?.database === 'connected');

  const corsNext = await request('GET', '/health', { origin: 'http://localhost:3000' });
  assert('CORS: Next.js origin (3000) accepted',
    corsNext.headers['access-control-allow-origin'] === 'http://localhost:3000',
    `got: ${corsNext.headers['access-control-allow-origin']}`);

  const corsOldVite = await request('GET', '/health', { origin: 'http://localhost:5173' });
  assert('CORS: old Vite origin (5173) blocked',
    corsOldVite.headers['access-control-allow-origin'] !== 'http://localhost:5173',
    `got: ${corsOldVite.headers['access-control-allow-origin']}`);

  const corsOther = await request('GET', '/health', { origin: 'http://evil.com' });
  assert('CORS: unknown origin blocked',
    corsOther.headers['access-control-allow-origin'] !== 'http://evil.com',
    `got: ${corsOther.headers['access-control-allow-origin']}`);

  // ── 2. AUTH FLOW ───────────────────────────────────────────────────────────
  section('2. Auth — Register → OTP → Login');

  const reg = await request('POST', '/api/auth/register',
    { body: { email: TEST_EMAIL, password: TEST_PASS, full_name: 'E2E Tester' } });
  assert('POST /api/auth/register returns 201', reg.status === 201,
    JSON.stringify(reg.body));
  USER_ID = reg.body?.userId;
  assert('Register returns userId', !!USER_ID);

  // Fetch OTP directly from DB (dev shortcut)
  await new Promise(r => setTimeout(r, 300));
  const otp = await getOtpFromDb(TEST_EMAIL);
  assert('OTP stored in DB', !!otp, otp);

  const verify = await request('POST', '/api/auth/verify-otp',
    { body: { email: TEST_EMAIL, otpCode: otp } });
  assert('POST /api/auth/verify-otp returns 200', verify.status === 200,
    JSON.stringify(verify.body));
  TOKEN = verify.body?.access_token;
  assert('Verify OTP returns access_token', !!TOKEN);

  const me = await request('GET', '/api/auth/me', { token: TOKEN });
  assert('GET /api/auth/me returns 200', me.status === 200, JSON.stringify(me.body));
  assert('auth/me returns correct email', me.body?.email === TEST_EMAIL);
  USER_ID = me.body?.id || USER_ID;

  const meUnauth = await request('GET', '/api/auth/me');
  assert('GET /api/auth/me without token returns 401', meUnauth.status === 401);

  // ── 3. PROFILES ────────────────────────────────────────────────────────────
  section('3. Profiles');

  const upsert = await request('PUT', '/api/profiles/me/upsert',
    { token: TOKEN, body: { display_name: 'E2E Tester', bio: 'Auto E2E test' } });
  assert('PUT /api/profiles/me/upsert returns 200', upsert.status === 200,
    JSON.stringify(upsert.body));
  PROFILE_ID = upsert.body?.id;
  assert('Upsert returns profile with id', !!PROFILE_ID);
  assert('Upsert returns correct display_name', upsert.body?.display_name === 'E2E Tester');

  // Second upsert should update, not duplicate
  const upsert2 = await request('PUT', '/api/profiles/me/upsert',
    { token: TOKEN, body: { display_name: 'E2E Tester Updated' } });
  assert('Second upsert updates (200)', upsert2.status === 200);
  assert('Second upsert returns same profile id', upsert2.body?.id === PROFILE_ID);

  const profileGet = await request('GET', `/api/profiles/${PROFILE_ID}`);
  assert('GET /api/profiles/:id returns 200', profileGet.status === 200);

  // Only one PUT /me/upsert handler (bug 1.3 check)
  const profilesRouter = require('../routes/profiles');
  const upsertCount = profilesRouter.stack
    .filter(l => l.route?.path === '/me/upsert' && l.route?.methods?.put)
    .length;
  assert('Only 1 PUT /me/upsert handler registered (bug 1.3)', upsertCount === 1,
    `found ${upsertCount}`);

  // ── 4. POSTS & FEED ────────────────────────────────────────────────────────
  section('4. Posts & Smart Feed');

  const createPost = await request('POST', '/api/posts',
    { token: TOKEN, body: { content: 'E2E test post ' + RUN_ID } });
  assert('POST /api/posts returns 201', createPost.status === 201,
    JSON.stringify(createPost.body));
  POST_ID = createPost.body?.id;
  assert('Create post returns id', !!POST_ID);

  const getPost = await request('GET', `/api/posts/${POST_ID}`, { token: TOKEN });
  assert('GET /api/posts/:id returns 200', getPost.status === 200);
  assert('Post content matches', getPost.body?.content?.includes('E2E test post'));

  const feedResp = await request('GET', '/api/posts?feed=true', { token: TOKEN });
  assert('GET /api/posts?feed=true returns 200', feedResp.status === 200,
    JSON.stringify(feedResp.body)?.slice(0, 100));
  assert('Feed returns array', Array.isArray(feedResp.body));

  // If multiple posts, verify feed_rank ordering
  if (Array.isArray(feedResp.body) && feedResp.body.length > 1) {
    const ranks = feedResp.body.map(p => p.feed_rank).filter(r => r != null);
    let sorted = true;
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] < ranks[i - 1]) { sorted = false; break; }
    }
    assert('Feed posts ordered by feed_rank ASC', sorted,
      `ranks: ${ranks.slice(0, 5).join(',')}`);
  }

  const noFeedResp = await request('GET', '/api/posts?sort=-created_at', { token: TOKEN });
  assert('GET /api/posts (no feed) returns 200', noFeedResp.status === 200);

  const likeResp = await request('POST', `/api/posts/${POST_ID}/like`, { token: TOKEN });
  assert('POST /api/posts/:id/like returns 200', likeResp.status === 200);

  const commentsResp = await request('POST', `/api/posts/${POST_ID}/comments`,
    { token: TOKEN, body: { content: 'E2E comment' } });
  assert('POST /api/posts/:id/comments returns 201', commentsResp.status === 201);

  // ── 5. PRODUCTS ────────────────────────────────────────────────────────────
  section('5. Products');

  const createProduct = await request('POST', '/api/products',
    { token: TOKEN, body: { title: 'E2E Product', price: 99.99, stock: 10 } });
  assert('POST /api/products returns 201', createProduct.status === 201,
    JSON.stringify(createProduct.body));
  PRODUCT_ID = createProduct.body?.id;
  assert('Create product returns id', !!PRODUCT_ID);

  const getProduct = await request('GET', `/api/products/${PRODUCT_ID}`);
  assert('GET /api/products/:id returns 200', getProduct.status === 200);

  const updateProduct = await request('PUT', `/api/products/${PRODUCT_ID}`,
    { token: TOKEN, body: { price: 79.99, stock: 8 } });
  assert('PUT /api/products/:id returns 200', updateProduct.status === 200);
  assert('PUT /api/products/:id returns updated price', updateProduct.body?.price == 79.99);

  // Bug 1.4: null check — update a nonexistent product id
  const fakeId = '00000000-0000-0000-0000-000000000001';
  const nullCheck = await request('PUT', `/api/products/${fakeId}`,
    { token: TOKEN, body: { price: 50 } });
  assert('PUT /api/products with nonexistent id returns 404 (bug 1.4)',
    nullCheck.status === 404, `got ${nullCheck.status}: ${JSON.stringify(nullCheck.body)}`);

  // ── 6. REVIEWS ─────────────────────────────────────────────────────────────
  section('6. Reviews');

  const createReview = await request('POST', '/api/reviews',
    { token: TOKEN, body: { product_id: PRODUCT_ID, rating: 5, comment: 'Great E2E product' } });
  assert('POST /api/reviews returns 201', createReview.status === 201,
    JSON.stringify(createReview.body));
  const REVIEW_ID = createReview.body?.id;

  // Bug 1.5: GET / route must exist
  const listReviews = await request('GET', '/api/reviews');
  assert('GET /api/reviews returns 200 (bug 1.5)', listReviews.status === 200,
    `got ${listReviews.status}: ${JSON.stringify(listReviews.body)}`);
  assert('GET /api/reviews returns array', Array.isArray(listReviews.body));

  const reviewsByProduct = await request('GET', `/api/reviews?product_id=${PRODUCT_ID}`);
  assert('GET /api/reviews?product_id=... returns 200', reviewsByProduct.status === 200);
  assert('Reviews include display_name join', reviewsByProduct.body?.[0]?.hasOwnProperty('display_name') !== false);

  const productReviews = await request('GET', `/api/reviews/product/${PRODUCT_ID}`);
  assert('GET /api/reviews/product/:id still works (preservation)', productReviews.status === 200);

  // ── 7. NOTIFICATIONS ───────────────────────────────────────────────────────
  section('7. Notifications');

  const listNotifs = await request('GET', '/api/notifications', { token: TOKEN });
  assert('GET /api/notifications returns 200', listNotifs.status === 200);
  assert('Notifications returns array', Array.isArray(listNotifs.body));

  // Create a notification to test mark-as-read
  const createNotif = await request('POST', '/api/notifications',
    { token: TOKEN, body: { user_id: USER_ID, type: 'system', title: 'E2E Test Notif' } });
  assert('POST /api/notifications returns 201', createNotif.status === 201,
    JSON.stringify(createNotif.body));
  NOTIF_ID = createNotif.body?.id;

  if (NOTIF_ID) {
    const markRead = await request('PUT', `/api/notifications/${NOTIF_ID}/read`, { token: TOKEN });
    assert('PUT /api/notifications/:id/read returns 200', markRead.status === 200,
      JSON.stringify(markRead.body));
    assert('Notification marked as read', markRead.body?.is_read === true);

    // Bug 1.4: null check on notifications
    const fakeNotifId = '00000000-0000-0000-0000-000000000002';
    // Insert then immediately delete to simulate race — just test nonexistent directly
    const notifNull = await request('PUT', `/api/notifications/${fakeNotifId}/read`, { token: TOKEN });
    assert('PUT /api/notifications/nonexistent/read returns 404 (bug 1.4)',
      notifNull.status === 404, `got ${notifNull.status}`);
  }

  const markAll = await request('PUT', '/api/notifications/read-all', { token: TOKEN });
  assert('PUT /api/notifications/read-all returns 200', markAll.status === 200);

  // ── 8. WALLET ──────────────────────────────────────────────────────────────
  section('8. Wallet (including bug 1.13 debit/refund)');

  const walletGet = await request('GET', '/api/wallet/me', { token: TOKEN });
  assert('GET /api/wallet/me returns 200', walletGet.status === 200);
  assert('Wallet has balance field', walletGet.body?.balance !== undefined);

  const topup = await request('POST', '/api/wallet/topup',
    { token: TOKEN, body: { amount: 500, reference: 'e2e-topup' } });
  assert('POST /api/wallet/topup returns 200', topup.status === 200,
    JSON.stringify(topup.body));

  const walletAfterTopup = await request('GET', '/api/wallet/me', { token: TOKEN });
  assert('Balance increased after topup', parseFloat(walletAfterTopup.body?.balance) >= 500);

  // Bug 1.13: POST /api/wallet/refund must exist
  const refund = await request('POST', '/api/wallet/refund',
    { token: TOKEN, body: { user_id: USER_ID, amount: 50, description: 'E2E refund' } });
  assert('POST /api/wallet/refund returns 200 (bug 1.13)', refund.status === 200,
    `got ${refund.status}: ${JSON.stringify(refund.body)}`);

  // ── 9. CRUD ALLOWLIST ──────────────────────────────────────────────────────
  section('9. crud.js ALLOWED_TABLES validation (bug 1.7)');

  const { validateTable, ALLOWED_TABLES } = require('../utils/crud');

  let threw = false;
  try { validateTable("users; DROP TABLE orders; --"); }
  catch (e) { threw = e.message.includes('Invalid table name'); }
  assert('SQL injection table name throws (bug 1.7)', threw);

  threw = false;
  try { validateTable('nonexistent_table_xyz'); }
  catch (e) { threw = true; }
  assert('Unknown table name throws', threw);

  let notThrew = true;
  try { validateTable('products'); }
  catch { notThrew = false; }
  assert('Valid table name "products" does not throw', notThrew);

  assert('ALLOWED_TABLES contains core tables',
    ALLOWED_TABLES.has('posts') && ALLOWED_TABLES.has('users') && ALLOWED_TABLES.has('products'));

  // ── 10. SEARCH ─────────────────────────────────────────────────────────────
  section('10. Search');

  const searchResp = await request('GET', '/api/search?q=E2E', { token: TOKEN });
  assert('GET /api/search?q=... returns 200', searchResp.status === 200,
    JSON.stringify(searchResp.body)?.slice(0, 80));

  // ── 11. CART ───────────────────────────────────────────────────────────────
  section('11. Cart');

  const cartGet = await request('GET', '/api/cart', { token: TOKEN });
  assert('GET /api/cart returns 200', cartGet.status === 200,
    JSON.stringify(cartGet.body)?.slice(0, 80));

  const cartAdd = await request('POST', '/api/cart/add',
    { token: TOKEN, body: { product_id: PRODUCT_ID, quantity: 1 } });
  assert('POST /api/cart/add returns 200/201',
    cartAdd.status === 200 || cartAdd.status === 201,
    `got ${cartAdd.status}: ${JSON.stringify(cartAdd.body)}`);

  // ── 12. STORIES ────────────────────────────────────────────────────────────
  section('12. Stories');

  const storiesGet = await request('GET', '/api/stories', { token: TOKEN });
  assert('GET /api/stories returns 200', storiesGet.status === 200,
    JSON.stringify(storiesGet.body)?.slice(0, 80));

  // ── 13. MIGRATION FILE CHECK ───────────────────────────────────────────────
  section('13. Migration file correctness (static checks)');

  const fs = require('fs');
  const path = require('path');

  const m7 = fs.readFileSync(path.join(__dirname, '../db/migrate7.js'), 'utf8');
  assert('migrate7.js has ADD COLUMN IF NOT EXISTS ticker_type (bug 1.1)',
    m7.includes('ADD COLUMN IF NOT EXISTS ticker_type'));
  assert('migrate7.js has ALTER COLUMN ticker_type SET DEFAULT (preservation)',
    m7.includes('ALTER COLUMN ticker_type SET DEFAULT'));

  const m8 = fs.readFileSync(path.join(__dirname, '../db/migrate8.js'), 'utf8');
  assert('migrate8.js uses user_id in stories index (bug 1.2)',
    m8.includes('ON stories(user_id, expires_at)'));
  assert('migrate8.js does NOT use author_id in stories index',
    !m8.includes('ON stories(author_id, expires_at)'));

  // ── 14. FRONTEND FILE CHECKS ───────────────────────────────────────────────
  section('14. Frontend file checks (static)');

  const providersPath = path.join(__dirname, '../../frontend-next/app/providers.tsx');
  if (fs.existsSync(providersPath)) {
    const providers = fs.readFileSync(providersPath, 'utf8');
    // AuthProvider must appear before CartProvider in source
    const authIdx = providers.indexOf('<AuthProvider>');
    const cartIdx = providers.indexOf('<CartProvider>');
    assert('providers.tsx: AuthProvider wraps CartProvider (bug 1.10)',
      authIdx !== -1 && cartIdx !== -1 && authIdx < cartIdx,
      `AuthProvider at ${authIdx}, CartProvider at ${cartIdx}`);
  } else {
    assert('providers.tsx exists', false, 'file not found');
  }

  const appLayoutPath = path.join(__dirname, '../../frontend-next/components/layout/AppLayout.tsx');
  if (fs.existsSync(appLayoutPath)) {
    const layout = fs.readFileSync(appLayoutPath, 'utf8');
    assert('AppLayout.tsx uses useAuth() (bug 1.11)',
      layout.includes('useAuth()') || layout.includes('useAuth('));
    assert('AppLayout.tsx does NOT call auth.me() directly (bug 1.11)',
      !layout.includes('auth.me()'));
    assert('AppLayout.tsx has redirect on !isAuthenticated (bug 1.12)',
      layout.includes('isAuthenticated') && layout.includes("router.push") && layout.includes('/login'));
  } else {
    assert('AppLayout.tsx exists', false, 'file not found');
  }

  const cartCtxPath = path.join(__dirname, '../../frontend-next/lib/CartContext.tsx');
  if (fs.existsSync(cartCtxPath)) {
    const cartCtx = fs.readFileSync(cartCtxPath, 'utf8');
    assert('CartContext.tsx imports useAuth (bug 1.10)',
      cartCtx.includes('useAuth'));
    assert('CartContext.tsx re-fetches cart after auth resolves',
      cartCtx.includes('authChecked') && cartCtx.includes('isAuthenticated'));
  } else {
    assert('CartContext.tsx exists', false, 'file not found');
  }

  // ── 15. ADDITIONAL ROUTES ──────────────────────────────────────────────────
  section('15. Additional routes');

  const eventsResp = await request('GET', '/api/events', { token: TOKEN });
  assert('GET /api/events returns 200', eventsResp.status === 200,
    `got ${eventsResp.status}`);

  const jobsResp = await request('GET', '/api/jobs', { token: TOKEN });
  assert('GET /api/jobs returns 200', jobsResp.status === 200,
    `got ${jobsResp.status}`);

  const coursesResp = await request('GET', '/api/courses', { token: TOKEN });
  assert('GET /api/courses returns 200', coursesResp.status === 200,
    `got ${coursesResp.status}`);

  const businessesResp = await request('GET', '/api/businesses', { token: TOKEN });
  assert('GET /api/businesses returns 200', businessesResp.status === 200,
    `got ${businessesResp.status}`);

  const showroomsResp = await request('GET', '/api/showrooms', { token: TOKEN });
  assert('GET /api/showrooms returns 200', showroomsResp.status === 200,
    `got ${showroomsResp.status}`);

  const trendsResp = await request('GET', '/api/trending', { token: TOKEN });
  assert('GET /api/trending returns 200', trendsResp.status === 200,
    `got ${trendsResp.status}`);

  const savesResp = await request('GET', '/api/saves', { token: TOKEN });
  assert('GET /api/saves returns 200', savesResp.status === 200,
    `got ${savesResp.status}`);

  // ── 16. CLEANUP ────────────────────────────────────────────────────────────
  section('16. Cleanup');
  try {
    if (POST_ID) await request('DELETE', `/api/posts/${POST_ID}`, { token: TOKEN });
    if (PRODUCT_ID) await request('DELETE', `/api/products/${PRODUCT_ID}`, { token: TOKEN });
    await pool.query('DELETE FROM users WHERE email = $1', [TEST_EMAIL]);
    assert('Test data cleaned up', true);
  } catch (e) {
    assert('Test data cleaned up', false, e.message);
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60));
  if (failures.length) {
    console.log('\n  FAILURES:');
    failures.forEach(f => console.log(`    • ${f}`));
  }
  console.log('');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\n❌ Uncaught test error:', err);
  pool.end().then(() => process.exit(1));
});
