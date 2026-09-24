# Nodbusiness — Networking, Domains & Security

> DNS, SSL, load balancing, DDoS protection, and domain strategy.
> **Last updated:** September 2026
> **Stack:** Oracle Cloud Johannesburg + Coolify v4 · Cloudflare Pages · Supabase

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| DNS | Domain Name System |
| SSL | Secure Sockets Layer |
| TLS | Transport Layer Security |
| CDN | Content Delivery Network |
| WAF | Web Application Firewall |
| DDoS | Distributed Denial of Service |
| HTTPS | HyperText Transfer Protocol Secure |
| HTTP | HyperText Transfer Protocol |
| IP | Internet Protocol |
| CORS | Cross-Origin Resource Sharing |
| HSTS | HTTP Strict Transport Security |
| TTL | Time to Live — DNS record expiry |
| API | Application Programming Interface |
| URL | Uniform Resource Locator |
| CNAME | Canonical Name — DNS record type |
| A Record | Address Record — DNS record mapping domain to IP |
| PoP | Point of Presence |
| VM | Virtual Machine |

---

## Domain Strategy

### Primary Domains (Register Now)

| Domain | Purpose | Points to |
|---|---|---|
| `nodbusiness.app` | Main user-facing app | Cloudflare Pages |
| `api.nodbusiness.app` | Backend API | Oracle VM via Cloudflare proxy |
| `status.nodbusiness.app` | Status page (Uptime Kuma) | Oracle VM (Uptime Kuma on Coolify) |
| `cdn.nodbusiness.app` | R2 CDN custom domain | Cloudflare R2 bucket |

### Future Domains

| Domain | When | Purpose |
|---|---|---|
| `nodbusiness.et` | Ethiopia-specific launch | Ethiopian ccTLD, local trust signal |
| `nodbusiness.co.ke` | Kenya launch | Kenya ccTLD |
| `business.nodbusiness.app` | Business portal | White-label for enterprise tier |
| `api.v2.nodbusiness.app` | API v2 | When versioning needed |

---

## DNS Architecture (Cloudflare)

```
nodbusiness.app (Cloudflare authoritative DNS)
│
├── A     @          → <Oracle VM public IP>    TTL: auto    Proxy: ✅
│         (Cloudflare Pages also works via CNAME — see below)
│
├── CNAME www        → nodbusiness.pages.dev    TTL: auto    Proxy: ✅
│         (or configure Cloudflare Pages custom domain directly)
│
├── A     api        → <Oracle VM public IP>    TTL: 60s     Proxy: ✅
│         (proxied through Cloudflare — Oracle IP stays hidden)
│
├── CNAME status     → <Oracle VM IP or Coolify subdomain>
│                      TTL: 300s   Proxy: ❌ (Uptime Kuma needs direct access for monitors)
│
├── CNAME cdn        → pub-xxxx.r2.dev          TTL: 300s    Proxy: ✅
│         (R2 bucket public URL → served via Cloudflare CDN globally)
│
├── TXT   @          → v=spf1 include:_spf.resend.com ~all
│         (Email SPF record for Resend)
│
├── TXT   resend._domainkey → {Resend DKIM key}
│         (Email DKIM for deliverability)
│
└── TXT   _dmarc     → v=DMARC1; p=quarantine; rua=mailto:dmarc@nodbusiness.app; pct=100
```

### Cloudflare Pages Custom Domain

For the frontend, add the custom domain directly in Cloudflare Pages:
```
Cloudflare → Pages → nodbusiness → Custom domains → Add domain
Enter: nodbusiness.app
Cloudflare Pages automatically creates the DNS record.
```

### DNS TTL Strategy

| Record type | TTL | Reason |
|---|---|---|
| API endpoint (Oracle VM IP) | 60 seconds | Fast cutover if migrating to Hetzner |
| Frontend (Cloudflare Pages) | Auto (CF managed) | Cloudflare updates automatically |
| Status page | 300 seconds | Rarely changes |
| CDN (R2) | 300 seconds | R2 URL rarely changes |
| Email (MX/TXT) | 3600 seconds | Email records are stable |

