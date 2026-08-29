# Nodbusiness — Abuse Reporting & Response

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| ATO | Account Takeover |
| CSAM | Child Sexual Abuse Material |
| DPA | Data Protection Authority |
| GDPR | General Data Protection Regulation |
| IP | Intellectual Property |
| LE | Law Enforcement |
| PII | Personally Identifiable Information |
| SLA | Service Level Agreement |
| SOP | Standard Operating Procedure |
| T&S | Trust & Safety |

---

## 1. Reporting Channels

### 1.1 User-Facing Channels

| Channel | Access | Use Case | SLA (Ack) |
|---------|--------|----------|-----------|
| **In-App Report Button** | Every content item, profile, message | Content, user, message abuse | Instant (auto-ack) |
| **Safety Center** | `safety.nodbusiness.app` | Detailed reports, attachments | 1 hour |
| **Email** | `abuse@nodbusiness.app` | Complex reports, legal, LE | 4 hours |
| **In-App Chat** | Support widget | Urgent, real-time help | 15 min (business hrs) |
| **Phone (Emergency)** | +251-XXX-XXXX | Imminent harm, CSAM | Immediate |

### 1.2 Internal Channels

| Channel | Purpose | Access |
|---------|---------|--------|
| **Slack #triage** | Real-time escalation | T&S Team + On-call |
| **Slack #incidents-sev1** | SEV-1 coordination | All hands |
| **Case Management** | Jira/Linear | T&S Team |
| **Admin Dashboard** | Admin users only | Admins, T&S Lead |

### 1.3 External Channels

| Source | Contact | Integration |
|---------|---------|-------------|
| **Law Enforcement** | `legal@nodbusiness.app` + portal | Manual + API |
| **NCMEC** | Cybertipline API | Automated |
| **Industry Partners** | `trust@nodbusiness.app` | Email + API |
| **Government/Regulators** | `legal@nodbusiness.app` | Manual + portal |

---

## 2. Report Categories & Routing

| Category | Auto-Route | Human Review | SLA (First Response) |
|----------|------------|--------------|----------------------|
| **CSAM** | → NCMEC + L1 Analyst | Immediate | 15 min |
| **Terrorism/Extremism** | → L1 + Legal | 1 hour | 1 hour |
| **Violence/Threats** | → L1 Analyst | 4 hours | 4 hours |
| **Hate Speech** | → L1 Analyst | 4 hours | 4 hours |
| **Harassment/Bullying** | → L1 Analyst | 4 hours | 4 hours |
| **Fraud/Scam** | → L1 + Fraud Team | 4 hours | 4 hours |
| **Spam** | Auto-filter + L1 | 24 hours | 24 hours |
| **IP Infringement (DMCA)** | → Legal + L1 | 24 hours | 24 hours |
| **Account Takeover** | → Security + T&S | 1 hour | 1 hour |
| **Data Breach/Privacy** | → DPO + Legal + Security | 1 hour | 1 hour |
| **Self-Harm** | → Crisis Resources + L1 | 15 min | 15 min |

---

## 3. Report Handling Workflow

### 3.1 Triage (Automated + Human)

```
REPORT RECEIVED
       │
       ▼
AUTO-ENRICH (User context, history, content hash, risk score)
       │
       ▼
AUTO-CLASSIFY (ML + Rules)
       │
       ├── AUTO-ACTION (High confidence, clear policy)
       │
       ├── ROUTE TO QUEUE (Priority by severity)
       │
       └── ESCALATE (SEV-1: Legal, CEO, Authorities)
```

### 3.2 Investigation Standards

| Step | Requirement |
|------|-------------|
| **Evidence Preservation** | Screenshot, hash, metadata, timestamps |
| **Context Review** | Full conversation, user history, related reports |
| **Policy Mapping** | Exact policy section violated |
| **Precedent Check** | Similar past cases, consistency |
| **Proportionality** | Action matches severity |
| **Documentation** | Every decision logged with reasoning |

### 3.3 Evidence Standards

| Evidence Type | Collection | Retention |
|---------------|------------|-----------|
| **Screenshots** | Full page + element | 90 days |
| **Content Hash** | SHA-256 (PhotoDNA, PDQ, Perceptual) | 1 year |
| **Metadata** | User IDs, timestamps, IPs, device | 1 year |
| **User History** | Prior violations, warnings, appeals | Account lifetime |
| **Network Analysis** | Connected accounts, IPs, devices | 90 days |
| **Communication Logs** | Relevant messages (redacted) | 90 days |

---

## 3. Account Takeover (ATO) Response

### 3.1 Detection Signals

