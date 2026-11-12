#!/usr/bin/env node
/**
 * Strict TypeScript ratchet (audit F-052, docs/operations/TECHNICAL_DEBT.md TD-004).
 *
 *   npm run typecheck:strict            check: no file may have more strict errors than its baseline
 *   npm run typecheck:strict -- --update  rewrite strict-baseline.json from the current counts
 *
 * The whole app is checked with "strict": true (tsconfig.strict.json). Files not in
 * strict-baseline.json must have no errors, so new code is strict from the start.
 * Files in it may only improve: when a file has fewer errors than recorded, the
 * check asks for the baseline to be lowered, so it never creeps back up.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BASELINE = path.join(ROOT, 'strict-baseline.json');

const tsc = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.strict.json', '--noEmit', '--pretty', 'false'], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
});
const output = `${tsc.stdout}${tsc.stderr}`;
if (tsc.status !== 0 && !/error TS\d+/.test(output)) {
  console.error(output);
  process.exit(1); // tsc failed for another reason (bad config, crash)
}

const counts = {};
for (const line of output.split('\n')) {
  const m = /^(.+?)\(\d+,\d+\): error TS\d+/.exec(line);
  if (m) { const key = m[1].split(path.sep).join('/'); counts[key] = (counts[key] ?? 0) + 1; }
}
const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
const total = Object.values(counts).reduce((s, n) => s + n, 0);

if (process.argv.includes('--update')) {
  // The baseline only goes down: fix new errors instead of recording them.
  if (fs.existsSync(BASELINE)) {
    const previous = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    const raised = Object.entries(sorted).filter(([file, n]) => n > (previous[file] ?? 0));
    if (raised.length) {
      console.error('typecheck:strict: refusing to raise the baseline; fix these first:');
      for (const [file, n] of raised) console.error(`  ${file}: ${n} (baseline ${previous[file] ?? 0})`);
      process.exit(1);
    }
  }
  fs.writeFileSync(BASELINE, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`typecheck:strict: baseline written: ${total} errors in ${Object.keys(sorted).length} files.`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
const worse = [];
const better = [];
for (const [file, n] of Object.entries(counts)) {
  const allowed = baseline[file] ?? 0;
  if (n > allowed) worse.push(`${file}: ${n} strict error(s), baseline ${allowed}`);
}
for (const [file, allowed] of Object.entries(baseline)) {
  const n = counts[file] ?? 0;
  if (n < allowed) better.push(`${file}: ${n} (baseline ${allowed})`);
}

if (worse.length) {
  console.error('typecheck:strict: these files have more strict TypeScript errors than allowed:');
  for (const w of worse) console.error('  ' + w);
  console.error('\nFix them (run `npx tsc -p tsconfig.strict.json --noEmit` to see the errors). New files must be strict-clean.');
  for (const line of output.split('\n')) if (worse.some((w) => line.startsWith(w.split(':')[0] + '('))) console.error(line);
  process.exit(1);
}
if (better.length) {
  console.error('typecheck:strict: these files improved; lower their baseline with `npm run typecheck:strict -- --update`:');
  for (const b of better) console.error('  ' + b);
  process.exit(1);
}
console.log(`typecheck:strict: OK: ${total} known strict errors in ${Object.keys(counts).length} files, none new.`);
