# Empire X — Backend Security

> Security is built in from the start. This document explains every layer of protection.
> For known threats and their mitigations, see `docs/architecture/THREAT_MODEL.md`.

---

## Authentication Flow

```
Request arrives
    │
    ▼
requireAuth middleware
    │
    ├── Extract Bearer token from Authorization header
    ├── jwt.verify(token, JWT_SECRET) — validates signature + expiry
    ├── pool.query: SELECT user WHERE id = payload.sub
    │       └── confirms user still exists and hasn't been deleted
    └── attach req.user = { id, email, role } → next()
```

Every protected route uses `requireAuth`. Every admin route uses `requireAuth` + `requireAdmin`.

---

## Middleware Stack (in order)

```
index.js middleware order:
1. Sentry (must be first — catches all errors)
2. helmet() — security headers
3. removeHeader('Server') — hides Express fingerprint
4. cors(corsOptions) — origin allowlist
5. rateLimit() — global 500 req/15min (prod), 50000 (dev)
6. authLimiter on /api/auth/login and /register
7. express.raw() on /api/orders/webhook (Stripe needs raw body)
8. express.json()
9. express.urlencoded()
10. static files → /uploads
11. routes
12. Sentry error handler
13. global error handler
```

---

## Helmet Security Headers

```
x-powered-by: removed (no Express fingerprint)
X-Frame-Options: DENY (clickjacking protection)
Strict-Transport-Security: 1 year (production only)
X-Content-Type-Options: nosniff (MIME sniffing protection)
X-XSS-Protection: enabled
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Resource-Policy: cross-origin (for R2 image serving)
```

---

## Input Validation

All routes use `express-validator` for input validation. Example from auth:

```js
// Validated before handler runs
const { email, password } = req.body;
if (!email || !password) {
  return res.status(400).json({ error: 'Email and password are required' });
}
if (password.length < 6) {
  return res.status(400).json({ error: 'Password must be at least 6 characters' });
}
```

**Rule:** Every endpoint that accepts user input must validate all fields before using them.

---

## SQL Injection Protection

Three layers:

1. **Parameterized queries** — all SQL uses `$1, $2` placeholders, never string concatenation
2. **ALLOWED_TABLES allowlist** — `crud.js` validates table names before any query
3. **Column name sanitization** — `buildWhere` sanitizes column names with `/[^a-z0-9_]/gi`

```js
// ✅ Safe — parameterized
pool.query('SELECT * FROM users WHERE email = $1', [email])

// ❌ Never do this
pool.query(`SELECT * FROM users WHERE email = '${email}'`)
```

---

## Rate Limiting

```js
// Global — all API routes
windowMs: 15 minutes
max: 500 req (production), 50000 req (development)

// Auth endpoints — stricter
windowMs: 15 minutes
max: 20 req (production), 10000 req (development)
Applied to: /api/auth/login, /api/auth/register
```

---

## File Upload Security

```
Allowed MIME types: images, video/mp4, application/pdf
Max file size: MAX_FILE_SIZE_MB env var (default 10MB)
Filename: UUID-generated (no user-controlled filenames)
Storage: Cloudflare R2 (not served from backend process)
```

---

## Ownership Checks

Every mutation route checks that the authenticated user owns the resource:

```js
// Products
if (existing.seller_id !== req.user.id && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}

// Profiles
if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}

// Orders — buyer OR seller can view/update
if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

## Stripe Webhook Verification

```js
event = stripe.webhooks.constructEvent(
  req.body,        // raw body (not parsed JSON)
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);
```

The Stripe signature prevents fake webhook events. The backend uses `express.raw()` on the webhook route (not `express.json()`) so the body is not modified before verification.

---

## Secrets Management

| Secret | Location | Never in |
|---|---|---|
| `JWT_SECRET` | Railway env vars | Git, logs, client bundle |
| `DATABASE_URL` | Railway env vars | Git, logs, client bundle |
| `STRIPE_SECRET_KEY` | Railway env vars | Git, logs, client bundle |
| `RESEND_API_KEY` | Railway env vars | Git, logs, client bundle |
| `R2_SECRET_ACCESS_KEY` | Railway env vars | Git, logs, client bundle |
| `NEXT_PUBLIC_*` | Vercel env vars | Server-only code |

`.env` is in `.gitignore`. `.env.example` contains no real values.

---

## Planned Security Upgrades

See `docs/operations/TECHNICAL_DEBT.md` for prioritized list:
- HttpOnly refresh token cookies (TD-001)
- JWT revocation blocklist via Redis (TD-005)
- Wallet topup admin-only in production (TD-002)
- Audit logging for financial transactions (TD-012)
- CSP headers (TD-013)
- 2FA (feature flag: `two_factor_auth`)
