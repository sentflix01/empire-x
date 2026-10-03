#!/usr/bin/env node
/**
 * audit-ignore-list.cjs — filter npm audit JSON for a strict CI gate
 *
 * Usage: node audit-ignore-list.cjs <audit.json> "['GHSA-xxxx-xxxx-xxxx']"
 *
 * Exits 1 if any vulnerability of severity high/critical remains after
 * excluding advisories listed in the ignore list. The reason for each
 * ignore entry belongs next to it in ci.yml — every entry must be
 * reviewed before removal.
 */
const fs = require('fs');

const [auditPath, ignoreJson] = process.argv.slice(2);
if (!auditPath || ignoreJson === undefined) {
  console.error('Usage: audit-ignore-list.cjs <audit.json> "[\'GHSA-id\', ...]"');
  process.exit(2);
}

const ignore = new Set(
  ignoreJson
    .replace(/^[\["']+|[\]"']+$/g, '')
    .split(',')
    .map((s) => s.trim().replace(/^["']+|["']+$/g, ''))
    .filter(Boolean)
);
const report = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

const flaggedAdvisories = new Set();
for (const info of Object.values(report.vulnerabilities ?? {})) {
  if (!['high', 'critical'].includes(info.severity)) continue;
  for (const via of info.via ?? []) {
    if (typeof via === 'string') continue;
    const id = /GHSA-[\w-]+/.exec(via.url ?? '')?.[0];
    if (id && !ignore.has(id)) flaggedAdvisories.add(id);
  }
}

if (flaggedAdvisories.size > 0) {
  console.error('Blocking audit findings (after ignore list):');
  for (const id of flaggedAdvisories) console.error('  - ' + id);
  process.exit(1);
}
console.log(`Audit passed (ignore list ok, ${[...ignore].length} advisory ignored).`);
