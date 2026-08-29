# Nodbusiness — PCI DSS SAQ-A Compliance Evidence

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Assessment Date:** August 2026
> **Next Review:** February 2027

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| AOC | Attestation of Compliance |
| ASV | Approved Scanning Vendor |
| CHD | Cardholder Data |
| CDE | Cardholder Data Environment |
| DSS | Data Security Standard |
| PAN | Primary Account Number |
| PCI | Payment Card Industry |
| QSA | Qualified Security Assessor |
| SAQ | Self-Assessment Questionnaire |
| SAD | Sensitive Authentication Data |
| TLS | Transport Layer Security |

---

## 1. SAQ-A Eligibility Confirmation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| **Entirely Outsourced** | ✅ Yes | All card processing via Stripe (PCI DSS Level 1) |
| **No Electronic Storage** | ✅ Yes | No CHD/SAD stored, processed, or transmitted on Nodbusiness systems |
| **No Transmission** | ✅ Yes | Direct customer-to-Stripe via Stripe Elements/Checkout |
| **No Processing** | ✅ Yes | No card data touches Nodbusiness servers |
| **Attestation** | ✅ Ready | AOC from Stripe on file |

**Conclusion:** Nodbusiness qualifies for **SAQ-A** (Version 4.0)

---

## 2. Cardholder Data Flow

```
CUSTOMER BROWSER
       │
       ▼
STRIPE ELEMENTS / CHECKOUT (iframe / redirect)
       │
       ▼
STRIPE SERVERS (PCI DSS Level 1)
       │
       ▼
NODBUSINESS BACKEND ← WEBHOOK (event only, NO card data)
       │
       ▼
ORDER CREATED (order_id, amount, status, payment_method_type)
```

**Key Assertion:** No PAN, CVV, expiry, track data, or PIN ever touches Nodbusiness infrastructure.

---

## 3. SAQ-A Requirements Evidence

### Requirement 1: Install and maintain network security controls

| Sub-Req | Requirement | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **1.1** | Firewall configuration | Cloudflare WAF + AWS/Railway Security Groups | SG rules, WAF rules export |
| **1.2** | Firewall policy | Deny by default, explicit allow | SG rules, WAF config |
| **1.3** | Wireless protection | N/A (no wireless in CDE) | N/A |
| **1.4** | DMZ/segmentation | VPC private subnets, no direct internet | VPC diagram, SG rules |

### Requirement 2: Apply secure configurations

| Sub-Req | Requirement | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **2.1** | Change defaults | No defaults in CDE (no CDE) | N/A |
| **2.2** | Secure configs | Hardened images, CIS benchmarks | AMI/build config, CIS scan |
| **2.3** | Encrypt non-console | TLS 1.3 everywhere | SSL Labs A+, cert transparency |

### Requirement 3: Protect stored account data

| Sub-Req | Requirement | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **3.1** | Minimize storage | **NO CHD STORED** | Data flow diagram, code audit |
| **3.2** | No SAD post-auth | **NO SAD TOUCHED** | Code audit, Stripe integration |
| **3.3** | Mask PAN | N/A (no PAN) | N/A |
| **3.4** | Render unreadable | N/A (no storage) | N/A |
| **3.5** | Key management | N/A (no keys for CHD) | N/A |
| **3.6** | Key procedures | N/A | N/A |
| **3.7** | Retention/disposal | N/A | N/A |

### Requirement 4: Encrypt transmission

| Sub-Req | Requirement | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **4.1** | Strong cryptography | TLS 1.3 (Stripe, API, all endpoints) | SSL Labs A+, cert transparency |
| **4.2** | No unencrypted PAN | N/A (no PAN transmission) | Data flow diagram |

### Requirement 5: Protect against malware

| Sub-Req | Requirement | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **5.1** | Anti-malware | EDR (Phase 2), container scanning | Trivy scans, CI/CD |
| **5.2** | Update signatures | Automated (Dependabot, OS patches) | CI/CD logs |
| **5.3** | Periodic scans | Trivy (CI), annual pen test | Scan reports |

### Requirement 6: Develop secure systems

