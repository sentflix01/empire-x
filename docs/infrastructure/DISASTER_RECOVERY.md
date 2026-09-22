# Nodbusiness — Disaster Recovery Plan

> What happens when things go catastrophically wrong, and how we recover.
> **Last updated:** September 2026
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Cloudflare Pages · Supabase · Upstash Redis · Cloudflare R2

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| RTO | Recovery Time Objective — maximum acceptable downtime |
| RPO | Recovery Point Objective — maximum acceptable data loss window |
| PITR | Point-In-Time Recovery — restoring database to a past state |
| DB | Database |
| API | Application Programming Interface |
| CDN | Content Delivery Network |
| DNS | Domain Name System |
| CI/CD | Continuous Integration / Continuous Delivery |
| WAL | Write-Ahead Log — PostgreSQL transaction log |
| P0/P1 | Priority 0/1 — critical/high severity incidents |
| SLA | Service Level Agreement |
| RCA | Root Cause Analysis |
| VM | Virtual Machine |

---

## Recovery Objectives

| Scenario | RTO (Recovery Time) | RPO (Data Loss) |
|---|---|---|
| Backend container crash (Coolify auto-restart) | < 2 minutes | 0 |
| Full Oracle VM failure → migrate to Hetzner | < 2 hours | 0 (DB + storage are external) |
| Supabase connection failure (transient) | < 5 minutes | 0 (reconnect) |
| Accidental data deletion (rows) | < 2 hours | < 24 hours |
| Complete database corruption | < 4 hours | < 24 hours |
| Cloudflare R2 unavailable | < 15 minutes | 0 (images cached on CDN) |
| Stripe outage | < 5 minutes | 0 (COD fallback via feature flag) |
| Security breach (account takeover) | < 30 minutes | 0 (revoke tokens) |
| Oracle Always Free cut again | < 2 hours | 0 (migrate Coolify to Hetzner) |

---

## Scenario 1: Backend Container Crash

**Causes:** Out of memory, uncaught exception, bad deployment

**Auto-recovery (Coolify + Docker):**
```
Docker detects unhealthy container (HEALTHCHECK fails) → restarts automatically
Coolify monitors container status → alerts if restart loop detected
Time: < 60 seconds
Action needed: None (if transient crash)
```

**If crash is recurring:**
```bash
# 1. Check Coolify logs
#    Coolify dashboard → Application → Logs → last 200 lines

# 2. Roll back to last working deployment
#    Coolify → Application → Deployments → last successful → Redeploy
#    Time: ~60 seconds (Coolify re-uses cached Docker image)

# 3. If bad code was deployed:
git revert HEAD
git push origin main
# GitHub Actions re-runs CI → Coolify webhook → new container
```

---

## Scenario 2: Oracle Cloud VM Failure

This is the highest-risk scenario because the Oracle VM hosts both Coolify and the backend container. However, **all data is external** (Supabase, R2, Upstash) so there is zero data loss.

**Contingency: Hetzner CAX11 (€4.29/month)**

```bash
# Step 1: Provision Hetzner CAX11 ARM instance (2 min)
# hetzner.com → Cloud → New Server → Falkenstein → CAX11 → Ubuntu 22.04

# Step 2: Install Coolify on Hetzner VM (5 min)
ssh root@<hetzner-ip>
curl -fsSL https://get.coolify.io | bash

# Step 3: Re-add the backend application in Coolify (15 min)
# - Connect GitHub repo
# - Coolify detects Dockerfile
# - Copy all env vars from notes/DEPLOYMENT_VARIABLES.md
# - Set new domain if needed

# Step 4: Update Cloudflare DNS (2 min)
# Cloudflare → DNS → A record "api" → change IP to <hetzner-ip>
# Propagation: < 1 minute (Cloudflare is authoritative)

# Step 5: Deploy (3 min)
# Coolify → Deploy → health check passes → done

# Total time: ~25–30 minutes
# Data loss: 0 (Supabase, R2, Upstash all external and unaffected)
```

**Why this works cleanly:**
- Supabase stores all application data — not on the VM
- Cloudflare R2 stores all file uploads — not on the VM
- Upstash Redis stores cache/queues — not on the VM
- The VM only runs the stateless Node.js API server
- Coolify config is rebuilt from `DEPLOYMENT_VARIABLES.md` notes

---

## Scenario 3: Supabase Database Outage

**Supabase SLA:** 99.9% uptime on free tier (best-effort; no contractual SLA on free)

