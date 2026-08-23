/**
 * scripts/backup-database.js — Automated database backups (TD-020 / audit item O-19)
 *
 * What it does:
 *   1. Dumps DATABASE_URL with pg_dump (custom-format → gzip).
 *   2. Uploads to Cloudflare R2 when configured, otherwise stores locally under
 *      backend/backups/ (dev fallback — NOT durable enough for production).
 *   3. Enforces retention: keeps the newest BACKUP_RETENTION_DAYS days (default 14).
 *   4. Records the outcome in app_settings key 'last_database_backup' so the
 *      monitoring/alerting layer can page when backups go stale.
 *
 * Schedule: startBackupSchedule() runs once per day (checked hourly), mirroring
 * the cleanupStories convention. Enable outside production with
 * BACKUP_SCHEDULE_ENABLED=true.
 *
 * Requirements: `pg_dump` must be on PATH (postgresql-client). On minimal
 * containers install it or point DATABASE dumps at a host that has it.
 *
 * Manual run:  node scripts/backup-database.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Manual/CLI runs need the same env the server has.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const logger = require('../lib/logger');
let recordEvent=null; try{recordEvent=require('../lib/telemetry').recordEvent;}catch{}
const pool = require('../db/pool');

const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS ?? '14', 10);
const LOCAL_DIR = path.join(__dirname, '..', 'backups');

function hasR2() {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID &&
            process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
}

function recordOutcome(status, extra = {}) {
  // Best-effort telemetry — never fail the backup because bookkeeping failed.
  const payload = JSON.stringify({ at: new Date().toISOString(), status, ...extra });
  return pool.query(
    `INSERT INTO app_settings (key,value) VALUES ('last_database_backup',$1)
     ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
    [payload],
  ).catch((err) => logger.warn({ err: err.message }, 'backup: could not record outcome'));
}

async function uploadToR2(filePath, key) {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const body = fs.createReadStream(filePath);
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: 'application/gzip',
  }));
  // Verify the object really landed (size > 0) before declaring success.
  const { HeadObjectCommand } = require('@aws-sdk/client-s3');
  const head = await client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  if (!head.ContentLength) throw new Error('R2 object empty after upload');
  return head.ContentLength;
}

async function pruneLocal() {
  if (!fs.existsSync(LOCAL_DIR)) return 0;
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const f of fs.readdirSync(LOCAL_DIR)) {
    const full = path.join(LOCAL_DIR, f);
    try {
      if (f.startsWith('nodbusiness-') && f.endsWith('.sql.gz') && fs.statSync(full).mtimeMs < cutoff) {
        fs.unlinkSync(full);
        removed++;
      }
    } catch { /* ignore individual file errors */ }
  }
  return removed;
}

async function runBackup() {
  const startedAt = Date.now();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const baseName = `nodbusiness-${stamp}.sql`;
  const gzPath = path.join(LOCAL_DIR, `${baseName}.gz`);

  if (!process.env.DATABASE_URL) {
    logger.warn('backup: DATABASE_URL not set — skipping');
    await recordOutcome('skipped', { reason: 'no_database_url' });
    return { ok: false, reason: 'no_database_url' };
  }
  fs.mkdirSync(LOCAL_DIR, { recursive: true });

  // ── Dump (pg_dump custom format piped through gzip) ────────────────────────
  await new Promise((resolve, reject) => {
    const dump = spawn('pg_dump', ['--no-owner', '--format=custom', process.env.DATABASE_URL], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const gzip = zlib.createGzip();
    const out = fs.createWriteStream(gzPath);
    let stderr = '';
    dump.stderr.on('data', (d) => { stderr += d; });
    dump.on('error', (err) => {
      const hint = err.code === 'ENOENT'
        ? 'pg_dump is not installed or not on PATH. Install PostgreSQL client tools (e.g. apt-get install -y postgresql-client on the deploy image, or add a Railway start command that ensures it).'
        : undefined;
      reject(Object.assign(err, { hint }));
    });
    gzip.on('error', reject);
    out.on('error', reject);
    out.on('finish', resolve);
    dump.stdout.pipe(gzip).pipe(out);
    dump.on('close', (code) => {
      if (code !== 0) reject(new Error(`pg_dump exited ${code}: ${stderr.slice(0, 500)}`));
    });
  });

  const size = fs.statSync(gzPath).size;
  if (size === 0) throw new Error('Backup file is empty');

  // ── Store ───────────────────────────────────────────────────────────────────
  let destination;
  if (hasR2()) {
    const key = `backups/${path.basename(gzPath)}`;
    const uploaded = await uploadToR2(gzPath, key);
    fs.unlinkSync(gzPath); // durable copy exists remotely — drop local temp
    destination = `r2:${key} (${uploaded} bytes)`;
  } else {
    destination = `local:${gzPath} (${size} bytes)`;
    logger.warn('backup: R2 not configured — backup kept on local disk only (NOT durable)');
  }

  const pruned = await pruneLocal();
  const durationMs = Date.now() - startedAt;
  logger.info({ destination, durationMs, pruned }, 'backup: completed');
  await recordOutcome('ok', { destination, durationMs });
  if(recordEvent)recordEvent('backup_completed',{destination,durationMs});
  return { ok: true, destination, durationMs };
}

async function backupDue() {
  try {
    const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key='last_database_backup'`);
    const last = rows[0]?.value?.at ? Date.parse(rows[0].value.at) : 0;
    return Date.now() - last > 24 * 60 * 60 * 1000;
  } catch {
    return true; // settings table missing → attempt anyway
  }
}

function startBackupSchedule() {
  const enabled = process.env.NODE_ENV === 'production' || process.env.BACKUP_SCHEDULE_ENABLED === 'true';
  if (!enabled) {
    logger.info('backup: schedule disabled (non-production)');
    return;
  }
  const tick = async () => {
    try { if (await backupDue()) await runBackup(); }
    catch (err) {
      logger.error({ err: err.message, hint: err.hint }, 'backup: FAILED');
      recordOutcome('failed', { error: String(err.message).slice(0, 300) });
    }
  };
  // Hourly check; the actual dump happens at most once per 24h (backupDue).
  setInterval(tick, 60 * 60 * 1000).unref();
  setTimeout(tick, 5_000).unref();
  logger.info('backup: daily schedule active (retention %s days)', RETENTION_DAYS);
}

module.exports = { runBackup, startBackupSchedule };

// CLI entry point
if (require.main === module) {
  runBackup()
    .then((r) => process.exit(r.ok ? 0 : 1))
    .catch((err) => { logger.error({ err: err.message, hint: err.hint }, 'backup: failed'); process.exit(1); });
}
