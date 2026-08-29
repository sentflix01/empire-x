# Nodbusiness — Trust & Safety Strategy

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| AI | Artificial Intelligence |
| AML | Anti-Money Laundering |
| API | Application Programming Interface |
| COD | Cash on Delivery |
| CSAM | Child Sexual Abuse Material |
| GDPR | General Data Protection Regulation |
| IP | Intellectual Property |
| KYC | Know Your Customer |
| ML | Machine Learning |
| PII | Personally Identifiable Information |
| SLA | Service Level Agreement |
| SOP | Standard Operating Procedure |
| T&S | Trust & Safety |
| UGC | User-Generated Content |

---

## 1. Trust & Safety Vision

> **Build the safest, most trustworthy platform for African commerce — where every business is verified, every transaction is protected, and every user feels safe to buy, sell, and connect.**

---

## 2. Risk Taxonomy

| Category | Sub-Categories | Severity |
|----------|----------------|----------|
| **Fraud** | Payment fraud, account takeover, seller fraud, buyer fraud, promo abuse | Critical |
| **Abuse** | Harassment, hate speech, threats, doxxing, spam, impersonation | High |
| **Illegal Content** | CSAM, counterfeit goods, prohibited items, regulated goods | Critical |
| **IP Infringement** | Trademark, copyright, patent, trade secrets | High |
| **Privacy Violations** | Data leaks, unauthorized access, doxxing | Critical |
| **Financial Crime** | Money laundering, sanctions evasion, tax evasion | Critical |
| **Platform Manipulation** | Fake reviews, rating manipulation, bot traffic, vote brigading | High |
| **Safety** | Physical harm, self-harm, violence incitement | Critical |

---

## 3. Content Moderation

### 3.1 Policy Framework

| Content Type | Policy | Action |
|--------------|--------|--------|
| **Hate Speech** | Zero tolerance — protected characteristics | Remove + account action |
| **Harassment** | Targeted abuse, threats, stalking | Remove + warning/suspension |
| **Violence/Physical Harm** | Incitement, instructions, threats | Remove + report to authorities |
| **Self-Harm** | Suicide, self-injury, eating disorders | Resources + wellness check |
| **Sexual Content** | Explicit, non-consensual, CSAM | Remove + report (CSAM) |
| **Illegal Goods** | Drugs, weapons, counterfeit, stolen | Remove + account action |
| **IP Infringement** | Copyright, trademark, patent | DMCA process + repeat offender policy |
| **Spam/Scam** | Phishing, fake listings, promo abuse | Remove + account action |
| **Misinformation** | Health, election, financial harm | Label + reduce distribution |

### 3.2 Moderation Layers

| Layer | Method | Coverage | SLA |
|-------|--------|----------|-----|
| **Automated (AI/ML)** | Classifiers, regex, hash matching | 95%+ of content | <1 sec |
| **Community Reports** | User flagging, prioritized queue | User-flagged | <2 hrs (SEV-1), <24 hrs (SEV-2) |
| **Human Review** | Trained moderators, escalation path | Appeals, edge cases, high-risk | <4 hrs (SEV-1), <24 hrs (SEV-2) |
| **Proactive Detection** | Pattern analysis, network analysis | Emerging threats | Continuous |

### 3.3 Moderation Actions

| Action | Trigger | Appeal |
|--------|---------|--------|
| **Content Removal** | Policy violation | Yes (48h) |
| **Warning** | First minor offense | N/A |
| **Temporary Suspension** | Repeat/severe (24h-30d) | Yes (72h) |
| **Permanent Ban** | Severe/repeat | Yes (30d) |
| **Shadow Ban** | Spam/bot behavior | N/A |
| **Feature Restriction** | Specific feature abuse | Yes |
| **Content Labeling** | Misinformation, sensitive | N/A |

---

## 4. User Verification & Trust

### 4.1 Verification Tiers

| Tier | Requirements | Benefits | Display |
|------|--------------|----------|---------|
| **Unverified** | Email/phone only | Basic access | — |
| **Verified Identity** | Government ID + selfie + liveness | Trust badge, higher limits | Blue shield |
| **Verified Business** | Business registration + tax ID + address | Business badge, higher limits, analytics | Green shield |
| **Top Seller** | 100+ orders, 4.5+ rating, 90% fulfillment | Gold badge, featured placement | Gold shield |
| **Verified Developer** | Identity + tax + 3+ approved templates | Marketplace trust, higher rev share | Purple shield |

