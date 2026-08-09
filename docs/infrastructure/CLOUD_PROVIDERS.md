# Empire X — Cloud Provider Decisions

> Why we chose each provider, alternatives considered, and when to switch.
> **Last updated:** August 2026

---

## Current Provider Stack

| Layer | Provider | Why chosen | Switch when |
|---|---|---|---|
| Backend hosting | Railway | Developer-friendly, Git-deploy, affordable | Cost > $1,000/month |
| Frontend hosting | Vercel | Best Next.js platform (same company) | Almost never |
| Database | Neon | Serverless PostgreSQL, free tier, branching | Volume pricing better elsewhere |
| Cache | Upstash Redis | Serverless, free tier, low latency | High command volume |
| File storage | Cloudflare R2 | 0 egress fees, fast globally | Almost never |
| Email | Resend | Simple API, free tier, reliable | Price at scale |
| Error tracking | Sentry | Industry standard, free tier | Almost never |
| DNS/CDN/SSL | Cloudflare | Free, fast, DDoS protection | Almost never |
| Payments | Stripe + Chapa | Stripe = global; Chapa = ETB native | Add more, not replace |

---

## Backend Hosting: Railway vs Alternatives

### Why Railway
- One-command deploy from GitHub
- Automatic SSL on all services
- Built-in secrets management
- PostgreSQL, Redis, MySQL available as plugins
- Railway CLI for local → production parity
- Generous free tier ($5 monthly credit)
- Railway is growing fast (Series A funded)

### Alternatives Considered

| Provider | Pros | Cons | Cost (comparable) |
|---|---|---|---|
| **Render** | Similar to Railway, good free tier | Slower cold starts | $7–25/month |
| **Fly.io** | Global edge deployment, fast | More complex config, Dockerfile required | $10–30/month |
| **Heroku** | Mature, well-documented | Expensive, removed free tier in 2022 | $50–100/month |
| **AWS Elastic Beanstalk** | AWS ecosystem, powerful | Complex setup, higher minimum cost | $30–100/month |
| **Google Cloud Run** | Serverless containers, great scaling | Google billing complexity | Pay-per-use |
| **DigitalOcean App Platform** | Simple, affordable | Less mature than Railway | $12–50/month |
| **Hetzner** | Very cheap, good performance | German data centers (latency for Ethiopia) | $5–15/month |

### When to switch from Railway

Switch to **AWS ECS/EKS** when:
- Monthly Railway bill exceeds $1,000 (AWS will be ~40% cheaper at that scale)
- Need more control over networking (VPC, security groups)
- Compliance requires data residency in specific regions
- Need GPU instances (ML workloads)

Switch to **Fly.io** when:
- Need deployment closer to East Africa (Fly has Johannesburg PoP)
- Need ultra-low latency for Ethiopian users

---

## Frontend: Vercel vs Alternatives

### Why Vercel (Almost Permanent Decision)
- Built Next.js — deepest integration, fastest builds
- Global Edge Network with 35+ PoPs
- Image optimization built-in
- Free SSL, custom domains
- Preview deployments on every PR (invaluable for code review)
- Vercel Analytics for Core Web Vitals

### Alternatives

| Provider | Pros | Cons |
|---|---|---|
| **Netlify** | Good free tier, similar to Vercel | Slower builds, less Next.js optimization |
| **Cloudflare Pages** | Free, global, fast | Less mature Next.js support |
| **AWS Amplify** | AWS ecosystem | Complex, expensive |
| **Self-hosted (nginx)** | Full control, cheapest | Requires DevOps expertise, no edge network |

**Decision:** Stay on Vercel. The Next.js integration is worth the price.

---

## Database: Neon vs Alternatives

### Why Neon
- Serverless PostgreSQL (scales to zero when idle = free dev environments)
- Database branching (create a branch for staging, PRs, testing)
- Continuous WAL archiving (point-in-time recovery)
- Built-in connection pooling (PgBouncer)
- Compatible with all PostgreSQL tools and ORMs
- Free tier is genuinely useful (0.5 CU, 3GB)
- Acquired by Cloudflare — deep integration likely

### Alternatives

| Provider | Pros | Cons | Cost |
|---|---|---|---|
| **Supabase** | PostgreSQL + storage + auth | Auth we don't need, more expensive | $25–100/month |
| **PlanetScale** | MySQL, great branching | MySQL not PostgreSQL, deprecated free tier | $39/month |
| **CockroachDB** | Distributed, globally consistent | More complex, expensive | $0–500/month |
| **AWS RDS** | Full-featured, many instance sizes | No free tier, complex setup | $30–200/month |
| **AWS Aurora Serverless** | Auto-scaling, PostgreSQL-compatible | Higher latency, complex | Pay-per-use |
| **DigitalOcean Managed DB** | Simple, affordable | Less features than Neon | $15/month |

