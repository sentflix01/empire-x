# Nodbusiness — GDPR Compliance Audit

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Status:** Compliant (Continuous Monitoring)
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| DPA | Data Processing Agreement |
| DPIA | Data Protection Impact Assessment |
| DPO | Data Protection Officer |
| DSR | Data Subject Request |
| EEA | European Economic Area |
| GDPR | General Data Protection Regulation |
| LIA | Legitimate Interests Assessment |
| PII | Personally Identifiable Information |
| ROP | Records of Processing Activities |
| SCC | Standard Contractual Clauses |
| SLA | Service Level Agreement |
| ToS | Terms of Service |

---

## 1. GDPR Applicability

| Criterion | Status | Detail |
|-----------|--------|--------|
| **Establishment in EU** | No | HQ in Ethiopia |
| **Targeting EU Residents** | Yes | Diaspora customers, EU businesses |
| **Monitoring Behavior** | Yes | Analytics, tracking (with consent) |
| **Article 27 Representative** | Required | Appointed: [EU Rep Name], [Address] |

**Conclusion:** GDPR applies (Article 3.2). Full compliance required.

---

## 2. Lawful Basis Register

| Processing Activity | Personal Data | Lawful Basis (Art. 6) | Legitimate Interest (if Art. 6.1.f) |
|---------------------|---------------|----------------------|-------------------------------------|
| **Account Registration** | Name, email, phone, password hash | 6.1.b (Contract) | — |
| **Identity Verification** | Gov ID, selfie, liveness | 6.1.c (Legal obligation - AML) | — |
| **Showroom Creation** | Business info, content, images | 6.1.b (Contract) | — |
| **Order Processing** | Buyer/seller info, address, payment | 6.1.b (Contract) | — |
| **Payment Processing** | Financial data, transaction history | 6.1.b + 6.1.c | — |
| **Wallet Operations** | Balance, transactions, KYC | 6.1.b + 6.1.c | — |
| **Messaging/Chat** | Messages, contacts | 6.1.b (Contract) | — |
| **Analytics (Product)** | Usage, events, device info | 6.1.f (Legitimate Interest) | LIA documented |
| **Marketing Communications** | Email, push, in-app | 6.1.a (Consent) | Opt-in required |
| **Fraud Prevention** | Device, IP, velocity, behavior | 6.1.f (Legitimate Interest) | LIA documented |
| **Security Monitoring** | Logs, IP, device, actions | 6.1.f (Legitimate Interest) | LIA documented |
| **Legal Compliance** | All categories | 6.1.c (Legal Obligation) | — |

---

## 3. Special Category Data (Art. 9)

| Data Type | Collected? | Basis (Art. 9.2) | Safeguards |
|-----------|------------|------------------|------------|
| **Biometric (liveness)** | Yes (verification) | 9.2.a (Explicit Consent) | Encrypted, auto-delete post-verification |
| **Health** | No | — | — |
| **Racial/Ethnic** | No | — | — |
| **Political/Religious** | No | — | — |
| **Genetic** | No | — | — |
| **Sexual Orientation** | No | — | — |
| **Trade Union** | No | — | — |
| **Criminal Convictions** | No (AML screening only) | 9.2.g (Substantial Public Interest) | Encrypted, access-controlled |

---

## 4. Data Subject Rights Implementation

| Right (Art.) | Implementation | API/Interface | SLA |
|--------------|----------------|---------------|-----|
| **Access (15)** | Dashboard export + email | `GET /api/v1/user/export` | 30 days |
| **Rectification (16)** | Profile edit + API | `PATCH /api/v1/user/profile` | 10 days |
| **Erasure (17)** | Anonymize (retain legal) | `DELETE /api/v1/user/account` | 30 days |
| **Restriction (18)** | Privacy flags | `PATCH /api/v1/user/privacy` | 10 days |
| **Portability (20)** | JSON export | `GET /api/v1/user/export?format=json` | 30 days |
| **Objection (21)** | Opt-out flags | Privacy settings | Immediate |
| **Automated Decision (22)** | Human review available | Appeal process | 30 days |

**DSR Portal:** `https://nodbusiness.app/privacy/requests` (authenticated)

---

## 5. Records of Processing Activities (ROPA - Art. 30)

