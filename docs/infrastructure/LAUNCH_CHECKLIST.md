# Halehame — Production Launch Checklist

> Every item that must be checked before real users and real money flow through the platform.
> Work through this list top-to-bottom before announcing public launch.
> Last updated: August 2026

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

---
---

## 🔴 CRITICAL — Must Complete Before First Real User

### File Storage
- [ ] Set `R2_ACCOUNT_ID` in Railway env vars
- [ ] Set `R2_ACCESS_KEY_ID` in Railway env vars
- [ ] Set `R2_SECRET_ACCESS_KEY` in Railway env vars
- [ ] Set `R2_BUCKET_NAME=halehame-uploads`
- [ ] Set `R2_PUBLIC_URL=https://pub-xxx.r2.dev`
- [ ] Enable R2 public access in Cloudflare dashboard
- [ ] Test: Upload a profile photo → verify URL is `pub-xxx.r2.dev/...`
- [ ] Test: Upload a product image → verify displayed in marketplace
- [ ] Test: Redeploy Railway → verify previous uploads still accessible

### Payments — Stripe
- [ ] Stripe account verified for live payments
- [ ] Set `STRIPE_SECRET_KEY=sk_live_...` in Railway
- [ ] Register webhook at dashboard.stripe.com → Developers → Webhooks
  - Endpoint URL: `https://api.halehame.app/api/orders/webhook`
  - Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] Set `STRIPE_WEBHOOK_SECRET=whsec_...` in Railway
- [ ] Test: Place a real order with test card `4242 4242 4242 4242`
- [ ] Test: Verify order status changes to "paid" after Stripe webhook fires
- [ ] Test: Verify seller receives push notification for new order
- [ ] Test: Verify buyer receives order confirmation email
- [ ] Test: Open `/orders/success` page — shows order summary

### Payments — Chapa
- [ ] Chapa business account approved
- [ ] Set `CHAPA_SECRET_KEY=CHASECK_live_...` in Railway
- [ ] Register webhook at dashboard.chapa.co → Settings → Webhooks
  - URL: `https://api.halehame.app/api/orders/chapa/webhook`
- [ ] Set `API_URL=https://api.halehame.app` in Railway
- [ ] Test: Place a real order via Telebirr sandbox
- [ ] Test: Verify payment confirmed in Orders page

### Error Monitoring
- [ ] Create Sentry project: Halehame Backend (Node.js)
- [ ] Create Sentry project: Halehame Frontend (Next.js)
- [ ] Set `SENTRY_DSN` in Railway env vars
- [ ] Set `NEXT_PUBLIC_SENTRY_DSN` in Vercel env vars
- [ ] Trigger a test error → verify it appears in Sentry
- [ ] Set up Sentry alert: New error → Telegram message

### Authentication Security
- [ ] `JWT_SECRET` is 64+ random characters (not a dictionary word)
- [ ] `JWT_SECRET` stored only in Railway env vars (not in code or git)
- [ ] Verify banned users cannot log in (test with a banned account)
- [ ] Verify admin routes reject non-admin users (test with regular account)

---

## 🟡 HIGH — Complete Before First 100 Users

### Domain & SSL
- [ ] Domain registered (halehame.vercel.app or similar)
- [ ] Cloudflare DNS configured:
  - `halehame.vercel.app` → Vercel (proxied ✅)
  - `api.halehame.app` → Railway (proxied ✅)
- [ ] SSL working: `https://halehame.vercel.app` → 200 OK
- [ ] SSL working: `https://api.halehame.app/health` → 200 OK
- [ ] HTTP redirects to HTTPS (test: `http://halehame.vercel.app` → 301)
- [ ] HSTS header present (check: securityheaders.com)

### Email
- [ ] Resend API key configured
- [ ] SPF record added to DNS: `v=spf1 include:_spf.resend.com ~all`
- [ ] DKIM record added (from Resend dashboard)
- [ ] DMARC record added: `v=DMARC1; p=quarantine; pct=100`
- [ ] Test: Register with real email → OTP arrives in inbox (not spam)
- [ ] Test: Place order → confirmation email arrives in inbox
- [ ] Test: Password reset → email arrives in inbox