**Failover DNS change time:** With 60s TTL on the API record, switching from Oracle VM to Hetzner means the new IP propagates globally in under 1 minute (Cloudflare is authoritative and bypasses ISP caching).

---

## SSL/TLS Configuration

### Cloudflare SSL Mode: Full (Strict) — Required

```
Cloudflare → SSL/TLS → Overview → Full (Strict)

DO NOT use "Flexible" mode:
  - Flexible = Cloudflare → origin over plain HTTP = data exposed in transit
  - Full (Strict) = Cloudflare → origin over HTTPS with valid cert
  
Coolify provides Let's Encrypt certificates automatically for your domain.
The Oracle VM has a valid cert; Cloudflare verifies it in Strict mode.
```

### HSTS (HTTP Strict Transport Security)

```javascript
// Already set in backend/index.ts (Helmet.js):
hsts: { maxAge: 31536000, includeSubDomains: true }

// Also set in Cloudflare:
// SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS)
// Max Age: 12 months, Include subdomains: ON
```

### TLS Minimum Version

```
Cloudflare → SSL/TLS → Edge Certificates → Minimum TLS Version → TLS 1.2
TLS 1.0 and 1.1 are deprecated.
TLS 1.3 is enabled by default and used when the client supports it.
```

---

## Cloudflare Configuration

### Free Plan Settings (Enable Immediately)

```
Security:
  ✅ DDoS Protection — always on (L3/L4/L7 — cannot be disabled)
  ✅ Bot Fight Mode → ON
  ✅ Browser Integrity Check → ON
  ✅ Hotlink Protection → ON

Performance:
  ✅ Auto Minify → JavaScript, CSS, HTML
  ✅ Brotli compression → ON
  ✅ Early Hints → ON
  ✅ Rocket Loader → OFF (breaks Next.js hydration)

Caching:
  ✅ Cache Level → Standard
  ✅ Browser Cache TTL → 4 hours (static assets)

SSL:
  ✅ Mode → Full (Strict)
  ✅ Always HTTPS → ON
  ✅ HSTS → 12 months, Include subdomains
  ✅ Minimum TLS → 1.2
```

### Oracle VM IP Allowlist (Critical Security Step)

**Block all direct HTTP/HTTPS to the Oracle VM — only Cloudflare IPs allowed:**

```
Oracle Cloud → Networking → Virtual Cloud Networks → Security Lists → Ingress Rules

ALLOW TCP 443 from: (Cloudflare IPv4 ranges — get current from cloudflare.com/ips-v4)
ALLOW TCP 80  from: (Cloudflare IPv4 ranges)
ALLOW TCP 8000 from: <your home/office IP> only  (Coolify dashboard)
ALLOW TCP 22   from: <your home/office IP> only  (SSH)
DENY all other inbound on 443, 80

This ensures:
1. Attackers cannot bypass Cloudflare by hitting the Oracle IP directly
2. All traffic goes through Cloudflare's DDoS scrubbing and WAF
3. Your Oracle VM's real IP is never exposed in DNS or HTTP responses
```

### Cloudflare Pro ($20/month) — When to Upgrade

Upgrade when:
- Getting significant bot traffic (> 10% of requests)
- Need WAF managed ruleset (SQLi, XSS blocking at Cloudflare level)
- Need image optimization via Cloudflare Polish
- Need more detailed analytics

### Cloudflare WAF Rules (Pro plan — future)

```
Rule 1: Block SQL injection attempts
  Expression: http.request.uri contains "' OR" OR http.request.uri contains "UNION SELECT"
  Action: Block

Rule 2: Rate limit login endpoint (Cloudflare level)
  Expression: http.request.uri.path == "/api/auth/login" AND rate > 20/minute/ip
  Action: Challenge

Rule 3: Block empty User-Agent (bots)
  Expression: http.user_agent == ""
  Action: Block

Rule 4: Allow Stripe webhooks from Stripe IPs only
  Expression: http.request.uri.path == "/api/orders/webhook"
              AND NOT ip.src in {stripe_ip_ranges}
  Action: Block
```

---

## Load Balancing (Stage 2+)

### Single Instance (Now)

