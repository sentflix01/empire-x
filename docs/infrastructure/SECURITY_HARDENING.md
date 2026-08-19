# Halehame — Security Hardening

> Layered security at every level: network, application, database, and human.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| OWASP | Open Web Application Security Project |
| XSS | Cross-Site Scripting |
| CSRF | Cross-Site Request Forgery |
| SSRF | Server-Side Request Forgery |
| SQL | Structured Query Language |
| IDOR | Insecure Direct Object Reference |
| CSP | Content Security Policy |
| CORS | Cross-Origin Resource Sharing |
| HSTS | HTTP Strict Transport Security |
| TLS | Transport Layer Security |
| WAF | Web Application Firewall |
| DDoS | Distributed Denial of Service |
| MFA | Multi-Factor Authentication |
| JWT | JSON Web Token |
| API | Application Programming Interface |
| PII | Personally Identifiable Information |
| SAST | Static Application Security Testing |
| DAST | Dynamic Application Security Testing |
| CVE | Common Vulnerabilities and Exposures |

---
## Security Layers (Defence in Depth)

```
Layer 1: Network         — Cloudflare DDoS, WAF, TLS
Layer 2: Authentication  — JWT, ban enforcement, rate limiting
Layer 3: Authorization   — requireAuth, requireAdmin, ownership checks
Layer 4: Input           — ALLOWED_TABLES, parameterized SQL, MIME validation
Layer 5: Data            — Encrypted at rest (Neon), secrets in env vars
Layer 6: Monitoring      — Sentry, structured logs, anomaly detection
Layer 7: Process         — Code review, pen testing, post-mortems
```

---

## Current Security Posture

### ✅ Already Implemented

| Control | Where | What it does |
|---|---|---|
| JWT authentication | `middleware/auth.js` | Verifies every request has valid token |
| Ban enforcement | `middleware/auth.js` | Banned users get 403 immediately |
| Rate limiting | `index.js` | 500 req/15min general; 20 req/15min auth |
| ALLOWED_TABLES | `utils/crud.js` | Prevents SQL injection via table names |
| Parameterized SQL | All routes | `$1`, `$2` params in all queries |
| Input validation | All routes | Required field checks before DB operations |
| Ownership checks | All mutation routes | Only owner or admin can modify resources |
| CORS | `index.js` | Only configured frontend origins allowed |
| Helmet.js | `index.js` | Security headers (CSP, HSTS, XSS protection) |
| Content Security Policy | `index.js` + `next.config.ts` | Blocks unauthorized script sources |
| HTTPS everywhere | Cloudflare | TLS enforced, HTTP redirected |
| File upload validation | `middleware/upload.js` | MIME type and size checks |
| Admin role enforcement | `middleware/auth.js` | `requireAdmin` on admin routes |

### ❌ Not Yet Implemented (Prioritized)

| Control | Priority | Effort | When |
|---|---|---|---|
| Sentry error monitoring | 🔴 Critical | 30 min | This week |
| VAPID keys (push security) | 🔴 Critical | 30 min | This week |
| Stripe webhook signature verify | 🔴 Critical | Done ✅ | Already built |
| OWASP dependency audit | 🟡 High | 1 hour | Monthly |
| 2FA (TOTP) | 🟡 High | 3 days | Month 2–3 |
| HttpOnly cookie for JWT | 🟡 High | 2 days | Month 2–3 |
| Penetration testing | 🟡 High | $5–20K | Before 50K users |
| Security headers audit | 🟢 Medium | 2 hours | Month 1 |
| CSRF protection | 🟢 Medium | 1 day | Month 2 |
| Audit logging | 🟢 Medium | 2 days | Month 3 |

---

## Authentication Security

### JWT Security

```javascript
// Current: JWT in localStorage + cookie
// Problem: localStorage accessible to JavaScript (XSS risk)
// Planned fix: HttpOnly cookie (not accessible to JS)

// Migration plan:
// 1. Set HttpOnly cookie on login:
res.cookie('access_token', token, {
  httpOnly: true,         // Not accessible to JavaScript
  secure: true,           // HTTPS only
  sameSite: 'strict',     // No cross-site sending
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// 2. Read from cookie in auth middleware:
const token = req.cookies?.access_token || req.headers.authorization?.slice(7);

// 3. Add refresh token (short-lived access token + long-lived refresh)
// Access token: 15 minutes
// Refresh token: 30 days, HttpOnly cookie
// On expiry: client calls /api/auth/refresh automatically
```

