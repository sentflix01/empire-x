# Nodbusiness — Production Launch Checklist

> Every item that must be checked before real users and real money flow through the platform.
> Work through this list top-to-bottom before announcing public launch.
> **Last updated:** September 2026
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Cloudflare Pages · Supabase · Upstash Redis · Cloudflare R2 · Resend

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| JWT | JSON Web Token |
| HTTPS | HyperText Transfer Protocol Secure |
| TLS | Transport Layer Security |
| CDN | Content Delivery Network |
| DNS | Domain Name System |
| SSL | Secure Sockets Layer |
| R2 | Cloudflare R2 — object storage |
| VAPID | Voluntary Application Server Identification — Web Push keys |
| KYC | Know Your Customer |
| AML | Anti-Money Laundering |
| GDPR | General Data Protection Regulation |
| DB | Database |
| CI/CD | Continuous Integration / Continuous Delivery |
| WAF | Web Application Firewall |
| MFA | Multi-Factor Authentication |
| VM | Virtual Machine |

---

## 🔴 CRITICAL — Must Complete Before First Real User

### Infrastructure (Oracle Cloud + Coolify)
- [ ] Oracle Cloud Johannesburg VM provisioned: Ampere A1, 2 OCPU, 12 GB RAM, Ubuntu 22.04
- [ ] Coolify v4 installed and accessible: `curl -fsSL https://get.coolify.io | bash`
- [ ] Backend application added in Coolify — GitHub repo connected, Dockerfile auto-detected
- [ ] All environment variables set in Coolify (see `DEPLOYMENT_VARIABLES.md` Section 2)
- [ ] Coolify webhook URL and API token copied into GitHub Secrets (`COOLIFY_WEBHOOK_URL`, `COOLIFY_TOKEN`)
- [ ] Test deploy: push an empty commit → GitHub Actions CI passes → Coolify webhook fires → container healthy
- [ ] Verify: `curl https://api.yourdomain.com/health` → `{ "status": "ok" }`

### File Storage (Cloudflare R2)
- [ ] R2 bucket created: `nodbusiness-uploads` in Cloudflare dashboard
- [ ] R2 API token created (Object Read & Write on `nodbusiness-uploads`)
- [ ] Set in Coolify env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- [ ] Enable R2 public access: R2 bucket → Settings → Public Access → Allow → copy URL
- [ ] Test: Upload a profile photo → verify URL is `pub-xxx.r2.dev/...`
- [ ] Test: Upload a product image → verify displayed in marketplace
- [ ] Test: Trigger Coolify redeploy → verify previous uploads still accessible (not on local disk)

### Payments — Stripe
- [ ] Stripe account verified for live payments
- [ ] Set `STRIPE_SECRET_KEY=sk_live_...` in Coolify env vars
- [ ] Register webhook at dashboard.stripe.com → Developers → Webhooks:
  - Endpoint URL: `https://api.yourdomain.com/api/orders/webhook`
  - Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] Set `STRIPE_WEBHOOK_SECRET=whsec_...` in Coolify env vars
- [ ] Test: Place a real order with test card `4242 4242 4242 4242`
- [ ] Test: Verify order status changes to "paid" after Stripe webhook fires
- [ ] Test: Verify seller receives push notification for new order
- [ ] Test: Verify buyer receives order confirmation email

### Payments — Chapa
- [ ] Chapa business account approved
- [ ] Set `CHAPA_SECRET_KEY=CHASECK_live_...` in Coolify env vars
- [ ] Register webhook at dashboard.chapa.co → Settings → Webhooks:
  - URL: `https://api.yourdomain.com/api/mewacho/webhook`
- [ ] Set `API_URL=https://api.yourdomain.com` in Coolify env vars
- [ ] Test: Place a real order via Telebirr sandbox
- [ ] Test: Verify payment confirmed in Orders page

### Error Monitoring (Sentry)
- [ ] Create Sentry project: Nodbusiness Backend (Node.js)
- [ ] Create Sentry project: Nodbusiness Frontend (Next.js)
- [ ] Set `SENTRY_DSN` in Coolify env vars
- [ ] Set `NEXT_PUBLIC_SENTRY_DSN` in Cloudflare Pages env vars
- [ ] Trigger a test error → verify it appears in Sentry dashboard
- [ ] Set up Sentry alert: New error → Telegram message

