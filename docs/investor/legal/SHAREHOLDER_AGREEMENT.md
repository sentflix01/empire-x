# Halehame — Shareholder Agreement Guide

> **Classification:** Confidential
> **Purpose:** What to include, what to fight for, and what to avoid
> in the Shareholders Agreement — the most legally binding investment document.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SHA | Shareholders Agreement — legal contract governing shareholder rights and obligations |
| SPA | Share Purchase Agreement — legal document for the actual equity investment transaction |
| ROFR | Right of First Refusal — right to purchase shares before they are offered to others |
| ESOP | Employee Stock Ownership Plan — reserved share pool for employee equity grants |
| CEO | Chief Executive Officer — company head and primary decision maker |
| CTO | Chief Technology Officer — technology leader |
| VC | Venture Capital — professional investment firm |
| IP | Intellectual Property — patents, trademarks, copyrights, trade secrets |
| NDA | Non-Disclosure Agreement — confidentiality contract |
| FMV | Fair Market Value — price a willing buyer and seller would agree on |
| MFN | Most Favored Nation — clause ensuring same terms as any future better deal |
| IPO | Initial Public Offering — when a company first lists shares on a stock exchange |

---

## What Is a Shareholders Agreement?

After a term sheet is agreed, lawyers draft the actual legal documents:
1. **Share Purchase Agreement (SPA)** — the actual investment transaction
2. **Shareholders Agreement (SHA)** — the ongoing governance rules
3. **Articles of Association amendment** — changes to the company charter

The SHA is the document you live with for years. It governs:
- How the Board operates
- How shares can be sold
- What decisions need investor approval
- How disputes are resolved
- How the company can be sold

**Always have an attorney review the SHA. Every clause matters.**

---

## 1. Share Purchase Agreement (SPA) — Key Clauses

### Representations and Warranties
```
The founder makes statements ("warranties") that are true:
  → "The cap table is accurate and complete"
  → "There is no undisclosed litigation"
  → "All IP is owned by the company, not personally"
  → "The financial statements are accurate"
  → "All contracts disclosed are valid"

Risk: If any warranty is false (even accidentally), investor can sue you.

How to protect yourself:
  → Disclose everything in a "Disclosure Letter"
  → The Disclosure Letter carves out exceptions to warranties
  → Example: "Except as disclosed in Disclosure Letter item 3..."
  → Being thorough in disclosure protects you. Being vague creates risk.
```

### Warranty Caps and Survival
```
Negotiate a cap on your warranty liability:
  Standard: Liability capped at investment amount
  What investors want: Unlimited liability for fundamental warranties
    (e.g., fraud, title to shares, authorization)

Survival period: How long can investors sue you for breach of warranty?
  Standard: 18–24 months after closing
  Push for: 12 months on general warranties, longer only for fraud/title

Example negotiation:
  "We agree to 12-month general warranty survival capped at 1× investment,
  with 5-year survival for fundamental warranties (title, capacity, no fraud)."
```

---

## 2. Shareholders Agreement — Key Clauses

### Board Composition and Voting
```
Document EXACTLY:
  → Number of board seats
  → Who appoints each seat
  → Quorum requirements (minimum attendees for valid meeting)
  → Voting threshold for regular vs. special resolutions
  → Chair of the board + casting vote if tie

Standard structure for seed round:
  3 directors: Founder (appointed by founder shareholders)
               Investor Director (appointed by preferred investors)
               Independent Director (agreed by both)
  
  Regular decisions: Simple majority (2/3)
  Special decisions (listed protective provisions): All preferred approval required
  
  Quorum: 2 of 3 directors present (investor cannot block by not attending)
```

### Reserved Matters (Investor Veto Rights)
```
These are decisions that require investor approval regardless of board vote.

Standard reserved matters (ACCEPT):
  ✅ Change the business purpose
  ✅ Amend Articles of Association
  ✅ Issue new shares (dilute investors)
  ✅ Create new share classes
  ✅ Acquire another company
  ✅ Sell the company or material assets
  ✅ Wind up the company
  ✅ Increase board size above agreed number
  ✅ Related party transactions above $X

Reasonable but negotiate thresholds:
  ⚠️ Capital expenditure above $X — negotiate: $100,000+ threshold, not $10,000
  ⚠️ Entering contracts above $X — negotiate: $250,000+ threshold
  ⚠️ Taking on debt above $X — negotiate: $500,000+ threshold

Refuse:
  ❌ Hiring/firing employees at any level
  ❌ Approving marketing campaigns
  ❌ Setting prices or pricing strategy
  ❌ Choosing technology vendors
  ❌ Approval required for any contract (operational control)
```

### Transfer Restrictions
```
ROFR (Right of First Refusal):
  → If you want to sell shares, company has right to buy them first
  → Then investors have right to buy at the same price
  → Only after both pass can you sell to a third party
  → ACCEPT this — standard

Lock-up period:
  → Founder cannot sell shares for 12–36 months from closing
  → Standard: 12 months absolute lock-up, then ROFR applies
  → ACCEPT this — shows commitment

Permitted transfers (NEGOTIATE these into the SHA):
  → You can transfer shares to your holding company or spouse
  → Without triggering ROFR
  → Important for estate planning and structure flexibility
```

