/**
 * Run database migrations in order, once each (ledger: migration_ledger).
 * Usage: node db/migrate-all.js [--status | --all | --rerun <file>]
 *
 * The runner auto-discovers migration files in this directory. The base
 * migration (`migrate.js`) runs first, then `migrate2.js`, `migrate3.js`,
 * etc. in numeric order.
 *
 * Two styles of migration are supported:
 *
 *   1. Legacy — the file runs side-effect code at import time and exits
 *      with status 0 on success. Detected by the absence of `module.exports`.
 *      Run as a child process so its pool / state is isolated.
 *
 *   2. Exported — the file does `module.exports = async function migrateNN(pool) {}`
 *      and is invoked directly in this process. Safer because:
 *        - We can classify the file by reading its source, not by executing
 *          it (test: isExportedFunction never has to run a legacy migration
 *          just to figure out what kind of file it is).
 *        - The runner can `await` the migration's promise and surface
 *          errors with proper stack traces.
 *
 * Exports (used by tests + programmatic callers):
 *   - discoverMigrationFiles(): array of filenames in run order
 *   - isExportedFunction(filepath): boolean, true if file is the exported style
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Returns the list of migration filenames to run, in order.
 * `migrate.js` (the base) is always first, then `migrate2.js` through
 * `migrateNN.js` in ascending numeric order. The runner itself
 * (`migrate-all.js`) is excluded.
 */
function discoverMigrationFiles() {
  const all = fs
    .readdirSync(__dirname)
    .filter((f) => /^migrate\d*\.js$/.test(f) && f !== 'migrate-all.js');

  // Sort: base ("migrate.js") before numbered. The "migrate.js" name
  // sorts before "migrate2.js" lexicographically, so a plain sort would
  // already do the right thing — but be explicit for clarity and to
  // tolerate future files like "migrate-extra.js".
  const numbered = all
    .filter((f) => /^migrate\d+\.js$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/migrate(\d+)\.js$/)[1], 10);
      const nb = parseInt(b.match(/migrate(\d+)\.js$/)[1], 10);
      return na - nb;
    });
  const base = all.filter((f) => f === 'migrate.js');
  return [...base, ...numbered];
}

/**
 * Detects whether a migration file is the "exported" style without
 * executing it. Reads the file as text and looks for a top-level
 * `module.exports = ...` assignment. This is critical for legacy files:
 * requiring them would RUN them, which could touch the database.
 *
 * @param {string} filepath  Absolute or relative path to the migration.
 * @returns {boolean}        true if the file exports a function/value
 *                           via `module.exports = ...`, false otherwise.
 */
function isExportedFunction(filepath) {
  let source;
  try {
    source = fs.readFileSync(filepath, 'utf8');
  } catch {
    return false;
  }
  // Match `module.exports = ...` at the top level. Allow any whitespace
  // and any expression on the right-hand side. We don't try to validate
  // that the RHS is actually a function — the file's own behavior will
  // tell us at require-time if it isn't.
  return /module\.exports\s*=/.test(source);
}

// ── Ledger (audit F-009) ──────────────────────────────────────────────────────
// migration_ledger records each migration that succeeded, with a checksum of
// the file. A recorded migration is skipped; a recorded file whose checksum
// changed stops the run (put changes in a new migration, or pass --rerun).
// On a database without the ledger every migration runs once more (they are
// all idempotent, as before) and is then recorded.

const LEDGER_SQL = `
  CREATE TABLE IF NOT EXISTS migration_ledger (
    name         TEXT PRIMARY KEY,
    checksum     TEXT NOT NULL,
    runner       TEXT NOT NULL,
    duration_ms  INTEGER,
    runs         INTEGER NOT NULL DEFAULT 1,
    applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

// The ledger is not called schema_migrations: production already had a table
// by that name from another tool, with other columns, and the first deploy
// failed on it. If a table named migration_ledger exists with other columns,
// stop with a clear message rather than touch it.
const LEDGER_COLUMNS = ['name', 'checksum', 'runner', 'duration_ms', 'runs', 'applied_at'];
async function assertLedgerShape(client) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'migration_ledger'`,
  );
  const have = new Set(rows.map((r) => r.column_name));
  const missing = LEDGER_COLUMNS.filter((c) => !have.has(c));
  if (missing.length) {
    throw new Error(
      `Table migration_ledger exists but is not this runner's ledger (missing: ${missing.join(', ')}). ` +
      'Nothing was run. Rename or inspect that table before deploying.',
    );
  }
}

// One migration run at a time per database (pg_advisory_lock, session level).
const LOCK_KEY = 724311009;

/** sha256 of the file's text, with line endings normalised. */
function fileChecksum(filepath) {
  const text = fs.readFileSync(filepath, 'utf8').replace(/\r\n/g, '\n');
  return require('crypto').createHash('sha256').update(text).digest('hex');
}

/**
 * Decides what to run. `applied` maps name → recorded checksum.
 * Returns { run: [{file, reason}], skipped: [...], changed: [...] } where
 * changed lists recorded files whose text differs and were not allowed to re-run.
 */
function planMigrations(files, checksums, applied, opts = {}) {
  const rerun = new Set(opts.rerun || []);
  const plan = { run: [], skipped: [], changed: [] };
  for (const file of files) {
    const recorded = applied.get(file);
    if (opts.all) plan.run.push({ file, reason: recorded ? 'all' : 'pending' });
    else if (recorded === undefined) plan.run.push({ file, reason: 'pending' });
    else if (recorded !== checksums.get(file)) {
      if (rerun.has(file)) plan.run.push({ file, reason: 'changed' });
      else plan.changed.push(file);
    } else if (rerun.has(file)) plan.run.push({ file, reason: 'rerun' });
    else plan.skipped.push(file);
  }
  return plan;
}

