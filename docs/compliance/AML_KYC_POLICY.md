# Nodbusiness — AML/KYC Policy

> **Anti-Money Laundering (AML) and Know Your Customer (KYC) policy for the Nodbusiness platform.**
> Financial crime prevention is a legal obligation, not an option. This policy applies globally to all users, merchants, and money flows on the platform.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| AML | Anti-Money Laundering |
| KYC | Know Your Customer |
| KYB | Know Your Business — business-level identity verification |
| CFT | Countering the Financing of Terrorism |
| CDD | Customer Due Diligence |
| EDD | Enhanced Due Diligence — applied to high-risk customers |
| PEP | Politically Exposed Person — someone with prominent public functions |
| SAR | Suspicious Activity Report |
| STR | Suspicious Transaction Report |
| FATF | Financial Action Task Force — sets global AML/CFT standards |
| GDPR | General Data Protection Regulation (EU) |
| OFAC | Office of Foreign Assets Control (US sanctions body) |
| UN | United Nations |
| EU | European Union |
| ID | Identity Document |
| DOB | Date of Birth |
| TIN | Taxpayer Identification Number |
| GMV | Gross Merchandise Value |
| API | Application Programming Interface |
| IP | Internet Protocol (address) |

---

## 1. Scope

This policy applies to:
- All users who handle money on the platform (sellers, service providers, withdrawal requesters)
- All marketplace transactions above defined thresholds
- All wallet top-ups and withdrawals
- All businesses (showrooms) accepting payments through Nodbusiness
- All employees and contractors handling financial data

This policy does NOT apply to:
- Free-tier users who never transact money
- Read-only observers

---

## 2. Why This Matters

Nodbusiness operates a marketplace and payment infrastructure across multiple countries. Regulators globally — including FATF (Financial Action Task Force), the EU, and the US — require platforms that process payments to:

1. Verify who their users are
2. Monitor transactions for suspicious patterns
3. Report suspicious activity to authorities
4. Block sanctioned individuals and entities
5. Maintain records for a minimum of 5 years

**Failure to comply** can result in:
- Platform shutdown by regulators
- Fines up to millions of dollars
- Criminal liability for company officers
- Loss of payment processor partnerships (Stripe, Chapa)

---

## 3. User Risk Classification

Every user and business is assigned a risk tier:

| Risk Tier | Profile | CDD Level |
|-----------|---------|-----------|
| Low | Individual buyer, no money movement | Basic ID (email verification only) |
| Standard | Seller with transactions < $1,000/month | KYC Tier 1 |
| Elevated | Seller with transactions $1,000–$10,000/month | KYC Tier 2 |
| High | Seller with transactions > $10,000/month, international transfers, crypto-adjacent | EDD (Enhanced Due Diligence) |
| PEP | Government officials, politicians, their relatives | Always EDD regardless of amount |
| Sanctioned | Matches OFAC / UN / EU sanctions lists | Blocked immediately — no access |

---

## 4. KYC Tiers and Required Information

### KYC Tier 1 (Standard Seller)
Required before processing any payment:
```
□ Full legal name (as on government ID)
□ Date of birth (DOB)
□ Country of residence
□ Email address (verified)
□ Phone number (verified via OTP)
□ Profile photo (real person verification)
```

### KYC Tier 2 (Elevated Seller / Monthly GMV > $1,000)
Additional requirements:
```
□ Government-issued photo ID (passport, national ID, or driver's license)
□ Proof of address (utility bill or bank statement < 3 months old)
□ Selfie with ID (liveness check)
□ Tax identification number (TIN) where required by local law
```

### KYB (Know Your Business — for registered businesses)
For sellers operating as registered businesses:
```
□ Business registration certificate
□ Business address (verified)
□ Beneficial owner declaration (who owns > 25% of the business)
□ Director/officer ID documents
□ Business bank account statement
```

### EDD (Enhanced Due Diligence — High Risk / PEP)
Additional to all Tier 2 requirements:
```
□ Source of funds declaration
□ Source of wealth declaration
□ Business purpose statement
□ Senior management approval before account activation
□ Ongoing monthly transaction monitoring
□ Annual review of account and documentation
```

---

## 5. Sanctions Screening

Every user, at signup and before every large transaction, is screened against:

