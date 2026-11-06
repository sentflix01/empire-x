# Wave 1 — Inventory (2026-11-05)

Generated from the code and the running **local** stack. Re-run:

```bash
source ~/.nodbusiness-local/env.sh
(cd backend && npx tsx ../note/2026-11-05-international-audit/scripts/inventory-endpoints.ts > ../note/2026-11-05-international-audit/inventory/endpoints.json)
node note/2026-11-05-international-audit/scripts/inventory-frontend.mjs
bash note/2026-11-05-international-audit/scripts/probe-missing-routes.sh
```

## Summary

| Item | Count | Source |
|---|---|---|
| Backend route mounts | 51 | `backend/index.ts` |
| Backend endpoints (live routers) | 354 — 38 public, 37 optional-auth, 240 auth, 39 admin | `endpoints.json` |
| Documented endpoints | 352 (matches live; F-011) | `docs/backend/API_REFERENCE.md` |
| Frontend page routes | 60 pages (73 route files incl. layouts, errors, robots, sitemap) | `frontend-routes.json` |
| Distinct /api paths called by the frontend | 222 — **16 call routes that do not exist** (F-001…F-006) | `api-crosscheck.json` |
| Backend endpoints never called by the frontend | 41 (webhooks, callbacks, integrations; reviewed in Wave 2) | `api-crosscheck.json` |
| Database tables | 92; 24 hold personal or sensitive columns | `pii-columns.txt` |

## Architecture as built (verified against code, not docs)

```
Browser (Next.js 16 app, Vercel)
  │  same-origin /api/* rewrite (next.config.ts) → keeps refresh cookie first-party
  ▼
Express 5 API (Render, Docker, single instance)
  ├─ request-id · pino · helmet · CORS allow-list · in-memory rate limits (per instance)
  ├─ Demo/Real selector (signed HttpOnly cookie) → AsyncLocalStorage → pool Proxy
  ├─ 51 route modules · Socket.IO (rooms: user, conversation, business tracking)
  ├─ in-process schedulers: stories cleanup, backups, digests, subscription lifecycle,
  │   direct-order expiry; migrations 83–85 re-run 5 s after boot
  ▼
PostgreSQL (Supabase; Real schema + optional separate Demo DB/schema)
Redis (Upstash; optional — cache, token revocation, flags, BullMQ; no-op fallback)
Object storage (Supabase Storage / R2; local disk in dev)
Outbound: Chapa, Stripe, Resend, Telegram, OpenAI / Gemini / Anthropic, Cloudflare API, Google OAuth
```

## Third parties

| Party | Purpose | Where | Personal data sent (to verify in Wave 2) |
|---|---|---|---|
| Stripe | USD subscriptions, legacy checkout | backend `stripe`, frontend `js.stripe.com` | email, payment (hosted fields) |
| Chapa | ETB subscriptions, legacy checkout | `api.chapa.co` | name, email, phone |
| Resend / SMTP | Email (OTP, notifications) | `api.resend.com` | email, name, message content |
| Telegram Bot API | Owner notifications, SEV1 paging | `api.telegram.org` | notification text |
| OpenAI / Gemini / Anthropic | AI assistant, generation | `lib/ai.ts` | prompts (may contain user content) |
| Google | OAuth sign-in; Maps / YouTube embeds | `accounts.google.com`, CSP | email, profile; embed IP exposure |
| Sentry | Errors (front + back) | `*.sentry.io` | stack traces, possibly URLs/IDs |
| Supabase / Cloudflare R2 | Database, storage | hosted | all stored data |
| OpenStreetMap, unpkg, cdnjs | Map tiles, Leaflet assets | CSP | visitor IP |
| Upstash | Redis | hosted | cache entries incl. user records (60 s) |

No analytics or advertising tags were found in source. Network capture to confirm: Wave 2.

## Access matrix (endpoints per module by required access)

