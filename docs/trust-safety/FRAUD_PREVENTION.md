# Halehame — Fraud Prevention Playbook

> **How Halehame detects, prevents, and responds to fraud across the marketplace, payments, and identity systems.**
> Fraud prevention is a revenue protection function as much as a safety one — every dollar of fraud costs the platform trust, money, and regulatory exposure.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| GMV | Gross Merchandise Value |
| CVV | Card Verification Value |
| BIN | Bank Identification Number — first 6 digits of a card number |
| IP | Internet Protocol (address) |
| VPN | Virtual Private Network |
| TOR | The Onion Router — anonymizing network |
| KYC | Know Your Customer |
| AML | Anti-Money Laundering |
| SAR | Suspicious Activity Report |
| ML | Machine Learning |
| API | Application Programming Interface |
| OTP | One-Time Password |
| MFA | Multi-Factor Authentication |
| SLA | Service Level Agreement |
| PSP | Payment Service Provider |
| 3DS | 3D Secure — additional authentication layer for card payments |
| IBAN | International Bank Account Number |
| ACH | Automated Clearing House |

---

## 1. Fraud Risk Matrix

Understanding the likelihood and impact of each fraud type:

| Fraud Type | Likelihood | Impact | Priority |
|-----------|-----------|--------|---------|
| Chargeback fraud (buyer claims non-delivery) | High | Medium | P1 |
| Stolen card payments | High | High | P1 |
| Fake seller / non-delivery | High | High | P1 |
| Account takeover | Medium | High | P1 |
| Fake reviews / review bombing | High | Medium | P2 |
| Promotion / coupon abuse | Medium | Low | P3 |
| Money laundering via marketplace | Low | Critical | P1 |
| Identity fraud (KYC bypass) | Low | High | P2 |
| Phishing targeting Halehame users | Medium | High | P2 |
| Affiliate fraud | Low | Medium | P3 |

---

## 2. Payment Fraud Prevention

### Card Testing
**What it is:** Fraudsters use stolen card lists and test tiny charges ($0.01–$1.00) on platforms to validate which cards are live.

**Prevention:**
```
□ Rate limit payment attempts: max 3 failed cards per account per hour
□ Max 5 payment attempts per 10 minutes per IP address
□ CAPTCHA after 2 failed payment attempts
□ Alert on > 5 declined payments from same device fingerprint
□ Stripe Radar rules block known card testing patterns
```

### Stolen Card Fraud
**What it is:** Fraudsters use stolen payment cards to purchase goods/services.

**Prevention:**
```
□ Stripe Radar ML (Machine Learning) fraud scoring on every transaction
□ 3DS (3D Secure) required on transactions over $100 (adds extra authentication step)
□ AVS (Address Verification System) check enabled
□ CVV check required on all card payments
□ Block transactions from TOR and known VPN exit nodes (for high-risk transactions)
□ Velocity rules: max 3 transactions per card per day
□ Flag mismatches between billing country and IP country
□ Suspicious BIN list maintained and blocked
```

### High-Risk Transaction Signals (auto-hold for review)
```
□ New account (< 7 days old) + first purchase > $200
□ Same IP used by > 3 different cards in 24 hours
□ Shipping address changed after payment
□ Purchase of high-value digital goods (gift cards, premium subscriptions) on new account
□ Unusual time pattern (3AM in user's timezone)
□ Multiple purchases in rapid succession (< 5 minutes apart)
□ Transaction country mismatch with registered country
□ Device fingerprint previously associated with fraud
```

---

## 3. Marketplace Fraud Prevention

### Seller Fraud (non-delivery, fake goods)

**New Seller Controls:**
```
Phase 1 — Probationary (first 30 days or < 10 orders):
  → Payouts held for 7 days after delivery confirmation
  → Maximum order value capped at $500
  → Cannot use "featured" listings
  → Manually reviewed if any dispute filed

Phase 2 — Standard (10–100 completed orders, < 1% dispute rate):
  → Standard 3-day payout hold
  → No order value cap
  → Eligible for featured listings

Phase 3 — Trusted (100+ orders, < 0.5% dispute rate, verified identity):
  → 1-day payout hold
  → Priority listing in search
  → Verified badge
```

**Listing Fraud Detection:**
```
□ Image reverse-search to detect stolen product photos
□ Price anomaly detection (same product listed at 80% below market average → flag)
□ Duplicate listing detection (same seller, same product listed multiple times)
□ Category-price mismatch (luxury goods listed at < 10% of typical price → flag)
□ AI-generated listing detection (suspiciously perfect text with no seller history)
```

### Buyer Fraud (chargeback abuse)

**Friendly Fraud (buyer receives goods but files chargeback):**
```
Prevention:
  □ Delivery confirmation required before funds released to seller
  □ Photo confirmation on delivery (for high-value items)
  □ Dispute window: buyer has 7 days after delivery to raise issue
  □ After 7 days, funds auto-release to seller — harder for chargeback to succeed

Response to chargeback:
  □ Gather evidence: order record, delivery confirmation, communication history
  □ Submit evidence to Stripe within dispute window (typically 7 days)
  □ If buyer wins chargebacks > 3 times: account suspended pending review
```

