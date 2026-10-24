# Nodbusiness — Privacy Policy

> **Classification:** Confidential — Internal Use Only (Public when published)
> **Version:** 1.0
> **Effective Date:** October 2026
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| DPA | Data Processing Agreement |
| DPO | Data Protection Officer |
| GDPR | General Data Protection Regulation |
| PII | Personally Identifiable Information |
| SCC | Standard Contractual Clauses |
| ToS | Terms of Service |

---

## 1. Overview

This Privacy Policy explains how Nodbusiness ("Nodbusiness," "we," "us," "our") collects, uses, shares, and protects your personal information when you use the Nodbusiness Platform ("Platform").

**Controller:** Nodbusiness, Addis Ababa, Ethiopia  
**DPO:** nodbusinesses@gmail.com  
**Contact:** nodbusinesses@gmail.com

---

## 2. Information We Collect

### 2.1 Information You Provide

| Category | Examples | Purpose |
|----------|----------|---------|
| **Account** | Name, email, phone, password hash, business name, registration docs | Account creation, verification, communication |
| **Profile** | Bio, avatar, location, website, social links, preferences | Profile display, personalization |
| **Business** | Business name, registration number, address, tax ID, bank details | Verification, payouts, compliance |
| **Content** | Product listings, descriptions, images, posts, messages, reviews | Service delivery, marketplace |
| **Payments** | Card tokens (via Stripe), bank details, wallet balance, transaction history | Payment processing, wallet, reconciliation |
| **Communications** | Support tickets, chat with support, feedback | Customer support, improvement |

### 2.2 Information Collected Automatically

| Category | Examples | Purpose |
|----------|----------|---------|
| **Usage** | Pages visited, features used, time spent, clicks, searches | Analytics, product improvement |
| **Device** | IP address, device ID, OS, browser, app version, push token | Security, fraud prevention, push notifications |
| **Location** | Country, city (from IP), GPS (with consent) | Localization, nearby discovery, fraud |
| **Cookies** | Session ID, preferences, analytics, marketing | Authentication, analytics, personalization |

### 2.3 Information from Third Parties

| Source | Data | Purpose |
|--------|------|---------|
| **Payment Providers** (Stripe, Chapa, Flutterwave) | Payment status, token, limited buyer info | Payment processing, reconciliation |
| **Auth Providers** (Google, Apple) | Email, name, profile picture | Social login |
| **Telecom/ID Verification** | Phone verification status, KYC result | Account verification, trust |
| **Public Sources** | Business registry data, social profiles | Verification, enrichment |

---

## 3. How We Use Your Information

| Purpose | Legal Basis (GDPR) | Details |
|---------|-------------------|---------|
| **Service Delivery** | Contract | Account, showroom, orders, payments, messaging |
| **Account Management** | Contract | Authentication, verification, security, support |
| **Payments & Wallet** | Contract + Legal Obligation | Processing, reconciliation, AML/KYC, tax |
| **Marketplace** | Contract | Listing, discovery, purchases, payouts |
| **Communications** | Legitimate Interest / Consent | Transactional, marketing (opt-in), support |
| **Personalization** | Legitimate Interest / Consent | Recommendations, discovery ranking, feed |
| **Analytics & Improvement** | Legitimate Interest | Usage analysis, A/B testing, feature development |
| **Security & Fraud** | Legitimate Interest / Legal Obligation | Fraud detection, abuse prevention, account security |
| **Compliance** | Legal Obligation | Tax, AML, sanctions, law enforcement requests |
| **Marketing** | Consent (opt-in) | Email, push, in-app (opt-out anytime) |

---

## 4. Information Sharing

### 4.1 We Do Not Sell Your Data

### 4.2 We Share With:

| Recipient | Purpose | Safeguards |
|-----------|---------|------------|
| **Payment Processors** (Stripe, Chapa, Flutterwave, M-Pesa) | Payment processing | DPA, PCI DSS, encryption |
| **Cloud Providers** (Neon, Upstash, Cloudflare, Vercel, Railway) | Hosting, infrastructure | DPA, SOC2, encryption |
| **Communication** (SendGrid, Firebase FCM) | Email, push notifications | DPA, encryption |
| **Analytics** (Metabase, Grafana, custom) | Product analytics | Aggregated/anonymized where possible |
| **Legal/Regulatory** | Law enforcement, courts, regulators | Legal process, data minimization |
| **Professional Advisors** | Legal, accounting, audit | Confidentiality agreements |
| **Business Partners** (with consent) | Integrations, co-marketing | DPA, your control |

### 4.3 Marketplace
- **Developers** see: Business name, order details (for fulfillment)
- **Customers** see: Business name, public profile, public reviews
- **Aggregated analytics** shared with developers (no PII)

### 4.4 Corporate Transactions
- In merger, acquisition, asset sale: data transferred with same protections
- You will be notified; choice to delete before transfer

---

## 5. International Transfers

| Destination | Mechanism | Countries |
|-------------|-----------|-----------|
| **EU/EEA** | Adequacy (where applicable) / SCCs | Germany, Netherlands, etc. |
| **US** | SCCs + Supplementary Measures | California, Virginia, etc. |
| **Africa** | Local adequacy / SCCs | South Africa, Kenya, Nigeria, Ghana |
| **Other** | SCCs + Supplementary Measures | As needed |

**Supplementary Measures:** Encryption in transit/rest, access controls, no government access without legal process, transparency reports.

---

## 6. Your Rights

