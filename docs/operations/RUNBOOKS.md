# Nodbusiness — Runbooks

> Step-by-step response procedures for common incidents.
> The goal is consistent, calm, fast recovery — not heroics.
> When something goes wrong, open this document first.
> **Last updated:** September 2026
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Cloudflare Pages · Supabase

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| P0/P1/P2/P3 | Priority 0/1/2/3 — incident severity levels |
| API | Application Programming Interface |
| DB | Database |
| OOM | Out of Memory |
| RCA | Root Cause Analysis |
| PITR | Point-In-Time Recovery |
| DNS | Domain Name System |
| SSL | Secure Sockets Layer |
| TLS | Transport Layer Security |
| CDN | Content Delivery Network |
| CPU | Central Processing Unit |
| RAM | Random Access Memory |
| VM | Virtual Machine |

---

## Incident Severity Levels

> **Canonical matrix: [`operations/SEVERITY_LEVELS.md`](SEVERITY_LEVELS.md).** Summary:
> SEV-1 platform down / money or data at risk (immediate) · SEV-2 core feature degraded
> (<15 min) · SEV-3 limited impact (<4 business hours) · SEV-4 cosmetic (backlog).

---

## Runbook 1: Backend is Down

**Symptoms:** API returns 502/503/000, health check fails, frontend shows network errors

**Step 1 — Verify the problem**
```bash
curl https://api.nodbusiness.app/health
# Expected: { "status": "ok" }
# Actual:   Connection refused / 502 / timeout
```

**Step 2 — Check Coolify dashboard**
- Open your Coolify instance → **nodbusiness-backend** application
- Check **Deployments** tab — is the latest deploy green or failed?
- Check **Logs** tab — look for crash errors or OOM messages

**Step 3 — Common causes and fixes**

| Cause | How to identify | Fix |
|---|---|---|
| Bad deploy (syntax error) | Logs show `SyntaxError` or `Cannot find module` | Coolify → Deployments → Rollback to previous (~60 sec) |
| Database connection refused | Logs show `ECONNREFUSED` or `PG connection failed` | Check Supabase status (status.supabase.com); check `DATABASE_URL` env var |
| OOM (out of memory) | Logs show `JavaScript heap out of memory` | Coolify → Container metrics → verify RAM; check for memory leak; consider Hetzner upgrade |
| Environment variable missing | Logs show `Missing required env vars` | Coolify → Environment Variables → add missing var → redeploy |
| Coolify container not starting | Health check never passes | Coolify → Logs → check why `wget /health` fails; check PORT env var is not set |

**Step 4 — Rollback if needed**
```
Coolify → Application → Deployments → find last working deploy → Redeploy
Takes ~60 seconds (uses cached Docker image — no rebuild needed)
```

**Step 5 — Oracle VM down (worst case)**
```bash
# If the entire Oracle VM is unreachable:
# 1. Provision Hetzner CAX11 (€4.29/month) — https://hetzner.com
# 2. SSH in: ssh root@<hetzner-ip>
# 3. Install Coolify: curl -fsSL https://get.coolify.io | bash
# 4. Add backend app (same GitHub repo, same env vars from DEPLOYMENT_VARIABLES.md)
# 5. Update Cloudflare DNS: A api → <hetzner-ip>  (TTL 60s → propagates in <1 min)
# Total time: ~25-30 minutes. Zero data loss (Supabase, R2, Upstash are all external)
```

**Step 6 — Notify users if P0 (>5 min outage)**
- Post status update via Telegram channel or Uptime Kuma public status page

**Step 7 — Post-incident**
- Write incident report (template at end of this file)
- Add checklist item to tech debt doc if a code change is needed

---

## Runbook 2: Database (Supabase) is Down

**Symptoms:** Every API call returns 500, logs show `database connection` errors

**Step 1 — Check Supabase status**
- Visit https://status.supabase.com
- If there's an incident → wait and monitor (usually resolves within 30 min)

**Step 2 — Check if the free project paused**
- Visit https://supabase.com → your project
- If it shows "Project paused" → click Resume (takes 10-30 seconds)
- **Prevention:** `supabase-keepalive.yml` cron runs every 5 days to prevent this

