# Nodbusiness — Data Processing Agreement (DPA) Template

> **Classification:** Confidential — Legal Document
> **Version:** 1.0
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| DPA | Data Processing Agreement |
| DPO | Data Protection Officer |
| DPIA | Data Protection Impact Assessment |
| GDPR | General Data Protection Regulation |
| PII | Personally Identifiable Information |
| SCC | Standard Contractual Clauses |
| SLA | Service Level Agreement |
| Sub-processor | Third-party data processor engaged by Processor |

---

## 1. Parties

**Controller:** [Customer Business Name], [Address], [Registration Number] ("Controller")

**Processor:** Nodbusiness Technologies PLC, [Address, Addis Ababa, Ethiopia], Registration No. [TBD] ("Processor")

---

## 2. Scope & Duration

| Element | Detail |
|---------|--------|
| **Subject Matter** | Processing of Personal Data on behalf of Controller in connection with the Nodbusiness Platform services |
| **Duration** | Term of the ToS + 90 days post-termination (for data export) |
| **Nature of Processing** | Hosting, storage, payment processing, analytics, communications, marketplace operations |
| **Purpose** | Providing Platform services per ToS: showroom builder, commerce, payments, marketplace, messaging |
| **Categories of Data Subjects** | Controller's employees, customers, business partners, end users |
| **Categories of Personal Data** | See Annex A |

---

## 3. Processor Obligations

### 3.1 General
- Process **only on documented instructions** from Controller (including this DPA)
- Ensure **confidentiality** of all personnel accessing Personal Data
- Implement **appropriate technical and organizational measures** (see Annex B)
- **Notify Controller** immediately if instruction violates GDPR/law
- **Engage Sub-processors** only per Section 5

### 3.2 Security Measures (Annex B Summary)
| Measure | Implementation |
|---------|----------------|
| **Encryption** | TLS 1.2+ in transit; AES-256 at rest; AES-256-GCM field-level for PII/credentials |
| **Access Control** | RBAC, least privilege, MFA, regular access reviews |
| **Availability** | 99.9% uptime target, automated backups (daily, 30-day retention), PITR |
| **Integrity** | Immutable audit logs, checksums, tamper-evident logs |
| **Resilience** | Multi-AZ deployment, auto-failover, chaos engineering |
| **Testing** | SAST/DAST/SCA in CI, annual pen test, quarterly vulnerability scans |

### 3.3 Data Subject Rights Support
Processor shall **assist Controller** in fulfilling data subject requests:
| Right | Processor Action | SLA |
|-------|-----------------|-----|
| **Access/Export** | Provide data in machine-readable format | 10 business days |
| **Rectification** | Enable correction via API/dashboard | 5 business days |
| **Erasure** | Anonymize (retain audit/financial per law) | 30 business days |
| **Portability** | Machine-readable export (JSON) | 10 business days |
| **Restriction/Objection** | Implement restriction flags | 5 business days |

### 3.4 Breach Notification
- **Notify Controller** within **24 hours** of becoming aware of a Personal Data breach
- **Provide:** Nature, categories/approx. number of subjects/records, likely consequences, measures taken/proposed
- **Cooperate** with Controller's supervisory authority notification

### 3.5 DPIA Assistance
Processor shall **assist** Controller with DPIAs where processing is likely to result in high risk.

### 3.6 Records
Processor maintains **records of processing activities** per GDPR Art. 30, available to Controller on request.

---

## 4. Controller Obligations

- Provide **lawful basis** for all processing instructions
- Ensure **data accuracy** and **data minimization** in instructions
- Respond **promptly** to Processor requests for clarification
- Conduct **DPIAs** where required for Controller-controlled processing
- Notify Processor of **data subject requests** received directly

---

## 5. Sub-processors

### 5.1 Authorized Sub-processors (Current)

| Sub-processor | Purpose | Location | Safeguards |
|---------------|---------|----------|------------|
| **Neon** | PostgreSQL database | EU/US | DPA, SCCs, SOC2, ISO27001 |
| **Upstash** | Redis (cache, sessions, queues) | EU/US | DPA, SCCs, SOC2 |
| **Cloudflare** | R2 storage, CDN, WAF, DNS | Global | DPA, SCCs, SOC2, ISO27001 |
| **Vercel** | Frontend hosting, edge functions | Global | DPA, SCCs, SOC2 |
| **Railway** | Backend hosting | US/EU | DPA, SCCs, SOC2 |
| **Stripe** | Payment processing (cards) | US/EU | DPA, PCI DSS, SCCs |
| **Chapa** | Payment processing (ETB) | Ethiopia | DPA, local compliance |
| **Flutterwave** | Payment processing (KES/NGN/GHS) | Kenya/Nigeria/Ghana/US | DPA, local compliance, SCCs |
| **SendGrid** | Transactional email | US/EU | DPA, SCCs, SOC2 |
| **Firebase (FCM)** | Push notifications | US | DPA, SCCs, Google Cloud terms |

### 5.2 New Sub-processors
- **Notice:** 30 days written notice before engagement
- **Objection:** Controller may object within 14 days (material impact only)
- **Agreement:** Sub-processor bound by same data protection obligations
- **Liability:** Processor remains fully liable for Sub-processor acts/omissions

---

## 6. International Transfers

