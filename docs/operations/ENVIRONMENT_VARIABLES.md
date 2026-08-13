# Halehame — Environment Variables Reference

> The complete guide to every environment variable used by the platform.
> **Last updated:** August 2026

---

## Backend (`backend/.env`)

### Required (App will not start without these)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/halehame?sslmode=require` |
| `JWT_SECRET` | Secret for signing JWTs. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | `a8f3...` (64+ chars) |
| `PORT` | HTTP server port | `3001` |
| `NODE_ENV` | Environment | `development` \| `production` \| `test` |

---

### Email (At least one required for OTP + order emails)

| Variable | Description | Example |
|---|---|---|
| `RESEND_API_KEY` | Resend.com API key (recommended) | `re_xxxxx` |
| `EMAIL_FROM` | Sender name + address | `Halehame <noreply@halehame.app>` |
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
| `API_URL` | Your backend URL (used for Chapa callback_url) | `https://api.halehame.app` |

---

### File Storage

| Variable | Description | Example |
|---|---|---|
| `UPLOAD_DIR` | Local upload directory (dev fallback) | `uploads` |
| `MAX_FILE_SIZE_MB` | Max upload size in MB | `10` |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID | `abc123` |
| `R2_ACCESS_KEY_ID` | R2 access key | `xxxxx` |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | `xxxxx` |
| `R2_BUCKET_NAME` | R2 bucket name | `halehame-uploads` |
| `R2_PUBLIC_URL` | Public CDN URL for R2 | `https://pub-xxx.r2.dev` |
| `SUPABASE_URL` | Supabase project URL (alternative to R2) | `https://xxx.supabase.co` |
| `SUPABASE_STORAGE_KEY` | Supabase storage API key | `eyJ...` |
| `SUPABASE_BUCKET` | Supabase storage bucket name | `halehame` |

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
| `OPENAI_MODEL` | Model to use | `gpt-4o-mini` |
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
| `VAPID_EMAIL` | Contact email for VAPID | `mailto:admin@halehame.app` |

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
| `FRONTEND_URL` | Comma-separated frontend URLs (CORS) | `https://halehame.vercel.app,https://halehame.vercel.app` |

---

### Feature Flags (Override defaults)

| Variable | Default | Description |
|---|---|---|
| `FF_CHAPA_PAYMENTS` | `true` | Enable Chapa payment option |
| `FF_STRIPE_PAYMENTS` | `true` | Enable Stripe payment option |
| `FF_PERSONALIZED_FEED` | `false` | Enable ML feed ranking |
| `FF_VIDEO_POSTS` | `false` | Enable video post upload |

---

## Frontend (`frontend-next/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:3001` (dev) \| `https://api.halehame.app` (prod) |
| `NEXT_PUBLIC_APP_URL` | Frontend app URL | `http://localhost:3000` (dev) \| `https://halehame.vercel.app` (prod) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (for Stripe.js/Elements if used) | `pk_live_...` or `pk_test_...` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry frontend DSN | `https://xxx@o123.ingest.sentry.io/456` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key (must match backend) | `BNxxx...` |
| `NEXT_PUBLIC_CHAPA_PUBLIC_KEY` | Chapa public key (for inline Chapa.js if used) | `CHAPUBK_test_...` |

---

## Railway Production Environment

Add these in Railway → Project → Variables:

```
DATABASE_URL=postgresql://...  (auto-set by Railway PostgreSQL plugin)
JWT_SECRET=<generated>
NODE_ENV=production
FRONTEND_URL=https://halehame.vercel.app
RESEND_API_KEY=re_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CHAPA_SECRET_KEY=CHASECK_live_...
API_URL=https://api.halehame.app
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=halehame-uploads
R2_PUBLIC_URL=https://pub-xxx.r2.dev
REDIS_URL=rediss://...  (Upstash)
VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:admin@halehame.app
SENTRY_DSN=https://...
```

## Vercel Production Environment

Add these in Vercel → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_API_BASE_URL=https://api.halehame.app
NEXT_PUBLIC_APP_URL=https://halehame.vercel.app
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