function parseArgs(argv) {
  const opts = { all: false, status: false, rerun: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--all') opts.all = true;
    else if (a === '--status') opts.status = true;
    else if (a === '--rerun') opts.rerun.push(argv[++i]);
    else if (a.startsWith('--rerun=')) opts.rerun.push(a.slice('--rerun='.length));
    else throw new Error(`Unknown option ${a}. Use --status, --all or --rerun <file>.`);
  }
  return opts;
}

async function runOne(file) {
  const full = path.join(__dirname, file);
  if (isExportedFunction(full)) {
    const migrateFn = require(full);
    if (typeof migrateFn !== 'function') throw new Error(`${file} module.exports is not a function`);
    const { Pool } = require('pg');
    const shimOptions = require('./poolJsShim.cjs').poolOptions;
    const pool = new Pool(shimOptions(process.env.DATABASE_URL));
    try { await migrateFn(pool); } finally { await pool.end().catch(() => {}); }
    return 'exported';
  }
  // Legacy style: its own process, so its imports and pool run in isolation.
  const result = spawnSync(process.execPath, [full], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) throw new Error(`${file} exited with status ${result.status}`);
  return 'legacy';
}

async function main(argv) {
  const opts = parseArgs(argv);
  const files = discoverMigrationFiles();
  const checksums = new Map(files.map((f) => [f, fileChecksum(path.join(__dirname, f))]));
  const unknown = opts.rerun.filter((f) => !files.includes(f));
  if (unknown.length) throw new Error(`--rerun names unknown migration(s): ${unknown.join(', ')}`);

  const { Client } = require('pg');
  const shimOptions = require('./poolJsShim.cjs').poolOptions;
  const client = new Client(shimOptions(process.env.DATABASE_URL));
  await client.connect();
  try {
    await client.query(LEDGER_SQL);
    await assertLedgerShape(client);
    const { rows } = await client.query('SELECT name, checksum, applied_at FROM migration_ledger');
    const applied = new Map(rows.map((r) => [r.name, r.checksum]));

    if (opts.status) {
      const plan = planMigrations(files, checksums, applied);
      const orphaned = rows.filter((r) => !files.includes(r.name)).map((r) => r.name);
      console.log(`\nMigrations: ${files.length} files, ${applied.size} recorded`);
      console.log(`  applied: ${plan.skipped.length}`);
      console.log(`  pending: ${plan.run.length}${plan.run.length ? ` (${plan.run.map((r) => r.file).join(', ')})` : ''}`);
      console.log(`  changed since applied: ${plan.changed.length}${plan.changed.length ? ` (${plan.changed.join(', ')})` : ''}`);
      if (orphaned.length) console.log(`  recorded but no file: ${orphaned.join(', ')}`);
      return 0;
    }

    console.log('\n🗄️   Running Nodbusiness migrations...\n');
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    // Re-read after waiting for any other run to finish.
    const fresh = new Map((await client.query('SELECT name, checksum FROM migration_ledger')).rows.map((r) => [r.name, r.checksum]));
    const plan = planMigrations(files, checksums, fresh, opts);

    if (plan.changed.length) {
      console.error(`\n❌ Applied migration(s) changed since they ran: ${plan.changed.join(', ')}`);
      console.error('   Put schema changes in a new migrate<N>.js. If re-running the edited file is intended,');
      console.error(`   run: node db/migrate-all.js --rerun ${plan.changed[0]}\n`);
      return 1;
    }
    if (!plan.run.length) { console.log(`✅ Nothing to run: all ${files.length} migrations are recorded.\n`); return 0; }

    for (const { file, reason } of plan.run) {
      process.stdout.write(`── ${file}${reason === 'pending' ? '' : ` (${reason})`} ... `);
      const started = Date.now();
      try {
        const runner = await runOne(file);
        await client.query(
          `INSERT INTO migration_ledger (name, checksum, runner, duration_ms) VALUES ($1, $2, $3, $4)
           ON CONFLICT (name) DO UPDATE SET checksum = EXCLUDED.checksum, runner = EXCLUDED.runner,
             duration_ms = EXCLUDED.duration_ms, runs = migration_ledger.runs + 1, applied_at = NOW()`,
          [file, checksums.get(file), runner, Date.now() - started],
        );
        console.log('✓');
      } catch (err) {
        console.log('✗');
        console.error(`\n❌ ${file} failed: ${(err && err.message) || err}`);
        if (err && err.stack) console.error(err.stack);
        console.error('   It is not recorded, so the next run tries it again.\n');
        return 1;
      }
    }
    console.log(`\n✅ ${plan.run.length} migration(s) applied; ${plan.skipped.length} already recorded.\n`);
    return 0;
  } finally {
    await client.query('SELECT pg_advisory_unlock_all()').catch(() => {});
    await client.end().catch(() => {});
  }
}

module.exports = { discoverMigrationFiles, isExportedFunction, fileChecksum, planMigrations, parseArgs };

// ── CLI entry point ────────────────────────────────────────────────────────────
//   node db/migrate-all.js            run pending migrations and record them
//   node db/migrate-all.js --status   show applied / pending / changed, run nothing
//   node db/migrate-all.js --all      run every migration again (idempotency check)
//   node db/migrate-all.js --rerun migrate86.js   run one recorded migration again
if (require.main === module) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => { console.error(`\n❌ ${(err && err.message) || err}\n`); process.exit(1); });
}
