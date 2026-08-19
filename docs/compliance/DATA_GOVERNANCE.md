# Nodbusiness — Data Governance Framework

> **How data flows, who owns it, how it is protected, and how long it is kept.**
> Data governance is the foundation of user trust, regulatory compliance, and platform integrity.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| GDPR | General Data Protection Regulation (EU) |
| CCPA | California Consumer Privacy Act (US) |
| PDPA | Personal Data Protection Act (varies by country) |
| PII | Personally Identifiable Information |
| PHI | Protected Health Information |
| DPA | Data Processing Agreement |
| DPO | Data Protection Officer |
| DSR | Data Subject Request |
| DPIA | Data Protection Impact Assessment |
| SLA | Service Level Agreement |
| API | Application Programming Interface |
| CDN | Content Delivery Network |
| S3 | Amazon Simple Storage Service |
| DB | Database |
| TLS | Transport Layer Security |
| AES | Advanced Encryption Standard |
| RBAC | Role-Based Access Control |
| SSO | Single Sign-On |
| MFA | Multi-Factor Authentication |
| IP | Internet Protocol (address) |
| KYC | Know Your Customer |
| TTL | Time to Live |

---

## 1. Data Classification

All data on the Nodbusiness platform is classified into one of four tiers:

### Tier 1 — Public
Data intentionally made available to anyone:
- Showroom names, descriptions, categories
- Public posts and reviews
- Product listings and prices
- Business locations (city/country level only)

**Controls:** None — this data is meant to be indexed and shared.

### Tier 2 — Internal
Data accessible to authenticated users within their own scope:
- User profile information (visible to the user, not public)
- Order history and status
- Private messages
- Notification preferences
- Device tokens

**Controls:** Authentication required, RBAC (Role-Based Access Control), HTTPS (TLS 1.2+).

### Tier 3 — Confidential
Data that is sensitive and restricted to Nodbusiness employees and systems:
- Full names + addresses + phone numbers (combined)
- KYC documents and identity verification data
- Payment card metadata (not full card numbers — Stripe handles those)
- Financial transaction records
- Internal analytics and revenue data
- Admin activity logs

**Controls:** MFA required, access logged, encrypted at rest (AES-256), need-to-know basis.

### Tier 4 — Restricted
Highest sensitivity — legal, financial, and identity data:
- Bank account numbers and routing information
- Government ID documents (passport, national ID scans)
- Investor and cap table data
- Legal agreements and contracts
- SAR (Suspicious Activity Report) filings
- Security credentials (API keys, private keys)

**Controls:** Encryption in transit and at rest, no external sharing without legal basis, access limited to ≤3 people.

---

## 2. Data Inventory

| Data Type | Classification | Storage Location | Retention |
|-----------|---------------|-----------------|-----------|
| User accounts (email, name, DOB) | Tier 2–3 | Neon PostgreSQL (primary DB) | Until deletion request + 30 days |
| User passwords | Tier 3 | Neon DB (bcrypt hash only) | Until account deletion |
| Showroom / product data | Tier 1–2 | Neon DB | Until deleted by user |
| Orders and transactions | Tier 3 | Neon DB | 7 years (legal/tax requirement) |
| KYC documents | Tier 4 | S3 encrypted bucket | 5 years after account closure |
| Chat messages | Tier 2 | Neon DB + Redis cache | 2 years (then archived/deleted) |
| File uploads (images) | Tier 2 | S3 / CDN | Until deleted by user |
| Analytics events | Tier 3 (aggregated) | Analytics DB | 2 years |
| Session tokens | Tier 3 | Redis (TTL 24h) | Auto-expiry |
| Error logs | Tier 3 | Sentry | 90 days |
| Server logs | Tier 3 | Railway/Cloud | 30 days |
| Payment tokens | Tier 4 | Stripe (never in Nodbusiness DB) | Managed by Stripe |
| IP addresses | Tier 3 | Server logs | 30 days |

---

## 3. Data Flow Map

### User Registration Flow
```
User submits signup form
  → HTTPS (TLS) in transit
  → Backend validates input (sanitization)
  → Password hashed with bcrypt (12 rounds minimum)
  → User record written to Neon PostgreSQL
  → Verification email sent via Resend
  → Session token created in Redis (TTL 24h)
  → Analytics event fired (anonymized user ID, no PII)
```

### KYC/Identity Verification Flow
```
User submits ID document
  → Encrypted upload over HTTPS
  → Document stored in S3 encrypted bucket (server-side AES-256 encryption)
  → Third-party KYC provider API called (Stripe Identity / Onfido)
  → Verification result stored (pass/fail + reason) in DB
  → Document accessible only to compliance officer
  → Document never stored in main application DB
```

### Payment Flow
```
User initiates payment
  → Payment details go directly to Stripe/Chapa (never touch Nodbusiness servers)
  → Stripe returns payment intent ID
  → Backend stores: order ID, payment intent ID, amount, currency, status
  → Card numbers, CVV, bank details: NEVER stored by Nodbusiness
  → Webhook from Stripe confirms success → order status updated
```

### Message/Chat Flow
```
User sends message
  → WebSocket (Socket.IO) connection
  → Message stored in DB: sender ID, recipient ID, content (encrypted at rest)
  → Real-time delivery via WebSocket
  → Push notification sent (device token used, message content in notification only if user opts in)
  → Message history retained for 2 years, then deleted
```

