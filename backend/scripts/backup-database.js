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
const LOCAL_DIR = path.join('/app', 'backups');

function getBackupConnectionString() {
  // Allow explicit override for backup (e.g., use pooler on Render to avoid IPv6)
  const raw = process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL;
  // pg_dump rejects the driver's `pgbouncer=true` parameter and cannot dump
  // through the Supabase transaction pooler. Always use the sanitized URL.
  return stripPgbouncerParam(raw);
}

// Build pg_dump arguments with optional IPv4 forcing
function getPgDumpArgs(dumpUrl) {
  const args = ['--no-owner', '--format=custom', dumpUrl];
  // Force IPv4 connection if requested (helps on Render where IPv6 to Supabase fails)
  if (process.env.BACKUP_FORCE_IPV4 === 'true') {
    // Extract host from URL for -h flag
    const hostMatch = dumpUrl.match(/@([^:]+):(\d+)/);
    if (hostMatch) {
      args.unshift('-h', hostMatch[1]);
    }
  }
  return args;
}

function stripPgbouncerParam(raw) {
  if (!raw) return raw;
  // Remove pgbouncer=true parameter
  let cleaned = raw.replace(/[?&]pgbouncer=true(?=&|$)/, '');
  cleaned = cleaned.replace(/[?&]$/, '');
  // pg_dump cannot use the Supabase transaction pooler (it requires SNI/session mode).
  // Convert pooler URL back to the direct Supabase connection string.
  // Pooler format:  postgres.PROJECT_REF:password@pooler-host:6543
  // Direct format:  postgres:password@db.PROJECT_REF.supabase.co:5432
  if (cleaned.includes('pooler.supabase.com')) {
    // Extract project ref from username (postgres.PROJECT_REF) or hostname
    const refMatch = cleaned.match(/postgres\.([a-z0-9]+)(?::|@)/) ||
                     cleaned.match(/\/\/[^@]+@[^.]+\.([a-z0-9]+)\.pooler/);
    const projectRef = refMatch?.[1];
    if (projectRef) {
      // Replace pooler host:port with direct host:port
      cleaned = cleaned.replace(
        /[^@]+\.pooler\.supabase\.com:\d+/,
        `db.${projectRef}.supabase.co:5432`
      );
      // Fix username: postgres.PROJECT_REF:password → postgres:password
      cleaned = cleaned.replace(`postgres.${projectRef}:`, 'postgres:');
    }
  }
  return cleaned;
}

function isNeonQuotaError(err) {
  if (!err) return false;
  const message = String(err.message ?? err).toLowerCase();
  const detail = String(err.detail ?? '').toLowerCase();
  const code = String(err.code ?? '').toLowerCase();
  return (
    message.includes('compute time quota') ||
    message.includes('account or project has exceeded') ||
    detail.includes('compute time quota') ||
    (code.includes('57014') && message.includes('quota')) ||
    (message.includes('quota') && message.includes('neon'))
  );
}

function isAuthError(err) {
  if (!err) return false;
  const message = String(err.message ?? err).toLowerCase();
  return (
    message.includes('password authentication failed') ||
    message.includes('authentication failed') ||
    message.includes('auth failed')
  );
}

function isSkippableNetworkError(err) {
  if (!err) return false;
  const message = String(err.message ?? err).toLowerCase();
  return (
    message.includes('network unreachable') ||
    message.includes('enetunreach') ||
    message.includes('self-signed certificate') ||
    message.includes('certificate') ||
    message.includes('name does not resolve') ||
    message.includes('enotfound')
  );
}

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

  try {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
  } catch (err) {
    if (isNeonQuotaError(err)) {
      logger.warn({ err: err.message }, 'backup: skipped (Neon compute quota exhausted)');
      await recordOutcome('skipped', { reason: 'neon_compute_quota' });
      return { ok: false, reason: 'neon_compute_quota' };
    }
    throw err;
  }

  // ── Dump (pg_dump custom format piped through gzip) ────────────────────────
  const dumpUrl = getBackupConnectionString();

  const result = await new Promise((resolve, reject) => {
    const dump = spawn('pg_dump', getPgDumpArgs(dumpUrl), {
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
    out.on('finish', () => resolve({ skipped: false }));
    dump.stdout.pipe(gzip).pipe(out);
    dump.on('close', (code) => {
      if (code !== 0) {
          const err = new Error(`pg_dump exited ${code}: ${stderr.slice(0, 500)}`);
          // Detect auth/network failure — skip to avoid circuit breaker
          if (isAuthError(err) || isSkippableNetworkError(err)) {
            logger.warn({ err: err.message }, 'backup: skipped (auth/network issue — check DATABASE_URL and connectivity)');
            // Clean up partial file if it exists
            try { fs.unlinkSync(gzPath); } catch {}
            resolve({ skipped: true, reason: isAuthError(err) ? 'auth_failure' : 'network_failure' });
          } else {
            try { fs.unlinkSync(gzPath); } catch {}
            reject(err);
          }
        }
    });
  });

  // Check if backup was skipped (auth/network failure)
  if (result.skipped) {
    await recordOutcome('skipped', { reason: result.reason });
    return { ok: false, reason: result.reason };
  }

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
  } catch (err) {
    if (isNeonQuotaError(err)) {
      logger.warn({ err: err.message }, 'backup: skipped due to Neon compute quota exhaustion');
      return false;
    }
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
    try {
      if (await backupDue()) {
        const result = await runBackup();
        if (result?.reason === 'neon_compute_quota') return;
      }
    }
    catch (err) {
      if (isNeonQuotaError(err)) {
        logger.warn({ err: err.message }, 'backup: skipped by schedule (Neon compute quota exhausted)');
        return;
      }
      logger.error({ err: err.message, hint: err.hint }, 'backup: FAILED');
      recordOutcome('failed', { error: String(err.message).slice(0, 300) });
    }
  };
  // Hourly check; the actual dump happens at most once per 24h (backupDue).
  setInterval(tick, 60 * 60 * 1000).unref();
  setTimeout(tick, 5_000).unref();
  logger.info('backup: daily schedule active (retention %s days)', RETENTION_DAYS);
}

module.exports = { runBackup, startBackupSchedule, stripPgbouncerParam };

// CLI entry point
if (require.main === module) {
  runBackup()
    .then((r) => process.exit(r.ok ? 0 : 1))
    .catch((err) => { logger.error({ err: err.message, hint: err.hint }, 'backup: failed'); process.exit(1); });
}