```
nodbusiness.app    → Cloudflare Pages (automatic edge — 335+ PoPs)
api.nodbusiness.app → Oracle VM (single Coolify container, Johannesburg)
```

### Multi-Instance (Stage 2: 50K+ users)

```
api.nodbusiness.app → Cloudflare Load Balancer ($5/month)
                        ├── Oracle VM Johannesburg (primary)
                        ├── Hetzner CAX21 Falkenstein (secondary)
                        └── Health check: GET /health every 30s

Requires Socket.IO Redis adapter (share WebSocket state across instances):
// backend/socket.ts — already commented pattern:
const { createAdapter } = require('@socket.io/redis-adapter');
io.adapter(createAdapter(pubClient, subClient));
// Uses Upstash Redis — no additional infrastructure needed
```

---

## DDoS Protection Levels

| Stage | Protection | Cost |
|---|---|---|
| Now | Cloudflare Free (L3/L4/L7 always-on + Oracle IP hidden) | $0 |
| Stage 2 | Cloudflare Pro (WAF, bot management, detailed analytics) | $20/month |
| Stage 3 | Cloudflare Business (custom WAF rules, DDoS SLA) | $200/month |
| Stage 4 | Cloudflare Enterprise | $5,000+/month |

**Current risk assessment:** Cloudflare's always-on DDoS at the free tier, combined with the Oracle VM IP being hidden behind Cloudflare's proxy, provides strong protection. The only vulnerability is a direct attack on the Oracle VM IP — mitigated by the Cloudflare IP allowlist security group rule.

---

## Network Security Rules

### Allowed Traffic (Current Stack)

```
Internet → Cloudflare:
  ✅ HTTPS (port 443) from anywhere
  ✅ HTTP (port 80) from anywhere — Cloudflare redirects to HTTPS

Cloudflare → Oracle VM (backend):
  ✅ HTTPS (port 443) — proxied, Oracle sees Cloudflare IP
  ✅ HTTP (port 80) — only if Cloudflare proxying; forced HTTPS by backend

Oracle VM → External:
  ✅ Supabase (PostgreSQL over TLS, ports 5432/6543)
  ✅ Upstash Redis (TLS, rediss://)
  ✅ Cloudflare R2 (HTTPS)
  ✅ Resend email API (HTTPS)
  ✅ Stripe API (HTTPS)
  ✅ Chapa API (HTTPS)
  ✅ Google OAuth (HTTPS)
  ✅ AI providers (HTTPS)
  ✅ Telegram Bot API (HTTPS)
```

### Blocked Traffic

```
❌ Direct HTTPS/HTTP to Oracle VM IP (blocked by security group — Cloudflare IPs only)
❌ Direct database access from internet (Supabase only accessible via TLS from backend)
❌ SSH from non-allowlisted IPs (Oracle security group)
❌ Coolify dashboard (port 8000) from non-allowlisted IPs
```

---

## Email Deliverability

### SPF / DKIM / DMARC (Required for email delivery)

```dns
# SPF — who can send email for nodbusiness.app
TXT @ v=spf1 include:_spf.resend.com ~all

# DKIM — cryptographic signature (get record from Resend dashboard → Domains)
TXT resend._domainkey CNAME {resend_dkim_record}

# DMARC — what to do with failed emails
TXT _dmarc v=DMARC1; p=quarantine; rua=mailto:dmarc@nodbusiness.app; pct=100
```

Without all three:
- Emails land in spam (bad for OTP, order confirmations)
- Gmail/Microsoft may reject emails entirely
- Deliverability < 50%

With all three configured:
- Deliverability > 98%
- Inbox placement on Gmail, Outlook, Yahoo

---

## API Rate Limiting (Application Level)

Currently: Express rate-limiter middleware backed by Upstash Redis in production.

```javascript
// backend/index.ts — already configured
// General: 500 req/15min/IP
// Auth: 20 req/15min/IP
// OTP: 5 req/15min/IP
```

**Redis-backed (production with REDIS_URL set):** rate limit state is shared across container restarts and future multi-instance setups.
**In-memory fallback (no REDIS_URL):** per-process only — resets on restart.
