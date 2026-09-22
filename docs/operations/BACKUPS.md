# Nodbusiness — Backup & Recovery

> Data loss is unrecoverable. Set this up before going to production.
> **Implemented 2026-08-23:** automated daily `pg_dump` backups (`scripts/backup-database.js`)
> + restorability verification (`scripts/verify-backup.js`).
> **Last updated:** September 2026
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Supabase · Cloudflare R2

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| DB | Database |
| PITR | Point-In-Time Recovery — restoring a database to an earlier state |
| WAL | Write-Ahead Log — PostgreSQL transaction log used for PITR |
| R2 | Cloudflare R2 — object storage |
| CDN | Content Delivery Network |
| RPO | Recovery Point Objective — maximum acceptable data loss in time |
| RTO | Recovery Time Objective — maximum acceptable downtime |
| SQL | Structured Query Language |
| VM | Virtual Machine |

---

## What Needs Backing Up

| Data | Storage | Backup Method |
|---|---|---|
| PostgreSQL database | Supabase (managed) | Automatic — Supabase handles WAL + PITR |
| PostgreSQL database | Supabase (independent) | Daily `pg_dump` → Cloudflare R2 (in-process scheduler) |
| User-uploaded files | Cloudflare R2 | R2 versioning (enable in bucket settings) |
| Environment variables | Coolify + Cloudflare Pages | Export manually to secure location (1Password/Bitwarden) |
| Source code | GitHub | Git history |

---

## Database Backups (Supabase — Automatic)

Supabase automatically manages WAL archiving and PITR for all projects.

| Plan | PITR Window |
|---|---|
| Free | 7 days |
| Pro ($25/month) | 30 days |
| Team | 30 days |

### How to Restore via Supabase PITR

1. Open https://supabase.com → your project
2. Go to **Database** → **Backups** → **Point in time restore**
3. Select a timestamp before the incident
4. Click **Restore** — Supabase creates a new branch with restored data
5. Verify data on the branch: `SELECT COUNT(*) FROM users`
6. Update `DATABASE_URL` in Coolify to the restored branch connection string
7. Trigger Coolify redeploy
8. After confirming everything works, promote the restored branch to replace main

**Test this before an incident, not during one.**

---

## Independent Backups (Application-Level — Daily pg_dump)

Supabase PITR protects against *accidents inside the database*, but an independent dump also protects against losing access to Supabase itself (account compromise, project deletion, billing lockout, or Supabase outage).

`backend/scripts/backup-database.js` runs a daily `pg_dump` pipeline:

| Piece | Detail |
|---|---|
| Dump format | `pg_dump --format=custom` piped through gzip |
| Schedule | Daily (checked hourly in-process via `startBackupSchedule()` from `index.ts`) |
| Destination | Cloudflare R2 `backups/` prefix when R2 env vars are set; otherwise local `backend/backups/` (⚠️ not durable — configure R2 before launch) |
| Retention | `BACKUP_RETENTION_DAYS` env var (default: 14 days) |
| Telemetry | Outcome recorded in `app_settings.key='last_database_backup'` |
| Manual run | `cd backend && npm run backup` |
| Requirement | `postgresql-client` installed in the Docker image — already in `backend/Dockerfile` (`apk add --no-cache postgresql-client`) |
| Connection | Uses **direct** Supabase URL (port 5432) — not the Supavisor pooler |

### Restorability Verification

A backup nobody has restored is a hope, not a plan. Verify weekly:

```bash
BACKUP_VERIFY_DATABASE_URL=postgres://<scratch-db> npm run backup:verify
```

Drops/recreates the scratch schema, restores the newest dump with `pg_restore`, then asserts table/user counts. Exit code 0 = proven restorable. **Never point it at production.**

### Operator Setup Checklist

- [ ] R2 env vars configured in Coolify (so dumps upload to R2, not local container disk)
- [ ] `postgresql-client` confirmed in Docker image (it is — check `backend/Dockerfile`)
- [ ] Scratch Supabase project created for weekly verify runs
- [ ] Weekly `npm run backup:verify` scheduled (Coolify cron job, or GitHub Actions cron)
- [ ] Alert configured: page when `last_database_backup.at` is stale or `status != 'ok'`

