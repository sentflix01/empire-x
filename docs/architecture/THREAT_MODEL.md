# Nodbusiness — Threat Model

> Security is part of the design, not an afterthought.
> This document identifies threats, current mitigations, and remaining work.
> **Statuses verified against code on 2026-08-23** (post security-hardening pass).
> Last updated: 2026-08-23

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| XSS | Cross-Site Scripting — injecting malicious scripts |
| CSRF | Cross-Site Request Forgery |
| IDOR | Insecure Direct Object Reference |
| JWT | JSON Web Token |
| HMAC | Hash-based Message Authentication Code |
| CSP | Content Security Policy |
| CORS | Cross-Origin Resource Sharing |
| OTP | One-Time Password |
| DDoS | Distributed Denial of Service |
| ReDoS | Regular Expression Denial of Service |
| SQL | Structured Query Language |
| API | Application Programming Interface |
| UUID | Universally Unique Identifier |
| OWASP | Open Web Application Security Project |
| MFA | Multi-Factor Authentication |
| WAF | Web Application Firewall |
| PCI-DSS | Payment Card Industry Data Security Standard |

---

## Threat Categories

### 1. Authentication & Session Attacks

| Threat | Description | Mitigation | Status |
|---|---|---|---|
| Credential brute force | Attacker tries many passwords on `/api/auth/login` | Rate limiting (20 req/15min in production) via `express-rate-limit`; timing-equalized responses (dummy bcrypt compare for unknown emails) | ✅ Done |
| JWT token theft (XSS) | Malicious script reads `access_token` from localStorage/JS-cookie | Access token is 15-min and still mirrored to localStorage + JS-readable cookie for middleware routing — **residual risk accepted, see remaining work**; refresh token is HttpOnly | ⚠️ Partial |
| Refresh-token misuse as access token | Stolen 7-day refresh cookie used as Bearer credential | `verifyAccessToken()` rejects any token whose `type` ≠ `access` on every route + socket handshake | ✅ Done |
| Expired token reuse | Attacker replays an old JWT | Access tokens expire after **15 min** (`auth.ts signAccessToken`); refresh flow rotates and revokes old jti | ✅ Done |
| Account takeover via reset link | Attacker intercepts password reset email | Reset tokens expire in 1 hour; single-use; stored as SHA-256 hash (DB read does not reveal live links) | ✅ Done |
| OTP brute force / prediction | Attacker guesses or predicts 6-digit OTP | OTPs generated with `crypto.randomBytes`; hashed with salt at rest; constant-time compare; 15-min expiry; null-safe verification | ✅ Done |
| Revoked/banned user keeps access | Token stolen before ban/logout-all continues to work | Redis revocation: `revoked:{jti}` + `revoke_before:{userId}` checked per request AND on socket handshake (fail-closed there); banned users rejected via cached user lookup | ✅ Done |
| Google OAuth token replay | Attacker replays a stolen Google ID token | Token verified with Google servers on every login request | ✅ Done |
| Session fixation | Attacker sets a known session ID | JWT is stateless — no server-side session to fix | ✅ N/A |

**Remaining work:**
- Move the access token fully in-memory (remove localStorage + JS-readable cookie mirror) once middleware gating moves off cookie sniffing — closes the residual XSS-theft window
- 2FA for high-value accounts (feature flag `two_factor_auth` exists, TOTP not implemented)

---

### 2. Injection Attacks

| Threat | Description | Mitigation | Status |
|---|---|---|---|
| SQL injection via values | Attacker injects SQL through request parameters | Parameterized queries everywhere (`$1, $2`); `ALLOWED_TABLES` allowlist in crud.ts | ✅ Done |
| SQL injection via identifiers | Attacker controls a column/table name (JSON body keys, sort params) | Column names sanitized to `[a-z0-9_]` in crud helpers (`sanitizeColumn`); route-level field allowlists on orders/devops; SAFE_SORTS whitelists on feed/product sorts | ✅ Done |
| XSS via user content | Attacker injects `<script>` in posts or product descriptions | React escapes by default; only developer-supplied chart config uses `dangerouslySetInnerHTML` | ✅ Done |
| Path traversal in file uploads | Attacker uploads `../../etc/passwd` | Multer MIME + extension cross-check; filenames generated server-side (timestamp-random) | ✅ Done |
| Command injection | Attacker injects shell commands | No shell execution from user input; `child_process` not used in request handlers | ✅ N/A |
| Template injection | Attacker injects template expressions | No server-side templating; all rendering is in React | ✅ N/A |

