# Nodbusiness — Tax Structure & Corporate Entity Strategy

> **How Nodbusiness Technologies is structured legally and how it handles tax obligations globally.**
> This document guides entity setup, cross-border transactions, and tax compliance as the company expands.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| LLC | Limited Liability Company |
| PLC | Public Limited Company |
| LTD | Limited (private company) |
| HQ | Headquarters |
| VAT | Value Added Tax |
| GST | Goods and Services Tax |
| WHT | Withholding Tax |
| PE | Permanent Establishment — a taxable presence in a foreign country |
| OECD | Organisation for Economic Co-operation and Development |
| BEPS | Base Erosion and Profit Shifting |
| IP | Intellectual Property |
| SPV | Special Purpose Vehicle |
| SHA | Shareholders' Agreement |
| USD | United States Dollar |
| CPA | Certified Public Accountant |
| R&D | Research and Development |
| EIN | Employer Identification Number |
| ITIN | Individual Taxpayer Identification Number |
| DTT | Double Tax Treaty |
| SaaS | Software as a Service |

---

## 1. Recommended Corporate Structure

### Phase 1 (Pre-seed / Bootstrap)
```
Nodbusiness Technologies [Country of Incorporation]
  └── Operating Entity (single company)
      All revenue, IP, employees in one entity
```

### Phase 2 (Post-seed / Series A)
```
Nodbusiness Technologies Inc. (Delaware, USA)  ← Holding Company + IP Owner
  └── Nodbusiness Technologies Ltd. (UK or Singapore)  ← EMEA/APAC Operating Company
  └── Nodbusiness Technologies PLC (Ethiopia or home country)  ← Africa/MENA Operations
```

### Phase 3 (Global expansion)
```
Nodbusiness Technologies Inc. (Delaware)  ← Global HQ + IP holder
  └── EU Entity (Ireland or Estonia) ← EU data compliance, VAT registration
  └── Asia-Pacific Entity (Singapore)  ← APAC hub, favorable tax rates
  └── Africa Entity (home country)  ← Local operations, regulatory compliance
  └── Middle East Entity (Dubai DIFC)  ← GCC market access (0% corporate tax zone)
```

---

## 2. Why Delaware (USA) as Holding Company

Delaware is the global standard for tech startups because:

- **Investor familiarity** — US VCs (Venture Capitalists) and accelerators (YC, a16z) require or strongly prefer Delaware C-Corps
- **SAFE and convertible note** frameworks are US-law instruments
- **No state income tax** on revenue earned outside Delaware
- **Flexible shareholder structure** — classes of shares, drag-along rights, ESOP (Employee Stock Ownership Plan) administration
- **Strong legal precedent** — Delaware Court of Chancery handles corporate disputes efficiently
- **IP ownership** — best jurisdiction to hold the core platform IP (Intellectual Property)

**Action:** Incorporate Nodbusiness Technologies Inc. in Delaware before first institutional fundraise.
**Cost:** ~$500 via Stripe Atlas, Clerky, or a US attorney.

---

## 3. Tax Obligations by Entity Type

### 3.1 Delaware C-Corp (USA)
```
Federal corporate income tax:    21% on US-sourced profits
State tax (Delaware):            0% on income from outside Delaware
Payroll taxes:                   Required if US employees on payroll
Sales tax:                       SaaS often exempt (varies by state)
Annual franchise tax:            ~$400–$200,000 (based on share structure — use authorized shares method to minimize)
```

**Key rule:** A Delaware holding company with no US employees and no US revenue may owe minimal US tax. Work with a US CPA to confirm.

### 3.2 UK LTD
```
Corporation tax:                 25% (2023+) on UK profits
VAT:                             20% (register when revenue > £85,000)
PAYE:                            Employer payroll tax for UK employees
R&D tax relief:                  Up to 33% credit on qualifying R&D costs
```

### 3.3 Singapore PTE LTD
```
Corporate income tax:            17% headline rate
Effective rate (startup):        ~8–13% after startup exemptions
GST:                             9% (register when revenue > SGD 1M)
No capital gains tax:            0% on share disposals
No withholding tax on dividends: Dividends to holding company tax-free
```
Singapore is highly recommended for the APAC (Asia-Pacific) entity.

### 3.4 Irish LTD (EU)
```
Corporate income tax:            12.5% on trading income
R&D credit:                      25% credit (cash refundable)
IP box regime:                   6.25% rate on qualifying IP income
VAT:                             23% standard (must register for EU VAT)
```

### 3.5 Dubai DIFC / Freezone
```
Corporate income tax:            0% (freezone companies with qualifying income)
VAT:                             5% (UAE standard)
No personal income tax:          0% for employees
Condition:                       Must not derive income from UAE mainland
```

---

## 4. Cross-Border Tax Issues

### 4.1 Withholding Tax (WHT) on Payments
When Nodbusiness pays contractors or licensees in other countries, WHT may apply:

| Payment Type | Typical WHT Rate | How to Reduce |
|-------------|-----------------|---------------|
| Software license fees to parent | 5–30% | Use DTT between countries |
| Dividends to holding company | 5–15% | Route through treaty-friendly entity |
| Service fees to foreign contractors | 0–20% | Use proper contractor agreements, check local rules |
| Royalties on IP | 5–30% | Hold IP in low-WHT jurisdiction |