| Right | Description | How to Exercise |
|-------|-------------|-----------------|
| **Access** | Confirm processing, get copy | Dashboard → Export or email privacy@ |
| **Rectification** | Correct inaccurate data | Dashboard edit or email |
| **Erasure** | Delete (anonymize financial/audit) | Dashboard → Delete Account or email |
| **Portability** | Machine-readable export (JSON) | Dashboard → Export or email |
| **Restriction** | Limit processing | Privacy settings or email |
| **Objection** | Opt-out of marketing, profiling | Privacy settings (opt-out flags) |
| **Automated Decisions** | Human review of significant decisions | Email privacy@ |
| **Withdraw Consent** | For marketing, analytics | Privacy settings (opt-out) |

**Response Time:** 30 days (extendable to 60 for complex requests)

---

## 6. Children's Privacy

- **No one under 18** may create an Account
- We **do not knowingly collect** data from children
- If discovered: immediate deletion + account termination

---

## 7. Data Security

| Measure | Implementation |
|---------|----------------|
| **Encryption in Transit** | TLS 1.2+ everywhere, HSTS, mTLS (services) |
| **Encryption at Rest** | AES-256 (DB, object store, backups) |
| **Field-Level Encryption** | AES-256-GCM for PII, credentials, financial |
| **Access Controls** | RBAC, least privilege, MFA, audit logs |
| **Network Security** | Private subnets, WAF, DDoS, private endpoints |
| **Vulnerability Management** | SAST/DAST/SCA in CI, annual pen test |
| **Incident Response** | 15-min SEV-1 response, 72h breach notification |
| **Certifications** | SOC2 Type II (target Phase 2), ISO 27001 (target Phase 3) |

---

## 8. Data Retention

| Data Category | Retention Period | Basis |
|---------------|------------------|-------|
| **Account/Profile** | Account lifetime + 90 days | Contract, legitimate interest |
| **Financial/Transactions** | 7 years | Legal obligation (tax, AML) |
| **Wallet/Transactions** | 7 years | Legal obligation |
| **Messages/Chat** | Account lifetime + 1 year | Contract, legitimate interest |
| **Audit Logs** | 7 years | Legal obligation, security |
| **Analytics/Telemetry** | 2 years | Legitimate interest |
| **Backups** | 30 days rolling | Operational resilience |
| **Marketing Consent** | Until withdrawn | Consent |
| **KYC/AML Records** | 5 years post-relationship | Legal obligation |

**Anonymization:** After retention, PII removed; aggregated analytics retained indefinitely.

---

## 9. Cookies & Tracking

### 9.1 Cookie Categories

| Category | Purpose | Consent | Examples |
|----------|---------|---------|----------|
| **Essential** | Auth, security, cart, payments | No (strictly necessary) | `session_id`, `csrf_token`, `wallet_nonce` |
| **Preferences** | Language, theme, timezone | Yes (opt-in) | `locale`, `theme`, `currency` |
| **Analytics** | Usage, performance, funnels | Yes (opt-in) | `_ga`, `_gid`, custom events |
| **Marketing** | Attribution, retargeting, personalization | Yes (opt-in) | `_fbp`, `_gcl_au`, custom |

### 9.2 Cookie Management
- **Banner:** First visit, granular toggles per category
- **Settings:** Dashboard → Privacy → Cookies (change anytime)
- **Reject All:** Only essential cookies set
- **Duration:** Essential = session/1yr; Others = 13 months max

### 9.3 Third-Party Cookies
- **Stripe/Chapa:** Payment flow only (essential)
- **Google/Google Maps:** Maps embed (preferences consent)
- **Social Platforms:** Share buttons (marketing consent)

---

## 10. Automated Decision Making

| System | Decision | Human Review | Opt-Out |
|--------|----------|--------------|---------|
| **Fraud Detection** | Block/challenge transaction | Yes (manual review queue) | N/A (security) |
| **Discovery Ranking** | Showroom order in feed | N/A (algorithmic) | N/A (core service) |
| **Template Pricing** | Suggested price | Developer sets final | Developer controls |
| **Quality Score** | Revenue share % | Appeal process | N/A (contractual) |
| **Fraud/Abuse** | Account suspension | Yes (appeal within 30d) | N/A (security) |

**Right to Human Review:** Available for all significant automated decisions affecting you.

---

## 11. Data Protection Officer

**DPO:** [Name]  
**Email:** nodbusinesses@gmail.com  
**Phone:** +251-XXX-XXXX  

**Responsibilities:** GDPR compliance, DPIAs, breach response, training, regulator liaison.

---

## 12. Complaints & Supervisory Authority

**Internal:** nodbusinesses@gmail.com (30-day response)

**Supervisory Authorities:**
- **Ethiopia:** Ethiopian Communications Authority / Personal Data Protection Office
- **EU:** Lead supervisory authority (where applicable)
- **UK:** Information Commissioner's Office (ICO)
- **Kenya:** Office of the Data Protection Commissioner
- **Nigeria:** Nigeria Data Protection Bureau

---

## 13. Changes to This Policy

- **Material changes:** 30 days notice via email + dashboard banner
- **Non-material:** Posted to this page with version/date
- **Continued use** after effective date = acceptance
- **Version history** maintained at bottom of this document

---

## 14. Contact

**Nodbusiness**  
Addis Ababa, Ethiopia  
**Privacy Email:** nodbusinesses@gmail.com  
**DPO Email:** nodbusinesses@gmail.com  
**General:** nodbusinesses@gmail.com  

---

*Confidential. For Nodbusiness Technologies internal use only.*