---

### 3. Authorization Failures

| Threat | Description | Mitigation | Status |
|---|---|---|---|
| Accessing another user's data | User A reads User B's orders or messages | Every protected route checks `req.user.id` against resource owner | ✅ Done |
| Privilege escalation | Regular user accesses admin routes | `requireAdmin` middleware checks `req.user.role === 'admin'` | ✅ Done |
| IDOR (Insecure Direct Object Reference) | Attacker guesses a UUID and accesses a resource | UUID primary keys are unguessable; ownership checks on all mutations | ✅ Done |
| Accessing another user's wallet | User A debits User B's wallet | `/api/wallet/debit` requires admin role; wallet looked up by `user_id` param | ✅ Done |

---

### 4. Payment & Financial Attacks

| Threat | Description | Mitigation | Status |
|---|---|---|---|
| Fake Stripe webhooks | Attacker sends fake `checkout.session.completed` events | Webhook signature verified with `stripe.webhooks.constructEvent()` + `STRIPE_WEBHOOK_SECRET` | ✅ Done |
| Duplicate webhook delivery | Stripe retries cause double fulfillment | Atomic claim on `webhook_events` (`INSERT … ON CONFLICT DO NOTHING`); claim released on processing failure so retries re-process | ✅ Done |
| Price manipulation (checkout) | Attacker modifies request to pay less than product price | Server recalculates totals from DB prices — never trusts client-sent price | ✅ Done |
| Price manipulation (COD orders) | Buyer sets their own `total_price` on cash-on-delivery orders | Field allowlist + server-forced `status='pending'`, `currency='ETB'`, `payment_provider='cod'`; price validated as positive/finite | ✅ Done |
| Order status forgery | Buyer/seller sets arbitrary columns or statuses via order update | Role-scoped transition allowlists (buyer vs seller vs admin); money/ownership fields stripped | ✅ Done |
| Wallet balance inflation | Attacker directly calls `/api/wallet/topup` | Admin-only in production; Chapa/Stripe top-ups verified server-side with concurrency-safe two-phase claims | ✅ Done |
| Double top-up credit | Two concurrent verify callbacks credit one payment | Transactional claim flips `pending_topup → credit` exactly once; expected amount enforced, underpayments rejected | ✅ Done |
| Commission bypass | Seller marks order complete without triggering commission | Commission collected server-side when `status=completed` — not client-controlled | ✅ Done |
| Refund fraud | Buyer requests refund without returning goods | Return requests require seller approval before refund is issued (manual admin refund step) | ✅ Done |

---

### 5. Denial of Service

| Threat | Description | Mitigation | Status |
|---|---|---|---|
| API flooding | Attacker sends thousands of requests | Global rate limiter (500 req/15min prod, Redis store); Cloudflare WAF planned | ✅ Done |
| Auth endpoint flooding | Attacker floods login/register | Separate stricter rate limiter (20 req/15min prod) | ✅ Done |
| Proxy quota bypass | Client rotates fake `X-Forwarded-For` values | Rate-limit key derived from validated `req.ip` (trust-proxy), never raw headers | ✅ Done |
| SSRF via outbound proxy fetch | Showroom external-source URLs reach internal networks | HTTPS-only; DNS resolution blocks loopback/private/link-local (IPv4 + IPv6 incl. ULA/multicast/NAT64); redirects rejected (`redirect: 'error'`); fail-closed on unknown formats | ✅ Done |
| Large file upload DoS | Attacker uploads 1GB files repeatedly | `MAX_FILE_SIZE_MB` env var enforced by Multer; MIME type allowlist | ✅ Done |
| DDoS | Volumetric attack on infrastructure | Vercel/Railway edge protection; Cloudflare integration is a roadmap item | ⚠️ Partial |
| ReDoS (regex DoS) | Crafted input causes catastrophic backtracking | No complex regex on user input | ✅ Done |