### JWT Rotation (Token Revocation)

```javascript
// backend/middleware/auth.js — already built
// Revoke by JTI (per-token):
await redis.set(`revoked:${payload.jti}`, '1', 'EX', 7 * 24 * 60 * 60);

// Revoke all tokens for a user (logout-all / post-breach):
await redis.set(`revoke_before:${userId}`, String(Math.floor(Date.now() / 1000)));
```

### Password Security

```javascript
// backend/routes/auth.js — bcrypt with cost factor 12
const hash = await bcrypt.hash(password, 12);

// Minimum requirements (enforce on frontend + backend):
if (password.length < 8) return res.status(400).json({ error: 'Password must be 8+ characters' });
if (!/[A-Z]/.test(password)) ... // Uppercase required
if (!/[0-9]/.test(password)) ... // Number required

// Password breach check (planned):
// Use HaveIBeenPwned API to check if password is in known breach databases
const response = await fetch(`https://api.pwnedpasswords.com/range/${sha1prefix}`);
```

---

## Database Security

### SQL Injection Prevention

```javascript
// ✅ Always use parameterized queries:
const { rows } = await pool.query(
  'SELECT * FROM products WHERE id = $1 AND seller_id = $2',
  [productId, req.user.id]
);

// ✅ ALLOWED_TABLES prevents table injection:
// backend/utils/crud.js
validateTable(table); // throws if not in allowlist

// ❌ Never do:
pool.query(`SELECT * FROM ${table} WHERE id = '${id}'`); // SQL injection vector
pool.query('SELECT * FROM products WHERE title LIKE %' + search + '%'); // injection + broken syntax
```

### Database Access Control

```
Neon: Create separate database users for different access levels:

1. app_user — read/write access to app tables
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

2. readonly_user — read-only for analytics
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

3. migration_user — schema changes only (used for npm run migrate)
   GRANT ALL PRIVILEGES ON DATABASE halehame TO migration_user;

Never use the superuser connection string in the application.
```

### Sensitive Data Handling

```javascript
// Never return password hashes to clients
const user = await pool.query(
  'SELECT id, email, full_name, role FROM users WHERE id = $1',
  // Note: no password_hash in SELECT
);

// Never log sensitive data
logger.info({ userId }, 'Login successful');
// NOT: logger.info({ userId, password }, 'Login attempt'); ← security violation

// Mask email in logs:
function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}
```

---

## API Security Checklist

Every new endpoint must pass this checklist:

```
[ ] requireAuth middleware applied (or explicitly marked public)
[ ] Input validated (required fields, type checking, length limits)
[ ] SQL uses parameterized queries ($1, $2)
[ ] Ownership check (user owns the resource OR role=admin)
[ ] Response doesn't leak sensitive data (passwords, tokens, PII)
[ ] Error messages don't leak stack traces or DB schema
[ ] Rate limiting appropriate for the endpoint
[ ] Idempotent if it processes money (Stripe webhook)
```

---

## File Upload Security

```javascript
// backend/middleware/upload.js — current security:

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
  'video/mp4', 'video/webm',
]);

// Validate MIME from actual file content, not just extension:
const fileType = await import('file-type');
const detected = await fileType.fromBuffer(file.buffer);
if (!ALLOWED_MIME_TYPES.has(detected?.mime)) {
  return res.status(400).json({ error: 'File type not allowed' });
}

