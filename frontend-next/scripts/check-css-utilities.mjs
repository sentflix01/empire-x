#!/usr/bin/env node
/**
 * Fails when the app source uses a Tailwind utility that `next build` did not
 * generate (a missing theme token or plugin, or a typo). Run after a build:
 *   npm run build && npm run check:css
 * See scripts/cssUtilityCheck.mjs for how candidates are matched.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findMissingUtilities } from './cssUtilityCheck.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_DIRS = ['app', 'components', 'views', 'lib', 'hooks', 'store', 'api'];
const SOURCE_EXT = /\.(tsx?|jsx?|mjs)$/;

function walk(dir, keep, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, keep, out);
    else if (keep(path)) out.push(path);
  }
  return out;
}

const cssFiles = walk(join(root, '.next', 'static'), (p) => p.endsWith('.css'));
if (!cssFiles.length) {
  console.error('check:css: no built CSS under .next/static. Run `npm run build` first.');
  process.exit(2);
}
const css = cssFiles.map((p) => readFileSync(p, 'utf8')).join('\n');

const sources = new Map();
for (const dir of SOURCE_DIRS) {
  for (const file of walk(join(root, dir), (p) => SOURCE_EXT.test(p))) {
    sources.set(relative(root, file).replace(/\\/g, '/'), readFileSync(file, 'utf8'));
  }
}

const missing = findMissingUtilities(sources, css);
if (missing.length) {
  console.error(`check:css: ${missing.length} Tailwind utilities are used but were not generated:\n`);
  for (const { name, files } of missing) {
    console.error(`  ${name}  (${files.slice(0, 3).join(', ')}${files.length > 3 ? `, +${files.length - 3} more` : ''})`);
  }
  console.error('\nDefine the token in app/globals.css (@theme), load the plugin there, fix the typo,');
  console.error('or, if the string is not a class, add it to ALLOWED in scripts/cssUtilityCheck.mjs.');
  process.exit(1);
}
console.log(`check:css: all ${sources.size} source files' Tailwind utilities are in the built CSS.`);
