// Preload for the backend: counts SQL queries and DB time per HTTP request.
// Writes one JSON line per request to $QCOUNT_LOG. Local measurement only.
const { AsyncLocalStorage } = require('node:async_hooks');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const als = new AsyncLocalStorage();
const out = fs.createWriteStream(process.env.QCOUNT_LOG || '/dev/stderr', { flags: 'a' });
const pg = require(require.resolve('pg', { paths: [path.resolve(process.cwd())] }));

const origQuery = pg.Client.prototype.query;
pg.Client.prototype.query = function patched(config, values, cb) {
  const s = als.getStore();
  if (!s) return origQuery.call(this, config, values, cb);
  const t0 = process.hrtime.bigint();
  const text = typeof config === 'string' ? config : config?.text;
  s.n++;
  const done = () => { const ms = Number(process.hrtime.bigint() - t0) / 1e6; s.dbms += ms; s.q.push([ms, String(text).replace(/\s+/g, ' ').slice(0, 4000)]); };
  if (typeof values === 'function') { const f = values; values = function () { done(); return f.apply(this, arguments); }; }
  else if (typeof cb === 'function') { const f = cb; cb = function () { done(); return f.apply(this, arguments); }; }
  else if (config && typeof config.callback === 'function') { const f = config.callback; config.callback = function () { done(); return f.apply(this, arguments); }; }
  const r = origQuery.call(this, config, values, cb);
  if (r && typeof r.then === 'function') r.then(done, done);
  return r;
};

const origEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function (ev, req, res) {
  if (ev !== 'request') return origEmit.apply(this, arguments);
  const store = { n: 0, dbms: 0, q: [], t0: process.hrtime.bigint() };
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - store.t0) / 1e6;
    out.write(JSON.stringify({ m: req.method, u: req.originalUrl || req.url, s: res.statusCode, ms: +ms.toFixed(1), n: store.n, dbms: +store.dbms.toFixed(1), bytes: Number(res.getHeader('content-length') || 0), q: store.q.sort((a, b) => b[0] - a[0]).slice(0, 5) }) + '\n');
  });
  return als.run(store, () => origEmit.apply(this, arguments));
};
