# Empire X — Privacy Policy (Draft)

> **Status:** Internal draft — must be reviewed by a data protection specialist before launch.
> **Applicable laws:** Ethiopian Personal Data Protection Proclamation (pending), GDPR (for EU users), CCPA (for California users).
> **Last updated:** August 2026

---

## 1. What Data We Collect

### Account Data
- Email address, full name, phone number (required to register)
- Password (stored as bcrypt hash — never in plaintext)
- Google OAuth ID (if using Google login)
- Profile photo, bio, headline, location (optional, user-provided)

### Business Data
- Business name, description, category, address, contact details
- Product listings, prices, images
- Order history and transaction records

### Usage Data
- Pages visited, features used, time spent (for product improvement)
- Device type, browser, operating system
- IP address (for security and fraud prevention)

### Location Data
- GPS coordinates (only when you use the Nearby Map feature — with explicit consent)
- We do not track location continuously or in the background

### Payment Data
- We do NOT store card numbers or full payment details
- Stripe and Chapa handle payment processing; we store only transaction references
- Wallet balance and transaction history are stored on our servers

### Communications
- Messages sent through the platform are stored for delivery and dispute resolution
- We do not sell or share message content with third parties

---

## 2. How We Use Your Data

| Purpose | Legal Basis |
|---|---|
| Providing the service (account, orders, messages) | Contract performance |
| Fraud detection and security | Legitimate interest |
| Push notifications you opted into | Consent |
| Improving the platform (analytics) | Legitimate interest |
| Marketing emails (only with opt-in) | Consent |
| Complying with Ethiopian law | Legal obligation |
| Tax reporting for platform transactions | Legal obligation |

---

## 3. Data Sharing

We share data with:

| Recipient | What | Why |
|---|---|---|
| **Stripe** | Transaction amounts, buyer email | Payment processing |
| **Chapa** | Transaction amounts, buyer email | Payment processing |
| **Resend / SMTP** | Your email address | Sending transactional emails |
| **Sentry** | Error traces (no PII) | Bug tracking |
| **Railway / Vercel / Neon** | All data | Infrastructure hosting |
| **Ethiopian authorities** | As legally required | Law enforcement requests |

We do **not** sell your personal data to advertisers or data brokers.

---

## 4. Data Retention

| Data type | Retention period |
|---|---|
| Account data | Until you delete your account |
| Order records | 7 years (Ethiopian commercial law requirement) |
| Message history | 1 year after account deletion |
| Server logs | 90 days |
| Deleted content | 30 days (backup purge window) |

---

## 5. Your Rights

Depending on your jurisdiction, you may have the right to:

- **Access** a copy of your personal data
- **Correct** inaccurate data
- **Delete** your account and data (subject to legal hold requirements)
- **Export** your data in a portable format
- **Object** to certain processing (e.g., marketing)
- **Withdraw consent** for optional data uses

To exercise these rights: **privacy@empirex.app**

We will respond within **30 days**.

---

## 6. Children's Privacy

Empire X is not intended for users under 18. We do not knowingly collect data from minors. If you believe a minor has registered, contact us immediately.

---

## 7. International Transfers

Your data may be stored and processed in:
- **United States** (Railway, Vercel, Neon, Stripe)
- **European Union** (Sentry, Resend)
- **Ethiopia** (Chapa)

We ensure appropriate safeguards for cross-border transfers.

---

## 8. Security Measures

- Passwords: bcrypt hash (never plaintext)
- Tokens: JWT (RSA-signed), stored in localStorage with HttpOnly Cookie transition planned
- HTTPS everywhere (TLS 1.2+ enforced)
- Database: encrypted at rest (Neon managed PostgreSQL)
- API: parameterized queries, ALLOWED_TABLES allowlist
- Backups: daily automated, 7-day retention
- Access: admin panel requires `role = 'admin'` + JWT

---

## 9. Cookies

| Cookie | Purpose | Required |
|---|---|---|
| `access_token` | Authentication session | Yes |
| `_vercel_jwt` | Vercel preview deployments | No |
| No tracking cookies | We use no third-party analytics cookies | — |

---

## 10. Contact & DPO

**Data Protection inquiries:**  
Email: privacy@empirex.app  
Address: Addis Ababa, Ethiopia

---

> ⚠️ This is a draft. It must be reviewed and approved by a qualified data protection professional before publication.
