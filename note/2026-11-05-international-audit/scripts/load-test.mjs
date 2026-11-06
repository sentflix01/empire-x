#!/usr/bin/env node
/**
 * Minimal closed-loop HTTP load test (no dependencies) — LOCAL ONLY.
 * For each endpoint and concurrency level, runs N workers for D seconds and
 * reports throughput, latency percentiles and errors.
 *
 *   node note/2026-11-05-international-audit/scripts/load-test.mjs [seconds=15]
 *
 * Numbers are an upper bound: this sandbox has 4 vCPUs, while production runs
 * on Render's free plan (a fraction of one CPU, 512 MB).
 */
const BASE = 'http://127.0.0.1:3001';
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(BASE)) throw new Error('Local only');
const SECONDS = Number(process.argv[2] ?? 15);
const ENDPOINTS = [
  { name: 'GET /health', path: '/health' },
  { name: 'GET /api/products (public list)', path: '/api/products?limit=20' },
  { name: 'GET /api/businesses (public list)', path: '/api/businesses' },
  { name: 'GET /api/trending', path: '/api/trending' },
];
const LEVELS = [10, 50, 100, 200];

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

async function run(path, concurrency) {
  const lat = []; let errors = 0; const codes = {};
  const end = Date.now() + SECONDS * 1000;
  async function worker() {
    while (Date.now() < end) {
      const t = performance.now();
      try {
        const res = await fetch(BASE + path);
        await res.arrayBuffer();
        codes[res.status] = (codes[res.status] ?? 0) + 1;
        if (res.status >= 500) errors++;
      } catch { errors++; codes.network = (codes.network ?? 0) + 1; }
      lat.push(performance.now() - t);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  lat.sort((a, b) => a - b);
  const r = (x) => Math.round(x);
  return { concurrency, requests: lat.length, rps: r(lat.length / SECONDS), p50_ms: r(pct(lat, 50)), p95_ms: r(pct(lat, 95)), p99_ms: r(pct(lat, 99)), max_ms: r(lat[lat.length - 1]), error_rate: +(errors / lat.length).toFixed(4), status_codes: codes };
}

const out = { ran_at: new Date().toISOString(), base: BASE, seconds_per_step: SECONDS, cpus: (await import('node:os')).cpus().length, results: [] };
for (const e of ENDPOINTS) {
  for (const c of LEVELS) {
    const r = await run(e.path, c);
    out.results.push({ endpoint: e.name, ...r });
    process.stderr.write(`${e.name.padEnd(34)} c=${String(c).padStart(3)} rps=${String(r.rps).padStart(5)} p50=${r.p50_ms}ms p95=${r.p95_ms}ms p99=${r.p99_ms}ms err=${(r.error_rate * 100).toFixed(1)}%\n`);
  }
}
console.log(JSON.stringify(out, null, 2));