### Authentication Security
- [ ] `JWT_SECRET` is 64+ random hex characters (not a dictionary word)
- [ ] `JWT_SECRET` stored only in Coolify env vars (not in code or git)
- [ ] Verify banned users cannot log in
- [ ] Verify admin routes reject non-admin users

---

## 🟡 HIGH — Complete Before First 100 Users

### Domain & SSL
- [ ] Domain registered (e.g. `nodbusiness.app`)
- [ ] Cloudflare DNS configured:
  - `A @ → <Oracle VM IP>` (proxied ✅)
  - `CNAME api → <Oracle VM IP or Coolify domain>` (proxied ✅)
  - `CNAME www → nodbusiness.pages.dev` (proxied ✅)
- [ ] Cloudflare SSL mode: **Full (Strict)** — not Flexible
- [ ] SSL working: `https://nodbusiness.app` → 200 OK
- [ ] SSL working: `https://api.nodbusiness.app/health` → 200 OK
- [ ] HTTP redirects to HTTPS (test: `http://nodbusiness.app` → 301)
- [ ] HSTS header present (check: securityheaders.com) — already set in Helmet.js

### Oracle VM Security — Block Direct IP Access
- [ ] Oracle Cloud → Networking → Security List → Ingress Rules:
  - Allow TCP 443 ONLY from Cloudflare IP ranges (prevents bypass attacks)
  - Allow TCP 80 ONLY from Cloudflare IP ranges
  - Allow TCP 8000 from your own IP only (Coolify dashboard)
  - Allow TCP 22 from your own IP only (SSH)
- [ ] Cloudflare IP ranges: https://www.cloudflare.com/ips/ (update when Cloudflare publishes changes)
- [ ] Test: Attempt direct HTTPS to Oracle VM IP → should be blocked

### Email
- [ ] Resend API key configured in Coolify (`RESEND_API_KEY`)
- [ ] SPF record added to DNS: `TXT @ v=spf1 include:_spf.resend.com ~all`
- [ ] DKIM record added (from Resend dashboard → Domains)
- [ ] DMARC record added: `TXT _dmarc v=DMARC1; p=quarantine; pct=100`
- [ ] Test: Register with real email → OTP arrives in inbox (not spam)
- [ ] Test: Place order → confirmation email arrives in inbox
- [ ] Test: Password reset → email arrives in inbox

### Push Notifications
- [ ] Generate VAPID keys: `cd backend && node -e "const wp=require('web-push');const k=wp.generateVAPIDKeys();console.log(JSON.stringify(k))"`
- [ ] Set `VAPID_PUBLIC_KEY` in Coolify env vars
- [ ] Set `VAPID_PRIVATE_KEY` in Coolify env vars
- [ ] Set `VAPID_EMAIL=mailto:admin@yourdomain.com` in Coolify env vars
- [ ] Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Cloudflare Pages env vars
- [ ] Test: Enable push notifications in app → allow in browser
- [ ] Test: Send a message → push notification appears on device
- [ ] Test: Place an order → seller receives push notification

### Caching (Upstash Redis)
- [ ] Create Upstash Redis database at upstash.com (free tier)
- [ ] Set `REDIS_URL=rediss://...` in Coolify env vars
- [ ] Verify: `curl https://api.yourdomain.com/health` → `"redis": "connected"`
- [ ] Test: Load feed → second request hits cache (faster response)

### Monitoring (Uptime Kuma)
- [ ] Add Uptime Kuma as a one-click service in Coolify (or deploy the Docker image)
- [ ] Add monitor: `https://api.yourdomain.com/health` (1-minute interval, HTTP keyword "ok")
- [ ] Add monitor: `https://nodbusiness.app` (1-minute interval, HTTP 200)
- [ ] Add monitor: Supabase status URL
- [ ] Configure alert: Telegram notification on downtime
- [ ] Test: Temporarily break a route → verify Telegram alert fires within 1 minute

### Supabase Keep-Alive
- [ ] Confirm `supabase-keepalive.yml` workflow is **enabled** in GitHub Actions → Actions tab
- [ ] Confirm `DATABASE_URL` secret is set in GitHub (workflow needs it)
- [ ] Run workflow manually: Actions → Supabase Keep-Alive → Run workflow → confirm it succeeds

