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

| Level | Definition | Response Time | Examples |
|-------|-----------|--------------|---------|
| **P0 — Critical** | Platform-wide outage; no users can use the app | 15 minutes | Database down, all API calls failing, payment system down |
| **P1 — High** | Core feature broken for many users | 1 hour | Login broken, orders not processing, messages not sending |
| **P2 — Medium** | Feature degraded or broken for some users | 4 hours | Search slow, images not loading, some payments failing |
| **P3 — Low** | Minor issue affecting few users | 24 hours | UI glitch, non-critical feature broken, edge case error |

---

## 3. Alert Sources

You will be paged from:
- **Sentry** — uncaught errors in backend or frontend
- **Uptime monitoring** (Railway/Vercel health checks)
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
- Was there a recent deployment? (Check Railway/Vercel deploy log)
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
  → Railway: deploy → redeploy previous version
  → Vercel: deployments → promote previous build

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
curl https://api.nodbusiness.com/health
```

### View recent errors
Navigate to DevOps → Live Errors tab (real-time error feed)

### Check database
Railway dashboard → PostgreSQL → Connect → run queries

### Check Redis
Railway dashboard → Redis → CLI

### Roll back backend
Railway dashboard → Deployments → Select previous → Redeploy

### Roll back frontend
Vercel dashboard → Deployments → Select previous → Promote to Production

---

## 6. Escalation Matrix

| Scenario | Who to call |
|---------|------------|
| Database unreachable | CTO → Railway support |
| Payment system down | CTO → Stripe/Chapa status page |
| Security incident / breach | CEO + Legal counsel immediately |
| All API calls 500 | CTO → check Railway logs |
| High fraud rate detected | CEO → freeze affected accounts |
| Media escalation | CEO → PR response |

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
