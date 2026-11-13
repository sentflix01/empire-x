/**
 * dotenv 17+ prints "injected env (N) from .env" on every config() call unless
 * it is told to be quiet. `import 'dotenv/config'` is quiet by default; every
 * explicit config() call in the backend (migrations, seeds, scripts, the pool
 * shim) must pass `quiet: true` so logs stay clean.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const SKIP = new Set(['node_modules', 'dist', 'coverage', '.git']);

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
    );
    expect(loud).toEqual([]);
  });
});
