// Hits the main endpoints once (cold cache) as guest and as the signed-in E2E user
// against the instrumented backend (QCOUNT preload). Usage: node sweep.mjs <base>
const BASE = process.argv[2] || 'http://127.0.0.1:3101';
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(BASE)) throw new Error('local only');
const H = { origin: 'http://localhost:3002', 'content-type': 'application/json' };

const login = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: H, body: JSON.stringify({ email: process.env.E2E_TEST_EMAIL, password: process.env.E2E_TEST_PASSWORD }) });
const { access_token: token, user } = await login.json();
const me = await (await fetch(BASE + '/api/auth/me', { headers: { ...H, authorization: `Bearer ${token}` } })).json();
const uid = me.id ?? user?.id;
const any = async (p) => (await (await fetch(BASE + p)).json());
const prod = (await any('/api/products?limit=1')).products[0];
const show = (await any('/api/showrooms?limit=1'))[0];
const post = (await any('/api/posts?limit=1'));
const postId = (Array.isArray(post) ? post : post.posts ?? post.data ?? [])[0]?.id;
const biz = (await any('/api/businesses'))[0];

const paths = [
  '/api/products?limit=24', '/api/products?limit=24&search=coffee', `/api/products/${prod.id}`,
  '/api/posts?limit=10', `/api/posts/${postId}`, `/api/posts/${postId}/comments`,
  '/api/businesses', `/api/businesses/${biz.id}`, '/api/showrooms', `/api/showrooms/slug/${show.slug}`, `/api/showrooms/${show.id}`,
  '/api/trending', '/api/hashtags/trending', '/api/search?q=coffee', `/api/profiles?user_id=${prod.seller_id}&limit=1`,
  '/api/stories', '/api/reviews?product_id=' + prod.id,
];
const authPaths = [
  '/api/auth/me', '/api/notifications', '/api/notifications/unread-count', '/api/messages/unread-count', '/api/messages/conversations',
  '/api/saves', '/api/cart', '/api/friends/mutual', '/api/suggestions/people', '/api/orders', '/api/orders?role=seller', `/api/wishlists/check/${prod.id}`, '/api/wishlists/price-alerts',
  `/api/profiles?user_id=${uid}&limit=1`, '/api/posts?limit=10', '/api/products?limit=24', '/api/trending',
];
for (const p of paths) { const r = await fetch(BASE + p, { headers: { 'x-sweep': 'guest' } }); await r.arrayBuffer(); }
for (const p of authPaths) { const r = await fetch(BASE + p, { headers: { authorization: `Bearer ${token}`, 'x-sweep': 'auth' } }); await r.arrayBuffer(); }
console.log('done', paths.length + authPaths.length);