### Drag-Along Rights
```
Definition: If X% of shareholders agree to sell the company, ALL shareholders
must sell too (at the same price).

Standard threshold: 75%+ of shareholders approve the sale
  → Prevents one small shareholder from blocking a deal

Negotiate:
  → Threshold should be at least 70% (not 50%)
  → Drag-along price must be the same for all share classes
  → Founders cannot be dragged below their liquidation waterfall amount
  → Board must also approve the sale (not just shareholder vote)
```

### Tag-Along Rights (Co-Sale)
```
Definition: If a founder sells shares to a third party, investors can
sell their shares too at the same price and terms.

→ ACCEPT this — standard and fair
→ It prevents founders selling out while leaving investors stuck
```

### Non-Compete and Non-Solicitation
```
Non-compete: Founder cannot start a competing business for X period
Standard: 12–24 months after leaving the company
Jurisdiction matters: In many countries (including Ethiopia), non-competes
are unenforceable if too broad

Non-solicitation: Founder cannot hire Halehame employees for X period
Standard: 12–24 months after leaving
→ More enforceable than non-compete in most jurisdictions

Negotiate:
  → Limit scope: "competing with Halehame's actual business at time of departure"
  → Not "any business in the technology sector" (too broad)
  → 12 months, not 36 months
```

### Good Leaver / Bad Leaver
```
If a founder leaves the company:

Good Leaver (keeps more shares):
  → Leaving due to illness or disability
  → Death
  → Redundancy (company closes the role)
  → Retirement after age X

Bad Leaver (company can buy back shares at nominal price):
  → Resignation without good reason
  → Termination for gross misconduct
  → Breach of SHA obligations
  → Starting a competing company

Negotiate:
  → Ensure your exit categories are clear
  → Ensure the repurchase price for good leaver is fair market value
  → Ensure bad leaver provisions don't apply to vested shares
    (you earned vested shares through work — they should not be repurchaseable)
```

### Founder Vesting
```
Document EXACTLY:
  → Vesting start date (usually employment start or closing date)
  → Vesting schedule: 4 years, 25% cliff at 12 months, then monthly
  → Acceleration:
    Single trigger: All vests on acquisition → PREFERRED for founders
    Double trigger: All vests on acquisition + if fired → investors prefer this

  → Strike price: How much company pays to repurchase unvested shares
    on departure? Usually: original price paid (very low for founders)

  → Good/bad leaver treatment of unvested shares (see above)
```

### Anti-Dilution (Repeat from Term Sheet)
```
Standard: Broad-based weighted average
→ Same as term sheet — confirm it's implemented correctly in the SHA
```

### Information Rights
```
The SHA formalizes what you agreed in the term sheet:
  → Quarterly management accounts (within 30 days of quarter end)
  → Annual audited financial statements (within 90 days of year end)
  → Annual budget (30 days before year start)
  → Board observer rights for $X+ investors

Right to inspect:
  → Investors can inspect books/records with 5 business days notice
  → Reasonable time and place
  → No real-time access to systems
```

---

## 3. SHA Negotiation Priority Matrix

```
FIGHT HARD FOR:
  1. Board control — never give investors majority board votes
  2. Broad-based anti-dilution (not full ratchet)
  3. 1× non-participating liquidation preference
  4. Reasonable reserved matters (high thresholds for operational items)
  5. Double trigger acceleration on acquisition

NEGOTIATE BUT ACCEPT MARKET STANDARD:
  6. ROFR and co-sale rights
  7. Drag-along with 75%+ threshold
  8. Founder vesting with 4-year schedule
  9. Standard information rights
  10. 12-month non-compete scope-limited

ACCEPT WITHOUT FIGHTING:
  11. Major corporate action protective provisions (acquisition, winding up)
  12. 12-month lock-up on founder shares
  13. Disclosure obligations
  14. Anti-dilution on down rounds (broad-based)
  15. Standard warranty representations
```

---

## 4. Closing Process

```
Step 1: Term sheet signed (Day 0)
Step 2: Data room opened to investors (Day 1-2)
Step 3: Legal counsel engaged by both sides (Day 1-3)
Step 4: Investor due diligence (Day 1-14)
Step 5: SHA drafting + negotiation (Day 7-21)
Step 6: Board resolution approving the investment (Day 18-23)
Step 7: Documents signed by all parties (Day 20-28)
Step 8: Money wired to Halehame business account (Day 21-30)
Step 9: Shares issued + cap table updated (Day 21-30)
Step 10: Shareholder register updated (Day 30)

Total timeline: 3–6 weeks is standard
Red flag: Over 8 weeks = investor may be losing interest
```

---

*This guide is for educational and planning purposes.*
*All investment documents must be reviewed by a qualified attorney.*
*Do not sign any shareholder agreement without legal counsel.*
