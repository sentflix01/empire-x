/**
 * The brand mark is the Nodbusiness emblem (components/brand/BrandLogo.tsx).
 * Crowns — the 👑 emoji or lucide's Crown icon — were replaced everywhere in
 * October 2026 and must not come back.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(__dirname, '..', '..');
const SCAN = ['app', 'components', 'views', 'lib', 'locales', 'hooks', 'api'];
const SOURCE = /\.(tsx?|jsx?|json)$/;

function files(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(files(full));
    else if (SOURCE.test(name)) out.push(full);
  }
  return out;
}

describe('brand mark', () => {
  const sources = SCAN.flatMap((d) => files(join(root, d)));

  it('scans the app source', () => {
    expect(sources.length).toBeGreaterThan(100);
  });

  it('uses no crown emoji', () => {
    const hits = sources.filter((f) => readFileSync(f, 'utf8').includes('\u{1F451}')).map((f) => relative(root, f));
    expect(hits).toEqual([]);
  });

  it('imports no Crown icon from lucide-react', () => {
    const lucideImport = /import\s*\{[^}]*\bCrown\b[^}]*\}\s*from\s*['"]lucide-react['"]/;
    const hits = sources.filter((f) => lucideImport.test(readFileSync(f, 'utf8'))).map((f) => relative(root, f));
    expect(hits).toEqual([]);
  });
});
