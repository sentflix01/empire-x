# Nodbusiness — Backup Strategy

> **Last updated:** September 22, 2026
> **Database:** Supabase PostgreSQL (project `tpgzlokgnjxcerexxoda`)
> **Backup tool:** pg_dump (built into backend Docker image via `postgresql-client`)

---

## Backup Overview

| Type | Method | Frequency | Retention | Storage |
|---|---|---|---|---|
| Automated daily backup | `scripts/backup-database.js` | Daily (checked hourly) | 14 days | Supabase R2 or local |
| Manual backup | `npm run backup` | On demand | Manual cleanup | Local `backend/backups/` |
| Supabase managed | Supabase internal snapshots | Continuous (Pro) / Weekly (Free) | 7 days (Pro) | Supabase infrastructure |

---

## How Automated Backups Work

The backup script runs inside the Render container at server startup:

```typescript
// index.ts
startBackupSchedule();  // Checks hourly, runs once per day
```

**Script:** `backend/scripts/backup-database.js`

**What it does:**
1. Runs `pg_dump` against the database
2. Compresses the output with gzip (`.sql.gz`)
3. Uploads to Cloudflare R2 if configured, or saves to `backend/backups/` locally
4. Deletes backups older than `BACKUP_RETENTION_DAYS` (default 14 days)
5. Records success/failure in `telemetry_events` table

**Schedule:** Runs once per day. Checked hourly — fires when `now() - last_backup > 24h`.

---

## Database Connection for Backups

`pg_dump` cannot use the Supabase transaction pooler (port 6543). It requires a **direct connection** (port 5432). The backup script automatically converts pooler URLs to direct connections.

**Automatic conversion (in `stripPgbouncerParam`):**
```
postgresql://postgres.tpgzlokgnjxcerexxoda:PASS@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
              ↓ automatically converted to ↓
postgresql://postgres:PASS@db.tpgzlokgnjxcerexxoda.supabase.co:5432/postgres
```

**Render env var `BACKUP_DATABASE_URL`:** Set to the same pooler URL as `DATABASE_URL`. The script handles conversion automatically.

**`BACKUP_FORCE_IPV4=true`:** Required on Render free tier which has no IPv6 outbound. Forces IPv4 DNS resolution for backup connections.

---

## Current Backup Status

On Render free tier, `pg_dump` is installed via the Dockerfile:
```dockerfile
RUN apk add --no-cache postgresql-client
```

**Current backup storage:** Local disk (`/app/backups/`) — these are **lost on every Render redeploy** since Render free tier has no persistent disk.

**Fix:** Configure Cloudflare R2 for persistent backup storage:
```
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=nodbusiness-backups
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

Until R2 is configured, use **manual backups** for important data preservation.

---

## Manual Backup (From Local Machine)

```bash
cd backend

# Create backup to local file
npm run backup

# Or run pg_dump directly
PGPASSWORD=your_password pg_dump \
  "postgresql://postgres.tpgzlokgnjxcerexxoda:PASS@db.tpgzlokgnjxcerexxoda.supabase.co:5432/postgres?sslmode=require" \
  --no-owner \
  --format=custom \
  | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz
```

Backup files are saved to `backend/backups/`.

---

## Restore From Backup

**Restore a `.sql.gz` backup:**

```bash
# Decompress and restore
gunzip -c backup-file.sql.gz | pg_restore \
  --no-owner \
  --dbname="postgresql://postgres.tpgzlokgnjxcerexxoda:PASS@db.tpgzlokgnjxcerexxoda.supabase.co:5432/postgres?sslmode=require"
```

**Or use the export/restore script:**

```powershell
# Windows PowerShell
.\scripts\export_and_restore_to_supabase.ps1
```

**Warning:** Restore overwrites existing data. Always backup the target database before restoring.

---

## Supabase Built-in Backups (Free Tier)

Supabase free tier does **not** include automated daily backups or Point-in-Time Recovery. It has:
- Daily snapshots (kept for a limited period — not guaranteed)
- No PITR (Point-in-Time Recovery)

**Supabase Pro ($25/mo) adds:**
- Daily backups with 7-day retention
- Point-in-Time Recovery (PITR)
- Manual backup downloads from dashboard

For a production app with real users, upgrade to Supabase Pro before launch.

---

## Backup Verification

To verify a backup is valid:

```bash
# List contents without restoring
pg_restore --list backup-file.sql.gz | head -50

# Test restore to a temporary database
createdb nodbusiness_restore_test
pg_restore --dbname=nodbusiness_restore_test backup-file.sql.gz
psql nodbusiness_restore_test -c "SELECT COUNT(*) FROM users;"
dropdb nodbusiness_restore_test
```

Or use the automated verification script:
```bash
npm run backup:verify
```

---

## Backup Files in Repository

The `backend/backups/` directory contains some historical backup files:
```
backend/backups/
  nodbusiness-2026-08-23-06-36-26.sql.gz
  nodbusiness-2026-08-23-06-37-35.sql.gz
  nodbusiness-2026-08-23-06-37-48.sql.gz
  nodbusiness-2026-08-23-06-38-56.sql.gz
```

These are from the development phase and contain seed/test data only.

---

## What's Backed Up

The `pg_dump` backup includes:
- All 38 migration tables (users, posts, products, orders, showrooms, etc.)
- All user data, business data, order history
- Schema definitions (tables, indexes, constraints)

**Not included in pg_dump:**
- Supabase Storage files (uploaded images/documents) — backed up separately via Supabase
- Redis data — ephemeral by design, not backed up
- Environment variables — documented in `ENVIRONMENT_VARIABLES.md`

---

## Backup Checklist

Before going live with real users:

- [ ] Configure R2 or Supabase Storage for persistent backup storage (not local disk)
- [ ] Verify backup script runs successfully: check `telemetry_events` table for `type='backup_completed'`
- [ ] Test restore from a backup to confirm integrity
- [ ] Consider upgrading to Supabase Pro for daily automated backups + PITR
- [ ] Set `BACKUP_RETENTION_DAYS` appropriately (default 14 is fine for dev)

---

## Retention Policy

| Backup type | Retention |
|---|---|
| Automated daily backups | 14 days (configurable via `BACKUP_RETENTION_DAYS`) |
| Manual backups | Until manually deleted |
| Supabase snapshots (free) | Best-effort, not guaranteed |
| Supabase daily backups (Pro) | 7 days |