| List | Provider |
|------|---------|
| OFAC SDN List (US sanctions) | Stripe Radar or dedicated sanctions API |
| UN Security Council sanctions | Automated screening tool |
| EU Consolidated Sanctions List | Automated screening tool |
| HM Treasury UK Sanctions | Automated screening tool |
| PEP (Politically Exposed Persons) database | Third-party KYC provider |

**Process:**
1. User submits name, DOB, and country at signup
2. System auto-screens against all lists in real time
3. Match found → account flagged for manual review
4. Confirmed match → account blocked, Stripe notified, SAR (Suspicious Activity Report) filed if required
5. False positive confirmed → manual override by compliance officer, documented

---

## 6. Transaction Monitoring

### Automated Flags
The platform automatically flags the following for review:

| Pattern | Action |
|---------|--------|
| Single transaction > $10,000 | Manual review required |
| Aggregate transactions > $10,000 in 30 days (structuring) | EDD triggered |
| Rapid sequential withdrawals (3+ in 1 hour) | Account frozen for 24-hour review |
| Payment from new IP + new device + large amount | Risk score increased |
| Unusual geographic patterns (e.g., payments from 5 countries in 1 day) | Manual review |
| Chargeback rate > 1% of GMV | Account reviewed, EDD triggered |
| Selling pattern suddenly changes (new product category, 10× volume) | Manual review |
| Funds received and immediately withdrawn | Flagged as potential layering |

### Manual Review Process
```
Step 1: Transaction flagged → ticket created in compliance queue
Step 2: Compliance officer reviews within 24 hours (48 hours for low-risk flags)
Step 3: Outcome: Clear (resume), Request info from user, or Suspend + SAR
Step 4: All outcomes documented with rationale
Step 5: Suspicious cases escalated to external legal counsel or reported to FIU
```

---

## 7. Suspicious Activity Reporting (SAR/STR)

If a transaction or user behavior appears to involve:
- Money laundering (disguising proceeds of crime)
- Terrorist financing
- Sanctions evasion

**The process is:**
1. Compliance officer documents the suspicion (facts, not speculation)
2. Internal review with CEO within 48 hours
3. If suspicion is reasonable: file SAR/STR with the relevant Financial Intelligence Unit (FIU) in the applicable jurisdiction
4. Do NOT tip off the user that a report has been filed (this is a criminal offense in many jurisdictions — called "tipping off")
5. Maintain records of all reports for 5+ years

**Do not:**
- Freeze the account or contact the user before filing (risk of tipping off)
- Delay filing beyond 30 days of identifying the suspicion
- File a SAR based purely on race, nationality, or religion

---

## 8. Data Retention

| Data Type | Minimum Retention Period |
|-----------|------------------------|
| KYC documents (ID, address proof) | 5 years after account closure |
| Transaction records | 5 years after transaction |
| SAR/STR filings | 5 years after filing |
| Sanctions screening results | 5 years |
| Employee AML training records | 3 years |

All KYC data is stored encrypted, access-controlled, and compliant with GDPR (General Data Protection Regulation) and applicable local data protection laws.

---

## 9. Employee Training and Compliance

| Audience | Training Requirement |
|---------|---------------------|
| All new employees | AML/KYC awareness training within 30 days of hire |
| Finance team | Full AML/CFT training annually |
| Customer support team | Red flag recognition training (annually) |
| Engineering team | Understanding AML system requirements (at feature launch) |
| CEO / Compliance Officer | Regulatory updates training (annually) |

**Training records must be maintained.** Evidence of training is required by regulators.

---

## 10. Third-Party KYC Vendors

Rather than building identity verification from scratch, Nodbusiness uses third-party providers:

| Provider | Function | Status |
|----------|---------|--------|
| Stripe Identity | KYC for Stripe Connect sellers | Active |
| Jumio / Onfido / Persona | ID document + liveness check | Evaluate for Phase 2 |
| ComplyAdvantage | Sanctions + PEP screening | Evaluate for Phase 2 |
| Chapa (local) | Local KYC for ETB transactions | Active (Africa) |

---

## 11. Non-Compliance Consequences

Internal violations of this policy by employees or contractors:
- Immediate investigation
- Termination if deliberate
- Possible criminal referral if financial crime involvement

---

*This policy is reviewed annually and updated when regulations change.*
*Questions: compliance@nodbusiness.com*
*Owner: CEO (Phase 1), Chief Compliance Officer (Phase 2+)*