| Processing Activity | Controller/Processor | Categories | Recipients | Transfers | Retention | Security |
|---------------------|---------------------|------------|------------|-----------|-----------|----------|
| **User Accounts** | Controller | Identity, contact, auth | Sub-processors (Auth) | SCCs (US) | Account + 90d | Encryption, MFA |
| **Payments** | Controller | Financial, transaction | Stripe, Chapa, Flutterwave | SCCs/adequacy | 7 years | Encryption, tokenization |
| **Wallet** | Controller | Financial, KYC | Sub-processors | SCCs/adequacy | 7 years | Field-level encryption |
| **Marketplace** | Controller | Business, products, reviews | Developers, buyers | SCCs | Account + 1yr | Encryption, access control |
| **Messaging** | Controller | Messages, contacts | Sub-processors (Socket) | SCCs | Account + 1yr | Encryption |
| **Analytics** | Controller | Usage, device, behavior | Analytics processors | SCCs | 2 years | Pseudonymization |
| **Marketing** | Controller | Contact, preferences | Email/push providers | SCCs | Until withdrawal | Consent logs |
| **Fraud/Security** | Controller | Device, IP, behavior | Security processors | SCCs | 2 years | Encryption, access control |

---

## 6. Data Protection Impact Assessments (DPIA - Art. 35)

| Processing | High Risk? | DPIA Status | Key Mitigations |
|------------|------------|-------------|-----------------|
| **Biometric Verification** | Yes | ✅ Completed | Explicit consent, auto-delete, encryption |
| **AI Profiling (Pricing/Discovery)** | Yes | ✅ Completed | Transparency, opt-out, human review |
| **Fraud Scoring (Automated)** | Yes | ✅ Completed | Human review, appeal, data minimization |
| **Large-Scale Monitoring** | Yes | ✅ Completed | Purpose limitation, retention limits |
| **Cross-Border Transfers** | Yes | ✅ Completed | SCCs, supplementary measures |
| **Wallet/Financial Data** | Yes | ✅ Completed | Field-level encryption, audit logs |
| **Biometric (Future)** | Yes | 🟡 Planned | Consent, encryption, deletion |

**DPIA Template:** `docs/compliance/DPIA_TEMPLATE.md`

---

## 7. International Transfers (Chapter V)

| Transfer | Mechanism | Supplementary Measures | Review Date |
|------------|-----------|------------------------|-------------|
| **Neon (PostgreSQL) - EU/US** | SCCs (2021/914) | Encryption, access controls, no bulk access | Annual |
| **Upstash (Redis) - EU/US** | SCCs | Encryption, access controls | Annual |
| **Cloudflare (R2/CDN) - Global** | SCCs + Adequacy (partial) | Encryption, edge processing | Annual |
| **Vercel (Frontend) - Global** | SCCs | Encryption, edge functions | Annual |
| **Railway (Backend) - US/EU** | SCCs | Encryption, private networking | Annual |
| **Stripe - US/EU** | SCCs + Adequacy | PCI DSS, tokenization | Annual |
| **Chapa - Ethiopia** | Local adequacy | Local law compliance | Annual |
| **Flutterwave - Kenya/Nigeria** | SCCs + Local | Local compliance, encryption | Annual |
| **SendGrid - US/EU** | SCCs | Encryption, suppression lists | Annual |
| **Firebase - US** | SCCs | Encryption, FCM tokens | Annual |

**Transfer Impact Assessments (TIA):** Completed for all high-risk transfers.

---

## 8. Data Subject Rights - Operational

### 8.1 DSR Workflow

```
1. REQUEST RECEIVED (Portal/Email)
       │
       ▼
2. VERIFY IDENTITY (2FA / Email / ID)
       │
       ▼
3. LOG IN DSR REGISTER (Automated)
       │
       ▼
4. ROUTE TO OWNER (Privacy Team)
       │
       ▼
5. EXECUTE (Automated + Manual)
       │
       ▼
6. VERIFY COMPLETION (Automated checks)
       │
       ▼
7. RESPOND TO USER (Portal + Email)
       │
       ▼
8. CLOSE & LOG (Audit trail)
```

### 8.2 SLA Compliance

