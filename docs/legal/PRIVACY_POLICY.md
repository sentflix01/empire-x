# Halehame — Privacy Policy (Draft)

> **Status:** Internal draft — must be reviewed by a qualified data protection specialist before launch.
> **Applicable laws:** GDPR (EU users), CCPA (California users), UK GDPR, and local data protection laws per market.
> **Reference market:** Ethiopian Personal Data Protection framework (in development) — GDPR standards applied.
> Last updated: August 2026

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| PII | Personally Identifiable Information |
| GDPR | General Data Protection Regulation (EU) |
| CCPA | California Consumer Privacy Act (US) |
| DPA | Data Processing Agreement |
| DPO | Data Protection Officer |
| DSR | Data Subject Request |
| JWT | JSON Web Token |
| OTP | One-Time Password |
| IP | Internet Protocol (address) |
| GPS | Global Positioning System |
| TLS | Transport Layer Security |
| KYC | Know Your Customer |

---

## 1. What Data We Collect

### Account Data
- Email address, full name, phone number (required to register)
- Password (stored as bcrypt hash — never in plaintext)
- Google OAuth ID (if using Google login)
- Profile photo, bio, headline, location (optional, user-provided)
- KYC identity documents (required for high-value seller accounts only)

### Business Data
- Business name, description, category, address, contact details
- Product listings, prices, images
- Order history and transaction records

### Usage Data
- Pages visited, features used, time spent (for product improvement)
- Device type, browser, operating system
- IP address (for security and fraud prevention — hashed for storage)

### Location Data
- GPS coordinates (only when you use the Nearby Map feature — with explicit consent per session)
- We do not track location continuously or in the background

### Payment Data
- We do NOT store card numbers, CVV, or full payment details — Stripe and Chapa handle all payment processing
- We store only: transaction reference IDs, amounts, currencies, and status
- Wallet balance and transaction history are stored on our servers

### Communications
- Messages sent through the platform are stored for delivery and dispute resolution
- We do not sell or share message content with third parties, except as required by law

---

## 2. How We Use Your Data

| Purpose | Legal Basis |
|---------|------------|
| Providing the service (account, orders, messages) | Contract performance |
| Fraud detection and security | Legitimate interest |
| Push notifications you opted into | Consent |
| Improving the platform (analytics) | Legitimate interest |
| Marketing emails (only with opt-in) | Consent |
| Complying with applicable law | Legal obligation |
| Tax reporting for platform transactions | Legal obligation |
| Dispute resolution | Legitimate interest |

---

## 3. Data Sharing

We share data with these parties:

| Recipient | Data Shared | Purpose | DPA in Place |
|-----------|------------|---------|-------------|
| **Stripe** | Transaction amounts, buyer email | Payment processing | Yes |
| **Chapa** | Transaction amounts, buyer email | Local payment processing (reference: Ethiopia) | Yes |
| **Resend** | Your email address | Transactional emails | Yes |
| **Sentry** | Error traces (anonymized, no PII) | Bug tracking | Yes |
| **Railway** | All server data | Backend hosting | Yes |
| **Vercel** | Request logs | Frontend hosting | Yes |
| **Neon** | Database content | Database hosting | Yes |
| **Law enforcement** | As legally required with valid legal process | Regulatory compliance | N/A |

We do **not** sell your personal data to advertisers or data brokers. We never will.

---

## 4. Data Retention

| Data type | Retention period |
|-----------|----------------|
| Account data | Until you delete your account + 30-day buffer |
| Order records | 7 years (financial/tax legal requirement) |
| KYC documents | 5 years after account closure (AML legal requirement) |
| Message history | 2 years, then deleted |
| Server logs | 30 days |
| Error logs (Sentry) | 90 days |
| Deleted content | Purged from backups within 30 days |

---

## 5. Your Rights

Rights vary by jurisdiction. The following apply to all users; starred rights (*) apply specifically to EU/UK users under GDPR.

| Right | What it means | How to exercise |
|-------|--------------|----------------|
| Access* | Get a copy of your personal data | Email privacy@halehame.app |
| Rectification* | Correct inaccurate data | Update in Settings, or email us |
| Deletion ("right to be forgotten")* | Delete your account and associated data | Settings → Delete Account, or email us |
| Portability* | Export your data in machine-readable format | Email privacy@halehame.app |
| Object to processing* | Stop certain uses of your data | Email privacy@halehame.app |
| Withdraw consent | Stop marketing emails | Unsubscribe link in any email |
| CCPA opt-out | California users: opt out of sale of data | We don't sell data — document on request |
| Lodge a complaint | Report to your local data protection authority | See regulator details below |

**Response time:** We respond to all data subject requests within **30 days**.

---

## 6. International Data Transfers

Your data may be stored and processed in:
- **United States** — Railway (backend hosting), Vercel (frontend), Neon (database), Stripe
- **European Union** — Resend (email), Sentry (error tracking)
- **Reference (Ethiopia)** — Chapa processes transactions within Ethiopia

For EU/UK users: We rely on Standard Contractual Clauses (SCCs) for transfers outside the EEA/UK.

---

## 7. Children's Privacy

Halehame is not intended for users under 18. We do not knowingly collect data from minors. If you believe a minor has registered, contact us immediately at privacy@halehame.app and we will delete their account within 48 hours.

---

## 8. Security Measures

| Layer | Implementation |
|-------|--------------|
| Passwords | bcrypt hash (12+ rounds) — never stored in plaintext |
| Access tokens | JWT (signed), short-lived (15 min), stored in memory only |
| Refresh tokens | HttpOnly cookies — cannot be read by JavaScript |
| Transport | HTTPS everywhere, TLS 1.2+ enforced |
| Database | Encrypted at rest (Neon managed PostgreSQL) |
| API | Parameterized queries, ALLOWED_TABLES injection prevention |
| IP addresses | SHA-256 hashed before storage |
| File uploads | UUID-named, MIME type validated, stored in Cloudflare R2 |
| Admin access | `role = 'admin'` required + JWT validation on every request |

---

## 9. Cookies

| Cookie | Purpose | Duration | Required |
|--------|---------|----------|---------|
| `access_token` (cookie) | Authentication — HttpOnly | 15 minutes | Yes |
| `refresh_token` (cookie) | Session renewal — HttpOnly | 7 days | Yes |
| `_vercel_jwt` | Vercel preview deployments only | Session | No |

We use **no third-party tracking cookies**. We do not use Google Analytics cookies, Meta Pixel, or advertising cookies.

---

## 10. Regulatory Contact Details

**EU Data Protection Supervisory Authorities:** https://edpb.europa.eu/about-edpb/about-edpb/members_en

**UK — Information Commissioner's Office (ICO):** https://ico.org.uk

**California — California Privacy Protection Agency:** https://cppa.ca.gov

**Reference (Ethiopia):** Ethiopian Communications Authority (ECA) — pending data protection framework

**Halehame Privacy Contact:**
Email: privacy@halehame.app
DPO appointment: Required when EU user base exceeds threshold — under review

---

> ⚠️ This is an internal draft. It must be reviewed and approved by a qualified data protection professional before publication. Requirements differ by jurisdiction.