---

### 6. Data Exposure

| Threat | Description | Mitigation | Status |
|---|---|---|---|
| Password in logs | Password accidentally logged | `password_hash` never returned from any API; Pino redacts sensitive fields | ✅ Done |
| JWT in logs | Token accidentally logged | Authorization header redacted in structured logs | ✅ Done |
| `x-powered-by` fingerprinting | Attacker knows we use Express | `app.disable('x-powered-by')` + Helmet removes `Server` header | ✅ Done |
| Sensitive env vars in client bundle | API keys leak into Next.js bundle | Only `NEXT_PUBLIC_` vars are exposed to the browser; secret keys server-only | ✅ Done |
| Database connection string exposure | DB URL in client code | `DATABASE_URL` is server-only; never in frontend env | ✅ Done |

---

### 7. Infrastructure & Supply Chain

| Threat | Description | Mitigation | Status |
|---|---|---|---|
| Dependency vulnerabilities | `npm audit` finds known CVEs | `npm audit` runs in CI on every push; auto `|| true` for non-blocking | ✅ Done |
| Secrets in Git | `.env` committed | `.env` in `.gitignore`; `.env.example` has no real values | ✅ Done |
| Misconfigured CORS | Any origin can make credentialed requests | CORS locked to `FRONTEND_URL` allowlist; not `*` | ✅ Done |
| Malicious npm packages | Typosquatting or compromised package | Exact/pinned versions in `package.json`; `package-lock.json` committed | ✅ Done |

---

## Remaining Security Work (Prioritized — verified 2026-08-23)

### High
1. **Access token still mirrored to localStorage + JS-readable cookie** (`api/client.ts`) —
   closes the XSS theft window only when route-gating moves off cookie sniffing. ADR-004's
   "memory only" goal is not yet fully met.
2. **TLS verification disabled** — `rejectUnauthorized: false` on Neon and Upstash connections
   (`db/pool.ts`, `lib/redis.ts`, socket Redis adapter). Encrypts but does not authenticate;
   switch to certificate validation / CA pinning.
3. **Audit logging** — no append-only audit trail for financial/admin actions; incident response
   currently reconstructs from logs. Tracked as TD-012.
4. **Seed credentials tracked in git** — `backend/db/dev-credentials.json` contains dev account
   passwords. Must never be seeded against production; move to env-driven seeding.

### Medium
5. **SVG uploads accepted** — stored-XSS vector if served inline from public buckets; sanitize or drop SVG.
6. **No magic-byte validation on uploads** — MIME + extension are client-controlled strings.
7. **File upload scanning** — malware/CSAM scanning (Cloudflare CSAM scanning or ClamAV).
8. **2FA** — TOTP via authenticator app; feature flag `two_factor_auth` already defined.
9. **DNS-rebinding TOCTOU in SSRF validator** — DNS is validated, then `fetch` re-resolves independently; pin resolved IPs at connect time for full coverage.

### Low
10. **Secrets rotation policy** — define cadence for JWT_SECRET, Stripe/Chapa keys, VAPID keys.
11. **Backup verification automation** — monthly automated restore test to a separate instance.
12. **Rate limiting disabled entirely in development** — acceptable locally; ensure load/staging environments enable it.

---

## Security Testing Checklist (Before Each Release)

- [ ] `npm audit` passes with no high-severity issues
- [ ] All new endpoints have `requireAuth` or explicit public access justification
- [ ] All user-supplied strings are parameterized in SQL queries
- [ ] All file uploads validate MIME type and size
- [ ] New env vars: secrets are server-only, public vars use `NEXT_PUBLIC_` prefix
- [ ] No `console.log` of request bodies that might contain passwords or tokens
- [ ] Rate limiting applies to any new auth-adjacent endpoints
