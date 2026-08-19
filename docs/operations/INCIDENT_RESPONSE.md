# Nodbusiness — Incident Response Playbook

> Step-by-step procedures for when things go wrong.
> The goal is consistent, calm, fast recovery — not heroics.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| P0/P1/P2/P3 | Priority 0/1/2/3 — incident severity levels |
| RCA | Root Cause Analysis |
| SLA | Service Level Agreement |
| MTTR | Mean Time to Resolve |
| API | Application Programming Interface |
| DB | Database |
| CI/CD | Continuous Integration / Continuous Delivery |
| ETB | Ethiopian Birr — reference market currency |
| UTC | Coordinated Universal Time |

---

## Severity Levels

| Level | Definition | Response time | Examples |
|---|---|---|---|
| **P0 — Critical** | Platform completely down, data loss risk, security breach | < 15 minutes | Database down, payment processing failure, auth broken |
| **P1 — High** | Major feature broken for all users | < 1 hour | Feed not loading, chat not working, orders failing |
| **P2 — Medium** | Feature degraded, some users affected | < 4 hours | Push notifications delayed, search slow |
| **P3 — Low** | Minor issue, workaround exists | < 24 hours | UI bug, typo, slow admin panel |

---

## P0 Response: Platform Down

### Step 1: Detect (< 5 min)
- **Sentry** — error spike alert
- **Railway health check** — `GET /health` returns non-200
- **User reports** — Telegram/WhatsApp from users

### Step 2: Communicate (< 10 min)
```
Post to team Telegram:
"🔴 P0 INCIDENT — [service] is down as of [time]. 
Investigating. Will update in 15 min."
```

### Step 3: Diagnose (< 15 min)
```bash
# Check Railway logs
railway logs --service backend

# Check database
psql $DATABASE_URL -c "SELECT 1"

# Check health endpoint
curl https://your-api.railway.app/health

# Check recent deployments
git log --oneline -10
```

### Step 4: Mitigate
**If bad deployment:**
```bash
# Roll back to last good commit
git revert HEAD
git push origin main
# Railway auto-deploys
```

**If database issue:**
- Neon console → check connection limits, active queries
- Kill long-running queries: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval '30 seconds'`

**If memory/CPU spike:**
- Railway dashboard → restart service
- Check for N+1 queries, connection pool exhaustion

### Step 5: Resolve & Document
```
Post to team Telegram:
"✅ P0 RESOLVED — [service] restored at [time]. 
Root cause: [cause]. 
Fix: [what was done]. 
Post-mortem: [link] within 48h."
```

---

## P0 Response: Security Breach

**Signs:** Unexpected admin actions, data accessed by unknown IPs, user reports of account takeover.

### Immediate actions (< 15 min)
1. **Revoke all JWTs**: `SET revoke_before:{userId} = NOW()` in Redis for all users
2. **Rotate secrets**: `JWT_SECRET`, `STRIPE_WEBHOOK_SECRET` immediately
3. **Block suspicious IPs**: Railway → Settings → Networking
4. **Preserve logs**: Download Railway logs before they rotate

### Investigation
```sql
-- Find suspicious sessions
SELECT id, email, created_at, last_login_ip 
FROM users 
WHERE last_login_ip NOT IN (known_ips)
ORDER BY last_seen DESC;

-- Check admin actions
SELECT * FROM audit_log WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Notification
- Notify affected users within 72 hours (GDPR requirement)
- Notify Ethiopian INSA (Information Network Security Agency) if > 1000 users affected
- Post breach notice on platform

---

## P1 Response: Payment Processing Down

```bash
# Check Stripe status
curl https://status.stripe.com/api/v2/status.json

# Check Chapa status
# (No public status API — check Chapa support)

# If Stripe webhook failing:
# Check STRIPE_WEBHOOK_SECRET is correct
# Verify webhook endpoint is accessible
# Check Railway logs for webhook route errors
```

**Mitigation:** Enable COD fallback automatically (set `FF_STRIPE_PAYMENTS=false` in env vars — no redeploy needed, feature flag takes effect in < 5 min).

---

## P1 Response: Database Connection Exhausted

```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;
SELECT max_conn, used, res_for_super FROM 
  (SELECT count(*) used FROM pg_stat_activity) t1,
  (SELECT setting::int res_for_super FROM pg_settings WHERE name='superuser_reserved_connections') t2,
  (SELECT setting::int max_conn FROM pg_settings WHERE name='max_connections') t3;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';
```

**Fix:** Increase `DB_POOL_MAX` env var, or enable Neon connection pooler.

---

## On-Call Responsibilities

| Role | Who | Contact |
|---|---|---|
| Primary on-call | Rotating weekly | Telegram: @primary-oncall |
| Escalation | Tech lead | Telegram: @tech-lead |
| Business escalation | CEO | Telegram: @ceo |

**On-call duties:**
- Acknowledge P0/P1 alerts within 15 minutes
- Post status updates every 15 minutes during active incidents
- Write post-mortem within 48 hours of P0 resolution

---

## Post-Mortem Template

```markdown
## Incident Post-Mortem: [Title]

**Date:** [Date]
**Duration:** [Start time] → [End time] ([X] minutes)
**Severity:** P0 / P1
**Author:** [Name]

## Summary
[1-2 sentence description of what happened and its impact]

## Timeline
- HH:MM — [What happened]
- HH:MM — [What was done]
- HH:MM — [Resolution]

## Root Cause
[What caused the incident?]

## Impact
- Users affected: [number]
- Revenue impact: ETB [amount]
- Orders affected: [number]

## What went well
- [Things that helped resolve faster]

## What went wrong
- [Things that slowed resolution]

## Action items
| Action | Owner | Due date |
|---|---|---|
| [Fix] | [Person] | [Date] |
```

---

## Status Page

A public status page should be set up at `status.nodbusiness.app` using:
- **Statuspage.io** (free tier)
- **UptimeRobot** + a simple HTML page
- Or build one using Railway health check + public endpoint

Update status page within 5 minutes of detecting a P0 or P1 incident.
