# Halehame — Equity Structure & Cap Table

> **Classification:** STRICTLY CONFIDENTIAL
> **Purpose:** Documents all share ownership, equity grants, option pools,
> and the capitalization table (cap table) for Halehame Technologies.
> **Last Updated:** August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SAFE | Simple Agreement for Future Equity — pre-seed investment instrument that converts to equity later |
| ESOP | Employee Stock Ownership Plan — reserved share pool for employee equity grants |
| MFN | Most Favored Nation — SAFE clause giving investor the same terms as any future better deal |
| ROFR | Right of First Refusal — right to buy shares before they are offered to anyone else |
| SHA | Shareholders Agreement — legal contract governing all shareholder rights and obligations |
| SPA | Share Purchase Agreement — legal document for a direct equity investment transaction |
| FMV | Fair Market Value — price a willing buyer and seller would agree on in a free market |
| VC | Venture Capital — professional investment firm funding high-growth startups |
| LP | Limited Partner — investor in a VC fund who is not actively involved in operations |
| IPO | Initial Public Offering — when a private company first lists shares on a stock exchange |
| PLC | Private Limited Company — standard Ethiopian/UK business structure with limited liability |
| HNW | High Net Worth — individual or entity with significant investable assets |
| MoM | Month over Month — comparing a metric to the previous month |

---

## 1. What Is a Cap Table?

A capitalization table (cap table) is a spreadsheet showing exactly who owns
what percentage of the company. It is the single most important financial
document in a startup.

Every founder, investor, employee with options, and advisor with equity
appears on the cap table. When you raise money, the cap table changes.
When you grant employee options, the cap table changes.

Investors will inspect this document in detail before investing. It must be:
- Accurate at all times
- Consistent with your shareholders register
- Maintained in your Delaware Corp documents or Ethiopian PLC articles

---

## 2. Share Classes Explained

### Common Shares
- Held by founders and employees (via options)
- Last to receive money in a liquidation event
- Carry voting rights (1 share = 1 vote typically)
- You start with 100% common shares

### Preferred Shares
- Given to investors in exchange for their investment
- Have special rights over common shares:
  - **Liquidation preference** — investors get paid first if company is sold
  - **Anti-dilution protection** — protects against future down rounds
  - **Pro-rata rights** — right to invest in future rounds to maintain %
  - **Information rights** — right to receive financial reports
- Typically convert to common shares at IPO

### Option Pool (ESOP)
- Reserved shares for future employees and advisors
- Grants employees the right to buy shares at a fixed "strike price" in the future
- Vests over 4 years with 1-year cliff (standard)
- Example: Engineer joins, gets 1% options vesting over 4 years
  - After 1 year (cliff): 0.25% unlocks
  - Each subsequent month: 0.25/36 unlocks
  - After 4 years: full 1% vested

---

## 3. Halehame Starting Structure

### At Incorporation (Today)

```
Total authorized shares: 10,000,000
Issued and outstanding: 8,000,000 (reserve 2M for future issuances)

Share breakdown:
  Founder (you):        7,000,000 shares = 87.5% of issued
  Co-founder (if any):  1,000,000 shares = 12.5% of issued
  Option Pool reserved:         0 shares = 0% (create before seed round)

If solo founder:
  Founder:              8,000,000 shares = 100%
```

### Founder Vesting Schedule
Even as a founder, implement a 4-year vesting schedule on your own shares.
This protects investors (and you) if a co-founder leaves early.

```
Standard founder vesting:
  Total shares: 7,000,000
  Vesting period: 4 years
  Cliff: 12 months (1,750,000 shares vest after 1 year)
  Monthly after cliff: 145,833 shares/month for 36 months

Why this matters: Investors REQUIRE this. Without founder vesting,
an investor won't fund you — they fear a founder leaving with 100%
of the equity right after funding.
```

---

## 4. Cap Table After Each Round

### Current State (Pre-Investment)

| Shareholder | Shares | % Ownership | Share Class |
|-------------|--------|------------|-------------|
| Founder | 8,000,000 | 100% | Common |
| **Total** | **8,000,000** | **100%** | |

---

### After Option Pool Creation (Before Pre-Seed)

Create a 10% option pool before raising any money.
Why before? Investors require a pool, and creating it after dilutes THEM.
Creating it before dilutes only the founders.

```
New shares issued for pool: 889,000
(To create 10% post-creation: 8,000,000 / 0.90 - 8,000,000 = 889,000)
```

| Shareholder | Shares | % Ownership | Share Class |
|-------------|--------|------------|-------------|
| Founder | 8,000,000 | 90.0% | Common |
| Option Pool (ungranted) | 889,000 | 10.0% | Reserved |
| **Total** | **8,889,000** | **100%** | |

---

### After Pre-Seed Round ($100K at $1M pre-money)

```
Pre-money valuation: $1,000,000
Investment: $100,000
Post-money: $1,100,000
New shares to issue: 8,889,000 × ($100K/$1M) = 888,900 new shares
```

| Shareholder | Shares | % Ownership | Share Class |
|-------------|--------|------------|-------------|
| Founder | 8,000,000 | 80.9% | Common |
| Option Pool | 889,000 | 9.0% | Reserved |
| Pre-Seed Investors | 888,900 | 9.0% | Preferred A |
| Friends & Family | 111,100 | 1.1% | Preferred A |
| **Total** | **9,889,000** | **100%** | |

