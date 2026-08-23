# Nodbusiness — North Star Vision & Metrics

> Every feature, every technical decision, every product choice should align with this document.
> If a proposed feature does not fit here, it probably does not belong in Nodbusiness.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| GMV | Gross Merchandise Value — total value of all transactions on the platform |
| MAU | Monthly Active Users |
| DAU | Daily Active Users |
| ARPU | Average Revenue Per User |
| ARPPU | Average Revenue Per Paying User |
| LTV | Lifetime Value |
| CAC | Customer Acquisition Cost |
| COD | Cash on Delivery |
| i18n | Internationalization |
| SDK | Software Development Kit |
| API | Application Programming Interface |

---

## Why Nodbusiness Exists

Billions of people globally lack access to the digital tools that people in developed markets take for granted — tools to run a business, find work, buy and sell, connect with their community, and access financial services.

Nodbusiness exists to change that. We are building the global superapp: one platform where anyone, anywhere can participate in the digital economy.

---

## Who It Is For

**Primary users:**
- Entrepreneurs and small business owners who want to sell products and services online
- Individuals who want to find local products, services, and jobs
- Anyone who wants to connect with their community, share content, and communicate

**Secondary users:**
- Businesses that want a showroom — a full digital storefront in minutes
- Freelancers and service providers finding clients through the tasks marketplace
- Educators selling courses to a local or global audience
- Developers building integrations on the Nodbusiness platform

---

## The Problem We Solve

| Problem | Nodbusiness Solution |
|---------|-------------------|
| No easy way to sell products online | Marketplace with global payment support |
| No digital presence for small businesses | Showroom Studio — a mini website in minutes |
| Fragmented tools (WhatsApp + Instagram + separate payment apps) | One app for everything |
| No local payment integration | Stripe + Chapa + local payment gateways |
| Language barriers with global platforms | Multi-language from day one |
| Hard to find local services nearby | Map-based discovery |

---

## What Nodbusiness Will Never Be

These boundaries protect the core identity:

- **Not a general-purpose social media** — our feed exists to connect commerce with community, not to maximize engagement at the cost of wellbeing
- **Not a copycat** — we build for global users, not a reskin of Western products
- **Not a data broker** — we do not sell user data or build advertising profiles for third parties
- **Not infinitely horizontal** — every new category must serve the same core users, not chase trends

---

## Product Principles

1. **Global from day one** — every feature should work for anyone, anywhere
2. **Commerce and community together** — the feed, marketplace, and social layer reinforce each other
3. **Simple enough for first-time smartphone users** — low cognitive load, clear actions
4. **Fast on slow connections** — performance is a feature, not a bonus
5. **Trust is everything** — payments, reviews, moderation — users must feel safe transacting

---

## The Vision at Scale

```
2026 — Nodbusiness launches globally
        Core: social feed, marketplace, showrooms, tasks, messaging

2027 — 100,000 active users
        Add: events, jobs, courses, wallet, local delivery

2028 — 1,000,000 users
        Expand: Kenya, Nigeria, Ghana, India, Southeast Asia
        Add: API platform, developer integrations

2030 — Global superapp
        Platform: public APIs, SDKs, webhooks, developer portal
        Infrastructure: multi-region, 10M+ users
```

---

## The North Star Metric

> **"Weekly Transacting Pairs"**
> The number of unique buyer-seller pairs who complete at least one transaction per week.

### Why this metric

- A transaction requires both a healthy supply side (sellers with products) AND demand side (buyers willing to pay)
- It measures **real economic value created**, not just engagement
- It cannot be gamed by a single side (unlike "active users")
- It grows when both the marketplace AND the social/discovery features work

---

## Input Metrics (Levers)

```
                    Weekly Transacting Pairs
                           /          \
              Seller Activity      Buyer Activity
               /        \           /        \
        New Sellers  Repeat      New Buyers  Repeat
        Onboarding   Sellers     Acquisition Buyers
              |                        |
        Showroom                 Discovery
        Completion               (Feed, Search, Explore)
```

### Seller-side metrics