| Signal | Action |
|--------|--------|
| **New Device/Location** | Step-up auth (OTP/email) |
| **Credential Stuffing** | Rate limit, CAPTCHA, HIBP check |
| **Password Reset + Login** | Force re-auth, notify user |
| **Session Anomaly** | Revoke sessions, force re-auth |
| **Credential Leak (HIBP)** | Force reset, notify user |

### 3.2 ATO Response Playbook

| Step | Action | Timeline |
|------|--------|----------|
| **1. Detect** | Alert (SIEM, user report, anomaly) | T+0 |
| **2. Contain** | Revoke all sessions, force re-auth | T+5 min |
| **3. Verify** | Contact user (email/SMS/push), confirm identity | T+15 min |
| **4. Investigate** | Access logs, device fingerprints, IP geo | T+30 min |
| **5. Remediate** | Reset password, revoke API keys, rotate secrets | T+1 hour |
| **6. Notify** | User (email + in-app), affected parties | T+2 hours |
| **7. Monitor** | Enhanced monitoring 30 days | Ongoing |
| **8. Postmortem** | Root cause, prevention | 48 hours |

---

## 3. Fraud & Scam Response

### 3.1 Payment Fraud

| Step | Action | Owner |
|------|--------|-------|
| **Detect** | Stripe/Chapa webhook, ML scoring, user report | T&S + Fraud |
| **Freeze** | Hold funds, suspend payout | Fraud Team |
| **Investigate** | Velocity, geo, device, BIN, email domain | Fraud Analyst |
| **Decide** | Refund / Release / Escalate | Fraud Lead |
| **Refund** | Auto (Stripe/Chapa) + Wallet credit | Finance |
| **Account Action** | Warn / Suspend / Ban | T&S |

### 3.2 Seller Fraud (Non-delivery, Fake Tracking)

| Step | Action | Timeline |
|------|--------|----------|
| **Detect** | Buyer report, tracking API mismatch, pattern | T+0 |
| **Suspend Payouts** | Hold current + future | T+15 min |
| **Investigate** | Carrier API, buyer/seller comms, evidence | T+2 hours |
| **Decide** | Refund buyer, suspend seller, or release | T+4 hours |
| **Account Action** | Warning → Suspension → Ban | Per severity |

---

## 3. IP Infringement (DMCA / Trademark)

### 3.1 DMCA Process

| Step | Action | Timeline |
|------|--------|----------|
| **Receive Notice** | Validate format (Art. 512) | T+0 |
| **Acknowledge** | Auto-reply with case ID | T+1 hour |
| **Remove Content** | Disable access | T+24 hours |
| **Notify User** | Inform of removal, provide counter-notice info | T+24 hours |
| **Counter-Notice** | Accept, forward to claimant | T+48 hours |
| **Restore** | If no lawsuit in 10-14 days | T+14 days |
| **Repeat Infringer** | 3 strikes → account termination | Automatic |

### 3.2 Trademark/Brand

| Step | Action | Timeline |
|------|--------|----------|
| **Receive** | Validate registration, scope | T+0 |
| **Verify** | Check listing vs. mark | T+4 hours |
| **Action** | Remove / restrict / warn | T+24 hours |
| **Appeal** | 30 days | Per appeal process |

---

## 3. Data Breach / Privacy Incident

### 3.1 Breach Response (GDPR Art. 33-34 / EDP Art. 26-27)

| Phase | Action | Timeline |
|-------|--------|----------|
| **Detect** | Alert (SIEM, user report, vendor) | T+0 |
| **Triage** | Confirm breach, classify data, assess risk | T+1 hour |
| **Contain** | Revoke access, rotate keys, isolate systems | T+2 hours |
| **Assess** | DPO + Legal: High risk? | T+4 hours |
| **Notify DPA** | If high risk | **72 hours** (GDPR/EDP) |
| **Notify Subjects** | If high risk to rights | Without undue delay |
| **Remediate** | Patch, rotate, monitor | T+24 hours |
| **Postmortem** | Root cause, prevention | 48 hours |

---

## 3. Self-Harm / Crisis Response

### 3.1 Detection & Response

| Signal | Action |
|--------|--------|
| **Explicit Threat** | Immediate crisis resources + wellness check |
| **Implicit Signals** | "I want to die", "ending it" → Resources + optional check |
| **Community Report** | Take seriously, prioritize |

### 3.2 Response Protocol