---

### After Seed Round ($1M at $4M pre-money)

```
Pre-money valuation: $4,000,000
Investment: $1,000,000
Post-money: $5,000,000
Equity sold: 20%
New shares: existing_shares / 0.80 × 0.20 = ~2,472,250 new preferred shares
(Also create new option pool top-up to maintain ~10%)
```

| Shareholder | Shares | % Ownership | Share Class |
|-------------|--------|------------|-------------|
| Founder | 8,000,000 | 60.5% | Common |
| Option Pool | 1,300,000 | 9.8% | Reserved |
| Pre-Seed Investors | 1,000,000 | 7.6% | Preferred A |
| Seed Investors | 2,900,000 | 22.1% | Preferred B |
| **Total** | **13,200,000** | **100%** | |

---

### After Series A ($4M at $12M pre-money)

```
Equity sold: 25%
Founder post-Series A: ~45–50%
```

| Shareholder | Shares | % Ownership | Share Class |
|-------------|--------|------------|-------------|
| Founder | 8,000,000 | 45.2% | Common |
| Employees (granted) | 800,000 | 4.5% | Common (via options) |
| Option Pool (remaining) | 600,000 | 3.4% | Reserved |
| Pre-Seed Investors | 1,000,000 | 5.7% | Preferred A |
| Seed Investors | 2,900,000 | 16.4% | Preferred B |
| Series A Investors | 4,400,000 | 24.9% | Preferred C |
| **Total** | **17,700,000** | **100%** | |

---

## 5. SAFE Notes — How They Affect the Cap Table

SAFE (Simple Agreement for Future Equity) is the most common pre-seed instrument.
It is NOT equity yet — it is a promise to convert to equity in the future.

```
How it works:
  1. Investor gives you $50,000 now
  2. No shares are issued yet
  3. When you raise your seed round (priced round), the SAFE converts
     to equity at a discount or valuation cap

SAFE terms to know:

  Valuation Cap ($1,000,000 cap):
  → The SAFE holder's shares are priced as if the company is worth $1M
    even if the actual seed valuation is $4M
  → They get MORE shares than seed investors for the same money
  → This rewards early risk-taking

  Discount Rate (20% discount):
  → SAFE converts at 20% below the seed round price
  → If seed price is $1/share, SAFE converts at $0.80/share
  → They get 25% more shares than seed investors

  MFN (Most Favored Nation):
  → If you offer better terms to a later SAFE investor, the MFN
    investor automatically gets those better terms too

Example SAFE conversion:
  SAFE: $50,000 with $1,000,000 cap
  Seed round: $4,000,000 pre-money, $0.40/share price
  SAFE price: $1,000,000 / total_shares = ~$0.11/share (using cap)
  SAFE shares: $50,000 / $0.11 = 454,545 shares
  (vs seed investor who gets: $50,000 / $0.40 = 125,000 shares)
  → SAFE investor gets 3.6× more shares for same amount — reward for early risk
```

---

## 6. Employee Stock Options (ESOP) — How to Grant

```
Standard option grant process:

1. Board approves the option pool (done at incorporation)
2. Hire an employee or advisor
3. Board resolves to grant X options at strike price Y
4. Strike price = Fair Market Value (FMV) at time of grant
   (For early-stage: typically $0.01–$0.10/share)
5. Options vest over 4 years (1-year cliff)
6. Employee signs option agreement

Example:
  Engineer joins, gets 100,000 options at $0.05 strike price
  After 4 years fully vested
  Company raises Series A — shares now worth $1.50/share
  Engineer's options value: 100,000 × ($1.50 - $0.05) = $145,000 profit
  
Key rule: Options are worthless if the company is not sold or goes public.
Be honest with employees about this.
```

---

## 7. Liquidation Preferences — Critical to Understand

When the company is acquired, who gets paid first?

```
Scenario: Company acquired for $3,000,000
(Less than the $4,000,000 seed round valuation — a "down exit")

With 1× non-participating liquidation preference (investor-friendly but fair):
  Seed investors (invested $1M): Get back $1,000,000 first (1× their money)
  Remaining: $3M - $1M = $2M splits among common shareholders pro-rata
  Founder (65% common): Gets $1,300,000
  Total to founder: $1,300,000

With 2× participating liquidation preference (very investor-friendly):
  Seed investors (invested $1M): Get back $2,000,000 first (2× their money)
  THEN also participate in remaining: 20% of $1M = $200,000
  Remaining: $3M - $2M = $1M splits among common shareholders
  Founder (65% common): Gets $650,000
  Total to founder: $650,000 (50% less)

→ NEVER accept participating preferred with >1× liquidation preference.
→ STANDARD is 1× non-participating. Push for this.
```

---

## 8. Cap Table Management Tools

Use these tools to maintain your cap table professionally:

| Tool | Cost | Best For |
|------|------|---------|
| Carta (carta.com) | $2,400/year | Industry standard. Investors expect this. |
| Pulley (pulley.com) | $500/year | Cheaper Carta alternative. |
| Capbase (capbase.com) | $1,200/year | Bundles legal + cap table |
| Google Sheets | Free | Acceptable for pre-seed only |
| AngelList | Free | Pre-seed, integrated with fundraising |

**Recommendation:** Use Google Sheets now. Migrate to Carta before seed round.

---

*This document is confidential and must be updated after every equity event.*
*Share only with authorized investors after NDA is signed.*