**Immediate actions:**
```
1. Check Supabase status: https://status.supabase.com
2. If Supabase outage confirmed:
   - Post status update (Telegram/WhatsApp groups)
   - The app degrades gracefully — cached data served from Upstash Redis
   - BullMQ jobs queue up and process when DB reconnects
   - Wait for Supabase resolution (usually < 30 minutes)

3. If > 1 hour outage:
   - Restore from latest pg_dump backup to a new PostgreSQL instance
   - Options: Supabase new project, Railway PostgreSQL ($5/mo), DigitalOcean Managed DB ($15/mo)
   - Update DATABASE_URL in Coolify env vars → redeploy
```

**Failover database (emergency, ~30 min):**
```bash
# 1. Get latest backup from R2 (backups/ prefix)
#    Cloudflare R2 → nodbusiness-uploads → backups/ → latest .sql.gz

# 2. Create new database (e.g. new Supabase project or Railway PostgreSQL)
# 3. Restore backup:
pg_restore --no-owner --dbname="$NEW_DATABASE_URL" nodbusiness-<timestamp>.sql

# 4. Update Coolify env var DATABASE_URL → new connection string
# 5. Trigger Coolify redeploy
# 6. Verify: curl https://api.yourdomain.com/health → "database": "connected"
```

---

## Scenario 4: Accidental Data Deletion

**Prevention:** Application-level guards in `utils/crud.ts` — `ALLOWED_TABLES` allowlist, no bulk-delete endpoints. Production `DATABASE_URL` is only accessible to the backend service.

**Recovery using Supabase PITR:**
```bash
# Supabase preserves WAL logs:
# - Free tier: 7 days PITR
# - Pro tier: 30 days PITR

# Steps:
# 1. Supabase Console → Project → Database → Backups → Point in time restore
# 2. Select timestamp before the deletion
# 3. Supabase creates a new branch with restored data
# 4. Verify data integrity on the branch
# 5. Either: promote branch to replace main, OR copy specific rows

# Time: 5–30 minutes depending on database size
```

**Recovery from daily pg_dump backup:**
```bash
# The backup script (backend/scripts/backup-database.js) runs daily at midnight.
# Backups stored in R2 under backups/ prefix, retained for BACKUP_RETENTION_DAYS (default 14).

# 1. List available backups:
#    Cloudflare R2 → nodbusiness-uploads → backups/

# 2. Download the latest backup

# 3. Restore to a scratch database (NEVER restore directly to production):
pg_restore --no-owner --dbname="$SCRATCH_DATABASE_URL" nodbusiness-<timestamp>.sql

# 4. Extract just the deleted rows:
psql $SCRATCH_DATABASE_URL -c "SELECT * FROM orders WHERE id IN ('uuid1','uuid2');"

# 5. Re-insert the recovered rows into production
```

---

## Scenario 5: Complete Database Corruption

**Daily backup job — implemented in `backend/scripts/backup-database.js`:**
- Runs daily at midnight (in-process scheduler in `index.ts`)
- `pg_dump --format=custom` → gzip → upload to R2 `backups/`
- Prunes backups older than `BACKUP_RETENTION_DAYS` (default 14)
- Records last backup timestamp to `app_settings.key='last_database_backup'`

```bash
# Manual backup (run anytime):
cd backend && npm run backup

# Verify a backup is restorable (use scratch DB, never production):
BACKUP_VERIFY_DATABASE_URL=postgresql://<scratch-db> npm run backup:verify

# Full restore procedure:
# 1. Download backup from R2
# 2. Create new Supabase project or other PostgreSQL instance
# 3. Restore:
pg_restore --no-owner --dbname="$NEW_DATABASE_URL" nodbusiness-<stamp>.sql

# 4. Verify counts:
psql $NEW_DATABASE_URL -c "
  SELECT 'users' AS t, COUNT(*) FROM users
  UNION ALL SELECT 'orders', COUNT(*) FROM orders
  UNION ALL SELECT 'products', COUNT(*) FROM products
  UNION ALL SELECT 'posts', COUNT(*) FROM posts;"

# 5. Update DATABASE_URL in Coolify → redeploy
# 6. Verify health endpoint
```

---

## Scenario 6: Security Breach — Account Takeover / JWT Leak