```
1. IMMEDIATE: Post crisis resources in chat/thread
   - Ethiopia: 988 (Suicide Prevention), 911 (Emergency)
   - Kenya: 1199, 116 (Childline)
   - Nigeria: 0800-720-720 (Lagos), 112
   - International: findahelpline.com

2. WELLNESS CHECK: If imminent risk + location known
   - Contact local emergency services
   - Provide user info (minimal necessary)

3. FOLLOW-UP: 24h, 72h, 7d check-ins (if engaged)

4. DOCUMENT: All actions in case log
```

---

## 4. Law Enforcement & Government Requests

### 4.1 Request Handling

| Request Type | Process | Timeline |
|-------------|---------|----------|
| **Subpoena/Court Order** | Legal validates → comply | Per court deadline |
| **Search Warrant** | Legal validates → comply | Immediate |
| **Emergency Disclosure** (imminent harm) | Legal validates → comply | <24 hours |
| **Preservation Request** | Legal validates → preserve 90 days | 24 hours |
| **Voluntary Request** (no legal process) | Legal reviews → deny/partial | 30 days |

### 4.2 Data Provided

| Data Type | Standard |
|-----------|----------|
| **Subscriber Info** | Name, email, phone, IP, signup date |
| **Transaction Data** | Orders, payments, wallet (with court order) |
| **Content** | Messages, posts (with warrant) |
| **Logs** | Access, IP, device (with court order) |
| **Encryption Keys** | Never (we don't have them for E2E) |

### 4.3 Transparency

| Report | Frequency | Content |
|--------|-----------|---------|
| **Government Requests** | Semi-annual | Count, type, compliance rate, country |
| **Emergency Disclosures** | Quarterly | Count, nature, outcome |

---

## 5. User Communication Templates

### 5.1 Account Action Notification

```
Subject: Action Taken on Your Nodbusiness Account

Hi [Name],

We've taken action on your account ([action: warning/suspension/ban]) due to a violation of our [specific policy: Community Guidelines Section X].

Details:
- Content: [description/link]
- Policy: [specific section]
- Action: [warning/24h suspension/permanent ban]
- Effective: [date/time]

You can appeal this decision within 30 days by visiting [appeals portal] or replying to this email.

If you believe this was an error, please let us know.

— The Nodbusiness Trust & Safety Team
```

### 5.2 Content Removal Notification

```
Subject: Content Removed from Nodbusiness

Hi [Name],

We've removed the following content from Nodbusiness:

Content: [description]
Reason: [specific policy violation]
Policy: [link to Community Guidelines section]

You can appeal this decision within 30 days at [appeals portal].

— The Nodbusiness Trust & Safety Team
```

### 5.3 Appeal Confirmation

```
Subject: Appeal Received - Case #[ID]

Hi [Name],

We've received your appeal for case #[ID]. Our team will review and respond within 48 hours.

Case Details:
- Original Action: [warning/suspension/ban/removal]
- Content: [description]
- Your Statement: [user's appeal text]

We'll notify you of the outcome via email and in-app notification.

— The Nodbusiness Trust & Safety Team
```

---

## 6. Metrics & Reporting

### 6.1 Operational Metrics (Daily)

| Metric | Target |
|--------|--------|
| **Reports Received** | Track volume, trend |
| **Auto-Action Rate** | >80% |
| **Queue Depth (SEV-1)** | <5 |
| **Queue Depth (SEV-2)** | <20 |
| **Median Response (SEV-1)** | <15 min |
| **Median Response (SEV-2)** | <1 hour |

### 6.2 Outcome Metrics (Weekly)

| Metric | Target |
|--------|--------|
| **Accuracy** | >95% (sample audit) |
| **False Positive Rate** | <1% |
| **Appeal Overturn Rate** | <5% |
| **User Satisfaction (Post-Action)** | >4/5 |

### 6.3 Strategic Metrics (Monthly)

| Metric | Target |
|--------|--------|
| **Fraud Loss Rate** | <0.1% GMV |
| **Chargeback Rate** | <0.5% |
| **ATO Rate** | <0.01% MAU |
| **Repeat Offender Rate** | <10% |
| **User Trust Score** | >80% (survey) |

---

## 7. Continuous Improvement

| Process | Frequency | Owner |
|---------|-----------|-------|
| **Policy Review** | Monthly | T&S Lead + Legal |
| **Precedent Review** | Weekly | Senior Analysts |
| **Model Retraining** | Monthly | ML Engineer |
| **Calibration Session** | Weekly | All Analysts |
| **Postmortem (SEV-1)** | Per incident | T&S Lead |
| **Process Audit** | Quarterly | T&S Lead + Legal |
| **User Feedback Review** | Monthly | T&S Lead + Product |

---

*Confidential. For Nodbusiness Technologies internal use only.*