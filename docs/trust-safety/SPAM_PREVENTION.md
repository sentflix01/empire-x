# Nodbusiness — Spam Prevention Strategy

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| CAPTCHA | Completely Automated Public Turing test to tell Computers and Humans Apart |
| CDN | Content Delivery Network |
| DNS | Domain Name System |
| HIBP | Have I Been Pwned |
| IP | Internet Protocol |
| ML | Machine Learning |
| NLP | Natural Language Processing |
| PII | Personally Identifiable Information |
| RBL | Real-time Blackhole List |
| SLA | Service Level Agreement |
| SMS | Short Message Service |
| T&S | Trust & Safety |
| UGC | User-Generated Content |

---

## 1. Spam Prevention Strategy

### 1.1 Philosophy
> **Prevent spam at the source, detect early, respond fast, minimize false positives — without degrading legitimate user experience.**

### 1.2 Spam Categories on Nodbusiness

| Category | Examples | Impact |
|---------|----------|--------|
| **Content Spam** | Duplicate posts, keyword stuffing, link farms | Degrades discovery, wastes moderation |
| **Commercial Spam** | Unsolicited promos, affiliate links, drop-shipping | Degrades trust, violates policy |
| **Account Spam** | Fake accounts, bot networks, credential stuffing | Inflates metrics, enables fraud |
| **Message Spam** | Bulk DMs, broadcast abuse, phishing links | Harasses users, enables fraud |
| **Review Spam** | Fake reviews, review swapping, incentivized | Undermines trust, distorts discovery |
| **Referral Abuse** | Self-referral, bot-driven referrals | Inflates metrics, costs credits |

---

## 2. Multi-Layer Defense Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: PREVENTION (At Source)                                 │
├─────────────────────────────────────────────────────────────────┤
│ • Account Creation Barriers                                     │
│ • Rate Limiting (API, Auth, Actions)                            │
│ • CAPTCHA / Proof-of-Work                                       │
│ • Device Fingerprinting                                         │
│ • Email/Phone Verification                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: DETECTION (Real-Time)                                  │
├─────────────────────────────────────────────────────────────────┤
│ • Content Analysis (NLP, ML, Heuristics)                        │
│ • Behavioral Analysis (Velocity, Patterns, Graph)               │
│ • Reputation Systems (IP, Device, Email, Phone)                 │
│ • Network Analysis (Account Clusters, Referral Graphs)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: RESPONSE (Automated + Human)                           │
├─────────────────────────────────────────────────────────────────┤
│ • Automated Actions (Shadowban, Rate Limit, Remove)             │
│ • Human Review Queue (Prioritized)                              │
│ • Account Actions (Warn, Suspend, Ban)                          │
│ • Network Takedowns (Cluster Removal)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer 1: Prevention (At Source)

### 3.1 Account Creation Barriers

| Control | Implementation | Bypass Difficulty |
|---------|----------------|-------------------|
| **Email Verification** | Mandatory, unique, verified via link | Low (disposable emails) |
| **Phone Verification** | Optional (required for wallet/seller) | Medium (VoIP, SIM farms) |
| **CAPTCHA/hCaptcha** | On signup, password reset, sensitive actions | Medium (AI solvers) |
| **Proof-of-Work** | Client-side hashcash (5-10s) on signup | High (costly at scale) |
| **Device Fingerprinting** | FingerprintJS + server correlation | High (hard to spoof consistently) |
| **Invite-Only (Early)** | Optional invite codes for early access | High (social graph) |
| **Honeypot Fields** | Hidden form fields | Low (basic bots) |
| **Time Analysis** | Min time on page, human-like timing | Medium |

### 3.2 Rate Limiting