### 4.2 KYC/AML

| Trigger | Action | Timeline |
|---------|--------|----------|
| **Wallet withdrawal > $500** | Full KYC (ID + selfie + address) | Before processing |
| **Monthly volume > $10K** | Enhanced KYC (source of funds) | Within 30 days |
| **Suspicious activity** | Enhanced due diligence | Immediate hold |
| **Sanctions screening** | Real-time (ComplyAdvantage/Refinitiv) | Per transaction |
| **PEP screening** | Enhanced monitoring | On identification |

---

## 5. Fraud Prevention

### 5.1 Payment Fraud

| Layer | Technique | False Positive Target |
|-------|-----------|----------------------|
| **Pre-auth** | Device fingerprint, velocity, geo-velocity, BIN, email risk | <0.5% |
| **Auth** | 3DS2, risk-based authentication | <1% |
| **Post-auth** | ML scoring (XGBoost), rules engine | <0.2% |
| **Post-settlement** | Chargeback monitoring, network analysis | <0.1% |

### 5.2 Account Takeover (ATO)

| Signal | Action |
|--------|--------|
| **New device/location** | Step-up auth (OTP/email) |
| **Password reset + login** | Force re-auth, notify user |
| **Credential stuffing** | Rate limit, CAPTCHA, credential check (HIBP) |
| **Session hijacking** | Short JWT (15min), HttpOnly cookies, rotation |

### 5.3 Seller Fraud

| Type | Detection | Action |
|------|-----------|--------|
| **Non-delivery** | Tracking + buyer reports | Suspend payouts, investigate |
| **Fake tracking** | Carrier API validation | Suspend, require proof |
| **Bait-and-switch** | Image/text mismatch detection | Remove listing, warn |
| **Review manipulation** | Graph analysis, timing, IP clustering | Remove reviews, suspend |

---

## 6. Intellectual Property Protection

### 6.1 DMCA Process

| Step | Timeline | Responsible |
|------|----------|-------------|
| **Notice Received** | Acknowledge <24h | Legal/T&S |
| **Content Removal** | <48h (valid notice) | T&S |
| **Counter-Notice** | Accept, notify claimant | Legal |
| **Restoration** | 10-14 days (if no lawsuit) | Legal/T&S |
| **Repeat Infringer** | 3 strikes → account termination | Legal/T&S |

### 6.2 Trademark/Brand Protection

| Tool | Frequency |
|-------|-----------|
| **Brand Monitoring** (BrandShield/Red Points) | Daily |
| **Keyword Alerts** (Google, social) | Real-time |
| **Marketplace Scanning** | Weekly |
| **Takedown Requests** | 48h SLA |

---

## 7. Financial Crime Compliance

### 7.1 AML Program

| Component | Detail |
|-----------|--------|
| **Risk Assessment** | Annual, per jurisdiction |
| **Customer Due Diligence** | Tiered (see Verification Tiers) |
| **Transaction Monitoring** | Real-time rules + ML (thresholds, velocity, structuring) |
| **SAR Filing** | <30 days (suspicious activity) |
| **Sanctions Screening** | Real-time (OFAC, UN, EU, local) |
| **PEP Screening** | Onboarding + ongoing |
| **Training** | Annual (all staff), specialized (T&S, Finance) |
| **Independent Audit** | Annual (external) |

### 7.2 Sanctions & Watchlists

| List | Screening |
|------|-----------|
| **OFAC SDN** | Real-time (API) |
| **UN Consolidated** | Real-time |
| **EU Consolidated** | Real-time |
| **Local (Ethiopia, Kenya, Nigeria)** | Real-time |
| **Internal Deny List** | Real-time |

---

## 8. Incident Response (T&S)

### 8.1 Severity Levels

| SEV | Definition | Response | Escalation |
|-----|------------|----------|------------|
| **SEV-1** | CSAM, imminent harm, active exploitation | 15 min | Founder + Legal + Authorities |
| **SEV-2** | Active fraud ring, data breach, coordinated abuse | 1 hour | T&S Lead + Legal + Engineering |
| **SEV-3** | Single fraud case, harassment, single IP violation | 4 hours | T&S Analyst |
| **SEV-4** | Policy question, low-risk report | 24 hours | T&S Analyst |

