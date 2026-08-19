require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const BASE = 'http://localhost:3001';

async function test(label, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${label}:`, JSON.stringify(result).slice(0, 150));
    return result;
  } catch (e) {
    console.log(`❌ ${label}: ERROR:`, e.message);
    return null;
  }
}

async function api(path, options = {}) {
  const res = await fetch(BASE + path, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('\n====== NODBUSINESS E2E TEST SUITE ======\n');

  // 1. Health Check
  const health = await test('Health Check', async () => {
    const r = await api('/health');
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return r.data.services;
  });

  // 2. Login as admin
  let token;
  await test('Admin Login', async () => {
    const r = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@nodbusiness.app', password: 'Admin1234!' })
    });
    if (!r.ok) throw new Error(`Status ${r.status}: ${JSON.stringify(r.data)}`);
    token = r.data.access_token;
    if (!token) throw new Error('No token in response');
    return { tokenPresent: true, userId: r.data.user?.id };
  });

  const auth = { headers: { Authorization: 'Bearer ' + token } };

  // 3. Get Profile
  await test('GET /api/profiles/me', async () => {
    const r = await api('/api/profiles/me', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { display_name: r.data.display_name, profile_type: r.data.profile_type };
  });

  // 4. Search (fixed)
  await test('GET /api/search?q=test', async () => {
    const r = await api('/api/search?q=test', auth);
    if (!r.ok) throw new Error(`Status ${r.status}: ${JSON.stringify(r.data)}`);
    return { users: r.data.users?.length, products: r.data.products?.length, showrooms: r.data.showrooms?.length, posts: r.data.posts?.length };
  });

  // 5. Trending
  await test('GET /api/trending', async () => {
    const r = await api('/api/trending', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { keys: Object.keys(r.data) };
  });

  // 6. Posts feed
  await test('GET /api/posts', async () => {
    const r = await api('/api/posts?limit=3', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : 'not array' };
  });

  // 7. Products
  await test('GET /api/products', async () => {
    const r = await api('/api/products?limit=3', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data).slice(0,80) };
  });

  // 8. Showrooms
  await test('GET /api/showrooms', async () => {
    const r = await api('/api/showrooms?limit=3', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data).slice(0,80) };
  });

  // 9. Tasks
  await test('GET /api/tasks', async () => {
    const r = await api('/api/tasks?limit=3', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data).slice(0,80) };
  });

  // 10. Wallet
  await test('GET /api/wallet/me', async () => {
    const r = await api('/api/wallet/me', auth);
    if (!r.ok) throw new Error(`Status ${r.status}: ${JSON.stringify(r.data)}`);
    return { balance: r.data.balance };
  });

  // 11. Friends
  await test('GET /api/friends/mutual', async () => {
    const r = await api('/api/friends/mutual', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data).slice(0,80) };
  });

  // 12. Suggestions
  await test('GET /api/suggestions/people', async () => {
    const r = await api('/api/suggestions/people', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data).slice(0,80) };
  });

  // 13. Messages conversations
  await test('GET /api/messages/conversations', async () => {
    const r = await api('/api/messages/conversations', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data).slice(0,80) };
  });

  // 14. Notifications
  await test('GET /api/notifications', async () => {
    const r = await api('/api/notifications', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data).slice(0,80) };
  });

  // 15. Cart
  await test('GET /api/cart', async () => {
    const r = await api('/api/cart', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { items: r.data.count, total: r.data.total };
  });

  // 16. Orders
  await test('GET /api/orders', async () => {
    const r = await api('/api/orders?limit=3', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data).slice(0,80) };
  });

  // 17. Jobs
  await test('GET /api/jobs', async () => {
    const r = await api('/api/jobs?limit=3', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data).slice(0,80) };
  });

  // 18. Events
  await test('GET /api/events', async () => {
    const r = await api('/api/events?limit=3', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data).slice(0,80) };
  });

  // 19. Courses
  await test('GET /api/courses', async () => {
    const r = await api('/api/courses?limit=3', auth);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return { count: Array.isArray(r.data) ? r.data.length : JSON.stringify(r.data).slice(0,80) };
  });

  // 20. OTP verify (new register)
  let newUserToken;
  const newEmail = `e2etest2_${Date.now()}@test.com`;
  await test('POST /api/auth/register (new user)', async () => {
    const r = await api('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, password: 'Test1234!', full_name: 'E2E Test' })
    });
    if (!r.ok && r.status !== 201) throw new Error(`Status ${r.status}: ${JSON.stringify(r.data)}`);
    return { userId: r.data.userId };
  });

  // 21. Refresh token endpoint
  await test('POST /api/auth/refresh', async () => {
    const r = await api('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    // 401 is expected if no cookie set — just check it responds
    return { status: r.status, responded: true };
  });

  // 22. Logout
  await test('POST /api/auth/logout', async () => {
    const r = await api('/api/auth/logout', {
      method: 'POST',
      headers: { ...auth.headers, 'Content-Type': 'application/json' },
    });
    if (!r.ok) throw new Error(`Status ${r.status}: ${JSON.stringify(r.data)}`);
    return { status: r.status };
  });

  console.log('\n====== TEST COMPLETE ======\n');
  await pool.end();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
