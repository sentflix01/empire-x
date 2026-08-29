# Nodbusiness — Ethiopia Data Protection Compliance

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Status:** Compliant (Continuous Monitoring)
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| DPA | Data Protection Authority (Ethiopia) |
| DPIA | Data Protection Impact Assessment |
| DPO | Data Protection Officer |
| DSR | Data Subject Request |
| ECA | Ethiopian Communications Authority |
| EDP | Ethiopia Data Protection Proclamation (Proclamation No. 1309/2024) |
| NCA | National Cybersecurity Agency |
| PII | Personally Identifiable Information |
| SAD | Sensitive Authentication Data |

---

## 1. Legal Framework

### 1.1 Primary Legislation

| Law | Status | Relevance |
|-----|--------|-----------|
| **Proclamation No. 1309/2024** (Ethiopia Data Protection Proclamation) | Enacted 2024 | Primary data protection law |
| **Proclamation No. 1156/2019** (Labor) | Enacted | Employee data |
| **Proclamation No. 1247/2021** (Cybercrime) | Enacted | Security incidents, cybercrime |
| **Proclamation No. 1234/2021** (Electronic Transactions) | Enacted | E-contracts, e-signatures |
| **NBE Directives** | Ongoing | Financial data, payments |
| **Ethiopian Communications Authority (ECA) Regulations** | Ongoing | Telecom, internet services |

### 1.2 Key Definitions (EDP Art. 2)

| Term | Definition |
|------|------------|
| **Personal Data** | Any information relating to an identified or identifiable natural person |
| **Sensitive Personal Data** | Racial/ethnic origin, political opinions, religious beliefs, health, genetic, biometric, sexual orientation, criminal records |
| **Data Controller** | Entity determining purposes/means of processing |
| **Data Processor** | Entity processing on behalf of controller |
| **Data Subject** | Natural person to whom data relates |
| **Processing** | Any operation on personal data (collection, storage, use, disclosure, etc.) |

---

## 2. Nodbusiness Classification

| Role | Classification | Basis |
|------|----------------|-------|
| **Primary** | **Data Controller** | Determines purposes/means for Platform data |
| **Secondary** | **Data Processor** | Processes on behalf of Business users (their customers) |
| **Sub-processor User** | Engages Sub-processors | Neon, Upstash, Cloudflare, Stripe, Chapa, etc. |

---

## 3. Lawful Basis Register (EDP Art. 7)

| Processing Activity | Personal Data | Lawful Basis (EDP Art. 7) | Detail |
|---------------------|---------------|---------------------------|--------|
| **User Registration** | Name, email, phone, password | Art. 7(1)(b) - Contract | ToS acceptance |
| **Identity Verification** | Gov ID, biometric (liveness) | Art. 7(1)(c) - Legal obligation (AML) | NBE directives |
| **Business Onboarding** | Business docs, tax ID, address | Art. 7(1)(b) - Contract | Business ToS |
| **Order Processing** | Buyer/seller info, address, payment | Art. 7(1)(b) - Contract | Order fulfillment |
| **Payment Processing** | Financial, transaction | Art. 7(1)(b) + (c) | Contract + NBE directives |
| **Wallet Operations** | Balance, transactions, KYC | Art. 7(1)(b) + (c) | Contract + NBE |
| **Messaging/Chat** | Messages, contacts | Art. 7(1)(b) - Contract | Platform feature |
| **Analytics** | Usage, device, behavior | Art. 7(1)(f) - Legitimate Interest | LIA documented |
| **Marketing** | Contact, preferences | Art. 7(1)(a) - Consent | Opt-in, opt-out anytime |
| **Fraud/Security** | Device, IP, behavior | Art. 7(1)(f) - Legitimate Interest | LIA documented |
| **Legal/Regulatory** | All categories | Art. 7(1)(c) - Legal Obligation | Court orders, regulatory |

---

## 4. Data Subject Rights (EDP Chapter 3)