// Strip EXIF data (removes GPS coordinates from photos):
const sharp = require('sharp');
const cleaned = await sharp(buffer).rotate().toBuffer(); // .rotate() strips EXIF
```

---

## OWASP Top 10 Compliance

| OWASP Risk | Status | Mitigation |
|---|---|---|
| A01 Broken Access Control | ✅ Mitigated | requireAuth + ownership checks on all mutations |
| A02 Cryptographic Failures | ✅ Mitigated | bcrypt passwords, HTTPS everywhere, secrets in env |
| A03 Injection | ✅ Mitigated | Parameterized SQL, ALLOWED_TABLES, input validation |
| A04 Insecure Design | ⚠️ Ongoing | Security reviews in code review checklist |
| A05 Security Misconfiguration | ⚠️ Partial | Helmet.js, CSP configured; needs audit |
| A06 Vulnerable Components | ⚠️ Not monitored | Need: `npm audit` in CI, `dependabot` alerts |
| A07 Auth Failures | ⚠️ Partial | Rate limiting done; HttpOnly cookie pending |
| A08 Software Integrity | ⚠️ Partial | No supply chain attack detection |
| A09 Logging/Monitoring | ⚠️ Partial | Pino logging done; Sentry needs activation |
| A10 Server-Side Request Forgery | ✅ Mitigated | SSRF validator middleware exists (`ssrfValidator.js`) |

---

## Dependency Security

```bash
# Run weekly — add to CI pipeline:
cd backend && npm audit --audit-level=moderate
cd frontend-next && npm audit --audit-level=moderate

# Enable GitHub Dependabot:
# .github/dependabot.yml

version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-patch"]  # Auto-approve patch updates
        
  - package-ecosystem: "npm"
    directory: "/frontend-next"
    schedule:
      interval: "weekly"
```

---

## Security Headers (Current vs Target)

```javascript
// Current (Helmet.js in index.js):
X-Content-Type-Options: nosniff             ✅
X-Frame-Options: DENY                       ✅
X-XSS-Protection: 1; mode=block            ✅
Strict-Transport-Security: max-age=31536000 ✅
Content-Security-Policy: [configured]       ✅
Referrer-Policy: strict-origin-when-cross-origin ✅
Permissions-Policy: camera=(), microphone=(), geolocation=(self) ✅

// Missing / needs tuning:
Cross-Origin-Opener-Policy: same-origin    ❌ Add to Helmet config
Cross-Origin-Resource-Policy: same-site    ❌ Add to Helmet config
Cross-Origin-Embedder-Policy: require-corp ❌ Careful — can break third-party embeds

// Check current headers at: securityheaders.com
```

---

## Penetration Testing Plan

### Before 50,000 users — Internal Audit

**Use OWASP ZAP (free automated scanner):**
```bash
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.halehame.app \
  -r zap-report.html
```

**Manual testing checklist:**
- [ ] Try accessing another user's orders: `GET /api/orders/{other-user-order-id}`
- [ ] Try SQL injection in search: `?q=' OR '1'='1`
- [ ] Try uploading malicious file: `.php` file with `.jpg` extension
- [ ] Try accessing admin routes without admin role
- [ ] Try JWT manipulation (change `sub` claim)
- [ ] Try IDOR (Insecure Direct Object Reference) on all IDs

### Before 200,000 users — External Audit

Hire a professional penetration testing firm:
- **HackerOne** (bug bounty programme — pay only for valid findings)
- **Cobalt** (vetted pen testers on demand, $3,000–10,000)
- **Local Ethiopian cybersecurity firms** (if available)

---

## Incident Response for Security Issues

### Severity: Critical (Active breach, data exfiltration)
```
1. Isolate: Revoke ALL JWTs immediately
2. Preserve: Download logs before they rotate
3. Patch: Fix vulnerability
4. Restore: If data modified, restore from backup
5. Notify: Users + authorities (GDPR 72h requirement)
6. Post-mortem: Blameless root cause analysis
```

### Severity: High (Vulnerability discovered, no active exploitation)
```
1. Assess: What data could be accessed?
2. Patch: Fix vulnerability within 24 hours
3. Monitor: Watch for signs of exploitation in logs
4. Reward: If reported via responsible disclosure → thank them, consider bounty
5. Document: Add to security review checklist to prevent recurrence
```

### Responsible Disclosure Policy

```
# Add to https://halehame.vercel.app/.well-known/security.txt

Contact: security@halehame.app
Preferred-Languages: en, am
Policy: https://halehame.vercel.app/security-policy
Acknowledgments: https://halehame.vercel.app/security/hall-of-fame
Expires: 2027-08-01T00:00:00Z
```