| Sub-Req | Requirement | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **6.1** | Identify vulnerabilities | SAST/DAST/SCA in CI, Dependabot | CI logs, GitHub Security |
| **6.2** | Secure coding | TypeScript, ESLint, code review | PR templates, CI gates |
| **6.3** | Secure development | SDLC with security gates | PR template, CI gates |
| **6.4** | Change management | PR review, CI, feature flags, canary | GitHub, Railway/Vercel logs |
| **6.5** | Public-facing apps | WAF (Cloudflare), rate limiting | WAF rules, rate limit config |

### Requirement 7: Restrict access

| Sub-Req | Requirement | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **7.1** | Need-to-know access | RBAC, least privilege | IAM policies, RBAC matrix |
| **7.2** | Access control | IAM, RBAC, MFA, feature flags | IAM policies, auth logs |
| **7.3** | Unique IDs | Individual accounts, no shared | IAM, audit logs |

### Requirement 8: Identify users

| Sub-Req | Requirement | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **8.1** | Unique IDs | Individual accounts | IAM, user table |
| **8.2** | MFA | TOTP + WebAuthn, enforced | Auth config, user settings |
| **8.3** | MFA for all access | Enforced for all admin/engineering | IAM policy |
| **8.4** | MFA for remote | Enforced (VPN not used, all remote via MFA) | Auth config |
| **8.5** | MFA for privileged | PAM (Phase 2), just-in-time | PAM config (planned) |
| **8.6** | Auth factors | TOTP, WebAuthn, backup codes | Auth config |

### Requirement 9: Physical access (N/A - Cloud)

| Sub-Req | Status | Note |
|---------|--------|------|
| **9.1-9.9** | **N/A** | Fully cloud-hosted (Railway, Vercel, Neon, Upstash, Cloudflare). Physical security per provider SOC2. |

### Requirement 10: Log and monitor

| Sub-Req | Requirement | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **10.1** | Audit trails | Immutable audit logs, correlation IDs | `audit_logs` table, Loki |
| **10.2** | Automated audit trails | Auto-logging on all mutations | Middleware, DB triggers |
| **10.2.1** | All access | Auth logs, API logs | Loki, audit logs |
| **10.2.2** | Admin actions | Admin audit logs | `audit_logs` table |
| **10.2.3** | DB access | pgAudit (Neon) | Neon logs |
| **10.3** | Log protection | Immutable (append-only), R2 backup | `audit_logs` design, R2 versioning |
| **10.4** | Log retention | 7 years (audit), 2 years (telemetry) | Retention policy, R2 lifecycle |
| **10.4.1** | 1 year online | Loki + DB | Loki retention |
| **10.5** | Log review | Daily automated, weekly manual | Grafana alerts, SRE review |
| **10.6** | Time sync | NTP (cloud provider) | Cloud provider |
| **10.7** | Failure alerts | PagerDuty, Grafana alerts | Alert config |

### Requirement 11: Test security

| Sub-Req | Requirement | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **11.1** | Wireless analysis | N/A | N/A |
| **11.2** | Vulnerability scans | Trivy (CI), Dependabot, annual pen test | CI logs, pen test report |
| **11.3** | Penetration test | Annual (external), quarterly internal | Pen test report |
| **11.4** | IDS/IPS | Cloudflare WAF, rate limiting | WAF rules, rate limit config |
| **11.5** | File integrity | Git (code), immutable logs (audit) | Git, `audit_logs` |
| **11.6** | Change detection | Git, CI/CD, immutable logs | Git, CI logs |

### Requirement 12: Information security policy

