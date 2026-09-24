# Nodbusiness — Security Hardening

> Layered security at every level: network, application, database, and human.
> **Last updated:** September 2026
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Cloudflare Pages · Supabase · Cloudflare R2

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
| CVE | Common Vulnerabilities and Exposures |
| VM | Virtual Machine |

---

## Security Layers (Defence in Depth)

```
Layer 1: Network         — Cloudflare DDoS/WAF/TLS; Oracle VM security group (Cloudflare IP allowlist)
Layer 2: Authentication  — JWT, ban enforcement, Redis-backed rate limiting
Layer 3: Authorization   — requireAuth, requireAdmin, ownership checks
Layer 4: Input           — ALLOWED_TABLES, parameterized SQL, MIME validation
Layer 5: Data            — TLS in transit everywhere; Supabase encrypts at rest
Layer 6: Monitoring      — Sentry, Pino structured logs, Uptime Kuma, anomaly detection
Layer 7: Process         — Code review, npm audit in CI, post-mortems
```

---

## Current Security Posture

### ✅ Already Implemented

| Control | Where | What it does |
|---|---|---|
| JWT authentication | `middleware/auth.ts` | Verifies every request has valid token |
| Ban enforcement | `middleware/auth.ts` | Banned users get 403 immediately |
| Redis-backed rate limiting | `index.ts` | 500 req/15min general; 20 req/15min auth — shared across restarts |
| ALLOWED_TABLES | `utils/crud.ts` | Prevents SQL injection via dynamic table names |
| Parameterized SQL | All routes | `$1`, `$2` params in all queries |
| Input validation | All routes | Required field checks, length limits before DB operations |
| Ownership checks | All mutation routes | Only owner or admin can modify resources |
| CORS allowlist | `index.ts` | Only configured `FRONTEND_URL` origins allowed |
| Helmet.js | `index.ts` | CSP, HSTS (1 year), noSniff, frameguard (DENY), referrerPolicy |
| Content Security Policy | `index.ts` + `next.config.ts` | Blocks unauthorized script sources |
| HTTPS everywhere | Cloudflare | TLS enforced, HTTP redirected — always-on all plans |
| File upload validation | `middleware/upload.ts` | MIME type check + 10 MB size limit |
| Admin role enforcement | `middleware/auth.ts` | `requireAdmin` on all admin routes |
| SSRF validator | `middleware/ssrfValidator.js` | Blocks server-side request forgery |
| Stripe webhook verification | `routes/orders.ts` | `constructEvent()` with `STRIPE_WEBHOOK_SECRET` |
| External API credential encryption | `routes/externalSources.ts` | AES-256-GCM, key from `EXTERNAL_API_ENCRYPTION_KEY` |
| Cloudflare DDoS protection | Network layer | L3/L4/L7 always-on, automatic, 335+ PoPs |
| Backend IP hidden | Cloudflare proxy | Oracle VM real IP never exposed to the internet |

### ❌ Not Yet Implemented (Prioritized)

| Control | Priority | Effort | When |
|---|---|---|---|
| Sentry error monitoring | 🔴 Critical | 30 min | This week |
| VAPID keys (push security) | 🔴 Critical | 30 min | This week |
| Oracle VM security group (CF IP allowlist) | 🔴 Critical | 30 min | **Before launch** |
| OWASP dependency audit | 🟡 High | 1 hour | Monthly (CI already has `npm audit --audit-level=high`) |
| 2FA (TOTP) | 🟡 High | 3 days | Month 2–3 |
| HttpOnly cookie for JWT | 🟡 High | 2 days | Month 2–3 |
| Penetration testing | 🟡 High | $5–20K | Before 50K users |
| CSRF protection | 🟢 Medium | 1 day | Month 2 |
| Audit logging | 🟢 Medium | Already built (`lib/auditLogger.ts`) — enable | Month 1 |

---

## CRITICAL: Oracle VM — Cloudflare IP Allowlist

**This must be configured before public launch.** Without it, attackers can bypass Cloudflare by hitting your Oracle VM's public IP directly, circumventing all DDoS protection and WAF rules.