| Endpoint | Limit | Window | Action |
|----------|-------|--------|--------|
| **Auth (Login/Register)** | 5 attempts | 15 min | Lock 30 min |
| **Password Reset** | 3 requests | 1 hour | Lock 1 hour |
| **API (General)** | 100 req/min | 1 minute | 429 + retry-after |
| **API (Write)** | 20 req/min | 1 minute | 429 + retry-after |
| **Post Creation** | 10/hour | 1 hour | Queue + review |
| **Message Send** | 30/min | 1 minute | Queue + warn |
| **Review Submit** | 5/hour | 1 hour | Queue + review |
| **Referral Generate** | 10/day | 1 day | Block |
| **Search** | 30/sec | 1 second | 429 |

**Tiered Limits:** Higher limits for verified businesses, developers, long-standing users.

### 3.3 Identity Verification Gates

| Action | Required Verification |
|--------|----------------------|
| **Create Showroom** | Email verified |
| **List Product** | Email + Phone verified |
| **Enable Wallet** | Phone + KYC (ID + Selfie) |
| **Withdraw Funds** | Full KYC + 2FA |
| **Run Ads/Featured** | Business Verified |
| **API Access** | Developer Verified |
| **Referral Program** | Email + Phone verified |

---

## 4. Layer 2: Detection (Real-Time)

### 4.1 Content Analysis

| Technique | Implementation | Target |
|-----------|----------------|--------|
| **NLP Classification** | BERT-based classifier (spam, promo, scam) | Text content |
| **Image Analysis** | Perceptual hash (PDQ), NSFW, text-in-image | Images |
| **Link Analysis** | Safe Browsing API, redirect tracking, reputation | URLs |
| **Duplicate Detection** | SimHash + MinHash (near-dupe) | All content |
| **Keyword/Regex** | Spam keywords, promo patterns, phone/email patterns | Fast filter |
| **Language Detection** | FastText (Amharic, English, Swahili, etc.) | All text |

### 4.2 Behavioral Analysis

| Signal | Detection | Threshold |
|--------|-----------|-----------|
| **Velocity** | Actions/time (posts, messages, likes) | >10/min → flag |
| **Burstiness** | Coefficient of variation (inter-arrival) | >3σ → flag |
| **Repetition** | N-gram similarity across posts | >0.8 Jaccard → flag |
| **Timing Patterns** | Regular intervals (bot-like) | χ² test p<0.01 |
| **Session Analysis** | Single session multi-actions | >50 actions/session → flag |

### 4.3 Network & Graph Analysis

| Analysis | Purpose | Action |
|----------|---------|--------|
| **Referral Graph** | Detect self-referral, circles, bots | Cluster removal |
| **Co-Action Graph** | Coordinated likes/shares/comments | Shadowban cluster |
| **IP/Device Clusters** | Multi-account on same device/IP | Verify / suspend |
| **Referral Chain** | Deep chains (>3 hops) | Audit / limit |
| **Review Graph** | Reciprocal reviews, swap rings | Remove reviews |

### 4.4 Reputation Systems

| Entity | Signals | Score Range | Action Threshold |
|--------|---------|-------------|------------------|
| **IP Address** | RBL, geo, VPN/proxy, history | 0-100 | <30 → challenge |
| **Device Fingerprint** | Entropy, consistency, spoofing | 0-100 | <40 → challenge |
| **Email Domain** | Disposable, age, reputation | 0-100 | <20 → block |
| **Phone Number** | VoIP, carrier, porting history | 0-100 | VoIP → challenge |
| **Account Age** | Days since creation | 0-100 | <7 days → stricter |
| **Action History** | Reports, violations, trust | 0-100 | <30 → stricter |

---

## 5. Layer 3: Response (Automated + Human)

### 5.1 Automated Actions

| Trigger | Action | Notification |
|---------|--------|--------------|
| **High-Confidence Spam** | Shadowban (content invisible to others) | Silent |
| **Velocity Violation** | Rate limit (exponential backoff) | In-app toast |
| **Duplicate Content** | Remove duplicates, keep first | In-app notice |
| **Malicious Link** | Remove link, warn user | In-app warning |
| **Suspicious Login** | Revoke sessions, force re-auth | Email + push |
| **Credential Leak (HIBP)** | Force password reset | Email + in-app |
| **New Device/Location** | Step-up auth (OTP) | Push + email |

