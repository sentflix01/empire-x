# Nodbusiness — SOC 2 Type II Readiness Roadmap

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Target:** Type II Audit by Month 18 (Series A)
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| AICPA | American Institute of CPAs |
| CC | Common Criteria (Trust Services Criteria) |
| CUEC | Complementary User Entity Controls |
| DR | Disaster Recovery |
| IAM | Identity and Access Management |
| MFA | Multi-Factor Authentication |
| PII | Personally Identifiable Information |
| RACI | Responsible, Accountable, Consulted, Informed |
| SOC | System and Organization Controls |
| SOP | Standard Operating Procedure |
| TSC | Trust Services Criteria |

---

## 1. SOC 2 Overview

| Aspect | Detail |
|--------|--------|
| **Standard** | AICPA SOC 2 (Trust Services Criteria) |
| **Type** | Type II (operating effectiveness over period) |
| **Scope** | Nodbusiness Platform (API, Frontend, Wallet, Marketplace, DevOps) |
| **Trust Criteria** | Security (CC6.1-CC6.8), Availability (A1.1-A1.3), Confidentiality (C1.1-C1.2), Processing Integrity (PI1.1-PI1.3) |
| **Audit Period** | 6 months minimum (target: 9 months) |
| **Auditor** | Big 4 or Top 10 (target: PwC, Deloitte, EY, KPMG) |
| **Target Completion** | Month 18 (Series A milestone) |

---

## 2. Trust Services Criteria Mapping

| Criterion | Description | Current Status | Target Date | Owner |
|-----------|-------------|----------------|-------------|-------|
| **CC1.1** | Control Environment - Integrity & Ethics | ✅ Code of Conduct, policies | Done | Legal |
| **CC1.2** | Board Independence & Oversight | 🟡 Advisory board formed | Month 6 | Founder |
| **CC2.1** | Communication - Internal | ✅ Slack, Notion, All Hands | Done | Ops |
| **CC2.2** | Communication - External | ✅ Status page, docs, support | Done | Ops |
| **CC3.1** | Risk Assessment - Process | 🟡 Annual risk assessment | Month 3 | SRE/Security |
| **CC3.2** | Risk Assessment - Fraud | ✅ Fraud risk model | Done | T&S |
| **CC4.1** | Monitoring - Ongoing | ✅ Grafana, PagerDuty, logs | Done | SRE |
| **CC4.2** | Monitoring - Reporting | 🟡 Monthly security report | Month 3 | Security |
| **CC5.1** | Control Activities - Selection | 🟡 Documented control matrix | Month 3 | Security |
| **CC5.2** | Control Activities - IT General | 🟡 Documented | Month 3 | SRE |
| **CC6.1** | Logical Access - Provisioning | ✅ IAM, MFA, RBAC | Done | Engineering |
| **CC6.2** | Logical Access - Authentication | ✅ MFA, SSO, JWT | Done | Engineering |
| **CC6.3** | Logical Access - Authorization | ✅ RBAC, feature flags | Done | Engineering |
| **CC6.4** | Logical Access - Removal | 🟡 Automated offboarding | Month 2 | HR/Engineering |
| **CC6.5** | Logical Access - Privileged | 🟡 PAM, just-in-time | Month 4 | SRE |
| **CC6.6** | Logical Access - Network | ✅ VPC, SG, WAF, mTLS (Phase 3) | Done | SRE |
| **CC6.7** | Logical Access - Data | ✅ Encryption, field-level | Done | Engineering |
| **CC6.8** | Logical Access - Monitoring | ✅ Audit logs, alerts | Done | SRE |
| **CC7.1** | System Operations - Vulnerability | ✅ SAST/DAST/SCA, pen test | Done | Security |
| **CC7.2** | System Operations - Malware | 🟡 EDR (Phase 2) | Month 8 | Security |
| **CC7.3** | System Operations - Patch Mgmt | ✅ Automated, Dependabot | Done | Engineering |
| **CC7.4** | System Operations - Incident | ✅ Runbooks, PagerDuty | Done | SRE |
| **CC7.5** | System Operations - Change | ✅ CI/CD, feature flags, rollback | Done | Engineering |
| **CC8.1** | Change Management - Authorization | ✅ PR review, feature flags | Done | Engineering |
| **CC8.2** | Change Management - Testing | ✅ CI, staging, canary | Done | Engineering |
| **CC8.3** | Change Management - Deployment | ✅ CI/CD, health checks, rollback | Done | Engineering |
| **CC9.1** | Risk Mitigation - Business | 🟡 BCP/DRP documented | Month 4 | SRE/Ops |
| **CC9.2** | Risk Mitigation - Vendor | 🟡 Vendor risk assessments | Month 6 | Security |

---

## 3. Control Implementation Status

| Control Area | Controls Defined | Implemented | Tested | Evidence Ready |
|--------------|------------------|-------------|--------|----------------|
| **Access Control** | 12 | 10 | 8 | 6 |
| **Encryption** | 8 | 8 | 7 | 7 |
| **Logging & Monitoring** | 10 | 10 | 9 | 8 |
| **Vulnerability Mgmt** | 6 | 5 | 4 | 4 |
| **Incident Response** | 8 | 7 | 6 | 5 |
| **Change Management** | 6 | 6 | 5 | 5 |
| **Data Protection** | 10 | 9 | 8 | 7 |
| **Vendor Management** | 6 | 3 | 2 | 2 |
| **HR Security** | 8 | 6 | 4 | 3 |
| **Physical Security** | 4 | 2 | 2 | 2 |
| **Total** | **84** | **70** | **59** | **48** |

