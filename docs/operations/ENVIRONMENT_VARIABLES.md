# Nodbusiness — Environment Variables Reference

> **Last updated:** September 22, 2026
> All variables listed here are set in **Render** (backend) or **Vercel** (frontend).
> Never commit real secret values to git. This file documents keys and formats only.

---

## Backend Environment Variables (Render)

Set at: Render → nodbusiness-backend → Environment

### Server

| Variable | Value | Required | Notes |
|---|---|---|---|
| `NODE_ENV` | `production` | ✅ Yes | Enables production mode, strict checks |
| `PORT` | *(not set — Render assigns dynamically)* | ❌ Don't set | Render injects PORT automatically. Do NOT set manually. |
| `LOG_LEVEL` | `info` | No | Options: `trace`, `debug`, `info`, `warn`, `error` |

### Database

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.REF:PASS@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require` | ✅ Yes | Supabase **pooler** URL (port 6543, transaction mode). App will not start without this. |
| `BACKUP_DATABASE_URL` | Same pooler URL | No | Used by backup script for `pg_dump`. Script converts pooler → direct automatically. |
| `DB_POOL_MAX` | `5` | No | Max DB connections in pool. Default 5. |
| `DB_POOL_MIN` | `0` | No | Min idle connections. Default 0. |
| `DB_CONNECTION_TIMEOUT_MS` | `15000` | No | Connection timeout in ms. Default 15000. |
| `DB_TLS_REJECT_UNAUTHORIZED` | `false` | No | Set `true` only if using a CA-signed cert. Default false (Supabase uses valid certs). |
| `BACKUP_FORCE_IPV4` | `true` | No | Forces IPv4 for backup connections. Required on Render free tier. |

### Authentication

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `JWT_SECRET` | 128-char hex string | ✅ Yes | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`. App exits if missing. |
| `OTP_SALT` | 64-char hex string | No (recommended) | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Prevents rainbow-table attacks on OTP hashes. |
| `JWT_EXPIRES_IN` | `7d` | No | Refresh token lifetime. Access token is always 15 min (hardcoded). |

### Google OAuth

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | `793690330854-...apps.googleusercontent.com` | ✅ Yes (production) | App **exits with process.exit(1)** in production if missing. Get from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | No | Not used by this backend for token verification — only Client ID needed. |

### CORS / Frontend

| Variable | Value | Required | Notes |
|---|---|---|---|
| `FRONTEND_URL` | `https://nodbusiness.vercel.app` | ✅ Yes | Used for CORS allowed origins. Separate multiple URLs with comma. |
| `API_URL` | `https://nodbusiness-backend-9psf.onrender.com` | No | Used as self-reference in Chapa callback URLs and self-ping. |
| `BACKEND_URL` | `https://nodbusiness-backend-9psf.onrender.com` | No | Alias for API_URL. Used in health check self-ping. |

### Email (Resend)

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | `re_...` | No* | *Recommended. Without it, OTP emails print to console only — users can't verify. |
| `EMAIL_FROM` | `Nodbusiness <onboarding@resend.dev>` | No | Sender address. Change to `noreply@nodbusiness.app` when custom domain is added. |

### Email (SMTP — backup, not currently used)

| Variable | Value | Required | Notes |
|---|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | No | Only used if `RESEND_API_KEY` is not set. |
| `SMTP_PORT` | `587` | No | |
| `SMTP_SECURE` | `false` | No | `true` for port 465 |
| `SMTP_USER` | Gmail address | No | Gmail App Password required (not regular password) |
| `SMTP_PASS` | Gmail App Password | No | |

### Redis

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `REDIS_URL` | `rediss://default:TOKEN@stirring-squid-289591.upstash.io:6379` | No* | *Highly recommended. Without Redis: no rate limiting, no JWT revocation, no queues, no Socket.IO scaling. App still works but degraded. |
| `REDIS_TLS_REJECT_UNAUTHORIZED` | `true` or `false` | No | Default `false` for Redis lib, `true` for Socket.IO adapter. Upstash uses valid certs — both work. |
| `UPSTASH_REDIS_REST_URL` | `https://stirring-squid-289591.upstash.io` | No | Upstash REST API URL. Not used by the backend directly (only used if you use Upstash REST client). |
| `UPSTASH_REDIS_REST_TOKEN` | Token string | No | Not used by backend directly. |

