# Halehame — Monetization Strategy

> How Halehame makes money — today, next year, and at scale.
> Reference market: Ethiopia (ETB). Global revenue model applies to all markets.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| GMV | Gross Merchandise Value |
| MRR | Monthly Recurring Revenue |
| ARR | Annual Recurring Revenue |
| ETB | Ethiopian Birr — reference market currency |
| USD | United States Dollar |
| API | Application Programming Interface |
| SaaS | Software as a Service |
| B2B | Business to Business |
| B2C | Business to Consumer |
| ARPU | Average Revenue Per User |
| LTV | Lifetime Value |
| CAC | Customer Acquisition Cost |

---

## Revenue Model Overview

Halehame uses a **multi-stream revenue model** — no single dependency.

```
Revenue Streams:
├── 1. Transaction Commission (live)
├── 2. Premium Business Subscriptions (planned)
├── 3. Promoted Posts / Ads (planned)
├── 4. Wallet Float Income (future)
├── 5. Featured Listings (planned)
├── 6. Creator Fund / Revenue Share (future)
└── 7. API / White-label (future)
```

---

## Stream 1: Transaction Commission (LIVE)

**What:** A percentage of every completed order goes to the platform.

**Current implementation:**
- `commission.js` route collects commission on order completion
- Commission is collected from **seller's wallet** automatically
- Rate is configurable via admin

**Industry benchmarks:**
| Platform | Rate |
|---|---|
| Amazon | 8–15% |
| Etsy | 6.5% |
| Jumia | 5–15% |
| Fiverr | 20% |
| Halehame (recommended) | 5–8% (start low to acquire sellers) |

**Projection:**
- 1,000 orders/month × ETB 500 avg order × 6% = **ETB 30,000/month**
- 10,000 orders/month × ETB 500 avg × 6% = **ETB 300,000/month**

**Action:** Keep commission rate low (5%) during launch to attract sellers. Raise to 7–8% after market share is established.

---

## Stream 2: Premium Business Subscriptions (PLANNED)

**What:** Monthly/annual subscription for power seller features.

**Tier structure:**

| Tier | Price (ETB/month) | Features |
|---|---|---|
| **Free** | 0 | 10 products, 1 showroom, basic analytics |
| **Pro** | 299 | Unlimited products, 5 showrooms, advanced analytics, verified badge, custom domain |
| **Enterprise** | 999 | Unlimited everything, dedicated support, API access, white-label showroom |

**Projection:**
- 500 Pro subscribers × ETB 299 = **ETB 149,500/month**
- 100 Enterprise × ETB 999 = **ETB 99,900/month**
- Combined: **ETB 249,400/month** recurring

**Implementation:** Stripe Subscriptions (`subscription_tier` field on businesses).

---

## Stream 3: Promoted Posts & Ads (PLANNED)

**What:** Sellers pay to boost their post or product into the feed.

**Formats:**
1. **Promoted Post** — appears in feed between organic posts (labeled "Sponsored")
2. **Featured Product** — appears at top of Marketplace search results
3. **Sponsored Showroom** — appears on the Showrooms listing page

**Pricing models:**
- **CPM** (Cost per 1,000 impressions): ETB 50–100/CPM
- **CPC** (Cost per click): ETB 3–8/click
- **Daily budget cap**: minimum ETB 50/day

**Projection:**
- 200 active campaigns × ETB 100/day average = **ETB 6,000/day = ETB 180,000/month**

**Implementation requirements:**
- `is_promoted`, `promotion_budget`, `promotion_expires_at` fields on posts
- Admin campaign approval workflow
- Feed injection: 1 promoted post per 10 organic
- Campaign performance dashboard for advertisers

---

## Stream 4: Wallet Float Income (FUTURE)

**What:** Interest earned on the combined balance held in user wallets.

**How it works:**
- ETB held in the platform wallet pool is invested in short-term NBE-approved instruments
- Return: ~8–12% annual (Ethiopian t-bill rates)
- Users earn no interest — the platform earns it on the float

**Requirements:** NBE payment institution license, legal counsel, fiduciary controls.

**Projection (at scale):**
- ETB 50 million in combined wallet balances × 10% annual = **ETB 5 million/year**

---

## Stream 5: Featured Listings (PLANNED)

**What:** Sellers pay a flat fee to have their products featured in a "Featured" section.

**Pricing:**
- ETB 99 for 7 days featured placement
- ETB 199 for 30 days featured placement

**Projection:**
- 300 featured listings/month × ETB 149 avg = **ETB 44,700/month**

---

## Stream 6: Creator Fund / Revenue Share (FUTURE)

**What:** High-engagement creators share in platform ad revenue.

**Model:** Platform shares 30–50% of ad revenue generated on a creator's content with that creator.

**Why:** Attracts premium content creators. LinkedIn and YouTube use this model.

**Requirements:** Creator analytics, revenue attribution, minimum threshold (e.g., 10K followers + 100K views/month).

---

## Stream 7: API & White-label (FUTURE)

**What:** Charge companies for API access to the Halehame marketplace, payments, or social graph.

**Use cases:**
- Banks offering SMB storefronts powered by Halehame
- Telecom bundles (Ethio Telecom offers Halehame Pro to subscribers)
- Government e-procurement portals built on Halehame infrastructure

**Pricing:** ETB 5,000–50,000/month API access fee depending on usage tier.

---

## Revenue Projection Summary

| Stream | Today | 6 months | 1 year |
|---|---|---|---|
| Commission | ETB 0 (dev) | ETB 30K/mo | ETB 150K/mo |
| Subscriptions | ETB 0 | ETB 50K/mo | ETB 250K/mo |
| Ads | ETB 0 | ETB 0 | ETB 100K/mo |
| Featured listings | ETB 0 | ETB 20K/mo | ETB 45K/mo |
| **Total** | **ETB 0** | **~ETB 100K/mo** | **~ETB 545K/mo** |

---

## Unit Economics

**Cost to acquire a user (CAC):**
- Target: ETB 50–100 via social media + referral program
- Our referral system already awards 50 points to referrers + 20 points to new users

**Lifetime Value (LTV) target:**
- Average seller: ETB 5,000/year in commission + potential subscription
- LTV/CAC ratio target: 10:1

**Gross margin:**
- Commission: ~95% (payment processing fees ~5%)
- Subscriptions: ~85% (Stripe fees ~15%)
- Ads: ~90%

---

## Payment Processing Costs

| Provider | Fee | Used for |
|---|---|---|
| Stripe | 2.9% + $0.30 per transaction | International cards, wallets |
| Chapa | 1.5–2% | Ethiopian banks, Telebirr |
| Our commission on ETB 500 order: | ETB 30 (6%) minus ~ETB 8 fees = **ETB 22 net** | |

---

## Anti-Revenue-Leakage Rules

1. **Never allow buyers and sellers to trade off-platform** — enforce through platform terms
2. **Commission is collected at order completion, not payment** — can't be bypassed by COD
3. **Stripe webhook idempotency** — duplicate events never double-collect commission
4. **All prices stored in ETB** — no currency confusion in commission calculation
