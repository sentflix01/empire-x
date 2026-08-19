# Nodbusiness — Regulatory Compliance Guide

> This document maps the platform's legal obligations by jurisdiction and feature area.
> **Last updated:** August 2026

---

## Ethiopia (Primary Jurisdiction)

### Applicable Laws

| Law | Relevance to Nodbusiness |
|---|---|
| **Computer Crime Proclamation No. 958/2016** | Governs online fraud, hacking, cyberstalking, unauthorized access |
| **Mass Media and Freedom of Information Proclamation No. 590/2008** | User-generated content standards, platform liability |
| **Anti-Terrorism Proclamation No. 652/2009** | Prohibited content; platform must remove terrorist content |
| **Electronic Signature & E-Commerce Proclamation No. 1067/2018** | Validity of digital contracts, e-commerce obligations |
| **National Bank of Ethiopia (NBE) Directives** | Payment processing, wallet operations, KYC requirements |
| **Ethiopian Investment Commission** | Business registration for operating in Ethiopia |
| **Ethiopian Revenue and Customs Authority (ERCA)** | VAT on digital services, income tax on platform revenue |
| **Ministry of Labor and Social Affairs** | Employment terms if hiring staff |

### Payment Compliance (NBE)
- Wallet operations may require NBE Payment Instrument Issuer license for balances above ETB 5,000
- KYC (Know Your Customer) required for wallet top-ups above NBE thresholds
- Anti-Money Laundering (AML) monitoring required for large transactions
- **Action required:** Consult with a financial services lawyer before wallet goes live with real users

### Tax Obligations (ERCA)
- Value Added Tax (VAT): 15% on digital services to Ethiopian users
- Withholding tax on commission income
- **Action required:** Register with ERCA, implement tax calculation in checkout

---

## European Union (GDPR)

Applies when serving users in EU member states.

| Requirement | Nodbusiness Status | Action |
|---|---|---|
| Privacy Policy | ✅ Draft exists | Finalize + publish |
| Lawful basis for processing | ✅ Documented in Privacy Policy | Review with DPO |
| Right to access data | ⚠️ Process defined, not automated | Build data export endpoint |
| Right to deletion | ⚠️ Account delete removes data | Verify cascade deletes all PII |
| Data breach notification (72h) | ❌ No process defined | Add to incident runbooks |
| Cookie consent | ⚠️ Not implemented | Add consent banner for EU users |
| Data Protection Officer (DPO) | ❌ Not appointed | Required if processing at scale |

---

## United States

### COPPA (Children's Online Privacy Protection Act)
- Nodbusiness prohibits users under 18
- Must not knowingly collect data from minors
- **Required:** Age gate on registration, parental consent mechanism

### CCPA (California Consumer Privacy Act)
- Applies when serving California residents
- Rights: know, delete, opt-out of sale (we don't sell data — document this)
- **Required:** "Do Not Sell My Personal Information" link (even though we don't sell)

### DMCA (Digital Millennium Copyright Act)
- Register a DMCA agent with the US Copyright Office
- Implement take-down and counter-notice process
- Safe harbor only applies if we respond promptly to valid notices
- **Contact:** dmca@nodbusiness.app

---

## Payment Card Industry (PCI-DSS)

We use Stripe and Chapa — we do NOT store card data. This reduces our PCI scope to **SAQ A** (self-assessment questionnaire).

| Requirement | Status |
|---|---|
| No card data stored | ✅ Stripe/Chapa handle all card data |
| HTTPS on all pages | ✅ TLS enforced |
| Stripe webhook signature verification | ✅ Implemented |
| Annual SAQ A completion | ❌ Not yet done |

---

## Accessibility (ADA / WCAG 2.1)

| Standard | Status |
|---|---|
| WCAG 2.1 Level AA | ⚠️ Partial — not formally audited |
| Screen reader compatibility | ⚠️ Some ARIA labels missing |
| Color contrast ratio (4.5:1 minimum) | ⚠️ Not audited |
| Keyboard navigation | ⚠️ Not fully tested |

**Action:** Schedule quarterly accessibility audit with axe DevTools + manual testing.

---

## Financial Compliance Checklist

Before accepting real money from users:

- [ ] NBE payment processor approval or partnership
- [ ] KYC flow for wallet top-ups above threshold
- [ ] AML transaction monitoring
- [ ] ERCA VAT registration
- [ ] PCI-DSS SAQ A completion
- [ ] Terms of Service reviewed by Ethiopian lawyer
- [ ] Privacy Policy reviewed by data protection specialist
- [ ] Escrow or trust account for held funds

---

## Platform Safety Obligations

Under Ethiopian law and international best practices:

- [ ] CSAM (child sexual abuse material) reporting pipeline to NCMEC + Ethiopian authorities
- [ ] Terrorist content removal within 1 hour of notice (EU DSA standard, good practice globally)
- [ ] Transparency report published annually (user reports, takedowns, law enforcement requests)
- [ ] Government data request policy published
