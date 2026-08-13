# Halehame — Networking, Domains & Security

> DNS, SSL, load balancing, DDoS protection, and domain strategy.
> **Last updated:** August 2026

---

## Domain Strategy

### Primary Domains (Register Now)

| Domain | Purpose | Register at |
|---|---|---|
| `halehame.vercel.app` | Main user-facing app | Cloudflare Registrar (~$12/year) |
| `api.halehame.app` | Backend API | Subdomain (free via Cloudflare DNS) |
| `status.halehame.app` | Status page | Subdomain → UptimeRobot/Statuspage.io |
| `cdn.halehame.app` | R2 CDN custom domain | Subdomain → Cloudflare R2 |

### Future Domains

| Domain | When | Purpose |
|---|---|---|
| `halehame.et` | Ethiopia-specific launch | Ethiopian ccTLD, trust signal |
| `halehame.co.ke` | Kenya launch | Kenya ccTLD |
| `halehame.co.tz` | Tanzania launch | Tanzania ccTLD |
| `business.halehame.app` | Business portal | White-label for enterprise |
| `api.v2.halehame.app` | API v2 | When versioning needed |

**Why `.app` domain:**
- HTTPS required by browser (.app is HSTS preloaded)
- International recognition
- Short and memorable
- Google-backed (trustworthy)

---

## DNS Architecture (Cloudflare)

```
halehame.vercel.app (Cloudflare DNS)
│
├── A/CNAME halehame.vercel.app → Vercel (frontend)
│         TTL: 1 minute (auto-updated by Vercel)
│         Proxy: ✅ (Cloudflare CDN + SSL)
│
├── CNAME api.halehame.app → halehame.railway.app
│         TTL: 1 minute
│         Proxy: ✅ (Cloudflare CDN + WAF)
│
├── CNAME status.halehame.app → stats.uptimerobot.com
│         TTL: 5 minutes
│         Proxy: ❌ (status page needs direct access)
│
├── CNAME cdn.halehame.app → pub-xxxx.r2.dev
│         TTL: 5 minutes
│         Proxy: ✅ (R2 + Cloudflare CDN)
│
├── TXT @ → v=spf1 include:_spf.resend.com ~all
│         (Email SPF record for Resend)
│
├── TXT resend._domainkey → {Resend DKIM key}
│         (Email DKIM for deliverability)
│
└── MX @ → {email provider MX records}
          (For contact@halehame.app mailbox)
```

### DNS TTL Strategy

| Record type | TTL | Reason |
|---|---|---|
| API endpoint | 60 seconds | Fast failover if Railway changes IP |
| Frontend | Auto (Vercel managed) | Vercel updates automatically |
| Status page | 300 seconds | Rarely changes |
| CDN | 300 seconds | R2 URL rarely changes |
| Email (MX/TXT) | 3600 seconds | Email records are stable |

---

## SSL/TLS Configuration

### All traffic is HTTPS (enforced automatically)

```
Cloudflare → Origin: Full (Strict)
  - Cloudflare generates certificate for visitors
  - Railway/Vercel generates certificate for Cloudflare → origin
  - Never: "Flexible" mode (passes plaintext to origin — insecure)
```

### HSTS (HTTP Strict Transport Security)

```
Already set in backend/index.js:
  hsts: { maxAge: 31536000, includeSubDomains: true }
  
This tells browsers: "Never connect to this domain over HTTP"
After 1 year, even direct HTTP URLs redirect to HTTPS automatically.
```

### TLS Minimum Version

```
Cloudflare SSL/TLS → Edge Certificates → Minimum TLS Version: TLS 1.2
TLS 1.0 and 1.1 are deprecated (broken by POODLE/BEAST attacks)
TLS 1.3: Fastest, most secure — enabled by default on Cloudflare
```

---

## Cloudflare Configuration

### Free Plan (Recommended for Stages 0–2)

Enable these immediately:
```
Security:
  ✅ DDoS Protection (always on, even free plan)
  ✅ Bot Fight Mode → ON
  ✅ Browser Integrity Check → ON
  ✅ Hotlink Protection → ON (prevents others embedding your images)

Performance:
  ✅ Auto Minify → JavaScript, CSS, HTML
  ✅ Brotli compression → ON
  ✅ Early Hints → ON (preloads resources)
  ✅ Rocket Loader → OFF (can break Next.js scripts)

Caching:
  ✅ Cache Level → Standard
  ✅ Browser Cache TTL → 4 hours (for static assets)
  
SSL:
  ✅ Always HTTPS → ON
  ✅ HSTS → 12 months, Include subdomains
  ✅ Minimum TLS → 1.2
```

### Cloudflare Pro ($20/month) — When to upgrade

Upgrade when:
- Need Web Application Firewall (WAF) — blocks SQLi, XSS, common attacks
- Getting bot traffic > 10% of requests
- Need image optimization via Cloudflare Polish
- Need Cloudflare Pages for the status page

### Cloudflare WAF Rules (Pro plan)