### File Storage

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `SUPABASE_URL` | `https://tpgzlokgnjxcerexxoda.supabase.co` | ✅ Yes* | *Required for cloud storage. App **exits with process.exit(1)** in production if neither Supabase nor R2 is configured. |
| `SUPABASE_API_URL` | Same as `SUPABASE_URL` | No | Alias. |
| `STORAGE_SUPABASE_URL` | Same as `SUPABASE_URL` | No | Another alias used internally. |
| `SUPABASE_STORAGE_KEY` | `eyJ...` (service_role JWT) | ✅ Yes* | Must be the **service_role** key, not the anon key. Get from Supabase → Settings → API. |
| `SUPABASE_BUCKET` | `uploads` | ✅ Yes* | Storage bucket name. Auto-created at startup if missing. |
| `UPLOAD_DIR` | `uploads` | No | Local disk fallback directory. Default `uploads`. |
| `MAX_FILE_SIZE_MB` | `10` | No | Max upload size in MB. Default 10. |

**Cloudflare R2 (alternative to Supabase Storage — not currently configured):**

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID | No | Only needed if using R2 instead of Supabase Storage |
| `R2_ACCESS_KEY_ID` | R2 access key | No | |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | No | |
| `R2_BUCKET_NAME` | `nodbusiness-uploads` | No | |
| `R2_PUBLIC_URL` | `https://pub-xxx.r2.dev` | No | |

### AI

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `AI_PROVIDER` | `gemini` | No | Options: `openai`, `gemini`, `anthropic`. Default `openai`. |
| `GEMINI_API_KEY` | `AIza...` | No* | Required if `AI_PROVIDER=gemini`. |
| `GEMINI_MODEL` | `gemini-1.5-flash` | No | Default `gemini-1.5-flash`. |
| `OPENAI_API_KEY` | `sk-...` | No | Required if `AI_PROVIDER=openai`. |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | No | |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | No | Required if `AI_PROVIDER=anthropic`. |
| `ANTHROPIC_MODEL` | `claude-3-haiku-20240307` | No | |

### Payments

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `CHAPA_SECRET_KEY` | `CHASECK_test_...` or `CHASECK_live_...` | No | Ethiopian payment gateway. Feature flag `FF_CHAPA_PAYMENTS=true`. |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | No | Currently set to `FF_STRIPE_PAYMENTS=false`. Add key when ready. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | No | Required to verify Stripe webhook signatures. |
| `STRIPE_CURRENCY` | `usd` | No | Default `usd`. Set `etb` for Ethiopian Birr (falls back to USD if rejected). |
| `STRIPE_ETB_TO_USD_RATE` | `0.008` | No | ETB to USD conversion rate for display. |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | `price_...` | No | Stripe price ID for Premium ($12/mo) plan. |
| `STRIPE_PRICE_PRO_MONTHLY` | `price_...` | No | Stripe price ID for Pro ($49/mo) plan. |
| `COMMISSION_RATE` | e.g. `0.05` | No | Platform commission rate (decimal). |

### Web Push Notifications

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `VAPID_PUBLIC_KEY` | `BKe52mPRC_...` (base64url, no `=`) | No | VAPID public key for web push. Generate once and keep forever. |
| `VAPID_PRIVATE_KEY` | `F7tNIcaoas...` | No | Keep secret. Never expose to frontend. |
| `VAPID_EMAIL` | `mailto:admin@empirex.app` | No | Contact email for push service providers. |

### Observability

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `SENTRY_DSN` | `https://xxx@o123.ingest.sentry.io/456` | No | Sentry error tracking DSN. |

### Feature Flags

| Variable | Value | Default | Notes |
|---|---|---|---|
| `FF_CHAPA_PAYMENTS` | `true` / `false` | `false` | Enable Chapa Ethiopian payments |
| `FF_STRIPE_PAYMENTS` | `true` / `false` | `true` | Enable Stripe payments — **set to `false` until keys are added** |
| `FF_PERSONALIZED_FEED` | `true` / `false` | `false` | Ranked feed algorithm |
| `FF_VIDEO_POSTS` | `true` / `false` | `false` | Allow video uploads |
| `FF_COMMUNITY_GROUPS` | `true` / `false` | `false` | Community groups feature |
| `FF_LIVE_STREAMING` | `true` / `false` | `false` | Live streaming |

