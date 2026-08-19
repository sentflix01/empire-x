# Halehame — Disaster Recovery Plan

> What happens when things go catastrophically wrong, and how we recover.
> Last updated: August 2026

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

---
## Recovery Objectives

| Scenario | RTO (Recovery Time) | RPO (Data Loss) |
|---|---|---|
| Backend crash (single instance) | < 2 minutes | 0 (Railway auto-restart) |
| Full Railway outage | < 30 minutes | 0 (deploy to Render/Fly) |
| Neon database connection failure | < 5 minutes | 0 (reconnect) |
| Accidental data deletion (rows) | < 2 hours | < 24 hours |
| Complete database corruption | < 4 hours | < 24 hours |
| Cloudflare R2 unavailable | < 15 minutes | 0 (images cached on CDN) |
| Stripe outage | < 5 minutes | 0 (COD fallback via feature flag) |
| Security breach (account takeover) | < 30 minutes | 0 (revoke tokens) |

**RTO** = Recovery Time Objective: how long until service is restored
**RPO** = Recovery Point Objective: how much data we can afford to lose

---

## Scenario 1: Backend Service Crash

**Causes:** Out of memory, uncaught exception, bad deployment

**Auto-recovery (Railway):**
```
Railway detects unhealthy instance → restarts container automatically
Time: < 60 seconds
Action needed: None (if it was a transient crash)
```

**If crash is recurring:**
```bash
# Check Railway logs for error pattern
railway logs --service backend --lines 100

# Roll back to last working deployment
# Railway Dashboard → Deployments → Last successful → Redeploy

# If bad code was deployed:
git revert HEAD
git push origin main
# Railway auto-deploys the revert
```

---

## Scenario 2: Database Outage (Neon Down)

**Neon SLA:** 99.9% uptime (less than 9 hours downtime per year)

**Immediate actions:**
```
1. Check Neon status: https://neontech.statuspage.io
2. If Neon outage confirmed:
   - Tweet/post status update immediately
   - Enable read-only mode (serve cached data from Redis)
   - Wait for Neon resolution (usually < 30 minutes)

3. If > 1 hour outage:
   - Restore from last backup to a different provider
   - Update DATABASE_URL to new connection string
   - Redeploy backend
```

**Failover database setup (prepare now, use if needed):**
```bash
# Keep a daily pg_dump to Cloudflare R2:
pg_dump $DATABASE_URL | gzip | aws s3 cp - s3://halehame-backups/db/daily-$(date +%Y%m%d).sql.gz

# Restore to DigitalOcean Managed PostgreSQL ($15/month) as emergency:
# 1. Create DO Managed PostgreSQL
# 2. Restore from latest backup
# 3. Update DATABASE_URL in Railway env vars
# 4. Restart Railway service
# Total time: ~30 minutes
```

---

## Scenario 3: Accidental Data Deletion

**Prevention (do now):**
```sql
-- Add BEFORE DELETE triggers on critical tables
CREATE OR REPLACE FUNCTION prevent_mass_delete()
RETURNS trigger AS $$
BEGIN
  -- Block DELETE without WHERE clause on critical tables
  IF (SELECT COUNT(*) FROM orders) > 100 THEN
    RAISE EXCEPTION 'Mass delete blocked. Use WHERE clause or contact DBA.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

**Recovery using Neon point-in-time recovery:**
```bash
# Neon preserves WAL logs for:
# - Free tier: 7 days
# - Launch tier: 7 days
# - Scale tier: 30 days

# Steps:
# 1. Neon Console → Project → Restore
# 2. Select timestamp before deletion
# 3. "Restore to this point in time"
# 4. New connection string provided
# 5. Verify data integrity
# 6. Switch DATABASE_URL to restored instance

# Time to restore: 5–30 minutes depending on database size
```

---

## Scenario 4: Complete Database Corruption

**This is the worst case. Preparation is critical.**

**Daily backup job (must implement):**
```javascript
// backend/scripts/backup-to-r2.js (schedule via BullMQ cron)
// Run daily at 3:00 AM Addis Ababa time (UTC midnight)

const { execSync } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createReadStream } = require('fs');
const { gzip } = require('zlib');
const { pipeline } = require('stream/promises');

