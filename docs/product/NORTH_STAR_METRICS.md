# Halehame — North Star Metrics

> The single metric that best captures the value we deliver, and the metrics that predict it.
> **Last updated:** August 2026

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

These are the metrics that drive the North Star. Improving any of these improves the north star.

```
                    Weekly Transacting Pairs
                           /          \
              Seller Activity      Buyer Activity
               /        \           /        \
        New Sellers  Repeat      New Buyers  Repeat
        Onboarding   Sellers     Acquisition Buyers
              |                        |
        Showroom                 Discovery
        Completion               (Feed, Search,
                                  Explore, Nearby)
```

### Seller-side metrics

| Metric | Target (Month 6) | Why it matters |
|---|---|---|
| Seller onboarding completion rate | > 70% | Low = product/UX problem |
| Sellers with ≥ 1 product listed | > 80% of registered sellers | Incomplete listings = empty marketplace |
| Seller weekly active rate | > 40% | Inactive sellers = stale inventory |
| Avg products per seller | > 5 | Single-product sellers = low catalog |
| Order fulfillment rate | > 90% | Unfulfilled orders = buyer distrust |

### Buyer-side metrics

| Metric | Target (Month 6) | Why it matters |
|---|---|---|
| Marketplace visit → product view rate | > 60% | Low = poor discovery |
| Product view → cart add rate | > 15% | Low = pricing/quality issue |
| Cart add → order complete rate | > 40% | Low = checkout friction or payment failure |
| Buyer repeat purchase rate (30 days) | > 25% | High = product-market fit |
| COD vs digital payment split | < 50% COD | COD has high fraud + cancellation risk |

---

## Engagement Metrics

These measure health of the social features that drive discovery.

| Metric | Definition | Target |
|---|---|---|
| DAU/MAU | Daily/Monthly ratio (stickiness) | 30% at Month 6 |
| Posts per DAU per week | How often users create content | > 0.5 |
| Comments per post | Social engagement depth | > 2 |
| Messages sent per DAU | Chat engagement | > 5 |
| Feed scroll depth | How far users scroll | > 10 posts |
| Search → product click | Search relevance | > 40% |

---

## Revenue Metrics

| Metric | Definition | Target |
|---|---|---|
| GMV (Gross Merchandise Value) | Total value of all orders | ETB 200K/mo (Month 6) |
| Net Revenue | Commission + subscriptions - refunds | ETB 15K/mo (Month 6) |
| Take Rate | Net Revenue / GMV | ~7% |
| ARPU (Avg Revenue Per User) | Monthly revenue / MAU | ETB 3/mo (Month 6) |
| ARPPU (Avg Revenue Per Paying User) | Revenue / paying users | ETB 30/mo |
| LTV (Lifetime Value) | Avg revenue per user × avg retention | ETB 500+ |
| CAC (Customer Acquisition Cost) | Marketing spend / new users | < ETB 100 |
| LTV:CAC ratio | LTV / CAC | > 5:1 |

---

## Trust Metrics

Trust metrics predict long-term health better than engagement.

| Metric | Target | Why |
|---|---|---|
| Dispute rate | < 5% of orders | High disputes = product quality or seller issues |
| Refund rate | < 3% of revenue | High refunds = expectation mismatch |
| Review submission rate | > 30% of buyers | Low reviews = passive users |
| Average seller rating | > 4.2 stars | Platform quality signal |
| Repeat buyer rate (same seller) | > 15% | Trust between specific pairs |

---

## Health Metrics (Platform Safety)

| Metric | Target | Why |
|---|---|---|
| Content removal rate | < 0.5% of posts | High = spam problem |
| Account ban rate | < 0.1% of users/month | High = fraud/abuse problem |
| User report response time | < 48 hours | Trust and safety responsiveness |
| Uptime | > 99.5% | Business continuity |
| API p95 response time | < 500ms | Performance impacts conversion |

---

## Dashboard Structure

The admin panel should show these in this order:

### Today at a Glance
- New registrations today
- Transactions today (count + ETB value)
- Active users right now (socket connections)
- Open reports to review

### This Week
- North star: transacting pairs
- New sellers onboarded
- Revenue trend (7-day chart)
- Top-selling products

### This Month
- MAU trend
- GMV by day (area chart)
- DAU/MAU ratio
- Conversion funnel

---

## Leading vs Lagging Indicators

| Type | Metric | Why |
|---|---|---|
| **Lagging** | Monthly revenue | Historical, can't be changed today |
| **Lagging** | MAU | Result of past 30 days of decisions |
| **Leading** | New seller onboardings | Predicts future supply |
| **Leading** | Cart add rate | Predicts this week's revenue |
| **Leading** | D7 retention | Predicts next month's MAU |
| **Leading** | Seller listing completion rate | Predicts next month's GMV |

**Focus on leading indicators to predict problems before they appear in revenue.**