| Right | Target | Current Avg | Breach Count (Q2 2026) |
|-------|--------|-------------|------------------------|
| **Access** | 30 days | 8 days | 0 |
| **Rectification** | 10 days | 3 days | 0 |
| **Erasure** | 30 days | 12 days | 0 |
| **Portability** | 30 days | 10 days | 0 |
| **Objection** | Immediate | Instant | 0 |
| **Restriction** | 10 days | 4 days | 0 |

---

## 9. Security Measures (Art. 32)

| Measure | Implementation | Verification |
|---------|----------------|--------------|
| **Encryption at Rest** | AES-256 (DB, R2, backups) | Annual audit |
| **Encryption in Transit** | TLS 1.3 everywhere | Qualys SSL Labs A+ |
| **Field-Level Encryption** | AES-256-GCM (PII, credentials) | Code review |
| **Pseudonymization** | Hashing/tokenization (analytics) | Code review |
| **Access Control** | RBAC, MFA, least privilege | Quarterly review |
| **Vulnerability Mgmt** | SAST/DAST/SCA, pen test | CI/CD + Annual |
| **Incident Response** | Runbooks, PagerDuty, 15-min SEV-1 | Quarterly drill |
| **Backup/Recovery** | Daily pg_dump to R2, weekly test | Weekly test |
| **Staff Training** | Annual GDPR + Security | Annual + onboarding |

---

## 9. Breach Notification (Art. 33-34)

| Scenario | Authority (72h) | Data Subjects (Without Delay) |
|----------|-----------------|-------------------------------|
| **Confirmed PII Breach** | ✅ DPA/Authority | ✅ High risk |
| **Encrypted Data Only** | ✅ If keys compromised | ❌ Low risk |
| **Internal Access Only** | ❌ No external exposure | ❌ No risk |
| **Test Data** | ❌ Not real PII | ❌ N/A |

**Process:** Detect → Triage (15m) → Contain → Assess Risk → Notify (72h) → Document → Postmortem

---

## 10. Vendor Management (Art. 28)

| Processor | DPA Signed | SCCs | Audit Rights | Last Review |
|-----------|------------|------|--------------|-------------|
| **Neon** | ✅ | ✅ | ✅ | 2026-06 |
| **Upstash** | ✅ | ✅ | ✅ | 2026-06 |
| **Cloudflare** | ✅ | ✅ | ✅ | 2026-06 |
| **Vercel** | ✅ | ✅ | ✅ | 2026-06 |
| **Railway** | ✅ | ✅ | ✅ | 2026-06 |
| **Stripe** | ✅ | ✅ | ✅ | 2026-06 |
| **Chapa** | ✅ | N/A (local) | ✅ | 2026-06 |
| **Flutterwave** | ✅ | ✅ | ✅ | 2026-06 |
| **SendGrid** | ✅ | ✅ | ✅ | 2026-06 |
| **Firebase** | ✅ | ✅ | ✅ | 2026-06 |

**Annual Review Cycle:** Q2 each year

---

## 10. Compliance Dashboard

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **DSR Response Time** | <30 days | 8 days avg | ✅ |
| **DPIA Coverage** | 100% high-risk | 100% | ✅ |
| **ROPA Current** | Quarterly review | Current | ✅ |
| **DPA Coverage** | 100% processors | 100% | ✅ |
| **SCC Coverage** | 100% transfers | 100% | ✅ |
| **Staff Training** | 100% annual | 95% | 🟡 |
| **DPIA Reviews** | Annual | On schedule | ✅ |
| **Breach Response** | <72h | 0 breaches | ✅ |
| **DPO Independence** | Yes | Independent | ✅ |

---

## 11. Action Items (Open)

| Item | Owner | Target | Status |
|------|-------|--------|--------|
| **Annual Staff Training Completion** | HR | 2026-09 | 🟡 95% |
| **DPIA for New AI Features** | ML Lead | Per feature | 🟡 Ongoing |
| **EU Representative Contract Renewal** | Legal | 2026-11 | 🟡 |
| **Annual Vendor DPA Review** | Security | 2026-09 | 🟡 |
| **Annual Pen Test** | Security | 2026-10 | 🟡 |

---

*Confidential. For Nodbusiness Technologies internal use only.*