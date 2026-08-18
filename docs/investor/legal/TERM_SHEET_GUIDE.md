# Halehame — Term Sheet Guide

> **Classification:** Confidential
> **Purpose:** Understand every clause in a term sheet before negotiating.
> A term sheet is a non-binding letter of intent from an investor.
> It defines the key terms of the investment deal.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SAFE | Simple Agreement for Future Equity — pre-seed investment instrument |
| VC | Venture Capital — professional investment firm funding high-growth startups |
| ROFR | Right of First Refusal — right to buy shares before they are offered to others |
| SHA | Shareholders Agreement — legal contract governing shareholder rights |
| SPA | Share Purchase Agreement — legal document for a direct equity investment |
| ESOP | Employee Stock Ownership Plan — reserved share pool for employee equity |
| CEO | Chief Executive Officer — company head and decision maker |
| CTO | Chief Technology Officer — technology leader |
| IPO | Initial Public Offering — when a company first lists on a stock exchange |
| MFN | Most Favored Nation — clause giving same terms as any future better deal |
| NDA | Non-Disclosure Agreement — confidentiality contract |
| FMV | Fair Market Value — price a willing buyer and seller would agree on |

---

## What Is a Term Sheet?

When a VC or angel agrees to invest, they send you a term sheet.
It is typically 5–15 pages. It is NOT the final legal document — the
actual investment documents (Share Purchase Agreement, Shareholders Agreement,
Articles of Association amendment) come after.

**Non-binding:** The investor can walk away after signing a term sheet.
**You should not walk away** after signing — it damages your reputation.

Always have a lawyer review a term sheet before signing.

---

## The 3 Categories of Term Sheet Clauses

```
1. Economics clauses — who gets what money
2. Control clauses — who makes decisions
3. Protective clauses — what investors can block
```

Founders fight most on economics.
Experienced founders say: **control clauses matter more than economics.**

---

## 1. Economics Clauses

### Pre-Money Valuation
```
Definition: What the company is worth before the investment.

Example:
  Pre-money: $4,000,000
  Investment: $1,000,000
  Post-money: $5,000,000
  Investor ownership: $1M / $5M = 20%

Negotiation tips:
  → Research comparable deals (see VALUATION_MODEL.md)
  → Have a counter-valuation ready with supporting evidence
  → First number is rarely final — expect 20–30% negotiation room
  → Having multiple investors interested DRAMATICALLY improves your position
```

### Option Pool
```
Definition: Unissued shares reserved for future employees.

Common investor demand: "We require a 15% option pool BEFORE the round closes."

Why this matters:
  Creating the pool before closing dilutes FOUNDERS, not investors.
  Creating it after would dilute everyone equally.

Example impact:
  Before pool: Founders own 100% of 8,000,000 shares
  Create 15% pool = 1,411,765 new shares
  Total shares: 9,411,765
  Founders now own: 8,000,000 / 9,411,765 = 85% BEFORE investor gets their 20%
  Effective founder dilution: BOTH the pool + the investor

  Negotiate: Try to agree on a smaller pool (10%) or create it AFTER closing.
```

### Liquidation Preference
```
Definition: In a sale or shutdown, investors get paid before common shareholders.

Standard (acceptable): 1× non-participating
  → Investor gets back their $1M investment first
  → Remaining proceeds split pro-rata among all shareholders (including investor)

Aggressive (resist): 1× participating preferred
  → Investor gets back $1M first
  → ALSO participates in remaining proceeds at their % ownership
  → Double-dips on small exits

Very aggressive (refuse): 2× participating
  → Investor gets back 2× their money
  → ALSO participates pro-rata
  → Leaves founders with almost nothing on small exits

Example ($3M exit, 20% investor):
  No preference:        Investor: $600K | Founder: $2,400,000
  1× non-participating: Investor: $1,000,000 | Founder: $2,000,000
  1× participating:     Investor: $1,400,000 | Founder: $1,600,000
  2× participating:     Investor: $2,400,000 | Founder: $600,000

→ ACCEPT: 1× non-participating
→ RESIST: 1× participating
→ REFUSE: 2× anything
```