### 5.2 Human Review Queue

| Priority | Queue | SLA | Reviewers |
|----------|-------|-----|-----------|
| **SEV-1 (CSAM, Terrorism, Violence)** | Critical | 15 min | L1 + Legal |
| **SEV-2 (Fraud, ATO, Threats, Hate)** | High | 1 hour | L1 + Senior |
| **SEV-3 (Harassment, IP, Medium Spam)** | Standard | 4 hours | L1 |
| **SEV-4 (Low Spam, Quality)** | Low | 24 hours | L1 |

### 5.3 Account Actions

| Action | Trigger | Duration | Appeal |
|--------|---------|----------|--------|
| **Warning** | First minor offense | Record only | N/A |
| **Content Removal** | Policy violation | Permanent | Yes |
| **Shadowban** | Spam, bot-like | Until behavior stops | No (auto-review) |
| **Feature Restriction** | Repeat abuse (posting, messaging) | 24h-30d | Yes |
| **Temporary Suspension** | Severe/repeat | 24h-30d | Yes |
| **Permanent Ban** | CSAM, terrorism, severe fraud | Permanent | Yes (30d) |
| **Verification Required** | Suspicious activity | Until verified | Yes |

### 5.4 Network Takedowns

| Trigger | Action |
|---------|--------|
| **Coordinated Spam Ring** | Identify cluster → suspend all → investigate |
| **Bot Network** | Device/IP cluster → mass suspend → investigate |
| **Review Swap Ring** | Review graph → remove reviews → suspend accounts |
| **Referral Abuse Ring** | Referral graph → revoke credits → suspend |

---

## 5. Specific Spam Type Defenses

### 5.1 Review Spam

| Defense | Implementation |
|---------|----------------|
| **Purchase Verification** | Only verified buyers can review |
| **Rate Limit** | 5 reviews/day, 20/week |
| **Similarity Check** | SimHash on review text |
| **Timing Analysis** | Burst reviews → flag |
| **Reciprocity Check** | A reviews B, B reviews A → flag |
| **Incentive Detection** | "5 stars for discount" → NLP flag |

### 5.2 Referral Abuse

| Defense | Implementation |
|---------|----------------|
| **Self-Referral Block** | Same IP/device/account → block |
| **Referral Chain Depth** | Max 3 hops |
| **Velocity Limit** | 10 referrals/day per user |
| **Quality Gate** | Referred user must complete action (purchase, publish) |
| **Credit Clawback** | If referred account banned → revoke credits |

### 5.3 Message Spam

| Defense | Implementation |
|---------|----------------|
| **Rate Limit** | 30 messages/min, 200/hour |
| **Duplicate Detection** | Same message to >5 users → flag |
| **Link Scanning** | Safe Browsing + custom ML |
| **Unsolicited Bulk** | >10 DMs to non-contacts/hour → shadowban |
| **Report Button** | Every message, one-click |

### 5.4 Account Creation Spam

| Defense | Implementation |
|---------|----------------|
| **Proof-of-Work** | Client-side hashcash (difficulty scales with risk) |
| **Device Reputation** | Fingerprint + IP reputation check |
| **Email Reputation** | Disposable domain block, domain age, MX check |
| **Phone Verification** | Required for high-risk (wallet, seller) |
| **Invite Codes** | Optional for viral loops |

---

## 6. Machine Learning Pipeline

### 6.1 Model Architecture