---

## File Storage Backups (Cloudflare R2)

R2 stores files redundantly across Cloudflare's network (11 nines durability — same as AWS S3). For additional protection:

1. Enable **Object Versioning** in R2 bucket settings — keeps previous versions of overwritten files for 30 days
2. Enable R2 versioning on day 1, before users upload anything

---

## Environment Variable Backup

Coolify and Cloudflare Pages env vars are not automatically backed up. If your account is compromised or you accidentally delete variables, you need to restore from notes.

**Action:** Once per month, export all env vars to a secure, encrypted location:
- 1Password or Bitwarden vault
- Encrypted note (never plain text file in Git)
- `.env.production` file stored offline, never committed

All variable names and descriptions are documented in `DEPLOYMENT_VARIABLES.md`.

---

## Disaster Recovery Scenarios

### Scenario 1: Accidental data deletion

Someone runs `DELETE FROM products` without a WHERE clause.

**Recovery:**
1. Supabase → Database → Backups → Point in time restore → pick timestamp before deletion
2. Supabase creates a restored branch
3. Verify the data: `SELECT COUNT(*) FROM products`
4. Update `DATABASE_URL` in Coolify → trigger redeploy
5. Monitor for a few hours, then clean up the temporary branch

**Expected recovery time:** 15–30 minutes

---

### Scenario 2: Backend container crash loop

A bad deploy causes a restart loop.

**Recovery:**
```
Coolify → Application → Deployments → find last working deploy → Redeploy
Takes ~60 seconds (uses cached Docker image)
```

---

### Scenario 3: Cloudflare Pages build fails

A Next.js build error blocks the frontend from deploying.

**Recovery:**
```
Cloudflare → Pages → nodbusiness → Deployments
→ Find last successful deploy → three-dot menu → "Rollback to this deployment"
Fix the build error → push a new commit → verify the build passes
```

---

### Scenario 4: R2 bucket deleted or corrupted

All user uploads are lost.

**Prevention:** Enable versioning before this happens.
**Recovery:** Restore from versioned objects in R2 dashboard. If versioning wasn't enabled — the files are gone.

**Lesson:** Enable R2 versioning on day 1.

---

### Scenario 5: Oracle VM failure or complete account compromise

**Oracle VM failure (most likely):**
- All application data is external (Supabase, R2, Upstash) — zero data loss
- Provision Hetzner CAX11 (€4.29/month), install Coolify, redeploy from GitHub
- Update Cloudflare DNS A record — propagates in <1 minute (TTL 60s)
- Total recovery: ~25–30 minutes

**Supabase account compromised:**
1. Change database password in Supabase → update `DATABASE_URL` in Coolify → redeploy
2. Rotate `JWT_SECRET` in Coolify → all user sessions invalidated → users re-login

**Cloudflare account compromised:**
1. Contact Cloudflare support immediately
2. R2 files are safe — Cloudflare infrastructure-level durability
3. DNS records can be recreated from notes

---

## Monthly Backup Checklist

Run these monthly:

- [ ] Verify Supabase PITR is showing recent activity in the Backups tab
- [ ] Run manual `npm run backup` in the backend container and verify it uploads to R2
- [ ] Check R2 `backups/` prefix — confirm recent `.sql.gz` files are there
- [ ] Verify R2 bucket versioning is enabled for `nodbusiness-uploads`
- [ ] Export current Coolify + CF Pages env vars to secure storage (1Password/Bitwarden)
- [ ] Run restorability check: `BACKUP_VERIFY_DATABASE_URL=<scratch> npm run backup:verify`
- [ ] Check Sentry for any recurring errors that could indicate data integrity issues
- [ ] Verify `last_database_backup` in `app_settings` table is not stale:
  ```sql
  SELECT value FROM app_settings WHERE key = 'last_database_backup';
  ```
