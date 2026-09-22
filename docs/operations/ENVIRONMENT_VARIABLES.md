# Nodbusiness — Environment Variables Reference

> The complete guide to every environment variable used by the platform.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| ENV | Environment Variable |
| JWT | JSON Web Token |
| API | Application Programming Interface |
| DB | Database |
| SMTP | Simple Mail Transfer Protocol |
| CDN | Content Delivery Network |
| R2 | Cloudflare R2 — object storage |
| VAPID | Voluntary Application Server Identification — Web Push keys |
| TLS | Transport Layer Security |
| OTP | One-Time Password |
| ETB | Ethiopian Birr — reference market currency |
| URL | Uniform Resource Locator |

---

## Backend (`backend/.env`)

### Required (App will not start without these)

The boot-time check in `index.ts` enforces **only these two** — the app hard-exits if either is missing:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/nodbusiness?sslmode=require` |
| `JWT_SECRET` | Secret for signing JWTs. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | `a8f3...` (64+ chars) |

### Strongly recommended (features degrade or misroute without them)

| Variable | Description | Default behavior without it |
|---|---|---|
| `PORT` | HTTP server port | `3001` |
| `NODE_ENV` | `production` enables Helmet CSP, prod rate limits, secure cookies, Redis-backed limiter store | dev mode (rate limits skipped, cookies not Secure) |
| `FRONTEND_URL` | Comma-separated frontend URLs (CORS allowlist, email links) | localhost fallbacks |

---

### Email (At least one required for OTP + order emails)

| Variable | Description | Example |
|---|---|---|
| `RESEND_API_KEY` | Resend.com API key (recommended) | `re_xxxxx` |
| `EMAIL_FROM` | Sender name + address | `Nodbusiness <noreply@nodbusiness.app>` |
| `SMTP_HOST` | SMTP server (alternative to Resend) | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Use TLS | `false` |
| `SMTP_USER` | SMTP username | `your@gmail.com` |
| `SMTP_PASS` | SMTP password / app password | `xxxx xxxx xxxx xxxx` |

---

### Payments

| Variable | Description | Example |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe API key. Blank = Stripe disabled (503 on checkout) | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. Register at dashboard.stripe.com → Webhooks | `whsec_...` |
| `STRIPE_CURRENCY` | Charge currency (`usd` or `etb`) | `usd` |
| `STRIPE_ETB_TO_USD_RATE` | ETB → USD conversion rate | `0.008` |
| `CHAPA_SECRET_KEY` | Chapa API key. `SANDBOX` for local testing | `CHASECK_test_...` or `SANDBOX` |
| `API_URL` | Your backend URL (used for Chapa callback_url) | `https://api.nodbusiness.app` |

---

### File Storage

| Variable | Description | Example |
|---|---|---|
| `UPLOAD_DIR` | Local upload directory (dev fallback) | `uploads` |
| `MAX_FILE_SIZE_MB` | Max upload size in MB | `10` |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID | `abc123` |
| `R2_ACCESS_KEY_ID` | R2 access key | `xxxxx` |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | `xxxxx` |
| `R2_BUCKET_NAME` | R2 bucket name | `nodbusiness-uploads` |
| `R2_PUBLIC_URL` | Public CDN URL for R2 | `https://pub-xxx.r2.dev` |
| `SUPABASE_URL` | Supabase project URL (alternative to R2) | `https://xxx.supabase.co` |
| `SUPABASE_STORAGE_KEY` | Supabase storage API key | `eyJ...` |
| `SUPABASE_BUCKET` | Supabase storage bucket name | `nodbusiness` |

---

### Caching & Queues

| Variable | Description | Example |
|---|---|---|
| `REDIS_URL` | Redis connection URL. No Redis = no-op stub (dev fallback) | `rediss://default:token@host.upstash.io:6380` |

---

### AI Features

