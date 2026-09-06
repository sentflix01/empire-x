/**
 * Run all database migrations in order.
 * Usage: node db/migrate-all.js
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

module.exports = { discoverMigrationFiles, isExportedFunction };

// ── CLI entry point ────────────────────────────────────────────────────────────
if (require.main === module) {
  (async () => {
    console.log('\n🗄️   Running Nodbusiness migrations...\n');

    const files = discoverMigrationFiles();
    let failed = false;

    for (const file of files) {
      const full = path.join(__dirname, file);
      process.stdout.write(`── ${file} ... `);

      if (isExportedFunction(full)) {
        // Modern style: require in-process and call the exported async function
        // with a fresh pool. Errors propagate as a rejected promise.
        try {
          const migrateFn = require(full);
          if (typeof migrateFn !== 'function') {
            throw new Error(`${file} module.exports is not a function`);
          }
          const { Pool } = require('pg');
          const pool = new Pool({ connectionString: process.env.DATABASE_URL });
          try {
            await migrateFn(pool);
          } finally {
            await pool.end().catch(() => {});
          }
          console.log('✓');
        } catch (err) {
          console.log('✗');
          console.error(`\n❌ ${file} failed: ${(err && err.message) || err}`);
          if (err && err.stack) console.error(err.stack);
          failed = true;
          break;
        }
      } else {
        // Legacy style: spawn as a child process so its imports/pool run in
        // isolation. The file's own code does the work at import time.
        const result = spawnSync(process.execPath, [full], {
          stdio: 'inherit',
          env: process.env,
        });
        if (result.status !== 0) {
          console.error(`\n❌ ${file} failed`);
          failed = true;
          break;
        }
      }
    }

    if (failed) {
      process.exit(1);
    } else {
      console.log('\n✅ All migrations complete.\n');
      process.exit(0);
    }
  })();
}