**Step 3 — Verify connection string**
- Coolify → env vars → `DATABASE_URL`
- Must include `?sslmode=require`
- App uses Supavisor pooler (port 6543) for live traffic — check it's the pooler URL
- Test: `psql "$DATABASE_URL" -c "SELECT 1"`

**Step 4 — Check connection count**
- Supabase → Dashboard → Database → "Active connections" widget
- If near the limit → the Supavisor pooler should handle this automatically
- Nano compute (free tier) has a connection limit of ~20 direct connections

**Step 5 — Restore from backup (if data corruption)**
```
Supabase → Project → Database → Backups → Point in time restore
Select timestamp before the incident
Supabase creates a restored branch — verify data, then switch DATABASE_URL
```

---

## Runbook 3: Payments are Failing

**Symptoms:** Users report payment errors; Stripe dashboard shows failed sessions

**Step 1 — Check Stripe dashboard**
- https://dashboard.stripe.com → Payments → look for errors

**Step 2 — Verify environment variables in Coolify**
```
STRIPE_SECRET_KEY — must start with sk_test_ (dev) or sk_live_ (prod)
STRIPE_WEBHOOK_SECRET — must match the webhook endpoint in Stripe dashboard
```

**Step 3 — Test the webhook**
- Stripe Dashboard → Developers → Webhooks → your endpoint (`https://api.nodbusiness.app/api/orders/webhook`)
- Click "Send test webhook" → `checkout.session.completed`
- Check Coolify container logs for the incoming request

**Step 4 — Check order status**
- Orders stuck in `pending` after payment = webhook not received or signature mismatch
- Manually check in Supabase SQL editor: `SELECT id, status, stripe_session_id FROM orders ORDER BY created_at DESC LIMIT 10`

**Step 5 — Disable Stripe temporarily (fast path — no redeploy)**
```bash
# Set feature flag in Upstash Redis:
redis-cli -u "$REDIS_URL" SET ff:stripe_payments \
  '{"enabled":false,"rollout":0,"description":"temporarily disabled"}' EX 3600
# Effect: Stripe checkout returns 503; Chapa still works; COD still works
# To restore: redis-cli -u "$REDIS_URL" DEL ff:stripe_payments
```

---

## Runbook 4: High Error Rate (Sentry Alert)

**Symptoms:** Sentry alert fires; many errors of the same type in a short window

**Step 1 — Open Sentry**
- https://sentry.io → Nodbusiness project → Issues tab
- Sort by "First Seen" (new errors) or "Events" (volume)

**Step 2 — Identify the error**
- Click the error → see full stack trace
- Note: which endpoint? Which line? What was the request?

**Step 3 — Common errors and fixes**

| Error | Cause | Fix |
|---|---|---|
| `Cannot read properties of null` | `updateRecord` returned null, not checked | Add null guard (`if (!updated) return 404`) |
| `Invalid table name` | `crud.ts` `validateTable` rejected a table | Add missing table to `ALLOWED_TABLES` |
| `JWT expired` | User's token is old | Expected — client should refresh. Check if redirect to /login works |
| `ECONNREFUSED` | Database or Redis unreachable | See Runbook 2 or Runbook 6 |
| `Webhook signature invalid` | Wrong `STRIPE_WEBHOOK_SECRET` | Update env var in Coolify → redeploy |

**Step 4 — Deploy a fix**
```
Fix code → push to main → CI runs → Coolify webhook deploys → verify in Sentry
```

---

## Runbook 5: Frontend is Down (Cloudflare Pages)

**Symptoms:** App shows blank page, 404, or build error

**Step 1 — Check Cloudflare Pages dashboard**
- https://dash.cloudflare.com → Pages → nodbusiness
- **Deployments** tab → is the latest deploy green?
- Click the failed deployment → **View build log** for errors

**Step 2 — Common build failures**

| Error | Fix |
|---|---|
| `Module not found` | A dependency is missing from `package.json` — `npm ci` locally first |
| `TypeScript error` | Fix the type error and push again |
| `Environment variable not defined` | Add missing `NEXT_PUBLIC_` var in CF Pages → Settings → Env vars |
| Build output dir wrong | Confirm output directory is `out` in CF Pages settings |

