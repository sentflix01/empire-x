# Halehame — Backup & Recovery

> Data loss is unrecoverable. Set this up before going to production.
> Last updated: August 2026

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

---

## What Needs Backing Up

| Data | Storage | Backup Method |
|---|---|---|
| PostgreSQL database | Neon (managed) | Automatic — Neon handles this |
| User-uploaded files | Cloudflare R2 | R2 versioning + replication |
| Environment variables | Railway + Vercel | Export manually to secure location |
| Source code | GitHub | Git history |

---

## Database Backups (Neon)

Neon automatically backs up your database. No manual setup required.

**Free tier:** 7-day history with point-in-time restore  
**Launch plan ($19/month):** 7-day PITR + branching for staging  
**Scale plan:** 30-day PITR + read replicas

### How to Restore

1. Open https://neon.tech → your project
2. Click **Restore** tab
3. Select a point in time (e.g., "yesterday 3pm")
4. Restore to: new branch (test first), then switch production connection string

**Test this before an incident, not during one.**

### Manual Backup (extra safety)

```bash
# Run this weekly and store the file securely (not in Git)
pg_dump $DATABASE_URL --no-owner --no-acl > backup-$(date +%Y%m%d).sql

# Store in: encrypted cloud storage, password manager notes, or offline drive
```

---

## File Storage Backups (Cloudflare R2)

R2 stores files redundantly across Cloudflare's network. For additional protection:

1. Enable **Object Versioning** in R2 bucket settings — keeps previous versions of overwritten files
2. Consider cross-region replication for critical media (R2 supports this in the dashboard)

---

## Environment Variable Backup

Railway and Vercel env vars are not backed up automatically. If your account is compromised or you accidentally delete variables, you need to restore them.

**Action:** Once per month, export all env vars to a secure, encrypted location:
- 1Password or Bitwarden vault
- Encrypted note (never plain text file)
- `.env.production` file stored offline, never in Git

```bash
# Check what's currently set in Railway
railway variables --service halehame-backend
```

---

## Disaster Recovery Scenarios

### Scenario 1: Accidental data deletion

Someone runs `DELETE FROM products` without a WHERE clause.

**Recovery:**
1. Open Neon → Restore → pick a time 5 minutes before the incident
2. Restore to a new branch
3. Verify the data is there: `SELECT COUNT(*) FROM products`
4. Switch `DATABASE_URL` in Railway to point to the restored branch
5. Redeploy backend
6. Monitor for a few hours, then clean up the broken branch

**Expected recovery time:** 15–30 minutes

---

### Scenario 2: Backend crashes and won't start

A bad deploy causes a crash loop.

**Recovery:**
1. Railway → Deployments → find the last working deploy → **Rollback**
2. Takes ~2 minutes

---

### Scenario 3: Vercel build fails

A Next.js build error blocks the frontend from deploying.

**Recovery:**
1. Vercel → Deployments → find last successful deploy → **Promote to Production**
2. Fix the build error → push a new commit → verify the build passes

---

### Scenario 4: R2 bucket deleted or corrupted

All user uploads are lost.

**Prevention:** Enable versioning before this happens.  
**Recovery:** Restore from versioned objects in R2 dashboard. If versioning wasn't enabled — the files are gone.

**Lesson:** Enable R2 versioning on day 1.

---

### Scenario 5: Complete account compromise

Railway, Vercel, or Neon account is taken over.

**Prevention:**
- Enable 2FA on all service accounts
- Use strong unique passwords (password manager)
- Limit who has access to production credentials

**Recovery:**
1. Contact provider support immediately
2. Restore from manual database backup (`backup-YYYYMMDD.sql`)
3. Recreate services from scratch using backup env vars
4. Redeploy from GitHub

---

## Monthly Backup Checklist

Run these monthly:

- [ ] Verify Neon automatic backups are enabled and recent
- [ ] Run manual `pg_dump` and store securely
- [ ] Verify R2 versioning is enabled
- [ ] Export current Railway + Vercel env vars to secure storage
- [ ] Test restore: restore Neon to a test branch, run `SELECT COUNT(*) FROM users`, verify number makes sense
- [ ] Check Sentry for any recurring errors that could indicate data integrity issues