async function runBackup() {
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const localPath = `/tmp/backup-${timestamp}.sql.gz`;
  
  // Dump and compress
  execSync(`pg_dump "${process.env.DATABASE_URL}" | gzip > ${localPath}`, {
    stdio: 'inherit',
    timeout: 300_000, // 5 minutes max
  });
  
  const stat = require('fs').statSync(localPath);
  console.log(`Backup size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
  
  // Upload to R2
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  
  await client.send(new PutObjectCommand({
    Bucket: 'halehame-backups',
    Key: `database/${timestamp}.sql.gz`,
    Body: createReadStream(localPath),
    ContentType: 'application/gzip',
  }));
  
  // Clean up local file
  require('fs').unlinkSync(localPath);
  
  console.log(`✅ Backup completed: database/${timestamp}.sql.gz`);
}

runBackup().catch(err => {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
});
```

**Recovery from backup:**
```bash
# 1. Download latest backup from R2
aws s3 cp s3://halehame-backups/database/$(date +%Y-%m-%d).sql.gz /tmp/restore.sql.gz

# 2. Create new database instance (Neon or DO)
# 3. Restore
gunzip -c /tmp/restore.sql.gz | psql $NEW_DATABASE_URL

# 4. Verify row counts
psql $NEW_DATABASE_URL -c "
  SELECT 'users' AS table, COUNT(*) FROM users
  UNION ALL SELECT 'orders', COUNT(*) FROM orders
  UNION ALL SELECT 'products', COUNT(*) FROM products
  UNION ALL SELECT 'posts', COUNT(*) FROM posts;
"

# 5. Update DATABASE_URL in Railway
# 6. Restart Railway service
# 7. Test critical flows
```

---

## Scenario 5: Security Breach

### Account Takeover (JWT leak)

```bash
# Immediately invalidate ALL JWT tokens
# This logs out every user — communicate before doing

# In Redis (if configured):
redis-cli SET revoke_before:all $(date +%s)

# Or: rotate JWT_SECRET in Railway env vars
# New secret = all existing tokens invalid
# Railway auto-restarts with new secret
# Time: < 2 minutes
```

### Data Breach (unauthorized DB access)

```
Immediate actions (within 15 minutes):
1. Change DATABASE_URL password via Neon Console
2. Rotate JWT_SECRET (logs out all users)
3. Rotate Stripe webhook secret
4. Revoke compromised API keys
5. Enable Cloudflare "Under Attack Mode"
6. Download access logs from Railway
7. Preserve all evidence for investigation

Within 4 hours:
8. Determine scope: what data was accessed?
9. Identify how breach occurred
10. Fix the vulnerability
11. Restore from clean backup if data was modified

Within 72 hours (GDPR requirement):
12. Notify affected users
13. Notify Ethiopian INSA (Information Network Security Agency)
14. Post breach notice on platform
15. Notify Stripe + Chapa (if payment data involved)
```

---

## Scenario 6: Stripe Outage (Payment Processing Down)

```javascript
// Feature flag already built — enable immediately if Stripe is down

// In Railway env vars:
FF_STRIPE_PAYMENTS=false

// Effect (no redeploy needed, takes effect in < 5 minutes):
// - Stripe checkout button disappears
// - Chapa button still works
// - COD still works
// - 503 error message for Stripe attempts changes to "Use Chapa or COD"
```

---

## Backup Retention Schedule

| Backup type | Frequency | Retention | Location |
|---|---|---|---|
| Database (pg_dump) | Daily | 30 days | Cloudflare R2 |
| Database (weekly) | Weekly | 6 months | Cloudflare R2 |
| Database (monthly) | Monthly | 2 years | Cloudflare R2 |
| Neon WAL (continuous) | Continuous | 7–30 days | Neon managed |
| R2 file storage | Continuous (versioning) | 30 days | Cloudflare R2 |
| Environment variables | Manual | Until rotation | 1Password / Vault |

---

## Recovery Drill Schedule

Run these drills regularly so recovery is not a surprise:

| Drill | Frequency | How |
|---|---|---|
| Backup restore test | Monthly | Restore last backup to staging database, verify row counts |
| Failover test | Quarterly | Intentionally crash backend, measure time to recovery |
| JWT rotation | Semi-annually | Rotate JWT_SECRET, verify all auth flows work |
| DDoS simulation | Annually | Use k6 load test to simulate traffic spike |
| Security incident tabletop | Annually | Walk through breach scenario with team, no actual attack |

---

## Emergency Contact List

Keep this updated and accessible to all team members:

| Service | Emergency contact | How to escalate |
|---|---|---|
| Railway | support@railway.app | railway.app/help |
| Neon | support@neon.tech | neon.tech/docs/support |
| Cloudflare | cloudflare.com/support | Phone support (paid plan) |
| Stripe | support.stripe.com | 24/7 for live mode issues |
| Chapa | support@chapa.co | support.chapa.co |
| Resend | support@resend.com | resend.com/help |

**Internal escalation:**
1. First: Check status pages (railway.app/status, neon.tech/status, etc.)
2. Second: Post in team Telegram with error logs
3. Third: Call on-call person
4. Fourth: Escalate to CEO/CTO

---

## Business Continuity

**If Halehame is down for > 1 hour:**

1. Post on Telegram/WhatsApp groups: "Halehame is experiencing technical difficulties. We're working on it. Orders placed today will be processed within 24 hours."

2. Sellers who took COD orders: orders are safe in database (assuming it's not a DB issue). When platform recovers, their orders will appear.

3. Payments in-flight: Stripe and Chapa have their own reliability. If payment went through on their end but our webhook failed, it will be retried for 72 hours.

4. Push notifications lost during outage: Users will miss them. Send a catch-up notification when service restores ("You missed X messages while we were down").