| Model | Type | Features | Latency | Update |
|-------|------|----------|---------|--------|
| **Spam Classifier (Text)** | DistilBERT fine-tuned | Text, metadata, user embeddings | <50ms | Weekly |
| **Spam Classifier (Image)** | EfficientNet + PDQ | Image, perceptual hash | <100ms | Weekly |
| **Fraud Scorer** | XGBoost | Behavioral, device, network, transaction | <20ms | Daily |
| **Account Risk Scorer** | LightGBM | Device, IP, email, phone, history | <10ms | Hourly |
| **Referral Quality** | Graph Neural Net | Referral graph, actions | <50ms | Daily |

### 6.2 Training Pipeline

| Stage | Frequency | Data |
|-------|-----------|------|
| **Data Collection** | Continuous | User actions, labels, outcomes |
| **Labeling** | Daily (auto + human) | 10K+ samples/day |
| **Training** | Weekly (full), Daily (incremental) | GPU cluster |
| **Validation** | Holdout + temporal split | AUC, F1, Precision@Recall |
| **Deployment** | Canary (5%) → Full | MLflow + Triton |

### 6.3 Model Monitoring

| Metric | Target | Alert |
|--------|--------|-------|
| **AUC** | >0.95 | <0.90 |
| **Precision@90%Recall** | >0.90 | <0.80 |
| **False Positive Rate** | <1% | >2% |
| **Latency (p99)** | <100ms | >200ms |
| **Drift (PSI)** | <0.1 | >0.2 |

---

## 6. Operational Playbooks

### 6.1 Spam Surge Response

```
1. DETECT: Alert (spam rate >2x baseline)
2. TRIAGE: Identify vector (accounts, content, channel)
3. MITIGATE:
   - Increase rate limits globally
   - Enable stricter CAPTCHA
   - Deploy emergency ML model
   - Block suspicious IP ranges
4. INVESTIGATE: Root cause (new botnet, leaked credentials, etc.)
5. HARDEN: Permanent rule updates, model retraining
6. POSTMORTEM: Document, share, prevent recurrence
```

### 6.2 Referral Abuse Surge

```
1. DETECT: Referral credit spike, new account cluster
2. ANALYZE: Referral graph, device/IP clusters, action patterns
3. MITIGATE:
   - Pause referral credits globally
   - Suspend cluster accounts
   - Increase referral friction (verification, depth limit)
4. INVESTIGATE: Attribution (botnet, farm, insider)
5. REMEDIATE: Clawback credits, ban cluster, harden gates
```

---

## 7. Metrics & Monitoring

### 7.1 Operational Metrics

| Metric | Target | Alert |
|--------|--------|-------|
| **Spam Rate (Content)** | <0.5% of submissions | >1% |
| **Spam Rate (Messages)** | <0.1% of messages | >0.5% |
| **Fake Account Rate** | <0.1% of signups | >0.5% |
| **Review Spam Rate** | <1% of reviews | >2% |
| **Referral Abuse Rate** | <0.5% of referrals | >1% |
| **False Positive Rate** | <0.1% | >0.5% |
| **Auto-Action Precision** | >99% | <98% |

### 7.2 Business Impact Metrics

| Metric | Target |
|--------|--------|
| **User Reports (Spam)** | <5/1000 MAU |
| **Support Tickets (Spam)** | <10/week |
| **Churn from Spam** | <0.1% |
| **Revenue Loss (Fraud)** | <0.01% GMV |
| **Moderation Cost/User** | <$0.01 |

---

## 7. Continuous Improvement

| Process | Frequency | Owner |
|---------|-----------|-------|
| **Model Retraining** | Weekly (full), Daily (incremental) | ML Engineer |
| **Rule Updates** | Weekly | T&S Lead |
| **Threshold Tuning** | Weekly | T&S Lead |
| **Feature Engineering** | Monthly | ML Engineer |
| **Adversarial Testing** | Quarterly | Security + ML |
| **Spam Trend Analysis** | Monthly | T&S Lead |
| **Adversary Emulation** | Quarterly | Red Team |

---

*Confidential. For Nodbusiness Technologies internal use only.*