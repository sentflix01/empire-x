# Nodbusiness — Incident Response Playbook

> Step-by-step procedures for when things go wrong.
> The goal is consistent, calm, fast recovery — not heroics.
> Severity definitions, SLAs, and escalation live in **`operations/SEVERITY_LEVELS.md`** (canonical).
> Last updated: 2026-08-23

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SEV | Severity level (see `SEVERITY_LEVELS.md`) |
| IC | Incident Commander |
| RCA | Root Cause Analysis |
| MTTR | Mean Time To Resolve |
| JWT | JSON Web Token |
| API | Application Programming Interface |
| DB | Database |
| UTC | Coordinated Universal Time |

---

## SEV-1 Response: Platform Down

### Step 1: Detect (< 5 min)
- **Sentry** — error spike alert
- **Railway health check** — `GET /health` returns non-200
- **User reports** — Telegram/WhatsApp from users

### Step 2: Communicate (< 10 min)
```
Post to team Telegram ("Nodbusiness Incidents"):
"🔴 SEV-1 INCIDENT — [service] is down as of [time].
Investigating. Will update in 30 min."
```

### Step 3: Diagnose (< 15 min)
```bash
# Check Railway logs
railway logs --service halehame-backend

# Check database
psql $DATABASE_URL -c "SELECT 1"

# Check health endpoint
curl -s https://your-api.railway.app/health | jq

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
- Kill long-running queries (queries have a 10 s statement timeout server-side, but stuck idle sessions can still pile up):

```sql
-- Longest-running queries right now
SELECT pid, now() - query_start AS runtime, state, left(query, 80) AS query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY runtime DESC;

-- Terminate a specific runaway query
SELECT pg_terminate_backend(<pid>);

-- Kill idle connections holding pool slots
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
```

**If memory/CPU spike:**
- Railway dashboard → restart service
- Check for N+1 queries, connection pool exhaustion (`GET /metrics`, admin-only)

### Step 5: Resolve & Document
```
Post to team Telegram:
"✅ SEV-1 RESOLVED — [service] restored at [time].
Root cause: [cause].
Fix: [what was done].
Postmortem within 72h using operations/POSTMORTEM_TEMPLATE.md."
```

---

## SEV-1 Response: Security Breach

**Signs:** Unexpected admin actions, data accessed by unknown IPs, user reports of account takeover.

### Immediate actions (< 15 min)
1. **Invalidate every session globally:** rotating `JWT_SECRET` invalidates all access *and* refresh tokens at once (both are signed with it). Restart the backend after changing the value. Per-user revocation (`revoke_before:{userId}` in Redis) exists but must be set per user — there is no global key.
2. **Force password reset for affected accounts:** clear `password_hash` or mark accounts and trigger the forgot-password flow.
3. **Rotate provider secrets**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CHAPA_SECRET_KEY`, database credentials.
4. **Preserve evidence first where possible:** download Railway logs before they rotate (retention is short) and snapshot suspicious rows.
5. **Block attacker infrastructure:** Railway → Settings → Networking (IP rules), plus WAF/proxy if configured.

### Investigation
There is no dedicated audit-log table yet (tracked as TD-012 in
`operations/TECHNICAL_DEBT.md`). Until it ships, reconstruct activity from:

```sql
-- Auth-related error spikes by fingerprint (error_events table, migrate30)
SELECT fingerprint, any_value(path) AS path, max(last_seen_at) AS last_seen,
       sum(occurrence) AS hits
FROM error_events
WHERE last_seen_at > NOW() - INTERVAL '24 hours'
GROUP BY fingerprint
ORDER BY hits DESC
LIMIT 50;
```

- **Railway logs** (JSON/Pino): grep for `auth`, `/api/admin`, `login`, `reset-password`.
- **Stripe/Chapa dashboards**: unexpected transfers, webhook failures, new bank accounts.
- Application data: check `orders`, `wallet_transactions`, and `commissions` for rows created outside normal patterns.

> Do not run speculative SQL against tables that may not exist. Anything you cannot verify,
> capture from logs instead.

### Notification
- Notify affected users within 72 hours (GDPR requirement).
- Notify Ethiopia's Information Network Security Agency (INSA) per legal review if personal data of >1,000 users is affected. Thresholds harmonized with `compliance/DATA_GOVERNANCE.md §6`.
- Post breach notice on platform. Templates: `support/CRISIS_COMMUNICATION.md`.

---

## SEV-2 Response: Payment Processing Degraded

```bash
# Check Stripe status
curl https://status.stripe.com/api/v2/status.json

# Check Chapa status
# (No public status API — contact Chapa support / dashboard)

# If Stripe webhook failing:
# Check STRIPE_WEBHOOK_SECRET is correct
# Verify webhook endpoint is accessible
# Check Railway logs for webhook route errors
```

**Mitigation — disable a payment rail instantly (no redeploy):**

```bash
# Fast path: flip the flag in Redis (takes effect immediately)
node -e "require('ioredis'); /* from an env with REDIS_URL */"
# or via the admin flow that calls setFlag('stripe_payments', false)

# Slower path: FF_STRIPE_PAYMENTS=false env var — NOTE this triggers a Railway redeploy.
```
Buyers on the disabled rail fall back to COD/Chapa per checkout logic.

---

## SEV-2 Response: Database Connection Exhausted

```sql
-- Check current connections vs limit
SELECT count(*) AS used,
       (SELECT setting::int FROM pg_settings WHERE name='max_connections') AS max_conn
FROM pg_stat_activity;

-- Who is connected?
SELECT client_addr, state, count(*)
FROM pg_stat_activity GROUP BY 1,2 ORDER BY 3 DESC;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';
```

**Fix:** Increase `DB_POOL_MAX` env var (default 10), or enable Neon connection pooling.

---

## On-Call Responsibilities

Rotation, escalation contacts, and duties: see **`operations/ON_CALL.md`**.
Response SLAs per severity: see **`operations/SEVERITY_LEVELS.md`**.

## Postmortems

Use **`operations/POSTMORTEM_TEMPLATE.md`** — required for every SEV-1/SEV-2, due within
72 hours of mitigation. Action items land in `operations/TECHNICAL_DEBT.md`.

## Status Page

A public status page should be set up at `status.nodbusiness.app` (canonical host) using:
- **Statuspage.io** (free tier), or
- **UptimeRobot** + a simple HTML page, or
- A public endpoint built on the Railway health check

Update the status page within 5 minutes of detecting a SEV-1 or SEV-2 incident.
