/**
 * dotenv 17+ prints "injected env (N) from .env" on every config() call unless
 * it is told to be quiet. `import 'dotenv/config'` is quiet by default; every
 * explicit config() call in the backend (seeds, scripts, the pool shim, new
 * migrations) must pass `quiet: true` so logs stay clean.
 *
 * Applied migrations (db/migrateN.js) are the exception: migration_ledger keeps a
 * checksum of each file, so editing even this line stops every deploy (it did on
 * 13 Nov 2026, #217). db/migrate-all.js sets DOTENV_CONFIG_QUIET instead, which
 * keeps them quiet without touching them.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const SKIP = new Set(['node_modules', 'dist', 'coverage', '.git']);

// The applied migrations that call dotenv without quiet: true (restored by
// #219). This list never grows: new migrations must pass quiet: true.
const APPLIED_LOUD = new Set([
  'migrate.js', 'migrate2.js', 'migrate3.js', 'migrate4.js', 'migrate5.js', 'migrate6.js', 'migrate7.js', 'migrate8.js', 'migrate9.js', 'migrate10.js', 'migrate11.js', 'migrate12.js', 'migrate13.js', 'migrate14.js', 'migrate16.js', 'migrate17.js', 'migrate18.js', 'migrate19.js', 'migrate20.js', 'migrate21.js', 'migrate22.js', 'migrate23.js', 'migrate24.js', 'migrate25.js', 'migrate26.js', 'migrate27.js', 'migrate28.js', 'migrate29.js', 'migrate30.js', 'migrate31.js', 'migrate32.js', 'migrate33.js', 'migrate37.js', 'migrate38.js', 'migrate39.js', 'migrate40.js', 'migrate41.js', 'migrate42.js', 'migrate43.js', 'migrate44.js',
].map((f) => `db/${f}`));
const isAppliedMigration = (rel: string) => APPLIED_LOUD.has(rel.split('\\').join('/'));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(c?js|mjs|ts)$/.test(name) ? [full] : [];
  });
}

describe('dotenv config calls', () => {
  it('all pass quiet: true', () => {
    const loud = sourceFiles(ROOT).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/require\(['"]dotenv['"]\)\.config\(([^)]*)\)/g)]
        .filter((m) => !/quiet:\s*true/.test(m[1]))
        .map(() => file.slice(ROOT.length + 1)),
    ).filter((rel) => !isAppliedMigration(rel));
    expect(loud).toEqual([]);
  });

  it('migrate-all keeps applied migrations quiet without editing them', async () => {
    const src = readFileSync(join(ROOT, 'db', 'migrate-all.js'), 'utf8');
    expect(src).toMatch(/process\.env\.DOTENV_CONFIG_QUIET = 'true'/);
  });
});