### Anti-Dilution Protection
```
Definition: Protects investors if you raise your next round at a LOWER
valuation than this round (a "down round").

Types:
  Full Ratchet (REFUSE):
    Investor's shares reprice to the new lower price.
    Can destroy founder equity in a down round.
    Example: Investor buys at $1/share. Down round at $0.50/share.
    Full ratchet: Investor's old shares all reprice to $0.50 — doubles their shares.

  Broad-based weighted average (ACCEPT — standard):
    Adjusts conversion price using a formula that accounts for ALL
    dilutive securities (not just this investor).
    Impact is moderate — investor is protected but founders aren't decimated.

  Narrow-based weighted average (RESIST — slightly better for investor):
    Uses a narrower share count in the formula — more protective for investor.

→ STANDARD: Broad-based weighted average anti-dilution.
```

### Dividends
```
Most startup term sheets include: "Non-cumulative dividends at 8% annually,
payable when and if declared by the Board."

Translation: Investors technically could receive 8% of their investment as
dividends each year before common shareholders get anything.

In practice: Startups NEVER pay dividends. Investors know this.
It's a legacy clause that almost never matters.

→ ACCEPT standard dividend language. Don't fight this.
```

---

## 2. Control Clauses

### Board Composition
```
This is the most important clause in the entire term sheet.
The Board of Directors controls the company. They can fire the CEO (you).

Standard seed round board:
  2 founder seats + 1 investor seat + 1 independent seat = 4 total
  OR: 2 founders + 1 investor = 3 total (simpler)

Dangerous (resist):
  2 founders + 2 investors = 4 total (deadlock)
  2 founders + 3 investors = 5 total (investors control)

NEVER give investors majority board control at seed stage.

Example good structure:
  Seat 1: Founder/CEO (you)
  Seat 2: Founder/CTO (co-founder)
  Seat 3: Lead investor
  Seat 4: Independent director (agreed by both sides)
  Result: Founders have 2/4 votes. With independent, usually 3/4.
```

### Voting Rights
```
Standard: Preferred shares vote as if converted to common.
  → Investor with 20% preferred = 20% of votes
  → Founders maintain voting control as long as they own >50%

Watch for: Super-voting preferred shares
  → Some term sheets give investors extra votes per share
  → Avoid this entirely

Protective provisions (standard — see section 3 below)
```

### Founder Vesting (Reverse Vesting)
```
Investors REQUIRE founders to have vesting on their shares.

Standard:
  4-year vesting, 1-year cliff
  If you leave before 1 year: 0% vests (company can repurchase shares)
  After 1 year: 25% vests
  Each month after: additional 1/36th vests

Acceleration clause:
  Single trigger: Vesting accelerates on acquisition (all shares vest immediately)
  Double trigger: Vesting accelerates only if acquired AND founder is terminated
  → Push for DOUBLE trigger acceleration. More common and fairer.

Why investors require this:
  They're investing in YOU staying. If you leave Day 1 with 100% of shares,
  the company has no founder but you have all the equity — unfair to investors.
```

---

## 3. Protective Clauses

### Protective Provisions (Investor Veto Rights)
```
Investors require your consent before doing certain things.
Standard protective provisions (accept these — they're reasonable):

  ✅ Sell or liquidate the company
  ✅ Amend the Articles of Association
  ✅ Create new share classes with superior rights
  ✅ Increase/decrease the size of the Board
  ✅ Issue new shares that dilute preferred investors

Less standard (negotiate carefully):
  ⚠️ Hiring/firing executives above $X salary
  ⚠️ Capital expenditure above $X amount
  ⚠️ Entering into debt above $X amount
  ⚠️ Changing the company's business

  → These give investors operational control. Resist anything that lets them
    veto your day-to-day business decisions.

Refuse:
  ❌ Investor veto on hiring any employee
  ❌ Investor approval required for all contracts above $5,000
  ❌ Investor control over marketing spend
  → These turn investors into managers. Unacceptable.
```