| Right (Art.) | EDP Article | Implementation | SLA |
|--------------|-------------|----------------|-----|
| **Access** | Art. 13 | Dashboard export + email | 30 days |
| **Rectification** | Art. 14 | Profile edit / API | 10 days |
| **Erasure** | Art. 15 | Anonymize (retain legal) | 30 days |
| **Restriction** | Art. 16 | Privacy flags / API | 10 days |
| **Portability** | Art. 17 | JSON export | 30 days |
| **Objection** | Art. 18 | Opt-out flags | Immediate |
| **Automated Decisions** | Art. 19 | Human review / appeal | 30 days |
| **Compensation** | Art. 20 | Claims process | Per case |

**DSR Portal:** `https://nodbusiness.app/privacy/requests` (Amharic + English)

---

## 5. Sensitive Personal Data (EDP Art. 10)

| Data Type | Collected? | Legal Basis | Safeguards |
|-----------|------------|-------------|------------|
| **Biometric (liveness)** | Yes | Explicit Consent (Art. 7(1)(a)) | AES-256-GCM, auto-delete post-verification |
| **Health** | No | — | — |
| **Racial/Ethnic** | No | — | — |
| **Political/Religious** | No | — | — |
| **Genetic** | No | — | — |
| **Sexual Orientation** | No | — | — |
| **Criminal Records** | AML screening only | Art. 7(1)(c) | Encrypted, access-controlled, audit logged |

---

## 6. Data Localization & Transfer (EDP Art. 24-25)

### 6.1 Localization Requirement

**EDP Art. 24:** "Personal data shall be stored within Ethiopia unless..."

| Exception | Applies? | Mechanism |
|-----------|----------|-----------|
| **Data Subject Consent** | Yes (explicit) | Explicit opt-in for cross-border |
| **Contract Performance** | Yes (payments) | SCCs + supplementary measures |
| **Legal Obligation** | Yes (AML) | Legal basis documented |
| **Vital Interests** | No | — |
| **Public Interest** | No | — |

### 6.2 Current Data Locations

| Data Category | Primary Location | Backup | Legal Basis |
|---------------|------------------|--------|-------------|
| **User Accounts (Ethiopia users)** | Ethiopia (Neon Addis) | R2 (Addis) | Localization + Consent |
| **User Accounts (Non-Ethiopia)** | EU (Neon Frankfurt) / US | R2 (Multi-region) | SCCs + Consent |
| **Payments (Chapa)** | Ethiopia | Ethiopia | Local processor |
| **Payments (Flutterwave/Stripe)** | Kenya/Nigeria/US/EU | Multi-region | SCCs + Consent |
| **Analytics** | EU (ClickHouse) | EU | SCCs + Legitimate Interest |
| **Backups** | R2 (Addis + EU) | Cross-region | Consent + SCCs |

### 6.3 Cross-Border Transfer Mechanisms

| Transfer | Mechanism | Safeguards | Review |
|----------|-----------|------------|--------|
| **Ethiopia → EU/US** | SCCs (Ethiopia DPA approved) | Encryption, access controls, no bulk access | Annual |
| **Ethiopia → Kenya/Nigeria/Ghana** | Bilateral adequacy / SCCs | Encryption, local compliance | Annual |
| **Intra-Africa** | AU Convention / SCCs | Local law compliance | Annual |

---

## 7. Data Protection Impact Assessment (DPIA - Art. 23)

| Processing | High Risk? | DPIA Status | Key Mitigations |
|------------|------------|-------------|-----------------|
| **Biometric Verification** | Yes | ✅ Completed | Explicit consent, auto-delete, encryption |
| **AI Profiling (Pricing/Discovery)** | Yes | ✅ Completed | Transparency, opt-out, human review |
| **Fraud Scoring (Automated)** | Yes | ✅ Completed | Human review, appeal, data minimization |
| **Large-Scale Monitoring** | Yes | ✅ Completed | Purpose limitation, retention limits |
| **Cross-Border Transfers** | Yes | ✅ Completed | SCCs, supplementary measures |
| **Wallet/Financial Data** | Yes | ✅ Completed | Field-level encryption, audit logs |

