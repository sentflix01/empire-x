/**
 * api.test.js — Integration tests for all major API endpoints.
 *
 * Run:  node test/api.test.js
 *
 * Requires the backend server to be running on PORT 3001.
 * Creates a fresh test user, exercises every feature, then cleans up.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');

const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;
let token = '';
let token2 = '';
let testUserId = '';
let testUser2Id = '';

const TEST_EMAIL = `test_${Date.now()}@halehame.test`;
const TEST_EMAIL2 = `test2_${Date.now()}@halehame.test`;
const TEST_PASSWORD = 'Test1234!';

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function request(method, path, body = null, authToken = token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    };
    const options = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${err.message}`);
    failed++;
    errors.push({ name, error: err.message });
  }
}

function expect(value) {
  return {
    toBe: (expected) => { if (value !== expected) throw new Error(`Expected ${expected}, got ${value}`); },
    toBeOneOf: (arr) => { if (!arr.includes(value)) throw new Error(`Expected one of ${arr}, got ${value}`); },
    toExist: () => { if (value == null) throw new Error(`Expected value to exist, got ${value}`); },
    toBeArray: () => { if (!Array.isArray(value)) throw new Error(`Expected array, got ${typeof value}`); },
    toHaveLength: (n) => { if (!Array.isArray(value) || value.length < n) throw new Error(`Expected array with >= ${n} items, got ${Array.isArray(value) ? value.length : typeof value}`); },
    toBeStatus: (s) => { if (value !== s) throw new Error(`Expected status ${s}, got ${value}`); },
  };
}

// ── Test suites ───────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n🧪 Halehame API Tests');
  console.log('═'.repeat(50));

  // ── Health ────────────────────────────────────────────────────────────────
  console.log('\n📡 Health');
  await test('GET /health returns ok', async () => {
    const r = await request('GET', '/health', null, null);
    expect(r.status).toBe(200);
    expect(r.data.status).toBe('ok');
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  console.log('\n🔐 Auth');
  let registeredUserId;

  await test('POST /api/auth/register — creates user', async () => {
    const r = await request('POST', '/api/auth/register', { email: TEST_EMAIL, password: TEST_PASSWORD, full_name: 'Test User' }, null);
    expect(r.status).toBe(201);
    expect(r.data.userId).toExist();
    registeredUserId = r.data.userId;
  });

  await test('POST /api/auth/register — duplicate email returns 409', async () => {
    const r = await request('POST', '/api/auth/register', { email: TEST_EMAIL, password: TEST_PASSWORD }, null);
    expect(r.status).toBe(409);
  });

  // Manually verify for testing (bypass OTP)
  const pool = require('../db/pool');
  await pool.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [registeredUserId]);

  await test('POST /api/auth/login — returns token', async () => {
    const r = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD }, null);
    expect(r.status).toBe(200);
    expect(r.data.access_token).toExist();
    token = r.data.access_token;
  });

  await test('GET /api/auth/me — returns user', async () => {
    const r = await request('GET', '/api/auth/me');
    expect(r.status).toBe(200);
    expect(r.data.email).toBe(TEST_EMAIL);
    testUserId = r.data.id;
  });

  await test('POST /api/auth/login — wrong password returns 401', async () => {
    const r = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: 'wrongpass' }, null);
    expect(r.status).toBe(401);
  });

  // Register second user
  await request('POST', '/api/auth/register', { email: TEST_EMAIL2, password: TEST_PASSWORD, full_name: 'Test User 2' }, null);
  await pool.query(`UPDATE users SET is_verified = TRUE WHERE email = $1`, [TEST_EMAIL2]);
  const loginRes2 = await request('POST', '/api/auth/login', { email: TEST_EMAIL2, password: TEST_PASSWORD }, null);
  token2 = loginRes2.data.access_token;
  const me2 = await request('GET', '/api/auth/me', null, token2);
  testUser2Id = me2.data.id;

  // ── Profiles ──────────────────────────────────────────────────────────────
  console.log('\n👤 Profiles');
  let profileId;

  await test('POST /api/profiles — creates profile', async () => {
    const r = await request('POST', '/api/profiles', {
      display_name: 'Test User',
      profile_type: 'personal',
      bio: 'Test bio',
      location: 'Addis Ababa',
    });
    expect(r.status).toBe(201);
    expect(r.data.display_name).toBe('Test User');
    profileId = r.data.id;
  });

  await test('GET /api/profiles/me — returns my profile', async () => {
    const r = await request('GET', '/api/profiles/me');
    expect(r.status).toBe(200);
    expect(r.data.user_id).toBe(testUserId);
  });

  await test('PUT /api/profiles/me/upsert — updates profile', async () => {
    const r = await request('PUT', '/api/profiles/me/upsert', { bio: 'Updated bio', display_name: 'Test User' });
    expect(r.status).toBe(200);
  });

  await test('GET /api/profiles/:id — gets profile by id', async () => {
    const r = await request('GET', `/api/profiles/${profileId}`, null, null);
    expect(r.status).toBe(200);
  });

  await test('POST /api/profiles/follow/:userId — follow user', async () => {
    const r = await request('POST', `/api/profiles/follow/${testUser2Id}`);
    expect(r.status).toBe(200);
  });

  // ── Posts ─────────────────────────────────────────────────────────────────
  console.log('\n📝 Posts');
  let postId;

  await test('POST /api/posts — creates post', async () => {
    const r = await request('POST', '/api/posts', { content: 'Hello Halehame! #test', post_type: 'text' });
    expect(r.status).toBe(201);
    expect(r.data.content).toExist();
    postId = r.data.id;
  });

  await test('GET /api/posts — lists posts', async () => {
    const r = await request('GET', '/api/posts?limit=10', null, null);
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  await test('POST /api/posts/:id/like — likes post', async () => {
    const r = await request('POST', `/api/posts/${postId}/like`);
    expect(r.status).toBe(200);
  });

  await test('POST /api/posts/:id/comments — adds comment', async () => {
    const r = await request('POST', `/api/posts/${postId}/comments`, { content: 'Great post!' });
    expect(r.status).toBe(201);
  });

  await test('GET /api/posts/:id/comments — gets comments', async () => {
    const r = await request('GET', `/api/posts/${postId}/comments`, null, null);
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  await test('PUT /api/posts/:id — updates own post', async () => {
    const r = await request('PUT', `/api/posts/${postId}`, { content: 'Updated content #test' });
    expect(r.status).toBe(200);
  });

  // ── Products ──────────────────────────────────────────────────────────────
  console.log('\n🛍️  Products');
  let productId;

  await test('POST /api/products — creates product', async () => {
    const r = await request('POST', '/api/products', {
      title: 'Test Product',
      description: 'A test product',
      price: 500,
      stock: 10,
      category: 'Other',
      currency: 'ETB',
    });
    expect(r.status).toBe(201);
    productId = r.data.id;
  });

  await test('GET /api/products — lists products', async () => {
    const r = await request('GET', '/api/products?status=active', null, null);
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  await test('GET /api/products/:id — gets product', async () => {
    const r = await request('GET', `/api/products/${productId}`, null, null);
    expect(r.status).toBe(200);
    expect(r.data.title).toBe('Test Product');
  });

  await test('PUT /api/products/:id — updates product', async () => {
    const r = await request('PUT', `/api/products/${productId}`, { price: 600 });
    expect(r.status).toBe(200);
    expect(r.data.price).toBe('600.00');
  });

  // ── Reviews ───────────────────────────────────────────────────────────────
  console.log('\n⭐ Reviews');

  await test('POST /api/reviews — creates review (user2)', async () => {
    const r = await request('POST', '/api/reviews', {
      product_id: productId, rating: 4, comment: 'Good product!'
    }, token2);
    expect(r.status).toBe(201);
  });

  await test('GET /api/reviews/product/:id — gets reviews', async () => {
    const r = await request('GET', `/api/reviews/product/${productId}`, null, null);
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  // ── Orders ────────────────────────────────────────────────────────────────
  console.log('\n📦 Orders');
  let orderId;

  await test('POST /api/orders — creates order (user2 buys from user1)', async () => {
    const r = await request('POST', '/api/orders', {
      seller_id: testUserId,
      product_id: productId,
      product_title: 'Test Product',
      total_price: 500,
      quantity: 1,
      currency: 'ETB',
    }, token2);
    expect(r.status).toBe(201);
    orderId = r.data.id;
  });

  await test('GET /api/orders — lists my orders', async () => {
    const r = await request('GET', '/api/orders');
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  await test('PUT /api/orders/:id — updates order status', async () => {
    const r = await request('PUT', `/api/orders/${orderId}`, { status: 'processing' });
    expect(r.status).toBe(200);
  });

  // ── Tasks ─────────────────────────────────────────────────────────────────
  console.log('\n📋 Tasks');
  let taskId, bidId;

  await test('POST /api/tasks — creates task', async () => {
    const r = await request('POST', '/api/tasks', {
      title: 'Test Task',
      task_type: 'delivery',
      offered_payment: 200,
      description: 'Test delivery task',
      location: 'Addis Ababa',
    });
    expect(r.status).toBe(201);
    taskId = r.data.id;
  });

  await test('GET /api/tasks — lists tasks', async () => {
    const r = await request('GET', '/api/tasks?status=open', null, null);
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  await test('POST /api/tasks/:id/bids — places bid (user2)', async () => {
    const r = await request('POST', `/api/tasks/${taskId}/bids`, { bid_amount: 180, message: 'I can do this!' }, token2);
    expect(r.status).toBe(201);
    bidId = r.data.id;
  });

  await test('GET /api/tasks/:id/bids — gets bids', async () => {
    const r = await request('GET', `/api/tasks/${taskId}/bids`, null, null);
    expect(r.status).toBe(200);
    expect(r.data).toHaveLength(1);
  });

  await test('PUT /api/tasks/bids/:bidId — accepts bid', async () => {
    const r = await request('PUT', `/api/tasks/bids/${bidId}`, { status: 'accepted' });
    expect(r.status).toBe(200);
  });

  // ── Messages ──────────────────────────────────────────────────────────────
  console.log('\n💬 Messages');
  let convId;

  await test('POST /api/messages/conversations/find-or-create — creates DM', async () => {
    const r = await request('POST', '/api/messages/conversations/find-or-create', {
      target_user_id: testUser2Id,
      target_name: 'Test User 2',
    });
    expect(r.status).toBeOneOf([200, 201]);
    convId = r.data.id;
  });

  await test('POST /api/messages/conversations/:id/messages — sends message', async () => {
    const r = await request('POST', `/api/messages/conversations/${convId}/messages`, { content: 'Hello!' });
    expect(r.status).toBe(201);
  });

  await test('GET /api/messages/conversations/:id/messages — gets messages', async () => {
    const r = await request('GET', `/api/messages/conversations/${convId}/messages`);
    expect(r.status).toBe(200);
    expect(r.data).toHaveLength(1);
  });

  // ── Notifications ─────────────────────────────────────────────────────────
  console.log('\n🔔 Notifications');

  await test('GET /api/notifications — gets my notifications', async () => {
    const r = await request('GET', '/api/notifications');
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  await test('PUT /api/notifications/read-all — marks all read', async () => {
    const r = await request('PUT', '/api/notifications/read-all');
    expect(r.status).toBe(200);
  });

  // ── Search ────────────────────────────────────────────────────────────────
  console.log('\n🔍 Search');

  await test('GET /api/search?q=test — returns results', async () => {
    const r = await request('GET', '/api/search?q=test', null, null);
    expect(r.status).toBe(200);
    expect(r.data).toExist();
  });

  // ── Saves / Bookmarks ─────────────────────────────────────────────────────
  console.log('\n🔖 Saves');

  await test('POST /api/saves/toggle — saves a post', async () => {
    const r = await request('POST', '/api/saves/toggle', { target_id: postId, target_type: 'post' });
    expect(r.status).toBe(200);
    expect(r.data.saved).toBe(true);
  });

  await test('GET /api/saves — lists saved items', async () => {
    const r = await request('GET', '/api/saves');
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  // ── Trending ──────────────────────────────────────────────────────────────
  console.log('\n📈 Trending');

  await test('GET /api/trending — returns trending data', async () => {
    const r = await request('GET', '/api/trending', null, null);
    expect(r.status).toBe(200);
    expect(r.data.trending_posts).toExist();
  });

  // ── Businesses ────────────────────────────────────────────────────────────
  console.log('\n🏢 Businesses');
  let bizId;

  await test('POST /api/businesses — creates business', async () => {
    const r = await request('POST', '/api/businesses', {
      business_name: 'Test Biz',
      business_category: 'shop',
    });
    expect(r.status).toBe(201);
    bizId = r.data.id;
  });

  await test('GET /api/businesses — lists businesses', async () => {
    const r = await request('GET', `/api/businesses?owner_id=${testUserId}`, null, null);
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  // ── Wallet ────────────────────────────────────────────────────────────────
  console.log('\n💰 Wallet');

  await test('GET /api/wallet/me — gets/creates wallet', async () => {
    const r = await request('GET', '/api/wallet/me');
    expect(r.status).toBe(200);
    expect(r.data.balance).toExist();
  });

  // ── Cart ──────────────────────────────────────────────────────────────────
  console.log('\n🛒 Cart');

  await test('POST /api/cart/add — adds product to cart', async () => {
    const r = await request('POST', '/api/cart/add', { product_id: productId, quantity: 2 }, token2);
    expect(r.status).toBe(201);
  });

  await test('GET /api/cart — gets cart', async () => {
    const r = await request('GET', '/api/cart', null, token2);
    expect(r.status).toBe(200);
    expect(r.data.items).toBeArray();
  });

  // ── Showrooms ─────────────────────────────────────────────────────────────
  console.log('\n🏪 Showrooms');
  let showroomId;

  await test('POST /api/showrooms — creates showroom', async () => {
    const r = await request('POST', '/api/showrooms', {
      title: 'Test Showroom',
      category: 'business',
      status: 'published',
    });
    expect(r.status).toBe(201);
    showroomId = r.data.id;
  });

  await test('GET /api/showrooms — lists showrooms', async () => {
    const r = await request('GET', '/api/showrooms?status=published', null, null);
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  // ── Coupons ───────────────────────────────────────────────────────────────
  console.log('\n🏷️  Coupons');

  await test('POST /api/coupons — creates coupon', async () => {
    const r = await request('POST', '/api/coupons', {
      code: 'TEST20',
      discount_type: 'percentage',
      discount_value: 20,
    });
    expect(r.status).toBe(201);
  });

  await test('POST /api/coupons/validate — validates coupon', async () => {
    const r = await request('POST', '/api/coupons/validate', {
      code: 'TEST20',
      seller_id: testUserId,
      order_total: 1000,
    }, null);
    expect(r.status).toBe(200);
    expect(r.data.valid).toBe(true);
  });

  // ── Stories ───────────────────────────────────────────────────────────────
  console.log('\n📸 Stories');
  let storyId;

  await test('POST /api/stories — creates story', async () => {
    const r = await request('POST', '/api/stories', { media_url: 'https://picsum.photos/400/600', caption: 'Test story' });
    expect(r.status).toBe(201);
    storyId = r.data.id;
  });

  await test('GET /api/stories — lists active stories', async () => {
    const r = await request('GET', '/api/stories', null, null);
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  // ── Admin ─────────────────────────────────────────────────────────────────
  console.log('\n🛡️  Admin (as regular user — should be 403)');

  await test('GET /api/admin/stats — 403 for non-admin', async () => {
    const r = await request('GET', '/api/admin/stats');
    expect(r.status).toBe(403);
  });

  // ── Events ────────────────────────────────────────────────────────────────
  console.log('\n🎫 Events');
  let eventId;

  await test('POST /api/events — creates event', async () => {
    const r = await request('POST', '/api/events', {
      title: 'Test Event',
      start_at: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
      ticket_price: 100,
      status: 'published',
    });
    expect(r.status).toBe(201);
    eventId = r.data.id;
  });

  await test('POST /api/events/:id/book — books event (user2)', async () => {
    const r = await request('POST', `/api/events/${eventId}/book`, {}, token2);
    expect(r.status).toBe(201);
  });

  // ── Hashtags ──────────────────────────────────────────────────────────────
  console.log('\n# Hashtags');

  await test('GET /api/hashtags/trending — returns trending hashtags', async () => {
    const r = await request('GET', '/api/hashtags/trending', null, null);
    expect(r.status).toBe(200);
    expect(r.data).toBeArray();
  });

  // ── Maps ──────────────────────────────────────────────────────────────────
  console.log('\n🗺️  Maps');

  await test('GET /api/maps/geocode — geocodes an address', async () => {
    const r = await request('GET', '/api/maps/geocode?address=Addis+Ababa', null, null);
    // Nominatim may be rate-limited; accept 200 or 404
    expect(r.status).toBeOneOf([200, 404, 500]);
  });

  // ── Jobs ──────────────────────────────────────────────────────────────────
  console.log('\n💼 Jobs');
  let jobId;

  await test('POST /api/jobs — creates job', async () => {
    const r = await request('POST', '/api/jobs', { title: 'React Developer', job_type: 'full_time' });
    expect(r.status).toBe(201);
    jobId = r.data.id;
  });

  await test('POST /api/jobs/:id/apply — applies for job (user2)', async () => {
    const r = await request('POST', `/api/jobs/${jobId}/apply`, { cover_letter: 'I am interested.' }, token2);
    expect(r.status).toBe(201);
  });

  // ── Courses ───────────────────────────────────────────────────────────────
  console.log('\n📚 Courses');
  let courseId;

  await test('POST /api/courses — creates course', async () => {
    const r = await request('POST', '/api/courses', { title: 'Test Course', price: 0 });
    expect(r.status).toBe(201);
    courseId = r.data.id;
  });

  await test('POST /api/courses/:id/enroll — enrolls (user2)', async () => {
    const r = await request('POST', `/api/courses/${courseId}/enroll`, {}, token2);
    expect(r.status).toBe(201);
  });

  // ── AI Description ────────────────────────────────────────────────────────
  console.log('\n🤖 AI');

  await test('POST /api/ai/generate-description — 503 without API key or 200', async () => {
    const r = await request('POST', '/api/ai/generate-description', { title: 'Test Product', type: 'product' });
    expect(r.status).toBeOneOf([200, 503]);
  });

  // ── Moderation ────────────────────────────────────────────────────────────
  console.log('\n🚨 Moderation');

  await test('POST /api/moderation/report — reports a post', async () => {
    const r = await request('POST', '/api/moderation/report', {
      target_id: postId, target_type: 'post', reason: 'Spam',
    });
    expect(r.status).toBe(201);
  });

  await test('POST /api/moderation/block/:userId — blocks user2', async () => {
    const r = await request('POST', `/api/moderation/block/${testUser2Id}`);
    expect(r.status).toBe(200);
  });

  // ── Cleanup ───────────────────────────────────────────────────────────────
  console.log('\n🧹 Cleanup');

  await test('DELETE /api/posts/:id — deletes own post', async () => {
    const r = await request('DELETE', `/api/posts/${postId}`);
    expect(r.status).toBe(200);
  });

  await test('DELETE /api/products/:id — deletes own product', async () => {
    const r = await request('DELETE', `/api/products/${productId}`);
    expect(r.status).toBe(200);
  });

  // Clean up test users
  await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [TEST_EMAIL, TEST_EMAIL2]);
  await pool.end();

  // ── Results ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests\n`);

  if (errors.length > 0) {
    console.log('❌ Failed tests:');
    errors.forEach(e => console.log(`  • ${e.name}\n    ${e.error}`));
  } else {
    console.log('🎉 All tests passed!');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Check server is running first
request('GET', '/health', null, null)
  .then(r => {
    if (r.status !== 200) throw new Error('Server not healthy');
    runTests().catch(console.error);
  })
  .catch(() => {
    console.error('\n❌ Cannot connect to backend. Start the server first:\n   cd backend && npm run dev\n');
    process.exit(1);
  });
