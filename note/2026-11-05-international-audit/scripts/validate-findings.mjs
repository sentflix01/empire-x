#!/usr/bin/env node
/**
 * Validates every findings/F-NNN.json against findings.schema.json rules,
 * without third-party dependencies. Exits 1 on any problem.
 *
 * Usage: node note/2026-11-05-international-audit/scripts/validate-findings.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(readFileSync(join(root, 'findings.schema.json'), 'utf8'));
const findingsDir = join(root, 'findings');
const props = schema.properties;
const errors = [];
const seen = new Set();

function check(file, f) {
  const e = (msg) => errors.push(`${file}: ${msg}`);
  for (const key of schema.required) if (!(key in f)) e(`missing "${key}"`);
  for (const key of Object.keys(f)) if (!(key in props)) e(`unknown field "${key}"`);

  for (const [key, rule] of Object.entries(props)) {
    if (!(key in f)) continue;
    const v = f[key];
    if (rule.enum && !rule.enum.includes(v)) e(`"${key}" must be one of ${rule.enum.join(', ')}`);
    if (rule.type === 'string') {
      if (typeof v !== 'string' || v.trim() === '') e(`"${key}" must be a non-empty string`);
      else {
        if (rule.pattern && !new RegExp(rule.pattern).test(v)) e(`"${key}" does not match ${rule.pattern}`);
        if (rule.minLength && v.length < rule.minLength) e(`"${key}" is shorter than ${rule.minLength}`);
        if (rule.maxLength && v.length > rule.maxLength) e(`"${key}" is longer than ${rule.maxLength}`);
        if (rule.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) e(`"${key}" must be YYYY-MM-DD`);
      }
    }
    if (rule.type === 'array') {
      if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || x.trim() === '')) e(`"${key}" must be an array of non-empty strings`);
      else if (rule.minItems && v.length < rule.minItems) e(`"${key}" needs at least ${rule.minItems} item(s)`);
    }
  }

  if (`${f.id}.json` !== file) e(`file name must match id (${f.id}.json)`);
  if (seen.has(f.id)) e(`duplicate id ${f.id}`);
  seen.add(f.id);

  // Evidence rules: no PASS by default.
  if (f.status === 'UNVERIFIED' && !f.unverified_reason) e('UNVERIFIED needs "unverified_reason"');
  if (f.status === 'CONFIRMED' && (!f.steps || f.steps.length === 0) && f.environment !== 'repository')
    e('CONFIRMED runtime findings need reproduction "steps"');
  if (f.phase === 'P5-security' && f.status === 'CONFIRMED' && f.severity !== 'Info' && f.kind !== 'hardening' && !f.cvss_v4)
    e('confirmed security vulnerabilities need "cvss_v4" (set kind: "hardening" for missing defence-in-depth controls)');
  if (f.kind === 'positive' && f.status !== 'POSITIVE') e('kind "positive" requires status POSITIVE');
  if (f.cvss_v4) {
    const c = f.cvss_v4;
    if (typeof c.vector !== 'string' || !c.vector.startsWith('CVSS:4.0/')) e('cvss_v4.vector must start with CVSS:4.0/');
    if (typeof c.score !== 'number' || c.score < 0 || c.score > 10) e('cvss_v4.score must be 0–10');
  }
  for (const ev of f.evidence ?? []) {
    if (ev.startsWith('evidence/') && !existsSync(join(root, ev))) e(`evidence file not found: ${ev}`);
  }
}

const files = existsSync(findingsDir) ? readdirSync(findingsDir).filter((n) => n.endsWith('.json')).sort() : [];
for (const file of files) {
  try {
    check(file, JSON.parse(readFileSync(join(findingsDir, file), 'utf8')));
  } catch (err) {
    errors.push(`${file}: invalid JSON (${err.message})`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) in ${files.length} finding(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ ${files.length} finding(s) valid`);
