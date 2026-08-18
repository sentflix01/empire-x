# Halehame — SAFE Agreement Guide

> **Classification:** Confidential
> **Purpose:** Understand SAFE notes before signing any with investors.
> SAFE = Simple Agreement for Future Equity — the most common pre-seed instrument.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SAFE | Simple Agreement for Future Equity — pre-seed investment instrument that converts to equity at a future priced round |
| MFN | Most Favored Nation — clause giving a SAFE investor the same terms as any future better deal |
| YC | Y Combinator — world's most prestigious startup accelerator, creators of the SAFE instrument |
| VC | Venture Capital — professional investment firm funding high-growth startups |
| NDA | Non-Disclosure Agreement — confidentiality contract |
| ROFR | Right of First Refusal — right to purchase shares before they are offered to others |

---

## What Is a SAFE?

A SAFE is an agreement where an investor gives you money TODAY in exchange
for the right to receive equity in the FUTURE (when you raise a priced round).

No interest. No maturity date. No debt. Not a loan.
Just: "I give you $50,000 now. When you raise a seed round, I get shares."

**Created by Y Combinator in 2013. Now the standard pre-seed instrument worldwide.**

---

## Why Use SAFE Instead of Equity?

```
Problem with giving equity directly at pre-seed:
  → You need to agree on a company valuation
  → At pre-seed, you have no revenue → hard to justify any valuation
  → Too early to price the company fairly

SAFE solves this:
  → Investor gives money now
  → Valuation is determined later (when you raise your seed round)
  → SAFE converts to equity at that point — at a discount or cap
  → Simple, fast, cheap to execute (2–3 page document, no negotiation needed)
```

---

## The 4 Types of SAFE (Know All of These)

### Type 1 — SAFE with Valuation Cap (Most Common)

```
Investor gives: $50,000
Cap: $2,000,000 (the maximum valuation at which the SAFE converts)

How it converts:
  If seed round values company at $4,000,000:
    SAFE converts as if company is worth only $2,000,000
    → SAFE investor gets 2× more shares than seed investors for the same money
    → This rewards the early risk the SAFE investor took

Formula:
  SAFE shares = Investment Amount / (Cap / Total Shares at conversion)
  Example:
    $50,000 / ($2,000,000 / 10,000,000 shares) = 250,000 shares
    vs seed investor: $50,000 / ($4,000,000 / 10,000,000) = 125,000 shares
    SAFE investor gets 2× more shares → fair reward for early risk
```

**Recommended for Halehame pre-seed.**

---

### Type 2 — SAFE with Discount (Less Common)

```
Investor gives: $50,000
Discount: 20%

How it converts:
  At seed round, SAFE price = seed price × (1 - 20%) = 80% of seed price
  If seed price is $0.50/share, SAFE converts at $0.40/share
  SAFE shares: $50,000 / $0.40 = 125,000 shares
  vs seed investor: $50,000 / $0.50 = 100,000 shares
  SAFE investor gets 25% more shares
```

---

### Type 3 — SAFE with Cap + Discount (Best for investor, risky for founder)

```
Investor gets BOTH the cap benefit AND the discount.
At conversion, they choose whichever gives them MORE shares.
→ Founders: try to avoid this. Use cap only.
```

---

### Type 4 — MFN SAFE (Most Favored Nation)

```
No cap. No discount.
BUT: If you give better terms to any future SAFE investor,
the MFN holder automatically gets those same better terms.

Use case: Very early investors who believe in you but can't agree on terms.
Risk: Creates automatic obligations to future investors.
```

---

## Standard SAFE Terms to Negotiate

### Valuation Cap — Set It Right

```
Too low cap: You give away too much equity to early investors
Too high cap: SAFE investors feel they're getting no discount → won't invest

How to set the cap:
  → Pre-seed cap should be ~50% of expected seed valuation
  → If you expect to raise seed at $4M pre-money:
    → Set SAFE cap at $1.5M – $2M
  
Halehame recommendation:
  → Raise pre-seed at $1M – $2M cap
  → This is fair given the platform is built but has no revenue
```

### Pro-Rata Rights

```
Definition: The right for SAFE investors to maintain their ownership %
in future rounds by investing again.

Example: Angel invests in your SAFE for 5%.
Pro-rata right means: In the seed round, they have the right to invest
enough to keep their 5% (not get diluted down to 3%).

→ GIVE THIS to significant angels ($25,000+)
→ It builds loyalty and signals you value them
→ Doesn't cost you anything unless they exercise it
```

### Information Rights

```
Definition: Investors receive monthly or quarterly financial updates.
Standard: Quarterly financial reports to SAFE investors.
→ You should do monthly investor updates anyway (see INVESTOR_UPDATE_TEMPLATE.md)
```

---

## SAFE Conversion Example — Step by Step

```
Scenario:
  You raise $150,000 via SAFE notes before seed:
    → Angel A: $75,000 at $1.5M cap
    → Angel B: $50,000 at $1.5M cap
    → Friend: $25,000 at $2M cap (different cap)

  12 months later, you raise seed round:
    → Seed round: $1,000,000 at $4,000,000 pre-money
    → Seed price per share: $4,000,000 / 10,000,000 shares = $0.40/share

  Conversion calculations:
    → Angel A conversion price: $1,500,000 / 10,000,000 = $0.15/share
       Angel A shares: $75,000 / $0.15 = 500,000 shares = 4.76% pre-money
    
    → Angel B conversion price: $0.15/share  
       Angel B shares: $50,000 / $0.15 = 333,333 shares = 3.17%
    
    → Friend conversion price: $2,000,000 / 10,000,000 = $0.20/share
       Friend shares: $25,000 / $0.20 = 125,000 shares = 1.19%
    
    → Seed investors: $1,000,000 / $0.40 = 2,500,000 shares = 23.8%

  Post-seed cap table:
    Founder: 10,000,000 / (10M + 500K + 333K + 125K + 2,500K new) = 73.3%
    → Note: This doesn't include option pool dilution
```

---

## SAFE Red Flags (What to Refuse)

```
❌ SAFE with no cap and no discount (investor gets free ride with no benefit for early risk)
❌ SAFE converting into debt if no priced round within X months (creates liability)
❌ SAFE with liquidation preference (SAFEs should NOT have preferences)
❌ Board seat rights before conversion (SAFEs do not grant governance rights)
❌ Veto rights over future fundraising (investors should not be able to block future rounds)
❌ Automatic conversion at a low valuation trigger (creates forced dilution)
```

---

## SAFE Document Template

Download the official YC SAFE templates for free:
**https://www.ycombinator.com/documents**

Four versions available:
1. Valuation Cap, no discount (recommended for Halehame)
2. Discount, no valuation cap
3. Valuation Cap and discount
4. MFN, no valuation cap, no discount

**These are attorney-drafted, battle-tested documents. Use them.**
**Cost: Free. No modification needed for standard terms.**

---

## Process to Close a SAFE Investment

```
Step 1: Investor agrees to invest (verbal or email confirmation)
Step 2: Fill in SAFE template with: investor name, amount, cap/discount
Step 3: Both parties sign electronically (DocuSign free tier works)
Step 4: Investor wires money to your business bank account
Step 5: Update your cap table with the SAFE entry
Step 6: Send investor a signed copy + receipt of funds
Step 7: Update FILING_TRACKER.md with investment details

Total time: 1–3 days (vs 30–90 days for a priced round)
Total cost: $0 (using YC templates) + DocuSign ($0 on free tier)
```

---

*This document is for educational and planning purposes.*
*Have your attorney review any SAFE before signing.*