```bash
# In Oracle Cloud Console:
# Networking → Virtual Cloud Networks → Your VCN → Security Lists → Default Security List
# Edit Ingress Rules:

# ALLOW: HTTPS (443) from Cloudflare IPv4 ranges only
# Get current ranges: https://www.cloudflare.com/ips-v4
# As of September 2026, these include:
# 103.21.244.0/22, 103.22.200.0/22, 103.31.4.0/22, 104.16.0.0/13, 104.24.0.0/14
# 108.162.192.0/18, 131.0.72.0/22, 141.101.64.0/18, 162.158.0.0/15
# 172.64.0.0/13, 173.245.48.0/20, 188.114.96.0/20, 190.93.240.0/20
# 197.234.240.0/22, 198.41.128.0/17
# (Always fetch current list from cloudflare.com/ips — it changes periodically)

# ALLOW: HTTP (80) from Cloudflare IPv4 ranges only (Cloudflare upgrades to HTTPS)
# ALLOW: TCP 8000 from your own IP only (Coolify dashboard)
# ALLOW: TCP 22 from your own IP only (SSH)
# DENY: Everything else on 80/443

# Also add IPv6 Cloudflare ranges from https://www.cloudflare.com/ips-v6
```

**Verify the restriction is working:**
```bash
# From your local machine (not through Cloudflare):
curl -k https://<oracle-vm-ip>/health
# Expected: Connection refused or timeout
# If you get a 200 response, the IP allowlist is NOT configured correctly
```

---

## Authentication Security

### JWT Security

```javascript
// Current: JWT in localStorage + cookie + memory (fixed in deployment-readiness-fix)
// Planned fix: HttpOnly cookie (not accessible to JS) — Month 2–3
// Migration plan in ADR-004

// JWT revocation already built:
// Per-token (logout): redis SET revoked:{jti} 1 EX 604800
// Per-user (logout-all / breach): redis SET revoke_before:{userId} {timestamp}
// Platform-wide: rotate JWT_SECRET in Coolify → instant global invalidation
```

### Password Security

```javascript
// bcrypt with cost factor 12 — already implemented in routes/auth.ts
const hash = await bcrypt.hash(password, 12);

// Minimum requirements enforced on both frontend + backend:
// - 8+ characters
// - At least one uppercase letter
// - At least one number
```

---

## Database Security

### SQL Injection Prevention

```javascript
// ✅ Always parameterized:
const { rows } = await pool.query(
  'SELECT * FROM products WHERE id = $1 AND seller_id = $2',
  [productId, req.user.id]
);

// ✅ ALLOWED_TABLES prevents table injection:
validateTable(table); // throws if not in allowlist

// ❌ Never:
pool.query(`SELECT * FROM ${table} WHERE id = '${id}'`);
```

### Supabase Access Control

```sql
-- Supabase project → SQL Editor → Create separate roles:

-- 1. app_user — used by the backend application (current default)
--    Connected via DATABASE_URL in Coolify
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- 2. readonly_user — for analytics queries only
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- 3. migration_user — used only for migrations (direct connection, not pooler)
GRANT ALL PRIVILEGES ON DATABASE postgres TO migration_user;
```

### Sensitive Data Handling

```javascript
// Never return password hashes to clients
const user = await pool.query(
  'SELECT id, email, full_name, role FROM users WHERE id = $1'
  // No password_hash in SELECT
);

// Mask email in logs:
function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}
```

---

## Network Security Configuration

### Cloudflare Free Plan Settings (Enable Immediately)

```
Security:
  ✅ DDoS Protection — always on (cannot be disabled)
  ✅ Bot Fight Mode → ON
  ✅ Browser Integrity Check → ON
  ✅ Hotlink Protection → ON (prevents others embedding your images)

Performance:
  ✅ Auto Minify → JavaScript, CSS, HTML
  ✅ Brotli compression → ON
  ✅ Rocket Loader → OFF (can break Next.js hydration scripts)

SSL:
  ✅ SSL Mode → Full (Strict) — not Flexible
  ✅ Always HTTPS → ON
  ✅ HSTS → 12 months, Include subdomains
  ✅ Minimum TLS Version → 1.2
```

### Cloudflare WAF (Upgrade to Pro at $20/month when ready)

```
Rule 1: Block SQL injection attempts
  Expression: http.request.uri contains "' OR" OR http.request.uri contains "UNION SELECT"
  Action: Block

Rule 2: Rate limit login endpoint (Cloudflare level — before Express)
  Expression: http.request.uri.path == "/api/auth/login" AND rate > 20/minute/ip
  Action: Challenge

Rule 3: Block empty User-Agent
  Expression: http.user_agent == ""
  Action: Block

Rule 4: Allow Stripe webhook IPs only for /api/orders/webhook
  Expression: http.request.uri.path == "/api/orders/webhook"
              AND NOT ip.src in {stripe_webhook_ips}
  Action: Block
```

---

## Coolify Security Settings

