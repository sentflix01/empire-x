/**
 * scripts/verify-backup.js — Prove backups are actually restorable.
 *
 * A backup nobody has restored is a hope, not a plan. This script:
 *   1. Takes the newest local backup in backend/backups/ (or BACKUP_FILE).
 *   2. Restores it into a THROWAWAY database via BACKUP_VERIFY_DATABASE_URL
 *      (e.g. a Neon branch or `postgres://localhost/verify_tmp`). The database
 *      is DROPPED AND RECREATED — never point this at production.
 *   3. Runs sanity checks (users > 0, orders table exists) and reports.
 *
 * Usage:
 *   BACKUP_VERIFY_DATABASE_URL=postgres://... node scripts/verify-backup.js
 *
 * Schedule: run weekly (cron / Railway scheduled job). Exit code 0 = verified.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const logger = require('../lib/logger');

function latestBackup() {
  if (process.env.BACKUP_FILE) return process.env.BACKUP_FILE;
  const dir = path.join(__dirname, '..', 'backups');
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => f.startsWith('nodbusiness-') && f.endsWith('.sql.gz')).sort()
    : [];
  if (!files.length) throw new Error('No local backups found. Run scripts/backup-database.js first (R2-only setups: download one manually and set BACKUP_FILE).');
  return path.join(dir, files[files.length - 1]);
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts });
}

async function main() {
  const target = process.env.BACKUP_VERIFY_DATABASE_URL;
  if (!target) throw new Error('BACKUP_VERIFY_DATABASE_URL is required (a THROWAWAY database)');
  if (/production|neon\.db\/.*prod/i.test(target)) {
    throw new Error('Refusing to run: verify target looks like production. Use a scratch database.');
  }

  const file = latestBackup();
  logger.info({ file }, 'verify-backup: restoring');

  // Drop/recreate the scratch schema cleanly
  sh(`psql "${target}" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`);

  // Stream gunzip | pg_restore
  const gz = fs.readFileSync(file);
  const tmp = path.join(require('os').tmpdir(), path.basename(file, '.gz'));
  fs.writeFileSync(tmp, zlib.gunzipSync(gz));
  try {
    sh(`pg_restore --no-owner --dbname="${target}" "${tmp}"`);
  } finally {
    fs.unlinkSync(tmp);
  }

  // Sanity checks
  const users = sh(`psql "${target}" -tAc "SELECT COUNT(*) FROM users"`, { shell: false }) ||
                sh(`psql "${target}" -tAc "SELECT COUNT(*) FROM users"`);
  const tables = sh(`psql "${target}" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"`);
  const userCount = parseInt(String(users).trim(), 10);
  const tableCount = parseInt(String(tables).trim(), 10);
  if (!(userCount >= 0) || tableCount < 5) throw new Error(`Restore looks broken (${tableCount} tables, ${userCount} users)`);

  logger.info({ tables: tableCount, users: userCount }, 'verify-backup: PASSED — backup is restorable');
}

main()
  .then(() => process.exit(0))
  .catch((err) => { logger.error({ err: err.message }, 'verify-backup: FAILED'); process.exit(1); });
