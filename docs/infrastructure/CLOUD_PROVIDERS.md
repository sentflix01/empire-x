# Nodbusiness — Cloud Provider Decisions

> Why we chose each provider, alternatives considered, and when to switch.
> **Last updated:** September 2026
> **Stack:** Render (backend) · Vercel (frontend) · Supabase · Upstash Redis · Cloudflare R2 · Resend

---

## Current Provider Stack

| Layer | Provider | Why chosen | Switch when |
|---|---|---|---|
| Backend hosting | Render (free tier) | No card required, Git-deploy, Node.js native, deploy hooks | Cold starts become unacceptable → Render Starter $7/mo |
| Frontend hosting | Vercel | Built for Next.js, best DX, free Hobby plan, preview deploys on every PR | Revenue from real users → Vercel Pro $20/mo |
| Database | Supabase | Free tier, PostgreSQL 16, built-in Supavisor pooler, already in use | Storage > 400MB → Supabase Pro $25/mo |
| Cache / Queues | Upstash Redis | Serverless, free 500K cmd/month, TLS always-on, no card required | High command volume → PAYG $0.20/100K |
| File storage | Cloudflare R2 | Zero egress fees, 10 GB free, S3-compatible, already integrated | Almost never |
| Email | Resend | Simple API, 3K/month free, 100/day, reliable | Volume > 100/day → Brevo (300/day free) |
| Error tracking | Sentry | Industry standard, free tier | Almost never |
| Payments | Stripe + Chapa | Stripe = global; Chapa = ETB native Ethiopian market | Add more, not replace |

---

## Backend Hosting: Render

### Why Render (for development)
- **No credit card required** for signup — GitHub login only
- **Git-deploy** — push to main and Render auto-deploys
- **Deploy hooks** — can be triggered from GitHub Actions for synchronised migrations + deploy
- **Node.js detection** — auto-detects Node.js from `package.json`, no Dockerfile needed
- **Free tier** includes 750 hours/month (enough for one always-on service)

### The one limitation
Render free tier **spins down after 15 minutes of inactivity**. First request after sleep takes 30–60 seconds to wake up. This is acceptable for development and demos. For production launch, upgrade to Render Starter ($7/month) for always-on service.

### Alternatives

| Provider | Pros | Cons |
|---|---|---|
| **Railway** | Better DX, no sleep | 30-day trial then $1/mo free credit (too small for always-on) |
| **Fly.io** | Global edge | Card required even for free tier |
| **Koyeb** | Free instance, no sleep | Website/service instability issues |
| **Oracle + Coolify** | Free forever, powerful | Requires credit card for identity verification |

---

## Frontend Hosting: Vercel

### Why Vercel
- **Built by the Next.js team** — deepest integration, fastest builds
- **Free Hobby plan** — no card, no expiry
- **Preview deployments** on every PR — invaluable for review
- **Vercel CLI** — integrates cleanly into GitHub Actions pipeline

### The limitation
Vercel Hobby plan terms say "personal non-commercial use only." Nodbusiness has Stripe payments and subscriptions. This is technically a ToS concern for production. **Acceptable for development/demo phase.** Upgrade to Vercel Pro ($20/month) before real users and real revenue.

---

## Database: Supabase

### Why Supabase
- Already in use — 28+ migrations applied, schema stable
- PostgreSQL 16 with built-in Supavisor connection pooler (free)
- 7-day PITR on free tier
- Pause risk mitigated by `supabase-keepalive.yml` cron

---

## File Storage: Cloudflare R2

### Why R2
- **Zero egress fees** — the single most important advantage at scale
- S3-compatible — `@aws-sdk/client-s3` already integrated
- 10 GB free + 1M Class A operations free
- No card needed for signup

---

## Redis: Upstash

### Why Upstash
- **500K commands/month free** (updated March 2026)
- **No card required** for free tier
- TLS always-on (`rediss://`)
- Serverless — no VM or server needed

---

## Future Stack (when revenue allows)

When you have paying users:

| Upgrade | Cost | When |
|---|---|---|
| Render Starter (always-on) | $7/month | When cold starts hurt UX |
| Vercel Pro | $20/month | Before real users + payments go live |
| Supabase Pro | $25/month | When DB > 400MB |
| Upstash PAYG | $0.20/100K | When commands > 400K/month |

---