### When to switch from Neon

- **To AWS RDS:** When needing > 1TB storage, compliance requirements, or cost optimization at scale
- **To CockroachDB:** When needing multi-region write availability (East Africa + Europe simultaneously)
- **Stay on Neon:** For the foreseeable future — excellent product improving rapidly

---

## File Storage: Cloudflare R2 vs Alternatives

### Why Cloudflare R2
- **Zero egress fees** — the single most important advantage
- S3-compatible API (drop-in replacement)
- Already integrated via `@aws-sdk/client-s3`
- 10 GB free + 1M Class A operations free
- Cloudflare's global network = fast downloads worldwide
- No bandwidth charges between R2 and Cloudflare Workers

### Cost Comparison (at 100GB stored, 1M downloads/month)

| Provider | Storage | Egress | Total/month |
|---|---|---|---|
| **Cloudflare R2** | $1.50 | **$0** | **$1.50** |
| AWS S3 | $2.30 | $9.00 | $11.30 |
| Google Cloud Storage | $2.00 | $8.50 | $10.50 |
| Backblaze B2 | $1.00 | $1.00 | $2.00 |
| DigitalOcean Spaces | $5.00 (included) | $5.00 (included) | $5.00 |
| Supabase Storage | $0.021/GB | $0.09/GB | $12+ |

**R2 wins on cost at every scale.** The only reason to switch: if Cloudflare has an outage that affects your storage AND your CDN simultaneously (unlikely).

---

## Email: Resend vs Alternatives

### Why Resend
- Clean API (POST body → email delivered)
- React Email integration (build emails with React components)
- 3,000 free emails/month (generous)
- 98%+ deliverability rate
- Built-in analytics (opens, clicks, bounces)
- Good documentation

### Alternatives

| Provider | Free tier | 50K emails/month | Notes |
|---|---|---|---|
| **Resend** | 3K/month | $89 | Best DX, modern |
| **SendGrid** | 100/day | $89.95 | Reliable but complex |
| **Postmark** | 100/month | $74 | Best deliverability |
| **Mailgun** | 1K/month (3 months) | $35–80 | Good, but complex |
| **AWS SES** | 62K/month (from EC2) | $5 | Cheapest at scale, complex setup |
| **Brevo (Sendinblue)** | 300/day | $65 | Good EU deliverability |

**Switch to AWS SES** when email volume > 200K/month (dramatically cheaper).
**Switch to Postmark** if email deliverability becomes critical issue.

---

## CDN/DNS: Cloudflare vs Alternatives

### Why Cloudflare (Almost Permanent)
- Free tier includes: DDoS protection, SSL, DNS, CDN, analytics
- Cloudflare Tunnel (expose local dev to internet for testing)
- R2 storage (no egress when accessed via Cloudflare)
- Workers (edge computing for future use)
- Fastest DNS resolver on Earth (1.1.1.1)
- 20% of the internet runs through Cloudflare

### Alternatives
- **AWS CloudFront:** More expensive, complex. Use when already on AWS.
- **Fastly:** Enterprise-grade, expensive.
- **BunnyCDN:** Cheapest CDN, good for small sites.
- **Azure CDN:** Use when on Azure.

**Decision:** Cloudflare is the right choice until AWS migration (if it ever happens).

---

## Africa-Specific Infrastructure Considerations

### Latency to Ethiopia

| Provider | Region | Latency to Addis Ababa |
|---|---|---|
| Railway (US-West) | Dallas, TX | ~250–350ms |
| Railway (EU-West) | Amsterdam | ~180–250ms |
| Fly.io (Johannesburg) | South Africa | ~80–120ms |
| AWS (eu-west-1) | Ireland | ~200–280ms |
| AWS (af-south-1) | Cape Town | ~60–100ms |
| AWS (Middle East) | UAE | ~80–130ms |

**Optimal regions for Ethiopian users:**
1. **AWS af-south-1 (Cape Town)** — lowest latency
2. **Fly.io Johannesburg** — similar latency, easier to use
3. **AWS me-south-1 (Bahrain)** — good for diaspora in Middle East

**Current issue:** Railway US-West means ~300ms latency for Ethiopian users.
**Plan:** Add Railway EU instance (Amsterdam) at Stage 2 → adds Kenya/Uganda later.

### When AWS Africa opens Nairobi region
AWS has announced an East Africa region (Nairobi). When live, deploy there:
- Database: Neon or RDS in Nairobi region
- Backend: ECS in Nairobi
- Result: Sub-50ms latency for Ethiopian users
