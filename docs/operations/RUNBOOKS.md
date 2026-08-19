# Nodbusiness — Runbooks

> Step-by-step response procedures for common incidents.
> The goal is consistent, calm, fast recovery — not heroics.
> When something goes wrong, open this document first.
> Last updated: August 2026

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

---

## Incident Severity Levels## Incident Severity Levels

| Level | Description | Response Time | Example |
|---|---|---|---|
| P0 | Complete outage — all users affected | Immediate | Database down, backend crash loop |
| P1 | Major degradation — key feature broken | <15 min | Payments failing, auth broken |
| P2 | Partial degradation — some users affected | <1 hour | AI not responding, notifications delayed |
| P3 | Minor issue — workaround exists | <24 hours | Slow queries, email delays |

---

## Runbook 1: Backend is Down

**Symptoms:** API returns 502/503, health check fails, frontend shows network errors

**Step 1 — Verify the problem**
```
GET https://api.nodbusiness.app/health
Expected: { "status": "ok" }
Actual:   Connection refused / 502
```

**Step 2 — Check Railway dashboard**
- Open https://railway.app → nodbusiness-backend service
- Check Deployments tab — is the latest deploy green or failed?
- Check Logs tab — look for crash errors or OOM (out of memory)

**Step 3 — Common causes and fixes**

| Cause | How to identify | Fix |
|---|---|---|
| Bad deploy (syntax error) | Logs show `SyntaxError` or `Cannot find module` | Railway → Deployments → Rollback to previous |
| Database connection refused | Logs show `ECONNREFUSED` or `PG connection failed` | Check Neon status (neon.tech/status); check `DATABASE_URL` env var |
| OOM (out of memory) | Logs show `JavaScript heap out of memory` | Railway → Scale → increase RAM; check for memory leak |
| Environment variable missing | Logs show `Missing required env vars` | Railway → Variables → add the missing var → redeploy |
| Port conflict | App doesn't start | Ensure `PORT` env var matches Railway config |

**Step 4 — Rollback if needed**
- Railway → Deployments → find last working deploy → Rollback
- Takes ~2 minutes

**Step 5 — Notify users if P0 (>5 min outage)**
- Post status update to Telegram channel or email

**Step 6 — Post-incident**
- Write a brief incident report: what happened, why, what was fixed, how to prevent it
- Add a checklist item to the tech debt doc if a code change is needed

---

## Runbook 2: Database (Neon) is Down

**Symptoms:** Every API call returns 500, logs show `database connection` errors

**Step 1 — Check Neon status**
- Visit https://neon.tech/status
- If there's an incident → this is their problem, wait and monitor

**Step 2 — Verify connection string**
- Railway → Variables → `DATABASE_URL`
- Must include `?sslmode=require` for Neon
- Test: `psql $DATABASE_URL -c "SELECT 1"`

**Step 3 — Check connection pool**
- Neon free tier: 10 max connections
- If you see `too many clients` errors → add `?connection_limit=5` to DATABASE_URL
- Or upgrade Neon plan

**Step 4 — Emergency read-only mode (if partial outage)**
- Neon supports branching — read replica can be promoted
- Contact Neon support for help with failover

**Step 5 — Restore from backup**
- Neon → Project → Restore → Select point in time
- Restore to a new branch, verify data, then switch connection string
- Test with a few API calls before switching production traffic

---

## Runbook 3: Payments are Failing

**Symptoms:** Users report payment errors; Stripe dashboard shows failed sessions

**Step 1 — Check Stripe dashboard**
- https://dashboard.stripe.com → Payments → look for errors
- Common errors: `Your card was declined`, `Invalid API key`, `Webhook signature mismatch`

**Step 2 — Verify environment variables**
- Railway → Variables:
  - `STRIPE_SECRET_KEY` — must start with `sk_test_` (dev) or `sk_live_` (prod)
  - `STRIPE_WEBHOOK_SECRET` — must match the webhook endpoint in Stripe dashboard

**Step 3 — Test the webhook**
- Stripe Dashboard → Developers → Webhooks → your endpoint
- Click "Send test webhook" → `checkout.session.completed`
- Check Railway logs for the incoming request

**Step 4 — Check order status**
- Orders stuck in `pending` after payment = webhook not received
- Manually check Stripe session: Stripe Dashboard → Payments → find session → check status
- If payment succeeded but order is still pending: manually update via admin panel or SQL

**Step 5 — Stripe mode mismatch**
- Using `sk_test_` key but testing with real cards → will fail
- Using `sk_live_` key but testing with test cards → will fail
- Verify key matches your testing intent

---

## Runbook 4: High Error Rate (Sentry Alert)

**Symptoms:** Sentry alert fires; many errors of the same type in a short window

**Step 1 — Open Sentry**
- https://sentry.io → Nodbusiness project
- Look at the Issues tab, sort by "First Seen" (new errors) or "Events" (volume)