### Cloudflare Pages Setup
- [ ] Cloudflare Pages connected to GitHub repo
- [ ] Build settings: Root dir = `frontend-next`, Command = `npm run build`, Output = `out`
- [ ] All frontend env vars set in Cloudflare Pages dashboard (see `DEPLOYMENT_VARIABLES.md` Section 3)
- [ ] Custom domain configured: `nodbusiness.app` → Cloudflare Pages

---

## 🟢 IMPORTANT — Complete Before First 1,000 Users

### Performance
- [ ] Enable Supabase Supavisor pooling: switch app `DATABASE_URL` to pooler URL (port 6543)
  - Keep direct URL (port 5432) only for migrations and pg_dump
- [ ] Run `EXPLAIN ANALYZE` on 5 most common queries — no seq scans on large tables
- [ ] Feed load time: < 1 second on 4G connection
- [ ] Product listing load time: < 800ms
- [ ] Image load time: < 500ms (Cloudflare R2 CDN serving from edge)

### Security
- [ ] Run `npm audit --audit-level=high` in backend → 0 high/critical issues
- [ ] Run `npm audit --audit-level=high` in frontend → 0 high/critical issues
- [ ] Check security headers at securityheaders.com → Score B or higher
- [ ] Enable Cloudflare Bot Fight Mode
- [ ] Enable Cloudflare Browser Integrity Check
- [ ] Enable Cloudflare Always HTTPS

### Content & Legal
- [ ] Terms of Service published at `/terms`
- [ ] Privacy Policy published at `/privacy`
- [ ] Content Policy linked in footer
- [ ] Cookie notice displayed to new visitors
- [ ] Contact email functional (`contact@yourdomain.com`)

### Admin Panel
- [ ] Admin account created (your account with `role=admin` in DB)
- [ ] Verify admin panel accessible at `/admin`
- [ ] Verify non-admin cannot access `/admin`
- [ ] Test ban/unban flow
- [ ] Test content removal flow

---

## 🔵 BEFORE MARKETING LAUNCH

### Performance Benchmarks (Must Pass)
- [ ] Load test: 100 concurrent users for 5 minutes → error rate < 0.5%
- [ ] Load test: 20 concurrent checkouts for 2 minutes → all succeed
- [ ] Lighthouse score: Performance ≥ 80 on mobile
- [ ] Lighthouse score: Accessibility ≥ 85
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

### Mobile Experience
- [ ] Install PWA on Android Chrome → opens correctly
- [ ] Push notifications work on Android
- [ ] All pages render correctly at 375px width (iPhone SE)
- [ ] Chat room input not covered by keyboard on mobile

### Critical User Flows (Full End-to-End Test)
- [ ] Register → OTP → Onboarding → Feed (works, < 3 min)
- [ ] Create business → create showroom → publish → share link → view as visitor
- [ ] List product → add to cart → checkout via Chapa → order in Orders page
- [ ] List product → add to cart → checkout via Stripe → order in Orders page
- [ ] Seller receives order → marks processing → marks delivered → buyer leaves review
- [ ] Send a message → recipient gets push notification → replies → real-time delivery
- [ ] Post with hashtag → appears in hashtag feed
- [ ] Follow a user → see their posts in Following tab

---

## Final Pre-Launch Sign-Off

| Check | Verified by | Date |
|---|---|---|
| All 🔴 Critical items complete | | |
| All 🟡 High items complete | | |
| Oracle VM security rules set (Cloudflare IP allowlist) | | |
| Full end-to-end test passed | | |
| Load test passed | | |
| Security review complete | | |
| Legal review complete | | |
| At least 10 real sellers ready | | |
| **APPROVED TO LAUNCH** | | |

---

## Post-Launch (First 48 Hours)

```
Hour 0–2:   Announce to first 50 users (close network)
Hour 2–6:   Monitor Sentry for new errors — fix immediately
Hour 6–12:  Check Coolify container CPU/RAM — normal?
Hour 12–24: Check payment success rate — target > 90%
Hour 24–48: Check D1 retention — how many users came back?

Keep team on standby for first 48 hours.
Have rollback ready: Coolify → Deployments → previous → Redeploy (60 seconds).
Feature flags in Redis allow instant disable of any feature without redeploy.
```
