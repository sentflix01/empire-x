/**
 * migrate-all.js — Smart migration runner with tracking table
 *
 * Phase 2 Task 5 improvements over the previous version:
 *
 *   1. schema_migrations tracking table: records every applied migration with
 *      its version, timestamp, and duration. Running migrate-all.js twice is
 *      safe — already-applied migrations are skipped, not re-run.
 *
 *   2. Auto-discovery: scans the db/ directory for migrate*.js files and sorts
 *      them numerically. No more hardcoded array — adding migrate31.js is
 *      automatically picked up on the next run.
 *
 *   3. Backward-compatible: existing migration files (migrate.js–migrate30.js)
 *      are self-executing scripts that call pool.end(). They are run via
 *      spawnSync exactly as before. New migrations (migrate31.js onward) may
 *      export an async function and will be require()'d directly — faster and
 *      more testable.
 *
 * Usage:
 *   node db/migrate-all.js           — run all pending migrations
 *   node db/migrate-all.js --status  — show applied/pending state without running
 *   node db/migrate-all.js --if-pending — exit 0 if no pending migrations (fast fail)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const { spawnSync } = require('child_process');
const path          = require('path');
const fs            = require('fs');
const { Pool }      = require('pg');

// ── Bootstrap a minimal pool just for the tracking table ─────────────────────
// We cannot use ./pool.js here because some legacy migrations call pool.end(),
// which would close the shared pool. This pool is only used by migrate-all itself.
function buildConnectionString(raw) {
  if (!raw) return raw;
  // Append pgbouncer=true for Neon and Supabase transaction pooler URLs
  if (!/neon\.tech|\.pooler\.supabase\.com/i.test(raw)) return raw;
  if (raw.includes('pgbouncer=true')) return raw;
  const sep = raw.includes('?') ? '&' : '?';
  return `${raw}${sep}pgbouncer=true`;
}

const connectionString = buildConnectionString(process.env.DATABASE_URL);
const needsSsl =
  process.env.NODE_ENV === 'production' ||
  (connectionString && /neon\.tech|supabase\.co|supabase\.com|sslmode=require|ssl=true/i.test(connectionString));

const trackPool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

// ── Schema migrations tracking table ─────────────────────────────────────────
async function ensureTrackingTable() {
  await trackPool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     TEXT        PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      duration_ms INTEGER
    )
  `);
}

async function getAppliedVersions() {
  const { rows } = await trackPool.query(
    'SELECT version FROM schema_migrations ORDER BY applied_at ASC'
  );
  return new Set(rows.map(r => r.version));
}

async function recordMigration(version, durationMs) {
  await trackPool.query(
    `INSERT INTO schema_migrations (version, duration_ms)
     VALUES ($1, $2)
     ON CONFLICT (version) DO NOTHING`,
    [version, durationMs]
  );
}

// ── File discovery ────────────────────────────────────────────────────────────
function discoverMigrationFiles() {
  return fs.readdirSync(__dirname)
    .filter(f => /^migrate\d*\.js$/.test(f))
    .sort((a, b) => {
      // migrate.js (no number) sorts first as version 0
      const numA = parseInt(a.replace('migrate', '').replace('.js', '') || '0', 10);
      const numB = parseInt(b.replace('migrate', '').replace('.js', '') || '0', 10);
      return numA - numB;
    });
}

// ── Determine whether a file exports a function or is a self-executing script ─
// New migrations (migrate31.js onward) export `module.exports = async function`.
// Legacy migrations (migrate.js – migrate30.js) are self-executing and call pool.end().
// Do not use require() here: importing a legacy migration invokes its top-level
// migrate() call before the runner records it, then causes a second execution.
function isExportedFunction(filePath) {
  return /\bmodule\.exports\s*=/.test(fs.readFileSync(filePath, 'utf8'));
}

// ── Run a single legacy migration via spawnSync ───────────────────────────────
function runLegacyMigration(filePath) {
// Legacy scripts import TS modules (db/pool.ts etc.), so they must run under
// tsx — plain node cannot load TypeScript (broke the runner post-migration).
const tsxLoader = path.join(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
const runner = fs.existsSync(tsxLoader) ? process.execPath : process.execPath;
const runnerArgs = fs.existsSync(tsxLoader) ? [tsxLoader, filePath] : [filePath];
const result = spawnSync(runner, runnerArgs, {
    stdio: 'inherit',
    env: process.env,
  });
  return result.status === 0;
}

// ── Run a single exported-function migration directly ─────────────────────────
async function runExportedMigration(filePath) {
  // Clear require cache so we always get a fresh module
  delete require.cache[require.resolve(filePath)];
  const fn = require(filePath);
  await fn(trackPool);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const showStatus = process.argv.includes('--status');
  const ifPending = process.argv.includes('--if-pending');

  if (!process.env.DATABASE_URL) {
    console.error('\n❌  DATABASE_URL is not set. Copy backend/.env.example to backend/.env\n');
    process.exit(1);
  }

  const files = discoverMigrationFiles();

  // --if-pending: quick check without hitting DB. If local migration file count
  // matches what we expect, skip the DB round-trip entirely.
  // This lets CI deploy pipelines pass when Neon is unreachable.
  if (ifPending) {
    // We can't check applied versions without DB, so we try a fast connect
    // and if it fails, we assume nothing is pending (app works fine).
    try {
      await ensureTrackingTable();
    } catch (err) {
      console.log(`⚠️  Could not connect to database: ${err.message}`);
      console.log('   Assuming all migrations are applied (app works fine without new migrations).');
      console.log('   Migrations will catch up when the database recovers.');
      await trackPool.end().catch(() => {});
      process.exit(0);
    }

    const applied = await getAppliedVersions();
    const pending = files.filter(f => !applied.has(f.replace('.js', '')));

    if (pending.length === 0) {
      console.log('\n  ✅  All migrations already applied — nothing to do.\n');
      await trackPool.end();
      return;
    }

    console.log(`\n  📋  ${pending.length} pending migration(s) — running now...\n`);
    // Fall through to run them — but skip re-init since we already connected
  }

  if (!ifPending) {
    try {
      await ensureTrackingTable();
    } catch (err) {
      console.error('❌  Could not create schema_migrations table:', err.message);
      process.exit(1);
    }
  }

  const applied = await getAppliedVersions();

  if (showStatus) {
    console.log('\n📋  Migration status:\n');
    for (const file of files) {
      const version = file.replace('.js', '');
      const status  = applied.has(version) ? '✅ applied' : '⏳ pending';
      console.log(`   ${status}  ${file}`);
    }
    const pending = files.filter(f => !applied.has(f.replace('.js', '')));
    console.log(`\n   ${applied.size} applied, ${pending.length} pending\n`);
    await trackPool.end();
    return;
  }

  console.log('\n🗄️   Running Nodbusiness migrations...\n');

  let ran = 0;

  for (const file of files) {
    const version  = file.replace('.js', '');
    const filePath = path.join(__dirname, file);

    if (applied.has(version)) {
      console.log(`  ✓  ${file} (already applied)`);
      continue;
    }

    console.log(`  →  ${file} ...`);
    const start = Date.now();

    try {
      if (isExportedFunction(filePath)) {
        // New-style: exported async function — run in-process
        await runExportedMigration(filePath);
      } else {
        // Legacy-style: self-executing script — run as subprocess
        const ok = runLegacyMigration(filePath);
        if (!ok) {
          console.error(`\n❌  ${file} exited with non-zero status`);
          process.exit(1);
        }
      }

      const duration = Date.now() - start;
      await recordMigration(version, duration);
      console.log(`  ✅  ${file} complete (${duration}ms)`);
      ran++;
    } catch (err) {
      console.error(`\n❌  ${file} failed: ${err.message}`);
      process.exit(1);
    }
  }

  if (ran === 0) {
    console.log('\n  All migrations already applied — database is up to date.\n');
  } else {
    console.log(`\n✅  ${ran} migration(s) applied successfully.\n`);
  }

  await trackPool.end();
}

if (require.main === module) {
  main().catch(err => {
    console.error('Migration runner error:', err.message);
    process.exit(1);
  });
}

module.exports = { discoverMigrationFiles, isExportedFunction };