| Metric | Target (Month 6) | Why it matters |
|--------|-----------------|----------------|
| Seller onboarding completion rate | > 70% | Low = product/UX problem |
| Sellers with ≥ 1 product listed | > 80% of registered sellers | Incomplete listings = empty marketplace |
| Seller weekly active rate | > 40% | Inactive sellers = stale inventory |
| Avg products per seller | > 5 | Single-product sellers = low catalog |
| Order fulfillment rate | > 90% | Unfulfilled orders = buyer distrust |

### Buyer-side metrics

| Metric | Target (Month 6) | Why it matters |
|--------|-----------------|----------------|
| Marketplace visit → product view rate | > 60% | Low = poor discovery |
| Product view → cart add rate | > 15% | Low = pricing/quality issue |
| Cart add → order complete rate | > 40% | Low = checkout friction |
| Buyer repeat purchase rate (30 days) | > 25% | High = product-market fit |
| COD vs digital payment split | < 50% COD | COD has high fraud + cancellation risk |

---

## Engagement Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| DAU/MAU | Daily/Monthly ratio (stickiness) | 30% at Month 6 |
| Posts per DAU per week | How often users create content | > 0.5 |
| Comments per post | Social engagement depth | > 2 |
| Messages sent per DAU | Chat engagement | > 5 |
| Feed scroll depth | How far users scroll | > 10 posts |
| Search → product click | Search relevance | > 40% |

---

## Revenue Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| GMV | Total value of all orders | $50K/mo (Month 6) |
| MRR (Monthly Recurring Revenue) | Subscription revenue | $5K (Month 6) |
| Take Rate | Net Revenue / GMV | Current: 3% (flat commission, see `architecture/CURRENCY_AND_COMMISSION.md`) · Target: ~5% by 2027 via subscriptions + value-added services |
| ARPU | Monthly revenue / MAU | $2/mo (Month 6) |
| LTV | Avg revenue per user × avg retention | $200+ |
| CAC | Marketing spend / new users | < $10 |
| LTV:CAC ratio | LTV / CAC | > 10:1 |

---

## Trust Metrics

| Metric | Target | Why |
|--------|--------|-----|
| Dispute rate | < 5% of orders | High disputes = product quality or seller issues |
| Refund rate | < 3% of revenue | High refunds = expectation mismatch |
| Review submission rate | > 30% of buyers | Low reviews = passive users |
| Average seller rating | > 4.2 stars | Platform quality signal |
| Repeat buyer rate (same seller) | > 15% | Trust between specific pairs |

---

## Platform Health Metrics

| Metric | Target | Why |
|--------|--------|-----|
| Content removal rate | < 0.5% of posts | High = spam problem |
| Account ban rate | < 0.1% of users/month | High = fraud/abuse problem |
| Report response time | < 48 hours | Trust and safety responsiveness |
| Uptime | > 99.5% | Business continuity |
| API p95 response time | < 500ms | Performance impacts conversion |

---

## Leading vs Lagging Indicators

| Type | Metric | Why |
|------|--------|-----|
| **Lagging** | Monthly revenue | Historical, cannot be changed today |
| **Lagging** | MAU | Result of past 30 days of decisions |
| **Leading** | New seller onboardings | Predicts future supply |
| **Leading** | Cart add rate | Predicts this week's revenue |
| **Leading** | D7 retention | Predicts next month's MAU |
| **Leading** | Seller listing completion rate | Predicts next month's GMV |

**Focus on leading indicators to predict problems before they appear in revenue.**

---

## Success Definition

We know Nodbusiness is working when:
- A small business owner can set up a showroom, list products, and receive their first order in under 30 minutes
- A buyer can find a product, pay with their preferred payment method, and receive delivery — all in one app
- A freelancer finds a task, bids, gets hired, delivers, and gets paid without leaving the platform
- Monthly GMV grows 20%+ month-over-month in the first year

---

## The Mindset

> We are not building an app. We are building infrastructure for the global digital economy.

Every engineering decision, product feature, and operational process should be made with this in mind.