**Chargeback Rate Monitoring:**
```
Target: < 0.5% of GMV (Stripe will review accounts at 0.8%+, close at 1%)
Alert threshold: 0.4% — triggers internal review
Action at 0.6%: Increase review holds, tighten new seller controls
Action at 0.8%: Contact Stripe, implement emergency controls
```

---

## 4. Account Fraud Prevention

### Account Takeover (ATO)
**What it is:** A fraudster gains access to a legitimate user's account.

**Prevention:**
```
□ MFA (Multi-Factor Authentication) available (encourage, eventually require for sellers)
□ Login anomaly detection: new device + new location → OTP (One-Time Password) challenge
□ Impossible travel detection: login from two countries within 2 hours → lock + verify
□ Password breach detection: check against HaveIBeenPwned API on login
□ Session invalidation: all sessions invalidated on password change
□ Email confirmation required for: password change, email change, withdrawal request
□ Rate limit: max 10 login attempts per hour per IP
□ Progressive lockout: 15 min, 1 hour, 24 hours, permanent (with human review)
```

**Response to Confirmed ATO:**
```
Step 1: Lock account immediately
Step 2: Invalidate all active sessions and API tokens
Step 3: Send email to account's registered email with verification link
Step 4: Hold any pending payouts for 72 hours
Step 5: Internal review of all transactions since estimated takeover time
Step 6: If transactions were fraudulent: initiate refunds, notify affected parties
Step 7: User re-verifies identity before account restored
```

### Fake Account Creation
```
□ Email verification required before any action
□ Phone number verification required before selling
□ Device fingerprinting to detect same device registering multiple accounts
□ IP-based rate limiting: max 3 accounts per IP per 24 hours
□ Behavioral analysis: accounts completing profile in < 30 seconds → flag as bot
□ Honeypot fields in registration form (bots fill hidden fields; humans don't)
□ CAPTCHA on registration (invisible or challenge-based)
```

### Multi-Accounting
```
Indicators:
  → Same device ID used by multiple accounts
  → Same bank account linked to multiple seller accounts
  → Same IP address used by multiple accounts that transact with each other
  → Similar writing style across accounts

Policy:
  → Legitimate multi-account use (e.g., business + personal): allowed with disclosure
  → Multi-accounting to evade bans or manipulate reviews: permanent ban on all accounts
```

---

## 5. Review Fraud Prevention

### Fake Review Detection
```
Signals of fake reviews:
  □ Reviewer has never purchased from the seller
  □ Reviewer account < 7 days old
  □ Multiple reviews from same IP/device
  □ Review text is generic (NLP analysis detects templated text)
  □ Cluster of 5-star reviews posted within hours of each other
  □ Reviewer only reviews this one seller (no other activity)

Actions:
  □ Reviews from non-verified purchasers are marked "unverified" (shown separately)
  □ Confirmed fake reviews removed without buyer notification
  □ Seller warned; repeat offense = review score penalized
  □ If systematic fake review campaign: seller suspended
```

### Review Bombing
**What it is:** A coordinated campaign to give a seller/business many negative reviews quickly.

```
Detection: > 5 negative reviews in 24 hours from accounts with no prior interaction with seller
Action: Auto-suspend new reviews, manually review all flagged reviews
Outcome: Remove coordinated fake negatives; keep legitimate negatives
```

---

## 6. Promotional / Coupon Fraud

```
Coupon abuse prevention:
  □ One coupon per email address per promotion
  □ One coupon per payment method per promotion
  □ Coupon value caps (max $X per transaction)
  □ Rate limit on coupon code attempts (prevent brute force)
  □ Coupons expire within 30 days

Referral fraud prevention:
  □ Referral credit only paid when referred user makes first real purchase (not just sign up)
  □ Referred user must use different payment method from referrer
  □ Referrals between same IP addresses flagged for review
  □ Maximum referral credit per user per month
```

---

## 7. Fraud Response Playbook

### When Fraud Is Detected
```
Minute 0–5:
  → Automated system flags or blocks transaction/account
  → Ticket created in fraud queue
  → Affected funds held (not released to fraudster)

Hour 1:
  → Fraud analyst (or CEO in Phase 1) reviews the case
  → Determine: confirmed fraud / false positive / needs more info

Hours 1–4:
  → Confirmed fraud: execute enforcement action (account ban, funds reversed)
  → False positive: clear flag, document reason, resume account
  → Needs more info: contact user for verification (24-hour response window)

Day 1:
  → Affected parties notified (buyer refunded if applicable)
  → Root cause noted in fraud log
  → Stripe/Chapa notified if payment fraud involved

Day 7:
  → Case closed and added to fraud pattern database
  → System rules updated if new pattern detected
```

---

## 8. Fraud Metrics Dashboard

Track these metrics weekly:

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Chargeback rate | < 0.5% of GMV | > 0.4% |
| Fraud loss rate | < 0.1% of GMV | > 0.08% |
| Account takeover rate | < 0.01% of MAU | > 0.005% |
| Fake review removal rate | — | Track trend |
| Dispute rate | < 2% of orders | > 1.5% |
| Seller suspension rate | — | Track trend |
| New account fraud rate | — | Track trend |

---

*Owner: CEO / Head of T&S (Phase 1), Dedicated Fraud team (Phase 2+)*
*Review cycle: Monthly metrics review; policy updated quarterly*
*Fraud incidents: fraud@halehame.com*
