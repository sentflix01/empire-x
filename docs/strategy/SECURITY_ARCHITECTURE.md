# Nodbusiness — Security Architecture (Zero-Trust, Defense-in-Depth)

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| ATO | Account Takeover |
| CSP | Content Security Policy |
| CSRF | Cross-Site Request Forgery |
| CVE | Common Vulnerabilities and Exposures |
| DAST | Dynamic Application Security Testing |
| DDoS | Distributed Denial of Service |
| GDPR | General Data Protection Regulation |
| HSTS | HTTP Strict Transport Security |
| IdP | Identity Provider |
| JWKS | JSON Web Key Set |
| JWT | JSON Web Token |
| mTLS | Mutual TLS |
| OWASP | Open Web Application Security Project |
| PII | Personally Identifiable Information |
| RBAC | Role-Based Access Control |
| SAST | Static Application Security Testing |
| SCA | Software Composition Analysis |
| SSO | Single Sign-On |
| SSRF | Server-Side Request Forgery |
| TLS | Transport Layer Security |
| WAF | Web Application Firewall |
| XSS | Cross-Site Scripting |

---

## 1. Security Principles

| Principle | Implementation |
|-----------|----------------|
| **Zero Trust** | Never trust, always verify — every request authenticated, authorized, encrypted |
| **Least Privilege** | Minimal scopes, short-lived tokens, scoped API keys, RBAC |
| **Defense in Depth** | 7 layers: Network → Transport → Application → Data → Runtime → Supply Chain → Human |
| **Secure by Default** | Fail closed, deny by default, explicit allowlists |
| **Auditability** | Immutable logs, tamper-evident, queryable |
| **Privacy by Design** | Data minimization, purpose limitation, user control |
| **Resilience** | Graceful degradation, circuit breakers, stale cache fallback |

---

## 2. Threat Model (STRIDE)

| Threat | Likelihood | Impact | Mitigations |
|--------|------------|--------|-------------|
| **Spoofing** | Medium | High | JWT (RS256), HttpOnly cookies, mTLS service-to-service |
| **Tampering** | Medium | High | CSP, SRI, signed webhooks, audit logs |
| **Repudiation** | Low | Medium | Immutable audit logs, signed events |
| **Information Disclosure** | Medium | High | Encryption at rest/in transit, field-level PII encryption, CSP |
| **Denial of Service** | High | Medium | Cloudflare WAF, rate limits, auto-scaling, circuit breakers |
| **Elevation of Privilege** | Medium | Critical | RBAC, feature flags, code review, least privilege |

---

## 3. Network Security

### 3.1 Perimeter

| Control | Implementation |
|---------|----------------|
| **WAF** | Cloudflare (managed + custom rules: SQLi, XSS, bot, geo-block) |
| **DDoS** | Cloudflare (unmetered L3/L4/L7) |
| **Geo-blocking** | Block high-risk countries (configurable via feature flag) |
| **IP Reputation** | Cloudflare IP reputation + custom blocklist |
| **Bot Management** | Cloudflare Bot Fight Mode + custom challenges |

### 3.2 Service Mesh (Phase 3)

| Component | Technology |
|-----------|------------|
| **mTLS** | Istio / Linkerd (automatic cert rotation) |
| **Authorization** | OPA policies per service |
| **Observability** | Distributed tracing (Jaeger), metrics (Prometheus) |
| **Traffic Management** | Canary, mirroring, retries, timeouts |

---

## 4. Transport Security

### 4.1 TLS Configuration