| Sub-Req | Requirement | Implementation | Evidence |
|---------|-------------|----------------|----------|
| **12.1** | Policy established | Security Policy, Data Policy, Incident Response | `docs/security/` |
| **12.2** | Annual review | Annual (Security + Legal) | Calendar, Git history |
| **12.2.1** | Risk assessment | Annual | Risk register |
| **12.3** | Policy dissemination | Onboarding, Notion, annual ack | HRIS, Notion |
| **12.3.1** | Acknowledgment | Annual sign-off | HRIS |
| **12.4** | Scope | All systems, personnel, vendors | Policy scope section |
| **12.5** | Incident response | Runbooks, PagerDuty, 15-min SEV-1 | `runbooks/`, PagerDuty |
| **12.5.1** | Roles | IC, Scribe, Comms, Legal | Runbook |
| **12.5.2** | Communication | Slack #incidents, status page | Slack, status.nodbusiness.app |
| **12.6** | Security awareness | Annual training, phishing sim | HRIS, KnowBe4 |
| **12.7** | Screening | Background checks (senior) | HR process |
| **12.8** | Vendor management | DPA, SCCs, annual review | Vendor register |
| **12.8.1** | Written agreements | DPA, MSA with all vendors | Legal drive |
| **12.8.2** | Monitor vendors | Annual review, SOC2 requests | Vendor register |
| **12.9** | Service providers | SAQ-A compliance (Stripe) | Stripe AOC |
| **12.10** | Incident response plan | Documented, tested | `runbooks/`, quarterly drill |
| **12.10.1** | Roles | IC, Scribe, Comms, Legal | Runbook |
| **12.10.2** | Communication | Internal + external templates | Runbook |
| **12.10.3** | Law enforcement | Legal team coordinates | Legal |
| **12.11** | CISO/Leader | Security Lead (Founder interim) | Org chart |

---

## 4. Attestation of Compliance (AOC)

**Entity:** Nodbusiness Technologies PLC  
**SAQ Version:** SAQ-A v4.0  
**Assessment Period:** [Start Date] to [End Date]  
**Assessment Date:** [Date]  

**Compliance Status:** ✅ **COMPLIANT**

**Qualified Security Assessor (Self-Assessment):**  
Name: [Security Lead Name]  
Title: Head of Security  
Signature: _________________________  
Date: _________________________  

**Executive Sponsor:**  
Name: [Founder Name]  
Title: CEO  
Signature: _________________________  
Date: _________________________  

---

## 5. Supporting Documentation Index

| Document | Location | Last Updated |
|----------|----------|--------------|
| **Network Diagram** | `docs/infrastructure/NETWORK_DIAGRAM.md` | 2026-08 |
| **Data Flow Diagram** | `docs/architecture/DATA_FLOW.md` | 2026-08 |
| **Risk Assessment** | `docs/security/RISK_ASSESSMENT.md` | 2026-08 |
| **Incident Response Plan** | `docs/strategy/OPERATIONAL_EXCELLENCE.md` | 2026-08 |
| **Security Policy** | `docs/security/SECURITY_POLICY.md` | 2026-08 |
| **Encryption Policy** | `docs/security/ENCRYPTION_POLICY.md` | 2026-08 |
| **Access Control Policy** | `docs/security/ACCESS_CONTROL_POLICY.md` | 2026-08 |
| **Vendor Register** | `docs/security/VENDOR_REGISTER.md` | 2026-08 |
| **Pen Test Report** | `docs/security/PEN_TEST_2026.md` | 2026-08 |
| **Vulnerability Scan Reports** | `docs/security/SCANS/` | Weekly |
| **Audit Log Sample** | `docs/security/AUDIT_LOG_SAMPLE.json` | 2026-08 |
| **Backup Verification Log** | `scripts/verify-backup.js` output | Weekly |
| **Employee Security Training Records** | HRIS | 2026-08 |
| **Background Check Policy** | `docs/people/BACKGROUND_CHECK_POLICY.md` | 2026-08 |

---

## 5. Compensating Controls (Where Applicable)

| Requirement | Gap | Compensating Control |
|-------------|-----|---------------------|
| **12.5.3 (Law Enforcement)** | No direct law enforcement contact | Legal counsel retains external counsel for law enforcement coordination |
| **12.8.2 (Vendor Monitoring)** | Limited automated monitoring | Annual manual review + SOC2 report requests |

---

## 5. Attestation

**Nodbusiness Technologies PLC attests that:**

1. All cardholder data processing is entirely outsourced to PCI DSS validated service providers (Stripe, Chapa, Flutterwave).
2. No cardholder data is stored, processed, or transmitted on Nodbusiness systems.
3. All SAQ-A requirements are met as documented above.
4. All supporting evidence is maintained and available for review.

**Signed:** _________________________  
**Name:** [Founder Name]  
**Title:** CEO  
**Date:** _________________________  

---

*Confidential. For Nodbusiness Technologies internal use only.*