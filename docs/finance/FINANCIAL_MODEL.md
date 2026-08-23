# Nodbusiness — Financial Model & P&L Framework

> **The financial operating model for Nodbusiness Technologies.**
> Every financial decision is grounded in this model.
> Updated monthly with actuals vs. projections.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| P&L | Profit and Loss — income statement showing revenue minus costs |
| MRR | Monthly Recurring Revenue — total subscription revenue in one month |
| ARR | Annual Recurring Revenue — MRR × 12 |
| COGS | Cost of Goods Sold — direct costs of delivering the service |
| OPEX | Operating Expenses — ongoing costs to run the business |
| CAPEX | Capital Expenditure — one-time investment in long-term assets |
| EBITDA | Earnings Before Interest, Taxes, Depreciation, and Amortization |
| CAC | Customer Acquisition Cost |
| LTV | Lifetime Value — total revenue from one customer over their lifetime |
| GMV | Gross Merchandise Value — total value of transactions on the platform |
| ETB | Ethiopian Birr |
| USD | United States Dollar |
| MoM | Month over Month |
| YoY | Year over Year |
| ROI | Return on Investment |

---

## 1. Revenue Model

### Revenue Streams (all active by Phase 2)

```
Stream 1: Subscriptions (primary)
  Free tier:      $0/month    (viral growth engine — no revenue)
  Starter:       $19/month   (remove branding, unlimited products)
  Pro:           $49/month   (3 showrooms, full analytics)
  Business:      $99/month   (unlimited showrooms, API access)

Stream 2: Template Marketplace Commission (Phase 2+)
  Nodbusiness takes 30% of all template subscription revenue
  Developer takes 70%
  Revenue = total template subscriptions × 30%

Stream 3: Featured Placement (Phase 2+)
  Category featured (monthly): $29
  City-wide featured (monthly): $99
  Feed promoted post (per post): $9–$49

Stream 4: Transaction Fees (LIVE — see architecture/CURRENCY_AND_COMMISSION.md)
  Marketplace orders: 3% commission per completed order (COMMISSION_RATE env, default 0.03)
  Task completions: no platform fee yet — same rate planned when gig payments route through the wallet
```

---

## 2. P&L Statement Template (Monthly)

Use this structure every month to track actuals vs. budget:

```
NODBUSINESS TECHNOLOGIES — MONTHLY P&L
Month: [Month Year]
Currency: USD (convert ETB at current rate)

REVENUE
  Subscription Revenue (Starter × count)     $______
  Subscription Revenue (Pro × count)          $______
  Subscription Revenue (Business × count)     $______
  Template Marketplace Commission              $______
  Featured Placement Revenue                  $______
  Transaction Fees                            $______
  ─────────────────────────────────────────────────────
  TOTAL REVENUE                               $______

COST OF GOODS SOLD (COGS)
  Cloud Infrastructure (Railway + Neon + Vercel)  $______
  Payment Processing Fees (Stripe + Chapa)        $______
  AI API Costs (OpenAI / Gemini)                  $______
  Email Service (Resend)                          $______
  Error Monitoring (Sentry)                       $______
  Other direct costs                              $______
  ─────────────────────────────────────────────────────
  TOTAL COGS                                  $______
  GROSS PROFIT                                $______
  GROSS MARGIN %                              _____%

OPERATING EXPENSES (OPEX)
  Salaries & Contractor Fees                  $______
  Marketing & Advertising                     $______
  Legal & Compliance                          $______
  Accounting & Finance                        $______
  Tools & Subscriptions (non-COGS)            $______
  Travel & Team Meetings                      $______
  Office / Coworking                          $______
  Miscellaneous                               $______
  ─────────────────────────────────────────────────────
  TOTAL OPEX                                  $______

  EBITDA                                      $______
  EBITDA MARGIN %                             _____%

  Taxes                                       $______

  NET INCOME / (LOSS)                         $______
```

---

## 3. Key Financial Metrics Tracker

Update these at the start of every month:

| Metric | Formula | Last Month | This Month | Target |
|--------|---------|-----------|-----------|--------|
| MRR | Sum of all active subscriptions | $0 | $0 | $25,000 (Phase 2 end) |
| ARR | MRR × 12 | $0 | $0 | $300,000 |
| MRR Growth % | (This MRR - Last MRR) / Last MRR | — | — | 20%+ |
| Gross Margin % | (Revenue - COGS) / Revenue | — | — | 80%+ |
| Net Burn | OPEX - Revenue (when negative, you're burning) | — | — | < $15,000 |
| Runway | Cash / Monthly Net Burn | — | — | 12+ months |
| CAC | Total marketing spend / New paying customers | — | — | < $30 |
| LTV | ARPU × Average months retained | — | — | $696+ |
| LTV:CAC Ratio | LTV / CAC | — | — | > 10:1 |
| Payback Period | CAC / Monthly ARPU | — | — | < 3 months |
| Paying Customers | Count of active paid subscriptions | 0 | 0 | 500 |
| ARPU | MRR / Paying Customers | — | — | $35+ |
| Churn Rate | Lost customers / Total customers | — | — | < 3% |
| Cash on Hand | Bank account balance | — | — | 12+ months runway |

---

## 4. Budget by Department (Monthly, Post-Seed)

| Department | Monthly Budget (USD) | % of Total |
|-----------|---------------------|-----------|
| Engineering (salaries + contractors) | $15,000 | 47% |
| Marketing & Growth | $4,000 | 12.5% |
| Customer Support | $3,000 | 9.4% |
| Operations & Legal | $2,500 | 7.8% |
| Infrastructure (COGS) | $600 | 1.9% |
| Product & Design | $3,500 | 10.9% |
| CEO / Admin | $2,000 | 6.3% |
| Buffer | $1,400 | 4.4% |
| **Total** | **$32,000** | **100%** |

---

## 5. Break-Even Analysis

```
Monthly fixed costs (post-seed, 10-person team): ~$32,000
Required MRR to break even: $32,000 / 0.82 gross margin = ~$39,000 MRR
Required paying businesses: $39,000 / $35 ARPU = ~1,115 paying businesses

Timeline to break-even (base case):
  Month 18: $25,000 MRR → Series A trigger (not yet break-even)
  Month 24: $70,500 MRR → Approaching break-even
  Month 30: $120,000 MRR → Cash-flow positive

With Series A ($4M raised, larger team):
  Monthly costs: ~$120,000–$180,000
  Break-even MRR: ~$150,000–$220,000
  Expected timing: Month 36–42
```

---

## 6. Financial Controls

### Spending Authority
```
< $500:    Any team member can approve (expense report required)
$500–$2,000: Direct manager approval
$2,000–$10,000: CEO approval
$10,000+:  CEO + Board approval (or investor approval per SHA)
```

### Financial Reporting Calendar
```
Monthly: P&L statement prepared by 10th of following month
Quarterly: Board report (P&L + metrics + projections update)
Annually: Audited financial statements (required for Series A+)
```

### Bank Account Rules
```
→ All revenue deposited to Nodbusiness Technologies PLC business account
→ No personal transactions through company account — ever
→ All payments tracked in accounting software (QuickBooks or Xero)
→ Two-signature requirement for transfers > $5,000
→ Monthly bank reconciliation required
```

---

*Financial model maintained by CEO (Phase 1) or CFO (Phase 2+).*
*Updated monthly, reviewed quarterly with board.*