**Step 2 — Identify the error**
- Click the error → see full stack trace
- Note: which endpoint? Which line of code? What was the request?

**Step 3 — Triage severity**
- Is it P0 (complete failure) or P3 (one edge case)?
- How many users are affected?
- Is it getting worse (check event rate graph)?

**Step 4 — Common errors and fixes**

| Error | Cause | Fix |
|---|---|---|
| `Cannot read properties of null` | updateRecord returned null, not checked | Add null guard (`if (!updated) return 404`) |
| `Invalid table name` | crud.js validateTable rejected a table | Add missing table to ALLOWED_TABLES |
| `JWT expired` | User's token is old | Expected — client should refresh. Check if redirect to /login works |
| `ECONNREFUSED` | Database or Redis unreachable | See Runbook 2 or Runbook 6 |
| `Webhook signature invalid` | Wrong STRIPE_WEBHOOK_SECRET | Update env var in Railway |

**Step 5 — Deploy a fix**
- Push to main → CI runs → auto-deploys to Railway + Vercel
- Verify error rate drops in Sentry within 5 minutes

---

## Runbook 5: Frontend is Down (Vercel)

**Symptoms:** App shows blank page, 404, or build error

**Step 1 — Check Vercel dashboard**
- https://vercel.com → nodbusiness project
- Deployments tab → is the latest deploy green?
- Check build logs for errors

**Step 2 — Common build failures**

| Error | Fix |
|---|---|
| `Module not found` | A dependency is missing from `package.json` |
| `TypeScript error` | Type error in a component — fix the type |
| `Environment variable not defined` | Add missing `NEXT_PUBLIC_` var in Vercel settings |
| `Build timeout` | Increase Vercel build timeout or optimize imports |

**Step 3 — Rollback**
- Vercel → Deployments → find last successful deploy → "Promote to Production"
- Takes ~30 seconds

**Step 4 — Verify**
- Visit https://nodbusiness.vercel.app
- Test: login, load feed, open a product

---

## Runbook 6: Redis is Down

**Symptoms:** Feature flags default to hardcoded values; background job queue doesn't drain; rate limiting may not work

**Step 1 — Check Upstash dashboard**
- https://console.upstash.com → your Redis instance
- Check if it shows connected or an error

**Step 2 — Impact assessment**
The app is designed to work without Redis (no-op fallback in `lib/redis.js`):
- Feature flags fall back to env vars + hardcoded defaults ✅
- BullMQ jobs run synchronously (emails/notifications still work, slower) ✅
- Real-time Socket.IO still works (single instance) ✅
- Rate limiting falls back to in-memory (less precise but functional) ✅

**Conclusion:** Redis down is P3 — degraded but not broken.

**Step 3 — Fix**
- Restart the Redis instance in Upstash dashboard
- Verify `REDIS_URL` env var in Railway is correct
- Check Railway logs — should show `BullMQ workers started` when Redis reconnects

---

## Runbook 7: File Uploads Not Working

**Symptoms:** Images don't upload; products/profiles show broken images

**Step 1 — Check R2 configuration**
- Railway → Variables: are all R2 vars set?
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_URL`

**Step 2 — Check Cloudflare R2 dashboard**
- https://dash.cloudflare.com → R2 → nodbusiness-uploads bucket
- Is public access enabled? Is the bucket accessible?

**Step 3 — Fallback**
- If R2 creds are missing, uploads fall back to local disk
- This is not suitable for production — fix R2 config

**Step 4 — Test manually**
```bash
curl -X POST https://api.nodbusiness.app/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.jpg"
# Should return { url: "https://pub-xxx.r2.dev/..." }
```

---

## Runbook 8: Emails Not Sending

**Symptoms:** Users not receiving OTP emails; password reset links not arriving

**Step 1 — Check Railway logs**
- Look for: `OTP email failed`, `Resend error`, `SMTP error`
- In dev: OTP prints to console in yellow — is it printing there?

**Step 2 — Verify Resend configuration**
- Railway → Variables: `RESEND_API_KEY` starts with `re_`
- Visit https://resend.com/emails — do recent sends show up?
- Check bounce/spam rate in Resend dashboard

**Step 3 — Test manually**
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@resend.dev","to":"you@email.com","subject":"Test","html":"<p>Test</p>"}'
```

**Step 4 — Fallback**
- If Resend fails, the mailer tries SMTP (if configured)
- If both fail in dev, OTP prints to console — dev still works
- In production: alert users to check spam, retry OTP

---

## Post-Incident Template

After every P0 or P1, write a brief report:

```
## Incident Report — [Date]

**Severity:** P0 / P1 / P2
**Duration:** X minutes
**Users affected:** estimated N users

**Timeline:**
- HH:MM — Issue first noticed
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — Confirmed resolved

**Root cause:**
[What went wrong?]

**Fix:**
[What was changed?]

**Prevention:**
[What will we do to prevent this happening again?]
- [ ] Action item 1
- [ ] Action item 2
```