```
Rule 1: Block SQL injection attempts
  Expression: cf.threat_score > 10 AND (http.request.uri.query contains "' OR" OR http.request.uri.query contains "UNION SELECT")
  Action: Block

Rule 2: Rate limit login endpoint
  Expression: http.request.uri.path == "/api/auth/login" AND rate > 20/minute/ip
  Action: Challenge

Rule 3: Block known bad bots
  Expression: cf.client.bot
  Action: Challenge

Rule 4: Block requests without User-Agent
  Expression: http.user_agent == ""
  Action: Block

Rule 5: Allow Stripe webhooks from Stripe IPs
  Expression: http.request.uri.path == "/api/orders/webhook" AND not ip.src in {stripe_ip_ranges}
  Action: Block
```

---

## Load Balancing (Stage 2+)

### Single Instance (Now)

```
halehame.vercel.app → Vercel (edge)
api.halehame.app → Railway (single instance)
```

### Multi-Instance (Stage 2: 10K+ users)

```
api.halehame.app → Cloudflare Load Balancer ($5/month)
                        ├── Railway US-West (primary)
                        ├── Railway US-East (secondary)
                        └── Health check: GET /health every 30s
                        
Failover: If US-West fails, Cloudflare routes to US-East automatically
```

### Multi-Region (Stage 3: 100K+ users)

```
api.halehame.app → Cloudflare Load Balancer (Geographic routing)
                        ├── US-West → Africa users (lowest latency via Dallas)
                        ├── EU-West → European diaspora
                        └── Middle East → UAE/Saudi diaspora
                        
Note: This requires Railway instances in each region
      + Socket.IO Redis adapter to share WebSocket state
```

---

## DDoS Protection Levels

| Stage | Protection | Cost |
|---|---|---|
| Now | Cloudflare Free (L3/L4 DDoS always-on) | $0 |
| Stage 2 | Cloudflare Pro (L7 WAF, bot management) | $20/month |
| Stage 3 | Cloudflare Business (custom WAF rules, advanced analytics) | $200/month |
| Stage 4 | Cloudflare Enterprise (unlimited rules, DDoS SLA, 24/7 support) | $5,000+/month |

**Current risk assessment:**
- Competitors attacking: Low (we're small)
- Script kiddies: Low-Medium (Cloudflare free blocks most)
- Government-level attack: N/A at current scale

---

## Network Security Rules

### Allowed Traffic

```
Frontend (Vercel) → Backend (Railway):
  ✅ All API calls (CORS configured with FRONTEND_URL)
  ✅ WebSocket upgrade (Socket.IO)

External → Backend:
  ✅ HTTPS only (HTTP redirected by Cloudflare)
  ✅ Stripe webhook IPs → /api/orders/webhook
  ✅ Chapa webhook IPs → /api/orders/chapa/webhook

Backend → External:
  ✅ Neon database (PostgreSQL over SSL)
  ✅ Upstash Redis (Redis over TLS)
  ✅ Cloudflare R2 (HTTPS)
  ✅ Resend email API (HTTPS)
  ✅ Stripe API (HTTPS)
  ✅ Chapa API (HTTPS)
  ✅ Firebase/APNS (when mobile app built)
```

### Blocked Traffic

```
❌ Direct database access from internet (Neon only accessible via app)
❌ SSH access to Railway instances (not supported — use Railway CLI)
❌ HTTP (all traffic forces HTTPS)
❌ Non-standard ports (only 80/443 exposed via Cloudflare)
```

---

## Email Deliverability

### SPF / DKIM / DMARC (Required for email delivery)

```dns
# SPF — who can send email for halehame.vercel.app
TXT @ v=spf1 include:_spf.resend.com ~all

# DKIM — cryptographic signature (get from Resend dashboard)
TXT resend._domainkey CNAME {resend_dkim_record}

# DMARC — what to do with failed emails
TXT _dmarc v=DMARC1; p=quarantine; rua=mailto:dmarc@halehame.app; pct=100
```

Without SPF/DKIM/DMARC:
- Emails land in spam (bad for OTP, order confirmations)
- Google/Microsoft may reject emails entirely
- Deliverability < 50%

With all three configured:
- Deliverability > 98%
- Inbox placement on Gmail, Outlook, Yahoo

---

## IPv6 Support

Cloudflare proxies all traffic — users with IPv6 connect to Cloudflare over IPv6,
Cloudflare connects to Railway over IPv4. No IPv6 configuration needed on Railway.

---

## API Rate Limiting (Network Level)

Currently: Express rate-limiter middleware (application level)

```javascript
// backend/index.js — already configured
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, skip: () => isDev });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, skip: () => isDev });
```

**At Stage 2:** Add Cloudflare Rate Limiting ($5/month)
- Blocks at the network level (before request hits Railway)
- Better DDoS protection
- Rate limit by: IP, country, user agent

```
Rule: Rate limit /api/auth/* to 20 requests/minute/IP
Rule: Rate limit all /api/* to 500 requests/minute/IP
Rule: Block if request from known malicious IP (Cloudflare Threat Score > 25)
```
