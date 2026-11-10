// API load test with autocannon. Local only. Usage: node load.mjs <out.json> [seconds]
import autocannon from 'autocannon';
import fs from 'node:fs';
const BASE = 'http://127.0.0.1:3001';
const [out, secs = '10'] = process.argv.slice(2);
const j = async (p) => (await fetch(BASE + p)).json();
const first = await j('/api/products?limit=24');
const prodId = first.products[0].id;
// A deep cursor (page ~40) so the keyset path is exercised past the cache.
let cursor = first.next_cursor;
for (let i = 0; i < 40 && cursor; i++) cursor = (await j('/api/products?limit=24&cursor=' + encodeURIComponent(cursor))).next_cursor;
const words = ['coffee', 'cake', 'repair', 'session', 'delivery', 'shoe', 'tibs', 'hair', 'phone', 'bread'];
const endpoints = [
  { name: 'products list (cached)', path: '/api/products?limit=24' },
  { name: 'products deep cursor', path: '/api/products?limit=24&cursor=' + encodeURIComponent(cursor) },
  { name: 'products sort -price', path: '/api/products?limit=24&sort=-price' },
  { name: 'products search (varied, uncached)', paths: words.map((w) => `/api/products?limit=24&search=${w}`), bust: true },
  { name: 'product detail', path: `/api/products/${prodId}` },
  { name: 'posts feed', path: '/api/posts?feed=true&limit=15' },
  { name: 'trending', path: '/api/trending' },
  { name: 'businesses', path: '/api/businesses' },
  { name: 'showrooms', path: '/api/showrooms' },
  { name: 'hashtags trending', path: '/api/hashtags/trending' },
];
const results = [];
for (const c of [10, 50]) {
  for (const e of endpoints) {
    let n = 0;
    const r = await autocannon({
      url: BASE, connections: c, duration: Number(secs),
      requests: [{ method: 'GET', setupRequest: (req) => {
        n++;
        if (e.paths) req.path = e.paths[n % e.paths.length] + (e.bust ? `&_=${n}` : '');
        else req.path = e.path;
        return req;
      } }],
    });
    const row = { endpoint: e.name, connections: c, rps: Math.round(r.requests.average), p50: r.latency.p50, p90: r.latency.p90, p99: r.latency.p99, max: r.latency.max, non2xx: r.non2xx, errors: r.errors };
    // autocannon reports p97.5/p99; derive p95 from its histogram percentiles when present.
    row.p95 = r.latency.p95 ?? r.latency.p97_5;
    results.push(row);
    process.stderr.write(JSON.stringify(row) + '\n');
  }
}
fs.writeFileSync(out, JSON.stringify(results, null, 2));
console.table(results.map(({ endpoint, connections, rps, p50, p95, p99, non2xx, errors }) => ({ endpoint, c: connections, rps, p50, p95, p99, non2xx, errors })));