### Push Notifications
- [ ] Generate VAPID keys: `node -e "const wp=require('web-push');console.log(JSON.stringify(wp.generateVAPIDKeys()))"`
- [ ] Set `VAPID_PUBLIC_KEY` in Railway
- [ ] Set `VAPID_PRIVATE_KEY` in Railway
- [ ] Set `VAPID_EMAIL=mailto:admin@halehame.app` in Railway
- [ ] Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel
- [ ] Test: Enable push notifications in app → allow in browser
- [ ] Test: Send a message → push notification appears on device
- [ ] Test: Place an order → seller receives push notification

### Caching (Redis)
- [ ] Create Upstash Redis database (free tier)
- [ ] Set `REDIS_URL=rediss://...` in Railway
- [ ] Test: Load feed → `X-Cache: HIT` on second request (within 60s)
- [ ] Test: Load trending → cached response

### Uptime Monitoring
- [ ] Create UptimeRobot account
- [ ] Add monitor: `https://api.halehame.app/health` (5-minute interval)
- [ ] Add monitor: `https://halehame.vercel.app` (5-minute interval)
- [ ] Configure alert: Email + Telegram when down
- [ ] Test: Temporarily block a route → verify alert fires within 5 minutes

---

## 🟢 IMPORTANT — Complete Before First 1,000 Users

### Performance
- [ ] Enable Neon connection pooling (Neon Console → Settings → Connection Pooling)
- [ ] Verify pool size set to `max: 20` in `backend/db/pool.js`
- [ ] Run `EXPLAIN ANALYZE` on 5 most common queries — no seq scans
- [ ] Feed load time: < 1 second on 4G connection (test with DevTools throttle)
- [ ] Product listing load time: < 800ms
- [ ] Image load time: < 500ms (Cloudflare CDN serving from edge)

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
- [ ] Cookie notice displayed to new visitors (EU users)
- [ ] Contact email functional (`contact@halehame.app`)

### Admin Panel
- [ ] Admin account created (your account with `role=admin`)
- [ ] Verify admin panel accessible at `/admin`
- [ ] Verify non-admin cannot access `/admin`
- [ ] Test ban/unban flow
- [ ] Test content removal flow
- [ ] Test verification granting

### Business
- [ ] Commission rate configured correctly in featureFlags.js
- [ ] At least 10 seed products listed in marketplace
- [ ] At least 5 seed showrooms published
- [ ] At least 3 real seller accounts onboarded and trained

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
- [ ] All pages render correctly at 390px width (iPhone 14)
- [ ] Chat room input not covered by keyboard on mobile
- [ ] Images load efficiently on 3G (test in DevTools)

### Critical User Flows (Full End-to-End Test)
- [ ] Register → OTP → Onboarding → Feed (works, < 3 min)
- [ ] Create business → create showroom → publish → share link → view as visitor
- [ ] List product → add to cart → checkout via Chapa → order in Orders page
- [ ] List product → add to cart → checkout via Stripe → order in Orders page
- [ ] Seller receives order → marks processing → marks delivered → buyer leaves review
- [ ] Send a message → recipient gets push notification → replies → real-time delivery
- [ ] Post with hashtag → appears in hashtag feed
- [ ] Follow a user → see their posts in Following tab

### Data & Analytics
- [ ] PostHog or analytics installed and tracking pageviews
- [ ] Admin dashboard showing real user/order counts
- [ ] Business Analytics page working for sellers
- [ ] Revenue chart appearing in admin overview

---

## Final Pre-Launch Sign-Off

| Check | Verified by | Date |
|---|---|---|
| All 🔴 Critical items complete | | |
| All 🟡 High items complete | | |
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
Hour 6–12:  Check Railway CPU/RAM — normal?
Hour 12–24: Check payment success rate — target > 90%
Hour 24–48: Check D1 retention — how many users came back?

Keep team on standby for first 48 hours.
Have rollback procedure ready (git revert, feature flags).
```