```bash
# Invalidate ALL tokens at once (platform-wide):
# Rotate JWT_SECRET in Coolify env vars → Coolify triggers redeploy automatically.
# Every existing access token and refresh token is immediately invalid.
# All users are logged out and must log in again.
# Time: < 3 minutes (Coolify redeploy with new secret)

# Per-user revocation (specific compromised accounts):
# The backend supports per-user revocation via Redis:
redis-cli -u "$REDIS_URL" SET revoke_before:<userId> $(date +%s)
# All tokens issued before this timestamp are rejected for that user.
```

**Data breach response (unauthorized DB access):**
```
Within 15 minutes:
1. Change Supabase database password (Supabase → Settings → Database → Reset password)
   → This invalidates the current DATABASE_URL; update in Coolify → redeploy
2. Rotate JWT_SECRET in Coolify → all sessions invalidated
3. Rotate Stripe webhook secret (Stripe dashboard → Webhooks → Roll secret)
4. Enable Cloudflare "Under Attack Mode" (Cloudflare → Overview → toggle)
5. Download Coolify container logs for forensics

Within 4 hours:
6. Determine scope: what data was accessed?
7. Identify breach vector
8. Fix vulnerability and deploy
9. Restore from clean backup if data was modified

Within 72 hours (GDPR / local notification requirement):
10. Notify affected users
11. Notify Ethiopian INSA (Information Network Security Agency)
12. Post breach notice
13. Notify Stripe + Chapa if payment data involved
```

---

## Scenario 7: Stripe Payment Processing Down

```bash
# FAST PATH (no redeploy): flip feature flag in Upstash Redis
redis-cli -u "$REDIS_URL" SET ff:stripe_payments \
  '{"enabled":false,"rollout":0,"description":"Stripe payments temporarily disabled"}' EX 3600
# Effect: Stripe checkout returns 503; Chapa button still works; COD orders still work
# Reverse: delete the Redis key to restore default (enabled)
redis-cli -u "$REDIS_URL" DEL ff:stripe_payments

# SLOW PATH (avoid during incident): set FF_STRIPE_PAYMENTS=false in Coolify env vars
# ⚠️ Changing env vars triggers a Coolify redeploy — not the right path during an incident
```

---

## Backup Retention Schedule

| Backup type | Frequency | Retention | Location |
|---|---|---|---|
| Database (pg_dump custom format) | Daily | 14 days | Cloudflare R2 (`backups/`) |
| Database (Supabase PITR / WAL) | Continuous | 7 days (free) / 30 days (Pro) | Supabase managed |
| File storage (R2) | Continuous | 11-nines durability, no separate backup needed | Cloudflare R2 |
| Environment variables | Manual (after any change) | Until next rotation | Secure notes / password manager |

---

## Recovery Drill Schedule

| Drill | Frequency | How |
|---|---|---|
| Backup restore test | Monthly | Restore latest pg_dump to scratch Supabase project, verify row counts |
| VM failover drill | Quarterly | Provision Hetzner VM, install Coolify, deploy from scratch, verify health |
| JWT rotation | Semi-annually | Rotate JWT_SECRET in Coolify, verify all auth flows still work |
| DDoS simulation | Annually | k6 load test to simulate traffic spike |
| Security incident tabletop | Annually | Walk through breach scenario, no actual attack |

---

## Emergency Contacts

| Service | Emergency contact | Status page |
|---|---|---|
| Oracle Cloud | cloud.oracle.com/support | https://ocistatus.oraclecloud.com |
| Coolify | github.com/coollabsio/coolify/issues | N/A (self-hosted) |
| Cloudflare | cloudflare.com/support | https://www.cloudflarestatus.com |
| Supabase | supabase.com/support | https://status.supabase.com |
| Upstash | upstash.com/docs/help | https://status.upstash.com |
| Stripe | support.stripe.com | https://status.stripe.com |
| Chapa | support@chapa.co | — |
| Resend | resend.com/help | https://status.resend.com |

**Contingency VPS (keep credentials ready):**
- Hetzner Cloud: hetzner.com — CAX11 ARM, €4.29/month, Falkenstein region
- DigitalOcean: $6/month Basic droplet (fallback if Hetzner unavailable)

---

## Business Continuity

**If Nodbusiness is down for > 1 hour:**

1. Post on Telegram/WhatsApp groups: "Nodbusiness is experiencing technical difficulties. We're working on it. Orders placed today will be processed within 24 hours."
2. Sellers who took COD orders: orders are safe in Supabase (unless it's a DB issue). When platform recovers, orders will appear.
3. Payments in-flight: Stripe and Chapa have their own reliability with 72-hour webhook retry.
4. Push notifications lost during outage: send catch-up when service restores.