| Module | public | optional | auth | admin |
|---|---|---|---|---|
| admin | 0 | 0 | 0 | 19 |
| ai | 1 | 0 | 2 | 0 |
| auth | 13 | 0 | 6 | 0 |
| businessApiKeys | 0 | 0 | 3 | 0 |
| businessWebhooks | 0 | 0 | 4 | 0 |
| businesses | 0 | 3 | 7 | 0 |
| cart | 0 | 0 | 5 | 0 |
| commission | 0 | 0 | 1 | 1 |
| coupons | 1 | 0 | 5 | 0 |
| delivery | 0 | 0 | 2 | 0 |
| devops | 1 | 1 | 0 | 13 |
| directOrders | 3 | 3 | 6 | 0 |
| docs | 1 | 0 | 0 | 0 |
| externalSources | 0 | 0 | 9 | 0 |
| flags | 0 | 1 | 2 | 1 |
| friends | 0 | 0 | 1 | 0 |
| hashtags | 1 | 2 | 0 | 0 |
| internalJobs | 1 | 0 | 0 | 0 |
| locations | 0 | 1 | 1 | 0 |
| maps | 0 | 2 | 0 | 0 |
| messages | 0 | 0 | 49 | 0 |
| moderation | 0 | 0 | 1 | 2 |
| notifications | 0 | 0 | 7 | 0 |
| orders | 4 | 0 | 7 | 0 |
| polls | 0 | 1 | 1 | 0 |
| po.ts | 0 | 4 | 15 | 0 |
| produ.ts | 0 | 2 | 8 | 0 |
| profilePartnerships | 0 | 1 | 9 | 0 |
| profiles | 0 | 3 | 8 | 0 |
| proxy | 0 | 1 | 0 | 0 |
| push | 1 | 0 | 2 | 0 |
| referral | 0 | 0 | 3 | 0 |
| returns | 0 | 0 | 6 | 0 |
| reviews | 0 | 2 | 2 | 0 |
| saves | 0 | 0 | 3 | 0 |
| search | 0 | 1 | 0 | 0 |
| sharePreview | 2 | 0 | 0 | 0 |
| showrooms | 1 | 4 | 7 | 0 |
| social | 0 | 0 | 10 | 0 |
| stories | 0 | 2 | 6 | 0 |
| subscriptions | 2 | 0 | 3 | 0 |
| subscriptionsEtb | 4 | 0 | 5 | 0 |
| suggestions | 0 | 0 | 2 | 0 |
| telegram | 0 | 0 | 4 | 0 |
| trending | 0 | 2 | 0 | 0 |
| upload | 0 | 0 | 1 | 0 |
| varia.ts | 0 | 1 | 3 | 0 |
| verification | 0 | 0 | 3 | 3 |
| wallet | 2 | 0 | 7 | 0 |
| wishli.ts | 0 | 0 | 14 | 0 |

Every "public" entry was reviewed; most are sign-in flows, webhooks, payment callbacks,
share previews and guest order links.

## Wave 2 queue (from this inventory)

1. Public sandbox payment routes (`/api/orders/chapa/sandbox`, `/api/wallet/topup/chapa/sandbox`, `/api/subscriptions/chapa/sandbox`, `POST …/sandbox/pay`): confirm they are unreachable in production mode.
2. `POST /api/internal/jobs/:name`: secret check, timing-safe compare, rate limit.
3. `GET /api/devops/versions`, `GET /api/docs`, `GET /api/ai/status`: information disclosure to guests.
4. `POST /api/coupons/validate`: guessing resistance and rate limit.
5. `GET /api/orders/chapa/status|verify/:tx_ref`: what a guest learns from a reference.
6. `POST /api/auth/demo/reset` and `/demo/exit` without auth: scope of effect.
7. `/api/direct-orders/link/:token/*` incl. receipt upload: token entropy, expiry, upload limits.
8. Storage at rest: `users.otp_code`, `users.reset_token`, `business_payment_accounts.account_number`, `business_webhooks.secret`, `verification_requests.id_document_url` (private bucket?).
9. Two-account ownership checks on every `:id` route (240 auth endpoints), prioritising orders, direct orders, messages, businesses, products, returns.
10. Production passive checks: headers, TLS, DNS (SPF/DKIM/DMARC), robots, sitemap, `security.txt`, one Lighthouse run.