---

## 4. Regulatory Compliance Requirements

### GDPR (EU/EEA Users)
| Right | What Nodbusiness Must Do | SLA |
|-------|-----------------------|-----|
| Right to Access | Provide all personal data held | 30 days |
| Right to Erasure ("be forgotten") | Delete all PII on request | 30 days |
| Right to Portability | Export data in machine-readable format (JSON/CSV) | 30 days |
| Right to Rectification | Correct inaccurate data | 10 days |
| Right to Restriction | Stop processing (not delete) on request | 10 days |
| Right to Object | Stop using data for marketing | Immediate |

**Legal bases for processing:**
- Contract performance: processing necessary to fulfill orders, deliver services
- Legitimate interest: fraud prevention, security
- Consent: marketing emails, push notifications (opt-in only)
- Legal obligation: KYC, tax records, AML reporting

### CCPA (California Users)
- Right to know what data is collected
- Right to delete personal information
- Right to opt out of sale of personal information (Nodbusiness does NOT sell personal data)
- Non-discrimination for exercising rights
- **"Do Not Sell My Personal Information"** link required on website if serving California users

### PDPA / Local Laws
Each country where Nodbusiness operates may have its own data protection law:
- Ethiopia: Pending data protection legislation — follow GDPR as best practice
- UK: UK GDPR (same as EU GDPR post-Brexit)
- UAE: DIFC Data Protection Law / Federal Decree Law No. 45 of 2021
- Nigeria: NDPR (Nigerian Data Protection Regulation)

---

## 5. Data Subject Request (DSR) Process

When a user requests access, deletion, or export of their data:

```
Step 1: Request received via privacy@nodbusiness.com or in-app form
Step 2: Identity verified (user must be logged in or verify via email OTP)
Step 3: Request logged with timestamp and requester ID
Step 4: Engineering team pulls data export within 10 business days
Step 5: Response sent to verified email address only
Step 6: If deletion: all PII removed from primary DB, backups queued for deletion
        Exception: data we are legally required to retain (financial records 7 years, KYC 5 years)
Step 7: Confirmation sent to user within 30 days of original request
```

---

## 6. Data Breach Response Plan

### Severity Levels
| Level | Definition | Response Time |
|-------|-----------|--------------|
| Critical | Exposure of > 1,000 users' PII or any payment data | 1 hour to containment, 72 hours to regulator notification (GDPR) |
| High | Exposure of < 1,000 users' PII | 4 hours to assessment, 72 hours to regulator if threshold met |
| Medium | Internal data exposed (no PII) | 24 hours to assessment, no regulator notification required |
| Low | Single user data misrouted, no malicious actor | 48 hours, user notified directly |

### Immediate Response Steps
```
Hour 1:
  □ Identify scope (what data, how many users, how long)
  □ Contain the breach (revoke compromised tokens, close vulnerability)
  □ Alert CEO, CTO, legal counsel

Hours 2–24:
  □ Full forensic investigation
  □ Document timeline: when breach occurred, when discovered, when contained
  □ Assess legal notification obligation (GDPR: notify within 72 hours if risk to users)

Days 2–7:
  □ Notify affected users (email with: what happened, what data was exposed, what we're doing)
  □ Notify regulator (if legally required)
  □ Prepare public statement if media-facing
  □ Post-incident review: root cause analysis, prevention plan
```

---

## 7. Third-Party Data Sharing

Nodbusiness shares data with these processors:

| Processor | Data Shared | Purpose | DPA in Place |
|-----------|------------|---------|-------------|
| Neon (PostgreSQL) | All structured data | Database hosting | Yes (standard terms) |
| Vercel | Request logs, session data | Frontend hosting | Yes |
| Railway | Server logs | Backend hosting | Yes |
| Stripe | Payment data, identity for KYC | Payment processing | Yes (Stripe standard) |
| Chapa | Payment data (Africa) | Local payment processing | Review required |
| Resend | Email addresses | Transactional email | Yes |
| Sentry | Error logs (may include IDs) | Error monitoring | Yes |
| OpenAI / Gemini | User query content | AI features | Review required; no PII in prompts |
| Redis (Upstash) | Session tokens, queue data | Caching + queues | Yes |

**Rule:** Never send PII to a third party without a signed DPA (Data Processing Agreement).

---

## 8. Data Minimization Principles

Only collect data that is:
1. **Necessary** for the stated purpose
2. **Relevant** to the user's use of the platform
3. **Limited** to what the purpose requires

**Examples:**
- Do NOT collect date of birth unless KYC requires it
- Do NOT store full address for users who are only buyers (not sellers)
- Do NOT track location continuously — only request when showing location-based results
- Do NOT store credit card numbers — offload to Stripe entirely

---

## 9. DPIA (Data Protection Impact Assessment) — When Required

A DPIA is required before launching any feature that:
- Processes biometric data (face recognition, fingerprints)
- Involves large-scale monitoring of users
- Processes special category data (health, religion, political views)
- Enables tracking across platforms
- Deploys automated decision-making that affects users materially

---

*Owner: CEO (Phase 1), Data Protection Officer/DPO (Phase 2+)*
*Review cycle: Annually, or after any major feature launch or data incident*
*Privacy contact: privacy@nodbusiness.com*
