# Nodbusiness — Backend Security

> Security is built in from the start. This document explains every layer of protection.
> For known threats and their mitigations, see `docs/architecture/THREAT_MODEL.md`.
> **Verified against code on 2026-08-23.** Last updated: 2026-08-23

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| JWT | JSON Web Token |
| XSS | Cross-Site Scripting |
| CSRF | Cross-Site Request Forgery |
| CORS | Cross-Origin Resource Sharing |
| CSP | Content Security Policy |
| TLS | Transport Layer Security |
| API | Application Programming Interface |
| OTP | One-Time Password |
| SQL | Structured Query Language |
| MIME | Multipurpose Internet Media Extensions |
| UUID | Universally Unique Identifier |

---

## Authentication Flow

```
Request arrives
    │
    ▼
requireAuth middleware
    │
    ├── Extract Bearer token from Authorization header
    ├── verifyAccessToken(): jwt.verify + enforce payload.type === 'access'
    │       └── refresh tokens (type='refresh', 7d) are NEVER valid Bearer credentials
    ├── Redis revocation check: revoked:{jti} and revoke_before:{userId} (fail-open if Redis down)
    ├── getCachedUser(): SELECT id, email, role, is_banned (60s Redis cache)
    │       └── 401 if deleted · 403 if banned
    └── attach req.user = { id, email, role, is_banned } → next()
```

Token architecture (ADR-004):
- **Access token:** 15 min, returned in the response body; client keeps it in memory plus a
  localStorage/JS-cookie mirror for middleware route-gating (residual XSS risk — see threat model).
- **Refresh token:** 7 days, `HttpOnly; Secure; SameSite=None` cookie scoped to `path=/api/auth`;
  rotated on every refresh with the old jti revoked.
- **logout-all:** sets `revoke_before:{userId}` — any token issued before that instant is rejected.

Every protected route uses `requireAuth`. Every admin route uses `requireAuth` + `requireAdmin`.
Socket.IO handshakes run the same access-type check plus revocation and ban checks (fail-closed).

---

## Middleware Stack (actual order in `index.ts`)

```
1.  Sentry init (error capture)
2.  compression + etag/Vary caching headers
3.  realMode filter (dev seed-data hiding)
4.  requestId → httpLogger → apiVersion (API-Version response header)
5.  env check — hard-exits unless DATABASE_URL + JWT_SECRET are set
6.  helmet() — security headers incl. strict CSP in production
7.  removeHeader('Server')
8.  cors() — origin allowlist (wildcard-subdomain support), credentials enabled
9.  global rate limiter on /api/ + stricter auth limiter (both SKIPPED entirely in development)
10. express.raw() on /api/orders/webhook (Stripe needs raw body)
11. express.json() / express.urlencoded() (10mb)
12. static /uploads
13. routes (44 modules) → admin-only /metrics
14. Sentry error handler → errorMiddleware → 404 catch-all
```

---

## Helmet Security Headers

Production additionally enforces a **strict CSP** (`default-src 'none'; script-src 'none'; …`)
because the API serves JSON only — pages live on Cloudflare Pages with their own CSP.

```
x-powered-by: removed (no Express fingerprint)
X-Frame-Options: DENY
Strict-Transport-Security: 1 year (production only)
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Resource-Policy: cross-origin (for image serving)
Content-Security-Policy: default-src 'none' (production API)
```

---

## Input Validation

Validation is **manual per-route guards** (the `express-validator` dependency is installed but
not imported anywhere — do not assume it protects anything). Standard shape:

```js
const { email, password } = req.body;
if (!email || !password) {
  return apiError.validationError(res, 'Email and password are required'); // 422 VALIDATION_ERROR
}
if (password.length < 8) {
  return apiError.validationError(res, 'Password must be at least 8 characters');
}
```

**Rule:** every endpoint validates required fields, types, and lengths before use. Field
allowlists (`pickAllowed`) are mandatory wherever `req.body` could reach a create/update call.

---

## SQL Injection Protection

Four layers:

1. **Parameterized queries** — all values use `$1, $2` placeholders, never string concatenation
2. **ALLOWED_TABLES allowlist** — `utils/crud.ts` validates table names before any query
3. **Identifier sanitization** — all dynamic column names pass `sanitizeColumn()` (`[a-z0-9_]` only); sort keys go through SAFE_SORTS whitelists
4. **Route-level field allowlists** — client JSON bodies never become column lists wholesale (orders, devops enforced explicitly)

```js
// ✅ Safe — parameterized
pool.query('SELECT * FROM users WHERE email = $1', [email])

// ❌ Never do this
pool.query(`SELECT * FROM users WHERE email = '${email}'`)
```

---

## Rate Limiting

```js
// Global — all /api routes (PRODUCTION ONLY; both limiters are skipped in development)
windowMs: 15 minutes
max: 500 req        // Redis-backed store via rate-limit-redis

// Auth endpoints — stricter
windowMs: 15 minutes
max: 20 req
Applied to: /api/auth/login, /api/auth/register
```

Responses include standard `Ratelimit-*` headers. The public proxy endpoint applies its own
per-IP+showroom quota keyed on validated `req.ip`.

---

## File Upload Security

```
Allowed types: jpg/png/gif/webp/avif/heic/svg/pdf/mp4/webm/mov (MIME × extension cross-checked)
Max file size: MAX_FILE_SIZE_MB env var (default 10MB)
Filename: server-generated timestamp-random (no user-controlled names)
Storage priority: Supabase Storage → Cloudflare R2 → local disk (dev)
Known gaps: SVG is a stored-XSS vector; no magic-byte validation — see THREAT_MODEL remaining work
```

---

## Ownership Checks

Every mutation route checks that the authenticated user owns the resource:

```js
// Products
if (existing.seller_id !== req.user.id && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}

// Orders — buyer OR seller can view/update (role-scoped status transitions)
if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

Money endpoints are stricter:
- `POST /api/wallet/topup` — **admin-only in production**
- `POST /api/wallet/debit`, `/refund` — **admin-only everywhere**
- All balance mutations flow through `atomicWalletOp` (row-level lock inside a transaction)

---

## Payment Verification

**Stripe:** webhook signature verified against the raw body (`express.raw()` mounted before
`express.json()`); events deduplicated by atomic claim on `webhook_events`; wallet credits are
two-phase (`pending_topup → credit`) inside a transaction.

**Chapa:** no webhook — pull-based server-to-server verification of each `tx_ref`; top-up
crediting claims the pending row transactionally and rejects underpaid amounts.
Details: `docs/backend/PAYMENT_INTEGRATION.md`.

---

## Secrets Management

| Secret | Location | Never in |
|---|---|---|
| `JWT_SECRET` | Coolify env vars | Git, logs, client bundle |
| `DATABASE_URL` | Coolify env vars | Git, logs, client bundle |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Coolify env vars | Git, logs, client bundle |
| `CHAPA_SECRET_KEY` | Coolify env vars | Git, logs, client bundle |
| `RESEND_API_KEY` / SMTP creds | Coolify env vars | Git, logs, client bundle |
| `NEXT_PUBLIC_*` | Cloudflare Pages env vars | Server-only code |

`.env` is gitignored; `.env.example` contains placeholders only.
⚠️ Known debt: `backend/db/dev-credentials.json` (dev seed passwords) is currently tracked —
never seed it into production; tracked in TECHNICAL_DEBT.

---

## Security Roadmap

Live register: `docs/architecture/THREAT_MODEL.md § Remaining Security Work`
(highest items: in-memory-only access token, TLS certificate validation, audit logging).