| Transfer | Mechanism | Supplementary Measures |
|----------|-----------|------------------------|
| **EU → US** | SCCs (2021/914) | Encryption, access controls, no bulk access, transparency |
| **EU → Africa** | Adequacy (ZA) / SCCs | Local law compliance, encryption |
| **Africa → EU/US** | SCCs / Adequacy | Encryption, access controls |
| **Intra-Africa** | Local adequacy / SCCs | Local law compliance |

---

## 7. Data Retention & Deletion

| Event | Processor Action | Timeline |
|-------|-----------------|----------|
| **ToS Termination** | Delete/return all Personal Data (Controller's choice) | 90 days |
| **Data Subject Erasure** | Anonymize (retain audit/financial per law) | 30 business days |
| **Backup Expiry** | Automatic expiry per retention policy | Per schedule (30 days rolling) |
| **Legal Hold** | Suspend deletion, notify Controller | Until released |

**Certification:** Processor provides written certification of deletion on request.

---

## 8. Audit Rights

| Right | Detail |
|-------|--------|
| **Audit** | Controller may audit (or appoint auditor) Processor compliance |
| **Notice** | 30 days written notice |
| **Scope** | Security, Sub-processors, records, deletion, breach response |
| **Frequency** | Max once per 12 months (unless breach or regulatory) |
| **Cost** | Controller bears cost (unless material non-compliance found) |
| **Report** | Shared with Controller; confidential |

---

## 9. Liability & Indemnification

| Provision | Detail |
|-----------|--------|
| **Processor Liability** | Per ToS liability cap (fees paid in 12 months) |
| **Indemnification** | Processor indemnifies Controller for Processor GDPR violations |
| **Controller Indemnification** | Controller indemnifies Processor for Controller instruction violations |
| **Joint Liability** | Per GDPR Art. 82 (joint and several to data subject) |

---

## 10. Term & Termination

| Event | Effect |
|-------|--------|
| **ToS Termination** | DPA terminates automatically |
| **Material Breach** | Non-breaching party may terminate with 30 days cure period |
| **Regulatory Action** | Immediate termination if required by authority |
| **Effect of Termination** | Section 7 (Deletion) applies; surviving clauses: 6, 7, 8, 9, 11 |

---

## 11. General

| Provision | Detail |
|-----------|--------|
| **Governing Law** | Same as ToS (Ethiopia/Kenya/Nigeria/England & Wales) |
| **Disputes** | Same as ToS (negotiation → mediation → arbitration) |
| **Amendments** | Written, signed by both parties |
| **Notices** | Email to legal@ / dpo@ addresses |
| **Entire Agreement** | This DPA + ToS + Annexes = entire agreement on data processing |

---

## Annex A: Categories of Personal Data

| Category | Examples |
|----------|----------|
| **Identity** | Name, email, phone, government ID, business registration |
| **Contact** | Address, email, phone, social handles |
| **Financial** | Bank details, wallet balance, transaction history, tax ID |
| **Authentication** | Password hash, 2FA secret, session tokens, API keys |
| **Usage/Behavioral** | Page views, clicks, searches, orders, messages, session data |
| **Device/Network** | IP, device ID, OS, browser, push token, location (IP/GPS) |
| **Content** | Product listings, descriptions, images, posts, reviews, messages |
| **Verification** | KYC documents, verification status, trust badges |
| **Preferences** | Language, theme, currency, notification settings, consent flags |
| **Analytics** | Aggregated/anonymized usage metrics, funnel data |

---

## Annex B: Technical & Organizational Measures (Detailed)

### B.1 Organizational
- **Data Protection Officer** appointed (dpo@nodbusiness.app)
- **Staff Training** annual GDPR/security training mandatory
- **Background Checks** for personnel with data access
- **Confidentiality Agreements** signed by all personnel
- **Incident Response Plan** documented, tested quarterly
- **Vendor Management** Sub-processor assessments, DPAs
- **Data Protection by Design/Default** baked into SDLC

### B.2 Technical
| Control | Implementation |
|---------|----------------|
| **Access Control** | RBAC, least privilege, MFA, just-in-time access, quarterly reviews |
| **Encryption** | TLS 1.3 (transit), AES-256 (rest), AES-256-GCM (field-level PII/credentials) |
| **Network** | Private subnets, security groups, WAF, DDoS, private endpoints, mTLS (Phase 3) |
| **Logging/Audit** | Immutable audit logs (append-only), correlation IDs, 7-year retention |
| **Backup/Recovery** | Daily pg_dump to R2 (30-day retention), weekly restore test, PITR |
| **Vulnerability Mgmt** | SAST/DAST/SCA in CI, Dependabot, Trivy, annual pen test, bug bounty |
| **Monitoring/Alerting** | Real-time metrics (Grafana), logs (Loki), traces (Jaeger), PagerDuty |
| **Data Minimization** | Field-level selection, purpose-limited queries, auto-expiry |
| **Pseudonymization** | Hashing/tokenization for analytics, separate keys |
| **Secure Development** | Secure SDLC, threat modeling, code review, secret scanning |

---

## Signatures

**Controller**  
Name: _________________________  
Title: _________________________  
Date: _________________________  
Signature: _________________________  

**Processor (Nodbusiness Technologies PLC)**  
Name: _________________________  
Title: _________________________  
Date: _________________________  
Signature: _________________________  

---

*Confidential. For Nodbusiness Technologies internal use only.*