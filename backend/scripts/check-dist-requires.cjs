#!/usr/bin/env node
/**
 * Fails the image build when compiled code requires a relative file that is
 * not in dist/. tsc only emits .ts files (allowJs is off), so a plain .js
 * module required from TypeScript must be copied by the Dockerfile; when one
 * was missed (lib/builderSectionRequirements.js, 2026-10-16) the server
 * crashed at start-up in production instead of failing the build.
 *
 *   node scripts/check-dist-requires.cjs [distDir]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const dist = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SPECIFIER = /\b(?:require|import)\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
const SKIP_DIRS = new Set(['node_modules', 'uploads', 'backups']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(c?js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const missing = [];
for (const file of walk(dist)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(SPECIFIER)) {
    try {
      require.resolve(match[1], { paths: [path.dirname(file)] });
    } catch {
      missing.push(`${path.relative(dist, file)} -> ${match[1]}`);
    }
  }
}

if (missing.length) {
  console.error(`check-dist-requires: ${missing.length} relative module(s) not found in ${dist}:`);
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}
console.log(`check-dist-requires: every relative require/import in ${dist} resolves.`);