**Target:** 100% defined, 100% implemented, 90%+ tested, 90%+ evidence ready by Month 12

---

## 4. Implementation Roadmap

### Phase 1: Foundation (Months 1-3)

| Milestone | Target | Owner |
|-----------|--------|-------|
| **Engage Auditor** | Month 1 | Founder |
| **Readiness Assessment** | Month 1 | Security Lead |
| **Control Matrix Documented** | Month 2 | Security Lead |
| **Policy Suite Finalized** | Month 2 | Legal + Security |
| **Evidence Collection Process** | Month 3 | Security Lead |
| **Automated Evidence Collection** | Month 3 | SRE |

### Phase 2: Implementation (Months 4-9)

| Milestone | Target | Owner |
|-----------|--------|-------|
| **Automated Offboarding** | Month 4 | Engineering |
| **Privileged Access Management** | Month 4 | SRE |
| **EDR Deployment** | Month 5 | Security |
| **Vendor Risk Program** | Month 6 | Security + Legal |
| **BCP/DRP Test** | Month 7 | SRE |
| **Penetration Test (Annual)** | Month 8 | Security |
| **Employee Security Training** | Month 3, 6, 9 | HR + Security |
| **Evidence Automation >80%** | Month 9 | SRE |

### Phase 3: Audit Period (Months 10-15)

| Milestone | Target | Owner |
|-----------|--------|-------|
| **Type I Audit (Point in Time)** | Month 10 | Auditor |
| **Remediation Period** | Months 10-11 | All |
| **Type II Period Begins** | Month 11 | — |
| **Continuous Monitoring** | Months 11-15 | All |
| **Type II Audit (Period End)** | Month 15 | Auditor |
| **Report Delivery** | Month 16 | Auditor |
| **Management Letter Response** | Month 16 | Security + Founder |

### Phase 4: Maintenance (Month 16+)

| Activity | Frequency | Owner |
|----------|-----------|-------|
| **Annual Type II Audit** | Annual | Auditor |
| **Quarterly Control Testing** | Quarterly | Security |
| **Semi-Annual Vendor Review** | Semi-annual | Security |
| **Annual Pen Test** | Annual | Security |
| **Annual Policy Review** | Annual | Legal + Security |
| **Continuous Evidence Collection** | Ongoing | SRE |

---

## 5. Evidence Requirements

| Evidence Type | Collection Method | Frequency | Storage |
|---------------|-------------------|-----------|---------|
| **Access Reviews** | Automated (IAM API) | Quarterly | Audit bucket |
| **Vulnerability Scans** | Automated (Trivy, Dependabot) | Weekly | Artifact registry |
| **Pen Test Reports** | Manual (auditor) | Annual | Secure drive |
| **Incident Reports** | Automated (PagerDuty) | Per incident | Notion/Confluence |
| **Change Logs** | CI/CD (GitHub Actions) | Per deploy | GitHub |
| **Backup Verification** | Automated (scripts) | Weekly | R2 + logs |
| **Access Logs** | Centralized (Loki) | Continuous | Loki |
| **Audit Logs** | Application (immutable) | Continuous | DB + R2 |
| **Vendor Assessments** | Manual (Questionnaire) | Annual | Secure drive |
| **Training Records** | HRIS (BambooHR/Deel) | Per session | HRIS |
| **Policy Acknowledgments** | HRIS | Annual | HRIS |
| **Risk Assessments** | Manual (Workshop) | Annual | Notion |

---

## 6. Complementary User Entity Controls (CUECs)

| CUEC | Description | Customer Responsibility |
|------|-------------|-------------------------|
| **CUEC-1** | Customer manages their user access | Provision/deprovision users, enforce MFA |
| **CUEC-2** | Customer configures feature flags | Only enable features they need |
| **CUEC-3** | Customer data classification | Mark PII, configure retention |
| **CUEC-4** | Customer API key management | Rotate keys, monitor usage |
| **CUEC-5** | Customer incident reporting | Report security incidents promptly |

---

## 6. Gap Remediation Tracker

| Gap | Criterion | Status | Target Date | Owner | Blocker |
|-----|-----------|--------|-------------|-------|---------|
| Automated offboarding | CC6.4 | 🟡 In progress | Month 2 | Engineering | — |
| PAM for privileged access | CC6.5 | 🟡 Planned | Month 4 | SRE | Budget |
| EDR deployment | CC7.2 | 🟡 Planned | Month 5 | Security | Vendor eval |
| Vendor risk assessments | CC9.2 | 🟡 In progress | Month 6 | Security | Time |
| Automated evidence >90% | All | 🟡 Planned | Month 9 | SRE | Tooling |
| HR security training | HR | 🟡 Planned | Month 3,6,9 | HR | Content |

---

## 7. Budget Estimate

| Category | Year 1 | Year 2 |
|----------|--------|--------|
| **Auditor Fees (Type I + Type II)** | $35K | $45K |
| **Readiness Consultant** | $25K | $10K |
| **Tooling (Compliance Automation)** | $15K | $20K |
| **Pen Test** | $15K | $15K |
| **Training/Staff Time** | $20K | $15K |
| **Total** | **$110K** | **$105K** |

---

## 7. Success Criteria

| Metric | Target |
|--------|--------|
| **Type I Report** | Clean (no material exceptions) |
| **Type II Report** | Clean (no material exceptions) |
| **Control Effectiveness** | 100% controls operating effectively |
| **Exceptions** | 0 material, <3 minor |
| **Evidence Automation** | >90% |
| **Audit Timeline** | On schedule (Month 16 report) |

---

*Confidential. For Nodbusiness Technologies internal use only.*