**DPIA Register:** `docs/compliance/DPIA_REGISTER.md`

---

## 8. Data Protection Officer (Art. 28)

| Requirement | Status | Detail |
|-------------|--------|--------|
| **DPO Appointed** | ✅ | [Name], dpo@nodbusiness.app |
| **Independence** | ✅ | Reports to Board, no conflict |
| **Resources** | ✅ | Budget, team, tools |
| **Expertise** | ✅ | Certified (CIPP/E, CIPM) |
| **Contact Published** | ✅ | Privacy Policy, website, DSR portal |

**DPO Responsibilities (Art. 28(3)):**
- Monitor compliance
- Advise on DPIAs
- Cooperate with DPA
- Act as contact point
- Training & awareness

---

## 9. Data Breach Notification (Art. 26-27)

### 9.1 Notification Timeline

| Event | Authority (DPA) | Data Subjects |
|-----------|-----------------|---------------|
| **Confirmed Breach** | **72 hours** (Art. 26) | **Without undue delay** (Art. 27) |
| **High Risk** | 72 hours | Without undue delay |
| **Low Risk (Encrypted)** | If keys compromised | Not required if low risk |

### 9.2 Breach Response Process

```
DETECT → TRIAGE (15 min) → CONTAIN → ASSESS RISK
    │
    ├── HIGH RISK → NOTIFY DPA (72h) + DATA SUBJECTS (without delay)
    ├── MEDIUM RISK → NOTIFY DPA (72h) + ASSESS SUBJECT NOTIFICATION
    └── LOW RISK → LOG + INTERNAL REVIEW
```

### 9.3 Breach Log (2026 YTD)

| Date | Type | Severity | Notified DPA | Notified Subjects | Root Cause |
|------|------|----------|--------------|-------------------|------------|
| — | — | — | — | — | — |

*No breaches reported in 2026 to date.*

---

## 9. Data Protection Impact Assessment Register

| DPIA ID | Processing | Date Completed | Risk Level | Review Date |
|---------|------------|----------------|------------|-------------|
| DPIA-001 | Biometric Verification | 2026-08-15 | High | 2027-08-15 |
| DPIA-002 | AI Pricing/Discovery | 2026-08-20 | High | 2027-08-20 |
| DPIA-003 | Fraud Scoring | 2026-08-22 | High | 2027-08-22 |
| DPIA-004 | Cross-Border Transfers | 2026-08-24 | High | 2027-08-24 |

---

## 10. Data Processing Agreements (Art. 29)

| Processor | DPA Status | Key Terms | Last Review |
|-----------|------------|-----------|-------------|
| **Neon** | ✅ Signed | SCCs, audit rights, deletion | 2026-06 |
| **Upstash** | ✅ Signed | SCCs, audit rights | 2026-06 |
| **Cloudflare** | ✅ Signed | SCCs, audit rights | 2026-06 |
| **Vercel** | ✅ Signed | SCCs, audit rights | 2026-06 |
| **Railway** | ✅ Signed | SCCs, audit rights | 2026-06 |
| **Stripe** | ✅ Signed | PCI DSS, SCCs | 2026-06 |
| **Chapa** | ✅ Signed | Local law, audit rights | 2026-06 |
| **Flutterwave** | ✅ Signed | SCCs, local compliance | 2026-06 |
| **SendGrid** | ✅ Signed | SCCs | 2026-06 |
| **Firebase** | ✅ Signed | SCCs | 2026-06 |

**All DPAs include:** Purpose limitation, security measures, breach notification, Sub-processor management, audit rights, deletion/return on termination.

---

## 11. Records of Processing Activities (ROPA - Art. 30)