**Step 3 — Rollback**
```
Cloudflare → Pages → nodbusiness → Deployments
→ Find last successful deploy → three-dot menu → "Rollback to this deployment"
Takes ~30 seconds
```

**Step 4 — Verify**
```bash
curl https://nodbusiness.app
# Expected: 200 OK or 307 redirect
```

---

## Runbook 6: Redis (Upstash) is Down / Limit Hit

**Symptoms:** Feature flags defaulting to hardcoded values; BullMQ jobs not processing; rate limiting using in-memory fallback

**Step 1 — Check Upstash dashboard**
- https://console.upstash.com → your Redis instance
- Is it connected? Has the monthly command limit been hit?

**Step 2 — Impact assessment**

The app is designed to work without Redis (`lib/redis.ts` no-op fallback):
- Feature flags fall back to env vars + hardcoded defaults ✅
- BullMQ jobs run synchronously in-process (emails/notifications work, slightly slower) ✅
- Socket.IO still works (single instance) ✅
- Rate limiting falls back to in-memory per-instance ✅

**Conclusion:** Redis down is SEV-3 — degraded but not broken.

**Step 3 — Fix command limit hit (free tier)**
```
The code handles "max requests limit exceeded" automatically — switches to no-op stub
for the remainder of the month. Upgrade to Upstash PAYG ($0.20/100K) to restore Redis.
Or wait until the monthly counter resets.
```

**Step 4 — Fix connection error**
```
1. Check REDIS_URL in Coolify starts with rediss:// (TLS required for Upstash)
2. Check Upstash dashboard shows the database as active
3. Coolify → redeploy to reinitialize Redis connection
```

---

## Runbook 7: File Uploads Not Working

**Symptoms:** Images don't upload; products/profiles show broken images

**Step 1 — Check R2 configuration in Coolify**
```
R2_ACCOUNT_ID — set?
R2_ACCESS_KEY_ID — set?
R2_SECRET_ACCESS_KEY — set?
R2_BUCKET_NAME — set to: nodbusiness-uploads
R2_PUBLIC_URL — set to: https://pub-xxx.r2.dev
```

**Step 2 — Check Cloudflare R2 dashboard**
- https://dash.cloudflare.com → R2 → nodbusiness-uploads bucket
- Is public access enabled? Is the bucket accessible?

**Step 3 — Test manually**
```bash
curl -X POST https://api.nodbusiness.app/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.jpg"
# Expected: { "url": "https://pub-xxx.r2.dev/..." }
# If you get a /uploads/ local path: R2 vars not set in Coolify
```

---

## Runbook 8: Emails Not Sending

**Symptoms:** Users not receiving OTP emails; password reset links not arriving

**Step 1 — Check Coolify container logs**
- Look for: `OTP email failed`, `Resend error`, `SMTP error`

**Step 2 — Verify Resend configuration**
- Coolify → env vars: `RESEND_API_KEY` starts with `re_`?
- Visit https://resend.com/emails — do recent sends appear?
- Check bounce/spam rate in Resend dashboard

**Step 3 — Check daily cap (free tier)**
- Resend free tier: 100 emails/day, 3,000/month
- If hitting 100/day: users cannot receive OTPs
- Fix: upgrade to Resend $20/month plan, or switch to Brevo (300/day free)

**Step 4 — Test manually**
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"noreply@nodbusiness.app","to":"you@email.com","subject":"Test","html":"<p>Test</p>"}'
```

---

## Post-Incident Template

After every P0 or P1, write a brief report:

```markdown
## Incident Report — [Date]

**Severity:** P0 / P1 / P2
**Duration:** X minutes
**Users affected:** estimated N users

**Timeline:**
- HH:MM — Issue first noticed (Uptime Kuma alert or user report)
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Fix deployed (Coolify rollback / code fix / DNS update)
- HH:MM — Confirmed resolved

**Root cause:**
[What went wrong?]

**Fix:**
[What was changed? Coolify rollback? Code fix? DNS update? Env var change?]

**Prevention:**
[What will we do to prevent this happening again?]
- [ ] Action item 1
- [ ] Action item 2
```
