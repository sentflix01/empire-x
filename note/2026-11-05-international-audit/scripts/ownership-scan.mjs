#!/usr/bin/env node
/**
 * Heuristic triage for object-level authorization (OWASP API1:2023).
 * For every authenticated route with a path parameter, extracts the handler
 * body and reports whether it references the caller (req.user) at all.
 * A "no caller reference" route is not automatically vulnerable — it is a
 * candidate for the live two-account check.
 *
 *   node note/2026-11-05-international-audit/scripts/ownership-scan.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const audit = join(dirname(fileURLToPath(import.meta.url)), '..');
const backend = join(audit, '..', '..', 'backend');
const { endpoints } = JSON.parse(readFileSync(join(audit, 'inventory', 'endpoints.json'), 'utf8'));

const sources = new Map();
const out = [];
for (const e of endpoints) {
  if (!['auth', 'optional'].includes(e.access) || !e.path.includes('/:')) continue;
  const file = join(backend, e.module);
  if (!sources.has(file)) sources.set(file, readFileSync(file, 'utf8'));
  const src = sources.get(file);
  // Find the router.<method>('<subpath>' declaration for this endpoint.
  const sub = e.path.replace(/^\/api\/[^/]+(\/:[^/]+\/external-sources)?/, '') || '/';
  const decl = new RegExp(`router\\.${e.method.toLowerCase()}\\(\\s*(\\[[^\\]]*)?['"\`]${sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`);
  const m = decl.exec(src);
  if (!m) { out.push({ ...e, verdict: 'not-located' }); continue; }
  // Handler body: from the declaration to the next top-level router.<verb>( or end of file.
  const rest = src.slice(m.index + 1);
  const next = rest.search(/\nrouter\.(get|post|put|patch|delete|use)\(/);
  const body = next === -1 ? rest : rest.slice(0, next);
  const refsCaller = /\b\w+\(\s*req\b|\(req, res\)|req\.user|req\.user!|requireOwner|assertOwner|ownsBusiness|canManage|isOwner|owner_id|seller_id\s*=|user_id\s*=/.test(body);
  const line = src.slice(0, m.index).split('\n').length;
  out.push({ method: e.method, path: e.path, access: e.access, at: `${e.module}:${line}`, verdict: refsCaller ? 'references-caller' : 'NO-CALLER-REFERENCE' });
}

writeFileSync(join(audit, 'inventory', 'ownership-scan.json'), JSON.stringify(out, null, 2) + '\n');
const by = (v) => out.filter((o) => o.verdict === v);
console.log(`param routes=${out.length} references-caller=${by('references-caller').length} no-caller-reference=${by('NO-CALLER-REFERENCE').length} not-located=${by('not-located').length}`);
for (const o of by('NO-CALLER-REFERENCE')) console.log(`  ${o.method.padEnd(6)} ${o.path.padEnd(52)} ${o.access.padEnd(8)} ${o.at}`);