### 4.2 Transfer Pricing
When related Nodbusiness entities transact with each other (e.g., Ethiopia OpCo pays Delaware HoldCo a license fee for using the platform), transfer pricing rules apply:

- **Rule:** All inter-company transactions must be priced at arm's length (as if unrelated parties)
- **Documentation required:** Transfer pricing study (required once revenue > $1M between entities)
- **Risk:** Tax authorities can re-characterize transactions if prices appear artificial
- **Action:** Retain a transfer pricing specialist before creating the multi-entity structure

### 4.3 Permanent Establishment (PE) Risk
Having employees or a physical office in a country can create a PE — meaning you owe corporate tax in that country on profits attributed to the PE.

| Activity | PE Risk |
|---------|---------|
| Remote contractor (no office, no authority to sign contracts) | Low |
| Local sales office | High |
| Employee who concludes contracts | High |
| Server in that country | Low (in most jurisdictions) |

**Action:** Before hiring employees in any new country, consult a local tax advisor about PE risk.

---

## 5. VAT/GST on SaaS

### Key Rule
Digital services (SaaS) are taxable where the customer is located in most jurisdictions, not where the seller is.

| Region | Rule |
|--------|------|
| European Union (EU) | VAT MOSS — register in one EU country, file centrally |
| United Kingdom | Register for UK VAT once revenue > £85,000 |
| Australia | Register for GST if revenue from AU customers > AUD 75,000 |
| Canada | Register for GST/HST if revenue from CA customers > CAD 30,000 |
| India | Register for GST if B2C digital services delivered in India |
| USA | No federal sales tax on SaaS; varies by state |

**Action for Phase 2:** Use a tax automation tool (Stripe Tax, Avalara, or TaxJar) to calculate and collect the correct VAT/GST from customers automatically.

---

## 6. Equity and Tax

### 6.1 ESOP (Employee Stock Ownership Plan) Tax Treatment
| Country | Employee tax event | Rate |
|---------|------------------|------|
| USA | At exercise (ISOs may defer) | Capital gains rate |
| UK | At grant / exercise / sale depending on scheme | EMI scheme: favorable |
| Ethiopia | At vesting or exercise | Local income tax rate |

**Action:** Establish ESOP through Delaware entity. Use ISOs (Incentive Stock Options) for US-based employees and EMI (Enterprise Management Incentives) for UK-based employees where possible.

### 6.2 Investor Exit Tax
When investors sell shares in Nodbusiness:
- **Capital gains tax** applies in the investor's home country
- **Delaware:** 0% state tax on capital gains for non-US investors
- **Structure tip:** Many US VCs prefer Delaware C-Corp for clean exit mechanics

---

## 7. R&D Tax Credits

Nodbusiness's engineering work likely qualifies for R&D tax credits in multiple jurisdictions:

| Country | Credit | Notes |
|---------|--------|-------|
| UK | 33% of qualifying R&D costs (SME scheme) | Apply retroactively up to 2 years |
| Ireland | 25% of R&D expenditure | Cash refundable |
| USA | 20% federal credit on qualifying R&D | Requires Form 6765 |
| Singapore | 250% deduction on qualifying R&D | Enhanced by government schemes |
| Canada | SR&ED (Scientific Research & Experimental Development) — 35% for CCPCs | Very generous |

**Action:** Document all engineering work (sprint records, GitHub commits, architectural decisions) to support R&D claims.

---

## 8. Tax Compliance Calendar

| Obligation | Frequency | Responsible Party |
|-----------|-----------|------------------|
| US federal corporate return (Form 1120) | Annual (by April 15 or Oct 15 with extension) | US CPA |
| Delaware franchise tax | Annual (by March 1) | Registered agent |
| VAT/GST returns | Monthly or quarterly (varies by country) | Finance team + tax software |
| Transfer pricing documentation | Annual (once multi-entity) | Tax advisor |
| Payroll tax filings | Monthly (per country) | HR + payroll provider |
| Investor K-1s (if LLC structure) | Annual | US CPA |
| Board-approved tax strategy review | Annual | CEO + CFO + Tax advisor |

---

## 9. Immediate Actions

```
Priority 1 (Before first investor):
  □ Incorporate Delaware C-Corp
  □ Transfer IP from founder to Delaware entity
  □ Issue founder shares with 4-year vesting + 1-year cliff
  □ File 83(b) election within 30 days of share issuance (US founders)
  □ Open US business bank account (Mercury or SVB)

Priority 2 (Post-seed, $500K+ raised):
  □ Register for VAT/GST in relevant markets
  □ Implement Stripe Tax for automatic VAT collection
  □ Set up accounting software (QuickBooks or Xero)
  □ Retain a Big 4 or mid-tier accounting firm
  □ Establish transfer pricing policy between entities

Priority 3 (Pre-Series A, $5M+ raised):
  □ Full multi-entity structure in place
  □ Formal transfer pricing study completed
  □ ESOP pool established and documented
  □ Audited financial statements prepared
  □ Tax opinion letter from qualified attorney
```

---

*This document is for planning purposes only. Consult a qualified tax professional for advice specific to your situation.*
*Tax laws change frequently. Review this document annually and after any major entity or revenue changes.*