### Encryption

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `EXTERNAL_API_ENCRYPTION_KEY` | 64 hex chars (32 bytes) | No | AES-256-GCM key for encrypting external API credentials at rest. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### Backup

| Variable | Value | Required | Notes |
|---|---|---|---|
| `BACKUP_RETENTION_DAYS` | `14` | No | How many daily backups to keep. Default 14. |
| `BACKUP_SCHEDULE_ENABLED` | `true` | No | Force-enable backup schedule outside production. |

### Telegram (Optional)

| Variable | Value format | Required | Notes |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `123456789:ABC...` | No | For deploy failure alerts and admin notifications. |
| `TELEGRAM_CHAT_ID` | Numeric ID | No | Your Telegram chat ID. |

---

## Frontend Environment Variables (Vercel)

Set at: Vercel → nodbusiness project → Settings → Environment Variables

| Variable | Value | Environment | Required | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://nodbusiness-backend-9psf.onrender.com` | All | ✅ Yes | Backend API URL. Baked into JS bundle at build time. Must redeploy after changing. |
| `NEXT_PUBLIC_APP_URL` | `https://nodbusiness.vercel.app` | Production | ✅ Yes | Public app URL for SEO metadata. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `793690330854-...apps.googleusercontent.com` | All | ✅ Yes | Same client ID as backend. Used to initialize Google Identity Services. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `BKe52mPRC_...` | All | No | Web push subscription public key. |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://xxx@sentry.io/...` | All | No | Frontend Sentry DSN. |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` | All | No | Shown in Sentry releases. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` | All | No | Required when `FF_STRIPE_PAYMENTS=true`. |
| `NEXT_PUBLIC_CHAPA_PUBLIC_KEY` | `CHAPUBK_...` | All | No | Chapa public key for frontend. |

---

## GitHub Actions Secrets

Set at: GitHub → sentflix01/empire-x → Settings → Secrets and variables → Actions

| Secret | Value format | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | Supabase pooler URL (port 6543) | ✅ Yes | Used by CI to run migrations. Same as Render `DATABASE_URL`. |
| `RENDER_DEPLOY_HOOK_URL` | `https://api.render.com/deploy/srv-...?key=...` | ✅ Yes | Triggers Render deploy after migrations. Get from Render → service → Settings → Deploy Hook. |
| `VERCEL_TOKEN` | Vercel personal access token | ✅ Yes | Used by `vercel` CLI in CI to deploy frontend. |
| `BACKEND_URL` | `https://nodbusiness-backend-9psf.onrender.com` | ✅ Yes | Used by health check job in deploy workflow. |
| `FRONTEND_URL` | `https://nodbusiness.vercel.app` | ✅ Yes | Used by health check job in deploy workflow. |

---

## Local Development (.env)

Copy `backend/.env.example` to `backend/.env` and fill in:

```bash
# Minimum required for local dev
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres.tpgzlokgnjxcerexxoda:PASS@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=any-long-random-string-for-local-dev-only
FRONTEND_URL=http://localhost:3002

# Run migrations locally
NODE_TLS_REJECT_UNAUTHORIZED=0  # Only for local dev, not production
```

For the frontend, copy `frontend-next/.env.local.example` to `frontend-next/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=793690330854-...apps.googleusercontent.com
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

---

## Environment Variable Priority

For feature flags, priority order is:
1. Env var (`FF_FLAG_NAME=true`) — highest, overrides everything
2. Redis key (`ff:flag_name`) — real-time admin updates without redeploy
3. Hardcoded defaults in `lib/featureFlags.ts` — lowest

---

## Security Notes

- `JWT_SECRET` must be at least 64 random bytes (128 hex chars). A guessable secret breaks all authentication.
- `SUPABASE_STORAGE_KEY` must be the `service_role` key, not the `anon` key. The anon key cannot create storage objects.
- Never put `STRIPE_SECRET_KEY`, `JWT_SECRET`, or `SUPABASE_STORAGE_KEY` in `NEXT_PUBLIC_*` variables — those are baked into the public JavaScript bundle.
- `GOOGLE_CLIENT_SECRET` is NOT used by this backend. The backend verifies Google ID tokens using only the Client ID.
- Rotating `JWT_SECRET` instantly invalidates ALL active sessions for all users.