### Right of First Refusal (ROFR)
```
Definition: If a founder wants to sell their shares, investors have the right
to buy those shares at the same price before anyone else can.

→ ACCEPT this. It's standard and protects the investor.
→ Watch for: "Company ROFR then investor ROFR" — company gets first option.
```

### Co-Sale Rights (Tag-Along)
```
Definition: If a founder sells shares, investors can sell their shares too
at the same price and terms.

→ ACCEPT this. It's standard.
```

### Drag-Along Rights
```
Definition: If the majority of shareholders approve an acquisition,
ALL shareholders must sell (even if some object).

→ ACCEPT with restrictions. Standard.
→ Negotiate: Drag-along requires 70%+ shareholder approval (not just majority).
```

### No-Shop Clause
```
Definition: After signing the term sheet, you cannot negotiate with other
investors for typically 30–60 days while this deal closes.

→ ACCEPT (standard). Keep the window short: 30 days not 60.
→ Negotiate exclusivity period to be as short as possible.
→ Make sure you have financing lined up before signing — exclusivity prevents
  getting competitive offers if this deal falls through.
```

---

## 4. Information Rights

```
Standard (accept):
  → Annual financial statements (audited if >$1M revenue)
  → Quarterly management accounts
  → Annual budget and business plan
  → Right to inspect books and records (with reasonable notice)

Acceptable additions:
  → Monthly dashboard/metrics report
  → Board observer seat (can attend meetings, cannot vote)

Refuse:
  → Real-time access to all financial systems
  → Right to audit at any time without notice
  → Access to all employee contracts and salaries
```

---

## 5. Term Sheet Negotiation Strategy

```
Step 1: Read every word. Understand every clause.
        If you don't understand something, ask your attorney.

Step 2: Identify your 3 non-negotiables:
        (usually: valuation, board control, liquidation preference)

Step 3: For everything else: express preference, don't die on the hill.
        "We'd prefer X but understand if you need Y"

Step 4: Always negotiate via email or in writing.
        Creates a record and gives you time to think.

Step 5: Use standard market terms as your anchor:
        "The YC standard is 1× non-participating — can we use that?"

Step 6: Get competitive tension if possible:
        "We have another interested investor at [date]" — real or not, it helps.
        (Only say this if TRUE — lying destroys trust forever)

Step 7: Close quickly once terms are agreed.
        Deals die during delays. Sign within 2 weeks of agreeing terms.
```

---

## Red Flags in a Term Sheet — Walk Away

```
🚩 Valuation >50% below market comparable
🚩 Participating preferred >1× (especially 2× or 3×)
🚩 Board control goes to investors at seed stage
🚩 Full ratchet anti-dilution
🚩 Extremely broad operational veto rights (they become managers)
🚩 Investor can remove CEO without cause at any time
🚩 Forced sale rights at investor's discretion (drag-along with no threshold)
🚩 No information about investor's other investments or reputation
→ Google every VC and angel. Talk to founders they funded before.
```

---

## Sample Term Sheet Structure (What You'll Receive)

```
TERM SHEET
Halehame Technologies PLC
Series Seed Preferred Stock

Date: [Date]
Investor: [VC Fund or Angel Name]

AMOUNT & OWNERSHIP
  Investment Amount: $[X]
  Pre-Money Valuation: $[X]
  Post-Money Valuation: $[X]
  Shares Sold: [X] Series Seed Preferred

ECONOMICS
  Liquidation Preference: 1× non-participating
  Conversion: 1:1 to common (automatic at IPO or qualified financing)
  Anti-Dilution: Broad-based weighted average
  Dividends: 8% non-cumulative, non-compounding

GOVERNANCE
  Board: 2 founders, 1 investor, 1 independent
  Protective Provisions: [listed]
  Information Rights: Quarterly financial reports

INVESTOR RIGHTS
  Pro-Rata: $[X]+ investors have right to participate in future rounds
  ROFR: Company then investor ROFR on founder share transfers
  Co-Sale: Tag-along on founder share sales

CLOSING CONDITIONS
  No-Shop: 45 days from signing
  Due Diligence: [list of items required]
  Closing: Target [date]
```

---

*This guide is for educational purposes.*
*Always have a qualified attorney review any term sheet before signing.*