| Endpoint | TLS Version | Cipher Suites | Certificate |
|----------|-------------|---------------|-------------|
| **Frontend (Vercel)** | TLS 1.3 only | TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256 | Vercel-managed (auto-renew) |
| **API (Render)** | TLS 1.2+ | ECDHE+AES-GCM, ECDHE+CHACHA20 | Render-managed (Let's Encrypt) |
| **Database (Supabase PostgreSQL)** | TLS 1.2+ | Server default | Supabase-managed |
| **Redis (Upstash)** | TLS 1.2+ | Server default | Upstash-managed |
| **Service-to-Service** | TLS 1.3 | mTLS (Phase 3) | SPIFFE/SPIRE |

### 4.2 Security Headers (CSP)

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://js.stripe.com https://accounts.google.com https://browser.sentry-cdn.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https: https://*.r2.dev https://*.supabase.co;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.nodbusiness.app wss://api.nodbusiness.app https://*.sentry.io https://api.stripe.com;
  frame-src https://js.stripe.com https://hooks.stripe.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

---

## 5. Application Security

### 5.1 Authentication

| Component | Implementation |
|-----------|----------------|
| **Password Hash** | bcrypt (cost factor 12) |
| **Access Token** | JWT HS256, 15 min, JTI revocation via Redis |
| **Refresh Token** | Opaque, 7 days, HttpOnly Secure SameSite=None (production) / SameSite=Lax (dev) cookie, rotating |
| **OTP** | 6 digits, 15 min TTL, rate-limited |
| **Session** | In-memory access token + HttpOnly refresh cookie |
| **Password Reset** | Time-limited (1hr), single-use, hashed token in DB |
| **Account Lockout** | 5 failed attempts → 15 min lockout + email alert |

### 5.2 Authorization (RBAC)

| Role | Permissions |
|------|-------------|
| **super_admin** | All (platform, users, flags, audit) |
| **admin** | Users, content, verification, flags, devops |
| **business_owner** | Own showroom, products, orders, wallet, team |
| **team_member** | Scoped to business (role: manager/staff/viewer) |
| **developer** | Template marketplace, API keys, webhooks |
| **customer** | Browse, purchase, chat, reviews, bookmarks |

**Implementation:** `middleware/auth.ts` → `requireAuth`, `requireAdmin`, `optionalAuth`

### 5.3 Input Validation

| Layer | Tool | Rules |
|-------|------|-------|
| **API** | Zod schemas | Strict, no extra fields, transform + refine |
| **Frontend** | React Hook Form + Zod | Client-side mirror of API schemas |
| **Database** | CHECK constraints | NOT NULL, ranges, enums, foreign keys |
| **Upload** | Multer + magic-byte | Allowlist: JPEG, PNG, WebP, PDF (NO SVG) |

### 5.4 Output Encoding

| Context | Method |
|---------|--------|
| **HTML** | React auto-escapes (JSX) |
| **JSON** | `JSON.stringify` + CSP |
| **URL** | `encodeURIComponent` |
| **SQL** | Parameterized queries ONLY (pg.Pool) |
| **Shell** | Never (no shell execution) |

---

## 6. PATENT 4 — External Data Gateway Security

### 6.1 Threat Model

| Threat | Impact | Mitigation |
|--------|--------|------------|
| **SSRF** | Internal network access, metadata service | DNS resolve → IPv4/IPv6 private blocklist (RFC1918, loopback, link-local, unique-local) |
| **Redirect Attacks** | Bypass blocklist via 3xx | `redirect: 'error'` (no follow) |
| **Credential Leakage** | Logs, error messages, client exposure | AES-256-GCM per-tenant key, never logged, server-side only |
| **Upstream Abuse** | DDoS, cost, quota exhaustion | Per-tenant-per-section quota (Redis), 30s timeout |
| **Cache Poisoning** | Stale/malicious data served | Cache key includes tenant+section+source, TTL per source |
| **Data Exfiltration** | Sensitive upstream data leaked | Response validation, schema enforcement, field allowlist |

### 6.2 Gateway Architecture

```
Tenant Request
     │
     ▼
┌──────────────────────────────────────────┐
│ 1. VALIDATE SOURCE                       │
│    • HTTPS only                          │
│    • DNS resolve → A/AAAA records        │
│    • IP blocklist check (RFC1918, etc.)  │
│    • Scheme allowlist (https)            │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│ 2. PREPARE REQUEST                       │
│    • Decrypt credentials (AES-256-GCM)   │
│    • Inject per auth mode (header/query) │
│    • Add correlation ID                  │
│    • Set timeout (30s)                   │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│ 3. FETCH (SSRF-SAFE)                     │
│    • fetch(url, { redirect: 'error',    │
│        signal: AbortSignal.timeout(30s) })│
│    • Enforce quota (Redis INCR)          │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│ 4. PROCESS RESPONSE                      │
│    • Validate status (2xx only)          │
│    • Unwrap envelope (single-key array)  │
│    • Apply field mappings                │
│    • Cache (TTL per source)              │
│    • Write health record                 │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│ 5. DEGRADATION (if upstream fails)       │
│    • Circuit breaker (5 failures → 5min) │
│    • Serve stale cache (7-day TTL)       │
│    • Emit X-Stale: true header           │
└──────────────────────────────────────────┘
```

### 6.3 Credential Vault

| Property | Implementation |
|----------|----------------|
| **Algorithm** | AES-256-GCM (authenticated encryption) |
| **Key Derivation** | HKDF-SHA256(master_key, `tenant:{id}:showroom:{id}`) |
| **Key Rotation** | Annual master key rotation + re-encrypt |
| **Storage** | `encrypted_credentials` table (ciphertext + IV + auth tag) |
| **Access** | Server-side only, never in logs, never to client |

---

## 7. Data Protection

### 7.1 Encryption

| State | Algorithm | Key Management |
|-------|-----------|----------------|
| **At Rest (DB)** | AES-256-GCM (Supabase-managed) | Supabase-managed |
| **At Rest (Object Store)** | SSE-S3 (R2) | Cloudflare-managed |
| **At Rest (Credentials)** | AES-256-GCM (per-tenant key) | HKDF from master |
| **In Transit** | TLS 1.2+ | See Section 4 |
| **PII Fields** | AES-256-GCM (application-level) | HKDF from master |

### 7.2 PII Handling

| Data | Classification | Retention | Access |
|------|----------------|-----------|--------|
| **Email** | PII | Account lifetime + 90d | Auth, notifications |
| **Phone** | PII | Account lifetime + 90d | Auth, orders, chat |
| **Address** | PII | Order lifetime + 1yr | Orders, delivery |
| **Payment Info** | PCI (tokenized) | Never stored | Stripe/Chapa tokens only |
| **Government ID** | Highly Sensitive | Verification + 90d | Verification team only |
| **Biometric** | None collected | N/A | N/A |

### 7.3 Data Subject Rights (GDPR/CCPA)

| Right | Implementation |
|-------|----------------|
| **Access** | `/api/user/export` — JSON + PDF |
| **Rectification** | Profile edit + admin override |
| **Erasure** | `/api/user/delete` — anonymize (retain audit logs) |
| **Portability** | JSON export (machine-readable) |
| **Restriction** | Feature flag `gdpr_restrict` → disable processing |
| **Objection** | Opt-out flags (marketing, analytics) |

---

## 8. Financial Security

### 8.1 Wallet Architecture

| Control | Implementation |
|---------|----------------|
| **Atomic Ops** | `SELECT FOR UPDATE` + single transaction (`atomicWalletOp`) |
| **Idempotency** | Idempotency keys on all mutating endpoints |
| **Audit Trail** | Immutable `audit_logs` table (append-only, indexed) |
| **Reconciliation** | Daily job: wallet balance = SUM(transactions) |
| **Limits** | Per-user daily/weekly/monthly (configurable) |
| **Fraud Detection** | Velocity checks, geo-velocity, device fingerprint |

### 8.2 Payment Security

| Gateway | Security |
|---------|----------|
| **Stripe** | PCI SAQ-A (Elements), webhook signature verification |
| **Chapa** | Callback verification, sandbox isolation, tx_ref uniqueness |
| **COD** | No payment data, order confirmation only |
| **Wallet** | Internal ledger, no external dependency |

---

## 9. Supply Chain Security

### 9.1 Dependency Management

| Control | Tool | Frequency |
|---------|------|-----------|
| **SCA** | `npm audit` + GitHub Dependabot | Every PR + daily |
| **License Check** | `license-checker` | CI |
| **Outdated** | `npm outdated` | Weekly |
| **SBOM** | `@cyclonedx/bom` | Every release |
| **Signed Commits** | GPG + GitHub vigilant mode | Always |

### 9.2 Container Security

| Control | Implementation |
|---------|----------------|
| **Base Image** | `node:20-alpine` (minimal) |
| **Non-root** | `USER node` |
| **Read-only FS** | `readonlyRootFilesystem: true` |
| **Dropped Capabilities** | `ALL` except `NET_BIND_SERVICE` |
| **Seccomp** | Default profile |
| **Image Scan** | Trivy (CI) + Cosign verify |

### 9.3 CI/CD Security

| Gate | Tool |
|------|------|
| **SAST** | CodeQL (GitHub Advanced Security) |
| **DAST** | OWASP ZAP (staging) |
| **Secrets Scan** | TruffleHog + GitHub Secret Scanning |
| **Dependency Review** | Dependabot PR reviews |
| **License Compliance** | FOSSA / `license-checker` |

---

## 10. Incident Response

### 10.1 Severity Levels

| SEV | Definition | Response Time | Escalation |
|-----|------------|---------------|------------|
| **SEV-1** | Data breach, payment fraud, total outage | 15 min | Founder + SRE lead + Legal |
| **SEV-2** | Partial outage, payment degradation, auth issues | 1 hour | SRE lead + Backend lead |
| **SEV-3** | Feature degradation, non-critical bug | 4 hours | On-call engineer |
| **SEV-4** | Low-impact bug, cosmetic | Next sprint | Team |

### 10.2 Incident Flow

```
DETECT (Alert / User Report / Manual)
    │
    ▼
TRIAGE (Severity + Impact + Owner)
    │
    ▼
MITIGATE (Rollback / Feature Flag / Scale / Patch)
    │
    ▼
RESOLVE (Root Cause + Fix + Deploy)
    │
    ▼
POSTMORTEM (Blameless, within 48h)
    │
    ▼
ACTION ITEMS (Tickets + Owner + Due Date)
```

### 10.3 Communication

| Audience | Channel | Template |
|----------|---------|----------|
| **Internal** | Slack `#incidents` + PagerDuty | Incident #, severity, impact, owner |
| **Customers** | In-app banner + email | Status page + ETA |
| **Partners** | Email + Slack Connect | Partner-specific impact |
| **Regulators** | Legal team | Within 72h (GDPR) |

---

## 11. Compliance Roadmap

| Standard | Target | Status |
|----------|--------|--------|
| **SOC 2 Type II** | Phase 2 (100K MAU) | Planning |
| **ISO 27001** | Phase 3 (500K MAU) | Planning |
| **PCI DSS SAQ-A** | Launch (Stripe/Chapa) | ✅ Compliant |
| **GDPR** | Launch (EU users) | ✅ Implemented |
| **CCPA** | Launch (CA users) | ✅ Implemented |
| **Ethiopia Data Protection** | Launch | ✅ Local counsel |

---

## 12. Security Testing

| Test | Tool | Frequency |
|------|------|-----------|
| **SAST** | CodeQL | Every PR + daily |
| **DAST** | OWASP ZAP | Weekly (staging) |
| **Dependency Scan** | Dependabot + Trivy | Every PR + daily |
| **Secrets Scan** | TruffleHog | Every PR + daily |
| **Penetration Test** | External firm | Annual (post-Series A) |
| **Bug Bounty** | HackerOne / Intigriti | Post-Series A |
| **Red Team** | Internal + external | Semi-annual (Phase 3) |

---

## 13. Security Checklist (Per Release)

```
PRE-RELEASE SECURITY GATE
────────────────────────────────────────
☐ All PRs: CodeQL + Dependabot + Trivy pass
☐ No new HIGH/CRITICAL CVEs in dependencies
☐ No secrets in code (TruffleHog clean)
☐ CSP headers verified (staging)
☐ Auth flows tested (login, refresh, reset, OTP)
☐ RBAC tested (admin, owner, member, customer)
☐ Wallet atomic ops tested (concurrency)
☐ PATENT 4 gateway tested (SSRF, redirect, quota, cache)
☐ CSP headers verified (production)
☐ WAF rules updated for new endpoints
☐ Rate limits configured for new endpoints
☐ Audit log entries for new financial actions
☐ Feature flag default = OFF for risky features
☐ Rollback tested (previous deploy)
────────────────────────────────────────
```

---

*This security architecture is the baseline for all development. Review monthly. Update with every threat model change.*

---

*Confidential. For Nodbusiness Technologies internal use only.*