| Processing | Controller/Processor | Categories | Recipients | Retention | Security |
|------------|---------------------|------------|------------|-----------|----------|
| **User Accounts** | Controller | Identity, contact, auth | Sub-processors | Account + 90d | Encryption, MFA |
| **Payments** | Controller | Financial, transaction | Stripe, Chapa, Flutterwave | 7 years | Tokenization |
| **Wallet** | Controller | Financial, KYC | Sub-processors | 7 years | Field-level AES-256-GCM |
| **Marketplace** | Controller | Business, products | Developers, buyers | Account + 1yr | Encryption |
| **Messaging** | Controller | Messages, contacts | Sub-processors | Account + 1yr | Encryption |
| **Analytics** | Controller | Usage, device, behavior | Analytics processors | 2 years | Pseudonymization |
| **Fraud/Security** | Controller | Device, IP, behavior | Security processors | 2 years | Encryption |

---

## 12. Security Measures (Art. 22)

| Measure | Implementation | Standard |
|---------|----------------|----------|
| **Encryption at Rest** | AES-256 (DB, R2, backups) | AES-256 |
| **Encryption in Transit** | TLS 1.3 everywhere | TLS 1.3 |
| **Field-Level Encryption** | AES-256-GCM (PII, credentials) | AES-256-GCM |
| **Access Control** | RBAC, MFA, least privilege | RBAC + MFA |
| **Vulnerability Mgmt** | SAST/DAST/SCA, pen test | Annual + CI/CD |
| **Incident Response** | Runbooks, 15-min SEV-1 | Quarterly drill |
| **Backup/Recovery** | Daily pg_dump, weekly test | RPO < 24h, RTO < 4h |
| **Staff Training** | Annual + onboarding | Annual |

---

## 12. Compliance Status Dashboard

| Requirement | Status | Evidence | Owner |
|-------------|--------|----------|-------|
| **DPO Appointed** | ✅ | Appointment letter | Founder |
| **Registration with DPA** | 🟡 In progress | Application submitted | Legal |
| **ROPA Maintained** | ✅ | `docs/compliance/ROPA.md` | DPO |
| **DPIAs Completed** | ✅ | 4 DPIAs | DPO |
| **DPA with Processors** | ✅ | 10/10 signed | Legal |
| **Cross-Border SCCs** | ✅ | 10/10 | Legal |
| **DSR Process** | ✅ | Automated + manual | DPO |
| **Breach Response Plan** | ✅ | `runbooks/` | Security |
| **Staff Training** | 🟡 95% | HRIS records | HR |
| **DPIA Register** | ✅ | 4 completed | DPO |
| **Annual Audit** | 🟡 Planned | Q4 2026 | DPO |

---

## 13. Penalties (EDP Art. 31-32)

| Violation | Administrative Fine | Criminal Penalty |
|-----------|---------------------|------------------|
| **Core Principles Violation** | Up to 2% annual turnover | Up to 5 years imprisonment |
| **Data Subject Rights** | Up to 2% annual turnover | Up to 3 years imprisonment |
| **Cross-Border Transfer** | Up to 4% annual turnover | Up to 5 years imprisonment |
| **Security Breach** | Up to 2% annual turnover | Up to 3 years imprisonment |
| **DPO Non-Appointment** | Up to 1% annual turnover | Up to 2 years imprisonment |

**Mitigation:** Full compliance program, DPO independence, audit trail, insurance.

---

## 13. Compliance Roadmap

| Milestone | Target | Status |
|-----------|--------|--------|
| **DPA Registration** | 2026-09 | 🟡 Application submitted |
| **DPA Audit** | 2026-12 | 🟡 Preparing |
| **Annual Staff Training** | 2026-09 | 🟡 95% complete |
| **Annual DPIA Review** | 2026-08 | ✅ Complete |
| **Annual DPA Audit** | 2026-12 | 🟡 Planning |
| **DPA Certification** | 2027-06 | 🟡 Target |

---

## 14. Contact

**Data Protection Officer:** [Name]  
**Email:** dpo@nodbusiness.app  
**Phone:** +251-XXX-XXXX  
**Address:** [Addis Ababa, Ethiopia]  

**Ethiopia DPA Contact:**  
Ethiopian Communications Authority / Personal Data Protection Office  
[Address, Addis Ababa]  

---

*Confidential. For Nodbusiness Technologies internal use only.*