| Variable | Description | Example |
|---|---|---|
| `AI_PROVIDER` | AI provider selection | `openai` \| `gemini` \| `anthropic` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `DB_POOL_MAX` | PostgreSQL pool size (`db/pool.ts`) | `10` — raise under load; Neon pooled connections recommended |
| `COMMISSION_RATE` | Platform commission as decimal (`services/commission.ts`) | `0.03` (flat 3%) |
| `BACKUP_RETENTION_DAYS` | Local backup retention (`scripts/backup-database.js`) | `14` |
| `BACKUP_SCHEDULE_ENABLED` | Force the daily backup schedule outside production | unset (auto-enables in production) |
| `OPENAI_MODEL` | Model to use | match `.env.example`; verify against your OpenAI account before relying on a specific model |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `GEMINI_MODEL` | Gemini model | `gemini-1.5-flash` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `ANTHROPIC_MODEL` | Claude model | `claude-3-haiku-20240307` |

---

### Push Notifications

| Variable | Description | How to generate |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key | `node -e "const wp=require('web-push');const k=wp.generateVAPIDKeys();console.log(k)"` |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key | (same command as above) |
| `VAPID_EMAIL` | Contact email for VAPID | `mailto:admin@nodbusiness.app` |

---

### Authentication & Google OAuth

| Variable | Description | Where to get |
|---|---|---|
| `JWT_EXPIRES_IN` | JWT token expiry | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | console.cloud.google.com → APIs → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | (same as above) |

---

### Observability

| Variable | Description | Example |
|---|---|---|
| `SENTRY_DSN` | Sentry backend DSN | `https://xxx@o123.ingest.sentry.io/456` |
| `LOG_LEVEL` | Pino log level | `debug` (dev) \| `info` (prod) |

---

### Integrations

| Variable | Description | Example |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather | `1234567890:ABCdef...` |
| `EXTERNAL_API_ENCRYPTION_KEY` | AES-256 key for encrypting external API credentials | 64 hex chars |

---

### Frontend URL

| Variable | Description | Example |
|---|---|---|
| `FRONTEND_URL` | Comma-separated frontend URLs (CORS) | `https://nodbusiness.app,https://nodbusiness.pages.dev` |

---

### Feature Flags (Override defaults)

| Variable | Default | Description |
|---|---|---|
| `FF_CHAPA_PAYMENTS` | `false` | Enable Chapa payment option (code default is **off** — `featureFlags.ts`) |
| `FF_STRIPE_PAYMENTS` | `true` | Enable Stripe payment option |
| `FF_PERSONALIZED_FEED` | `false` | Enable ML feed ranking |
| `FF_VIDEO_POSTS` | `false` | Enable video post upload |

---

## Frontend (`frontend-next/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:3001` (dev) \| `https://api.nodbusiness.app` (prod) |
| `NEXT_PUBLIC_APP_URL` | Frontend app URL | `http://localhost:3000` (dev) \| `https://nodbusiness.app` (prod) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (for Stripe.js/Elements if used) | `pk_live_...` or `pk_test_...` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry frontend DSN | `https://xxx@o123.ingest.sentry.io/456` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key (must match backend) | `BNxxx...` |
| `NEXT_PUBLIC_CHAPA_PUBLIC_KEY` | Chapa public key (for inline Chapa.js if used) | `CHAPUBK_test_...` |

---

## Railway Production Environment

Add these in Coolify → nodbusiness-backend → Environment Variables:

```
DATABASE_URL=postgresql://postgres.REF:[PASS]@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=<generated>
NODE_ENV=production
FRONTEND_URL=https://nodbusiness.app
RESEND_API_KEY=re_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CHAPA_SECRET_KEY=CHASECK_live_...
API_URL=https://api.nodbusiness.app
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=nodbusiness-uploads
R2_PUBLIC_URL=https://pub-xxx.r2.dev
REDIS_URL=rediss://...  (Upstash)
VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:admin@nodbusiness.app
SENTRY_DSN=https://...
```

## Cloudflare Pages Production Environment

Add these in Cloudflare → Pages → nodbusiness → Settings → Environment Variables:

```
NEXT_PUBLIC_API_BASE_URL=https://api.nodbusiness.app
NEXT_PUBLIC_APP_URL=https://nodbusiness.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SENTRY_DSN=https://...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN...
```

---

## Security Notes

- **Never commit `.env` files** — they are in `.gitignore` ✅
- **Rotate `JWT_SECRET` immediately** if you suspect it's compromised (invalidates all sessions)
- **Rotate `STRIPE_WEBHOOK_SECRET`** after any suspected webhook endpoint exposure
- **Never log env var values** — only log their presence/absence
- **Use Railway's built-in secret encryption** — don't store secrets in `railway.toml`
