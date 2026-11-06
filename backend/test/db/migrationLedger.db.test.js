'use strict';

/**
 * Migration ledger (audit F-009) against real Postgres: each migration is
 * recorded once, a second run does nothing, status reports it, and a second
 * runner waits for the first (advisory lock).
 */
const path = require('path');
const { execFileSync, spawn } = require('child_process');
const { Client } = require('pg');
const { pool } = require('./helpers');
const { discoverMigrationFiles } = require('../../db/migrate-all');

const RUNNER = path.join(__dirname, '../../db/migrate-all.js');
const run = (...args) => execFileSync(process.execPath, [RUNNER, ...args], { env: process.env, encoding: 'utf8', timeout: 110000 });

it('records every migration file, and a second run has nothing to do', async () => {
  run();
  const { rows } = await pool.query('SELECT name, checksum, runner FROM schema_migrations');
  const recorded = new Set(rows.map((r) => r.name));
  for (const file of discoverMigrationFiles()) expect(recorded.has(file)).toBe(true);
  expect(rows.every((r) => /^[0-9a-f]{64}$/.test(r.checksum) && ['legacy', 'exported'].includes(r.runner))).toBe(true);
  expect(run()).toMatch(/Nothing to run/);
  expect(run('--status')).toMatch(/pending: 0/);
});

it('runs a migration whose record is missing, and only that one', async () => {
  await pool.query("DELETE FROM schema_migrations WHERE name = 'migrate86.js'");
  expect(run('--status')).toMatch(/pending: 1 \(migrate86\.js\)/);
  expect(run()).toMatch(/1 migration\(s\) applied/);
});

it('a second runner waits while another holds the migration lock', async () => {
  const holder = new Client({ connectionString: process.env.DATABASE_URL });
  await holder.connect();
  await holder.query('SELECT pg_advisory_lock(724311009)');
  const child = spawn(process.execPath, [RUNNER], { env: process.env });
  let done = false;
  const finished = new Promise((resolve) => child.on('exit', (code) => { done = true; resolve(code); }));
  await new Promise((r) => setTimeout(r, 1500));
  expect(done).toBe(false);
  await holder.query('SELECT pg_advisory_unlock(724311009)');
  await holder.end();
  expect(await finished).toBe(0);
});
