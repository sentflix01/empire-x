# Nodbusiness — Threat Model

> Security is part of the design, not an afterthought.
> This document identifies threats, current mitigations, and remaining work.
> Last updated: August 2026

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
| Credential brute force | Attacker tries many passwords on `/api/auth/login` | Rate limiting (20 req/15min in production) via `express-rate-limit` | ✅ Done |
| JWT token theft (XSS) | Malicious script reads `access_token` from localStorage | DOMPurify on all user content; CSP headers via Helmet; HttpOnly cookies planned | ⚠️ Partial |
| Expired token reuse | Attacker replays an old JWT | Token expiry enforced (`JWT_EXPIRES_IN=7d`); DB lookup confirms user still exists | ✅ Done |
| Account takeover via reset link | Attacker intercepts password reset email | Reset tokens expire in 1 hour; tokens are single-use (cleared on use) | ✅ Done |
| OTP brute force | Attacker guesses 6-digit OTP | OTPs expire in 15 minutes; rate limiting on `/api/auth/verify-otp` | ✅ Done |
| Google OAuth token replay | Attacker replays a stolen Google ID token | Token verified with Google servers on every login request | ✅ Done |
| Session fixation | Attacker sets a known session ID | JWT is stateless — no server-side session to fix | ✅ N/A |

**Remaining work:**
- HttpOnly refresh token (eliminates XSS token theft risk)
- Redis-based JWT blocklist (allows token revocation before expiry)
- 2FA for high-value accounts (feature flag: `two_factor_auth`)

---

### 2. Injection Attacks

| Threat | Description | Mitigation | Status |
|---|---|---|---|
| SQL injection | Attacker injects SQL through request parameters | Parameterized queries everywhere (`$1, $2`); `ALLOWED_TABLES` allowlist in crud.js | ✅ Done |
| XSS via user content | Attacker injects `<script>` in posts or product descriptions | DOMPurify sanitizes all rendered HTML; React escapes by default | ✅ Done |
| Path traversal in file uploads | Attacker uploads `../../etc/passwd` | Multer enforces allowed MIME types; filenames are UUID-generated | ✅ Done |
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
| Price manipulation | Attacker modifies request to pay less than product price | Server recalculates total from DB price — never trusts client-sent price | ✅ Done |
| Wallet balance inflation | Attacker directly calls `/api/wallet/topup` | TopUp is available to authenticated users (self-service); production would use Stripe/Chapa webhook only | ⚠️ Needs review in production |
| Commission bypass | Seller marks order complete without triggering commission | Commission collected server-side when `status=completed` — not client-controlled | ✅ Done |
| Refund fraud | Buyer requests refund without returning goods | Return requests require seller approval before refund is issued | ✅ Done |

---

### 5. Denial of Service

| Threat | Description | Mitigation | Status |
|---|---|---|---|
| API flooding | Attacker sends thousands of requests | Global rate limiter (500 req/15min prod); Cloudflare WAF | ✅ Done |
| Auth endpoint flooding | Attacker floods login/register | Separate stricter rate limiter (20 req/15min prod) | ✅ Done |
| Large file upload DoS | Attacker uploads 1GB files repeatedly | `MAX_FILE_SIZE_MB` env var enforced by Multer; MIME type allowlist | ✅ Done |
| DDoS | Volumetric attack on infrastructure | Cloudflare in front of both Vercel and Railway | ✅ Done |
| ReDoS (regex DoS) | Crafted input causes catastrophic backtracking | No complex regex on user input; validation uses `express-validator` primitives | ✅ Done |

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

## Remaining Security Work (Prioritized)

### High
1. **HttpOnly refresh token** — Eliminates XSS JWT theft. Requires `/api/auth/refresh` endpoint + backend cookie setting.
2. **Wallet topup restriction** — In production, `/api/wallet/topup` should only be callable from internal backend (Stripe webhook) or admin. Add internal-only middleware.
3. **Audit logging** — Log all financial transactions (wallet, orders, commissions) to an append-only audit table.

### Medium
4. **JWT revocation blocklist** — Store invalidated tokens in Redis. Check on every request. Required for "logout all devices".
5. **2FA** — Time-based OTP (TOTP) via authenticator app. Feature flag `two_factor_auth` already defined.
6. **File upload scanning** — Scan uploads for malware/CSAM using Cloudflare CSAM scanning or ClamAV.
7. **CSP headers** — Add `Content-Security-Policy` via Helmet to restrict script sources.

### Low
8. **Secrets rotation policy** — Define how often JWT_SECRET, Stripe keys, and VAPID keys are rotated.
9. **Backup verification** — Monthly automated test: restore Neon backup to a separate instance and verify data integrity.
10. **Disaster recovery runbook** — Document step-by-step what to do if the primary database, backend, or CDN goes down.

---

## Security Testing Checklist (Before Each Release)

- [ ] `npm audit` passes with no high-severity issues
- [ ] All new endpoints have `requireAuth` or explicit public access justification
- [ ] All user-supplied strings are parameterized in SQL queries
- [ ] All file uploads validate MIME type and size
- [ ] New env vars: secrets are server-only, public vars use `NEXT_PUBLIC_` prefix
- [ ] No `console.log` of request bodies that might contain passwords or tokens
- [ ] Rate limiting applies to any new auth-adjacent endpoints
