/**
 * Logo files are addressed through lib/brandAssets.ts. A changed logo gets a
 * new file name so no browser, service worker or installed app can keep
 * showing the old copy (the black logo stayed visible after the November 2026
 * colour change because the old name was cached).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { BRAND, BRAND_RENAMES } from '@/lib/brandAssets';

const root = join(__dirname, '..', '..');
const pub = (p: string) => join(root, 'public', p);
const SCAN = ['app', 'components', 'views', 'lib', 'hooks'];

function sources(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(sources(full));
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

describe('brand assets', () => {
  it('every logo address points at a file in public/', () => {
    for (const p of Object.values(BRAND)) expect(existsSync(pub(p)), p).toBe(true);
  });

  it('old names are gone from public/ and redirect to a current file', () => {
    const current = new Set<string>(Object.values(BRAND));
    for (const [oldPath, target] of BRAND_RENAMES) {
      expect(existsSync(pub(oldPath)), oldPath).toBe(false);
      expect(current.has(target)).toBe(true);
    }
  });

  it('no source file uses an old logo name', () => {
    const old = BRAND_RENAMES.map(([o]) => o);
    const offenders = SCAN.flatMap((d) => sources(join(root, d)))
      .filter((f) => !f.endsWith(join('lib', 'brandAssets.ts')))
      .filter((f) => { const s = readFileSync(f, 'utf8'); return old.some((o) => s.includes(o)); })
      .map((f) => relative(root, f));
    expect(offenders).toEqual([]);
  });

  it('the manifest and service worker use current icon files', () => {
    const manifest = JSON.parse(readFileSync(pub('manifest.json'), 'utf8')) as { icons: Array<{ src: string }> };
    const sw = readFileSync(pub('sw.js'), 'utf8');
    const used = [...manifest.icons.map((i) => i.src), ...(sw.match(/\/icons\/[\w.-]+/g) ?? [])];
    expect(used.length).toBeGreaterThan(0);
    for (const p of used) expect(existsSync(pub(p)), p).toBe(true);
  });
});