```
# In Coolify → Settings:
✅ Enable 2FA for Coolify admin login
✅ Set a strong Coolify admin password
✅ Use Coolify's automatic Let's Encrypt SSL for the Coolify dashboard
✅ Restrict Coolify dashboard access (port 8000) to your IP via Oracle security group
✅ Rotate Coolify API tokens regularly (GitHub Secrets → COOLIFY_TOKEN)
```

---

## File Upload Security

```javascript
// Current validation in middleware/upload.ts:

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
  'video/mp4', 'video/webm',
]);

// Validates MIME from actual content (not just extension)
// Sharp strips EXIF data (removes GPS coordinates from photos)
// Files stored on R2, NOT served from the backend's filesystem
// No executable files can be uploaded (no .php, .js, .sh, etc.)
```

---

## OWASP Top 10 Compliance

| OWASP Risk | Status | Mitigation |
|---|---|---|
| A01 Broken Access Control | ✅ Mitigated | requireAuth + ownership checks on all mutations |
| A02 Cryptographic Failures | ✅ Mitigated | bcrypt passwords, HTTPS everywhere, secrets in Coolify env |
| A03 Injection | ✅ Mitigated | Parameterized SQL, ALLOWED_TABLES, input validation |
| A04 Insecure Design | ⚠️ Ongoing | Security reviews in code review checklist |
| A05 Security Misconfiguration | ⚠️ Partial | Helmet.js done; Oracle VM Cloudflare IP allowlist needed |
| A06 Vulnerable Components | ✅ Monitored | `npm audit --audit-level=high` blocks in CI pipeline |
| A07 Auth Failures | ⚠️ Partial | Redis rate limiting done; HttpOnly cookie pending |
| A08 Software Integrity | ⚠️ Partial | Dependabot alerts enabled |
| A09 Logging/Monitoring | ⚠️ Partial | Pino logging done; Sentry needs activation; Uptime Kuma pending |
| A10 SSRF | ✅ Mitigated | SSRF validator middleware exists |

---

## Dependency Security

```bash
# CI already runs this on every push (blocking at high+):
cd backend && npm audit --audit-level=high
cd frontend-next && npm audit --audit-level=high

# Dependabot already configured at .github/dependabot.yml
# Weekly scans, patch updates auto-approved
```

---

## Security Headers (Current)

```javascript
// backend/index.ts (Helmet.js):
X-Content-Type-Options: nosniff             ✅
X-Frame-Options: DENY                       ✅
X-XSS-Protection: 1; mode=block            ✅
Strict-Transport-Security: max-age=31536000 ✅
Content-Security-Policy: [configured]       ✅
Referrer-Policy: strict-origin-when-cross-origin ✅
Permissions-Policy: camera=(), microphone=(), geolocation=(self) ✅

// frontend-next/next.config.ts — already set:
X-Content-Type-Options: nosniff            ✅
X-Frame-Options: DENY                      ✅
Referrer-Policy: strict-origin-when-cross-origin ✅
Permissions-Policy: camera=(), geolocation=(self) ✅
Content-Security-Policy: [configured]      ✅
```

---

## Penetration Testing Plan

### Before 50,000 users — Internal Audit

```bash
# OWASP ZAP automated scan:
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.yourdomain.com \
  -r zap-report.html
```

**Manual testing checklist:**
- [ ] Try accessing another user's orders: `GET /api/orders/{other-user-order-id}`
- [ ] Try SQL injection in search: `?q=' OR '1'='1`
- [ ] Try uploading malicious file: `.php` file with `.jpg` extension
- [ ] Try accessing admin routes without admin role
- [ ] Try JWT manipulation (change `sub` claim)
- [ ] Try IDOR on all resource IDs
- [ ] Verify Oracle VM IP is not directly reachable (Cloudflare bypass test)

### Before 200,000 users — External Audit

Hire a professional penetration testing firm:
- **HackerOne** (bug bounty — pay only for valid findings)
- **Cobalt** (vetted pen testers on demand, $3,000–10,000)

---

## Incident Response

### Critical (Active breach)
```
1. Rotate JWT_SECRET in Coolify → all sessions invalidated (< 3 min)
2. Change Supabase database password → update DATABASE_URL in Coolify
3. Enable Cloudflare Under Attack Mode
4. Download Coolify container logs
5. Preserve evidence → investigate
6. Notify affected users + INSA within 72 hours (GDPR/local requirement)
```

### Responsible Disclosure Policy

```
# Add to https://nodbusiness.app/.well-known/security.txt

Contact: security@nodbusiness.app
Preferred-Languages: en, am
Policy: https://nodbusiness.app/security-policy
Acknowledgments: https://nodbusiness.app/security/hall-of-fame
Expires: 2027-09-01T00:00:00Z
```
