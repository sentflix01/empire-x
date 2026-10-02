# Nodbusiness — On-Call Guide

> Who is responsible when something breaks, how to respond, and what to do at every severity level.
> This is the first document you read when your phone alerts at 3AM.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SLA | Service Level Agreement |
| P0/P1/P2/P3 | Priority 0/1/2/3 — incident severity levels |
| RCA | Root Cause Analysis |
| MTTR | Mean Time to Resolve |
| CEO | Chief Executive Officer |
| CTO | Chief Technology Officer |
| DB | Database |
| API | Application Programming Interface |
| CI/CD | Continuous Integration / Continuous Delivery |

---

## 1. On-Call Rotation

### Phase 1 (Bootstrap — single engineer)
- **Primary on-call:** CEO / Lead Engineer
- **Escalation:** CEO
- Hours: best effort — no formal rotation yet

### Phase 2 (Post-seed, 3+ engineers)
- Weekly rotation — engineer covers Sunday–Saturday
- Handoff on Sunday at 10:00 UTC via async message
- Rotation managed via PagerDuty or similar

### Phase 3 (Scale)
- Follow-the-sun rotation (3 timezones)
- 12-hour shifts
- Backup engineer always assigned alongside primary

---

## 2. Severity Levels

> **Canonical matrix: [`operations/SEVERITY_LEVELS.md`](SEVERITY_LEVELS.md).** This page uses
> SEV-1…SEV-4 (formerly P0–P3) as defined there — response SLAs, update cadence, escalation,
> and communication rules all come from that document, not from here.

| Level | Definition | Response Time | Examples |
|-------|-----------|--------------|---------|
| **SEV-1** | Platform down; money or data at risk | Immediate (24/7) | Database down, payment double-charging, data breach |
| **SEV-2** | Core feature degraded, workaround exists | <15 min (24/7) | Login broken for some users, one payment rail failing |
| **SEV-3** | Limited impact | <4 business hours | Search slow, notifications delayed, Redis down |
| **SEV-4** | Cosmetic / no user impact | Backlog | UI glitch, dashboard tile broken |

---

## 3. Alert Sources

You will be paged from:
- **Sentry** — uncaught errors in backend or frontend
- **Uptime monitoring** (Uptime Kuma — self-hosted on Oracle VM, 1-min checks)
- **DevOps Live Error Feed** — `/devops` panel shows real-time errors
- **User reports** — support@nodbusiness.com, social media
- **Manual escalation** — teammate or CEO messages you

---

## 4. Response Playbook

### Step 1: Acknowledge (within response SLA)
```
- Open the alert
- Post in #incidents channel: "I'm on it — investigating"
- Check: is this actually happening? (Check Sentry, /health endpoint, try the app yourself)
```

### Step 2: Assess Scope
```
- How many users affected?
- Which feature/endpoint is failing?
- When did it start? (Sentry first-seen timestamp)
- Was there a recent deployment? (Check Render → Deployments tab)
- Check DevOps Live Error Feed for error pattern
```

### Step 3: Communicate
```
P0/P1: Update status page within 15 minutes
P0/P1: Notify CEO immediately (call if no response in 5 min)
P2: Post update in #engineering within 1 hour
All: Keep status page updated every 30 min during active incident
```

### Step 4: Resolve
```
Option A: Roll back (if caused by a recent deploy)
  → Backend: Render → service → Deploys → select previous → Redeploy (~2 min)
  → Frontend: Vercel → Project → Deployments → Rollback (~1 min)

Option B: Hotfix
  → Fix code on a branch
  → Test locally
  → Deploy to production
  → Verify fix with smoke tests

Option C: Disable feature
  → Admin panel → Feature Flags → Disable the broken feature
  → Users see feature unavailable; platform stays up
```

### Step 5: Post-Incident
```
- Post "resolved" on status page
- Write incident summary in #incidents within 24h
- Schedule post-mortem within 72h for P0/P1
- Add to Runbooks if new fix discovered
```

---

## 5. Useful Commands During Incidents

### Check backend health
```bash
curl https://api.nodbusiness.app/health
```

### View recent errors
Navigate to DevOps → Live Errors tab (real-time error feed)

### Check database
Supabase → Dashboard → Table Editor → run queries
Or: `psql "$DATABASE_URL" -c "SELECT 1"`

### Check Redis
Upstash → console.upstash.com → your database → CLI

### Roll back backend
Render → service → Deploys → Select previous → Redeploy

### Roll back frontend
Cloudflare → Pages → nodbusiness → Deployments → Select previous → Rollback

---

## 6. Escalation Matrix

| Scenario | Who to call |
|---------|------------|
| Database unreachable | CTO → Supabase status (status.supabase.com) |
| Payment system down | CTO → Stripe/Chapa status page |
| Security incident / breach | CEO + Legal counsel immediately |
| All API calls 500 | CTO → check Render service logs |
| High fraud rate detected | CEO → freeze affected accounts |
| Media escalation | CEO → PR response |
| Oracle VM unreachable | CTO → provision Hetzner CAX11 (see DISASTER_RECOVERY.md Scenario 2) |

---

## 7. Post-Incident Report Template

Fill this within 24 hours of resolution:

```markdown
## Incident Report — [Date]

**Severity:** P0/P1/P2/P3
**Duration:** X hours Y minutes
**Users affected:** ~N users / X% of traffic

**What happened:**
[1-2 sentence summary]

**Timeline:**
- HH:MM — First alert / user report
- HH:MM — Engineer acknowledged
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — All clear confirmed

**Root cause:**
[Specific technical cause]

**What went well:**
[Things that helped resolve this quickly]

**What went wrong:**
[Things that slowed resolution]

**Action items:**
- [ ] [Specific action] — [Owner] — [Due date]
- [ ] [Specific action] — [Owner] — [Due date]

**Will we publish a public post-mortem?** Yes / No
```

---

*Owner: On-call engineer (rotating), CEO (escalation)*
*Review: After every P0/P1 incident*