### 8.2 Response Playbook (SEV-1 Example: CSAM)

1. **Detect** (AI hash match / report) → Immediate removal
2. **Report** → NCMEC (US), local authorities, hosting provider
3. **Preserve** → Hash, metadata, access logs (legal hold)
4. **Account Action** → Permanent ban, device fingerprint block
5. **Notify** → Founder, Legal, Board (if material)
6. **Postmortem** → 48h, root cause, prevention

---

## 8. Transparency & Reporting

### 8.1 Transparency Report (Quarterly)

| Metric | Reported |
|--------|----------|
| **Content Removals** | By category, country, automation % |
| **Account Actions** | Warnings, suspensions, bans, appeals |
| **Government Requests** | Count, type, compliance rate |
| **IP Removals** | DMCA, trademark, counter-notices |
| **Fraud Prevented** | Volume, value, false positive rate |
| **Response Times** | Median by severity |

### 8.2 Public Resources

| Resource | URL |
|----------|-----|
| **Community Guidelines** | nodbusiness.app/guidelines |
| **Report Abuse** | nodbusiness.app/report |
| **Transparency Report** | transparency.nodbusiness.app |
| **Safety Center** | safety.nodbusiness.app |
| **API for Researchers** | developers.nodbusiness.app/safety |

---

## 9. Trust & Safety Team Structure

| Phase | Roles | Count |
|-------|-------|-------|
| **Phase 1** | T&S Lead (1), Analyst (1), ML Engineer (0.5) | 2.5 |
| **Phase 2** | + Analysts (2), ML Engineer (1), Policy Manager (1) | 5.5 |
| **Phase 3** | + Regional Analysts (4), ML Engineers (2), Investigations Lead (1) | 12.5 |

### 9.1 Key Roles

| Role | Responsibilities |
|------|------------------|
| **T&S Lead** | Strategy, policy, escalation, cross-functional |
| **Policy Manager** | Policy development, regulatory liaison |
| **ML Engineer** | Classifiers, anomaly detection, automation |
| **Analyst** | Queue review, investigations, appeals |
| **Investigations Lead** | Complex fraud, coordinated abuse, law enforcement |
| **Regional Analyst** | Local context, language, cultural nuance |

---

## 10. Budget (Projected)

| Category | Year 1 | Year 2 | Year 3 |
|----------|--------|--------|--------|
| **Team** | $120K | $300K | $600K |
| **Tools (ML, monitoring, case mgmt)** | $30K | $100K | $250K |
| **Vendor (verification, screening)** | $50K | $150K | $400K |
| **Training/Wellness** | $20K | $50K | $100K |
| **Legal/Compliance** | $30K | $60K | $100K |
| **Total** | **$250K** | **$660K** | **$1.45M** |

---

## 10. Key Metrics (Dashboard)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Content Removal Accuracy** | >95% | Precision/Recall |
| **False Positive Rate** | <1% | Appeal overturn rate |
| **Median Response Time (SEV-1)** | <15 min | PagerDuty |
| **Median Response Time (SEV-2)** | <1 hour | Case system |
| **Appeal Overturn Rate** | <5% | Appeals / total |
| **Fraud Loss Rate** | <0.1% GMV | Finance |
| **Chargeback Rate** | <0.5% | Payment providers |
| **Account Takeover Rate** | <0.01% MAU | Security |
| **User Trust Score (Survey)** | >80% | Quarterly NPS |

---

## 11. Regulatory Compliance

| Regulation | Status | Owner |
|------------|--------|-------|
| **Ethiopia Data Protection** | Compliant | DPO |
| **Kenya Data Protection Act** | Compliant | DPO |
| **Nigeria NDPR** | Compliant | DPO |
| **GDPR (EU users)** | Compliant | DPO |
| **PCI DSS SAQ-A** | Compliant (Stripe/Chapa) | Security |
| **AML/KYC (Local)** | Compliant | T&S + Finance |
| **Consumer Protection** | Compliant | Legal + T&S |

---

*Confidential. For Nodbusiness Technologies internal use only.*