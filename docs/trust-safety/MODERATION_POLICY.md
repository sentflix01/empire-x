# Nodbusiness — Moderation Policy

> **Classification:** Confidential — Internal Use Only
> **Version:** 1.0
> **Last Updated:** August 2026

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| CSAM | Child Sexual Abuse Material |
| DMCA | Digital Millennium Copyright Act |
| DSA | Digital Services Act (EU) |
| GDPR | General Data Protection Regulation |
| IP | Intellectual Property |
| ML | Machine Learning |
| PII | Personally Identifiable Information |
| SLA | Service Level Agreement |
| SOP | Standard Operating Procedure |
| T&S | Trust & Safety |
| UGC | User-Generated Content |

---

## 1. Policy Overview

### 1.1 Purpose
This policy defines how Nodbusiness moderates user-generated content (UGC) on the Platform to ensure a safe, trustworthy, and legally compliant environment for all users.

### 1.2 Scope
Applies to all UGC on the Platform:
- Showroom content (descriptions, images, products)
- Posts, comments, reviews, ratings
- Messages (chat, broadcasts)
- Marketplace listings (templates, widgets, integrations)
- Profile content (bio, avatar, links)

### 1.3 Principles
| Principle | Application |
|-----------|-------------|
| **Safety First** | Harm prevention over engagement |
| **Proportionality** | Action matches severity |
| **Transparency** | Clear rules, clear appeals |
| **Consistency** | Same rules for all users |
| **Human-in-the-Loop** | AI flags, humans decide on high-risk |

---

## 2. Prohibited Content

### 2.1 Zero Tolerance (Immediate Removal + Account Action)

| Category | Definition | Examples |
|----------|------------|----------|
| **Child Sexual Abuse Material (CSAM)** | Any sexual content involving minors | Images, videos, text depicting minors sexually |
| **Terrorism/Extremism** | Promoting violent extremist ideologies | Propaganda, recruitment, manifestos |
| **Violence/Physical Harm** | Credible threats, incitement, instructions | Death threats, bomb-making, self-harm encouragement |
| **Child Exploitation** | Sexualization of minors, grooming | Sexualized depictions, solicitation |

**Action:** Immediate removal → Permanent ban → Report to authorities (NCMEC, local law enforcement)

### 2.2 High Severity (Removal + Account Action)

| Category | Definition | Examples |
|----------|------------|----------|
| **Hate Speech** | Attacking protected groups | Race, ethnicity, religion, gender, sexuality, disability |
| **Harassment/Bullying** | Targeted abuse, intimidation | Doxxing, stalking, coordinated attacks |
| **Violence/Threats** | Credible threats of harm | "I'll kill you", "I'll find you", weapon photos |
| **Illegal Goods/Services** | Prohibited by law | Drugs, weapons, counterfeit, stolen goods, human trafficking |
| **Financial Fraud** | Scams, phishing, Ponzi | Fake investments, advance-fee fraud, money mule recruitment |
| **Non-Consensual Intimacy** | Revenge porn, deepfakes | Leaked nudes, AI-generated sexual content |

### 2.3 Medium Severity (Removal + Warning/Restriction)

| Category | Definition | Examples |
|----------|------------|----------|
| **Spam/Scam** | Unsolicited commercial, deceptive | Fake listings, bulk DMs, clickbait, phishing links |
| **Misinformation** | Harmful false claims | Medical misinformation, election interference, financial scams |
| **IP Infringement** | Copyright, trademark, patent | Pirated content, counterfeit logos, patent violation |
| **Adult Content (Non-Consensual/Explicit)** | Pornography, sexual services | Explicit images, sexual service ads |
| **Self-Harm** | Suicide, eating disorders, cutting | Encouragement, instructions, glorification |

### 2.4 Low Severity (Label/Reduce Distribution)

| Category | Definition | Action |
|----------|------------|--------|
| **Clickbait** | Sensationalist, misleading headlines | Reduce distribution |
| **Low Quality** | Incoherent, spammy, duplicate | Reduce distribution |
| **Controversial** | Polarizing but not illegal | Label "sensitive", reduce |
| **Political Content** | Election, partisan | Label, reduce during elections |

---

## 3. Content-Specific Policies

### 3.1 Marketplace Listings (Templates, Widgets, Integrations)

| Requirement | Violation Action |
|-------------|------------------|
| **Accurate Description** | Features match actual functionality | Removal + warning |
| **No Malicious Code** | No backdoors, data exfiltration | Permanent ban + report |
| **IP Compliance** | Original or licensed assets only | Removal + DMCA |
| **No Deceptive Pricing** | Clear pricing, no hidden fees | Removal + warning |
| **Compatibility Claims** | Tested on stated versions | Removal if false |

### 3.2 Showroom Content (Business Pages)

| Requirement | Violation Action |
|-------------|------------------|
| **Accurate Business Info** | Name, address, contact, hours | Warning → suspension |
| **Product Accuracy** | Images, descriptions, prices match | Removal + warning |
| **No Prohibited Products** | Weapons, drugs, counterfeit, regulated | Removal + account action |
| **Authentic Reviews** | No fake/review manipulation | Remove reviews + account action |

### 3.3 Posts & Social Feed

| Content Type | Policy |
|--------------|--------|
| **Text Posts** | Same as general prohibited content |
| **Images/Videos** | Visual policy + CSAM scanning (PhotoDNA/PDQ) |
| **Links** | No phishing, malware, illegal sites (Safe Browsing API) |
| **Mentions/Hashtags** | No coordinated harassment/brigading |

### 3.4 Messages (Chat)

| Type | Policy |
|------|--------|
| **Private DMs** | Encrypted; no proactive scanning; user reports only |
| **Group Chats** | Same as posts; admin moderation tools |
| **Broadcasts** | Business-to-customer; same as posts |
| **File Sharing** | Max 50MB; type validation; malware scan |

### 3.4 Reviews & Ratings

| Violation | Action |
|-----------|--------|
| **Fake Reviews** (bought, incentivized, bot) | Remove + account action |
| **Review Manipulation** (review gating, review swapping) | Remove + account action |
| **Defamatory/False** | Remove if proven false |
| **Off-Topic** | Remove (not a review) |

---

## 4. Moderation Workflow

### 4.1 Detection

| Source | Method | Coverage |
|--------|--------|----------|
| **AI/ML Classifiers** | Text, image, video, link analysis | 95%+ of content |
| **Hash Matching** | CSAM (PhotoDNA), copyright (Content ID) | Known illegal content |
| **User Reports** | In-app reporting, prioritized queue | User-flagged |
| **Proactive Detection** | Pattern analysis, network analysis | Emerging threats |
| **Trusted Flagger** | Verified orgs (NGOs, law enforcement) | Priority queue |

### 4.2 Decision Flow

```
CONTENT DETECTED
       │
       ▼
AUTO-CLASSIFY (AI confidence >95%)
       │
       ├── HIGH CONFIDENCE VIOLATION → AUTO-REMOVE + LOG
       │
       ├── MEDIUM CONFIDENCE → HUMAN REVIEW QUEUE (SLA: 2h SEV-1, 24h SEV-2)
       │
       └── LOW CONFIDENCE → MONITOR / USER REPORT TRIGGER
```

### 4.3 Human Review Standards

| Criterion | Standard |
|-----------|----------|
| **Context Awareness** | Consider intent, satire, education, news |
| **Cultural Sensitivity** | Local norms (Amharic, Swahili, Hausa, Yoruba, Zulu) |
| **Proportionality** | Action matches severity |
| **Consistency** | Same violation = same action (precedent database) |
| **Documentation** | Every decision logged with reasoning |

### 4.4 Escalation Path

| Level | Trigger | Response Time | Authority |
|-------|---------|---------------|-----------|
| **L1: Analyst** | Standard queue | 2h (SEV-1), 24h (SEV-2) | T&S Analyst |
| **L2: Senior Analyst** | Appeals, complex, high-profile | 4h | Senior T&S |
| **L3: Policy Manager** | Policy interpretation, new categories | 8h | T&S Lead |
| **L4: Leadership** | Legal risk, media, government requests | Immediate | T&S Lead + Legal + CEO |

---

## 4. Appeals Process

### 4.1 Appeal Eligibility
- **Eligible:** Content removal, account suspension, feature restriction
- **Not Eligible:** Automated spam filter, obvious CSAM/terrorism

### 4.2 Appeal Process

```
USER SUBMITS APPEAL (Portal/Email)
       │
       ▼
ACKNOWLEDGE (24h) + CASE ID
       │
       ▼
REVIEW BY DIFFERENT ANALYST (48h SLA)
       │
       ├── UPHELD → NOTIFY USER + REASONING
       │
       └── OVERTURNED → RESTORE CONTENT + NOTIFY
```

### 4.3 Appeal Outcomes

| Outcome | User Notification | Internal Action |
|---------|-------------------|-----------------|
| **Upheld** | "Appeal denied. Reason: [specific policy]" | Log, update precedent |
| **Overturned** | "Content restored. Apology for error." | Restore, log, retrain model |
| **Partial** | "Part restored. [Details]" | Partial restore, log |

---

## 5. Enforcement Actions

| Action | Trigger | Duration | Appeal |
|--------|---------|----------|--------|
| **Content Removal** | Policy violation | Permanent | Yes |
| **Warning** | First minor offense | N/A (recorded) | N/A |
| **Feature Restriction** | Repeat abuse (e.g., posting, messaging) | 24h-30 days | Yes |
| **Temporary Suspension** | Severe/repeat | 24h-30 days | Yes |
| **Permanent Ban** | Severe/repeat/CSAM/terrorism | Permanent | Yes (30 days) |
| **Shadow Ban** | Spam/bot behavior | Until behavior stops | No (automated) |
| **Account Verification Required** | Suspicious activity | Until verified | Yes |

---

## 5. Special Categories

### 5.1 CSAM (Child Sexual Abuse Material)

| Step | Action | Timeline |
|------|--------|----------|
| **Detect** | PhotoDNA/PDQ hash match | Immediate |
| **Remove** | Permanent deletion | <1 minute |
| **Report** | NCMEC (US), Interpol, local LE | <24 hours |
| **Account** | Permanent ban, device/IP block | Immediate |
| **Preserve** | Hash, metadata, logs (legal hold) | 90 days minimum |

### 5.2 Terrorism/Extremism

| Step | Action | Timeline |
|------|--------|----------|
| **Detect** | Hash matching, keyword, network analysis | Immediate |
| **Remove** | Permanent deletion | <1 hour |
| **Report** | Relevant authorities (UN, local LE) | <24 hours |
| **Account** | Permanent ban | Immediate |
| **Network Analysis** | Identify connected accounts | 24 hours |

---

## 5. Transparency & Reporting

### 5.1 Transparency Report (Quarterly)

| Metric | Reported |
|--------|----------|
| **Total Content Removals** | By category, country, automation % |
| **Account Actions** | Warnings, suspensions, bans, appeals |
| **Government Requests** | Count, type, compliance rate |
| **IP Removals** | DMCA, trademark, counter-notices |
| **Fraud Prevented** | Volume, value, false positive rate |
| **Response Times** | Median by severity |

### 5.2 Public Resources

| Resource | URL |
|----------|-----|
| **Community Guidelines** | nodbusiness.app/guidelines |
| **Report Abuse** | nodbusiness.app/report |
| **Transparency Report** | transparency.nodbusiness.app |
| **Safety Center** | safety.nodbusiness.app |
| **Appeals Portal** | appeals.nodbusiness.app |

---

## 6. Moderator Wellbeing

| Support | Detail |
|---------|--------|
| **Rotation** | Max 4 hours queue time/day |
| **Counseling** | Free, confidential, on-demand |
| **Debrief** | Mandatory post-SEV-1 |
| **Peer Support** | Monthly moderator circles |
| **Trauma Training** | Quarterly (mandatory) |
| **Career Path** | Analyst → Senior → Lead → Manager |

---

## 7. Training & Quality

| Program | Frequency | Audience |
|---------|-----------|----------|
| **New Moderator Training** | 40 hours (onboarding) | New hires |
| **Policy Updates** | Monthly (2 hours) | All moderators |
| **Cultural Sensitivity** | Quarterly (4 hours) | All moderators |
| **Bias Awareness** | Semi-annual | All moderators |
| **Wellness/Resilience** | Monthly | All moderators |
| **Quality Calibration** | Weekly (sample review) | All moderators |

---

## 6. Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Removal Accuracy** | >95% | Precision/Recall on sample |
| **False Positive Rate** | <1% | Appeal overturn rate |
| **Median Response (SEV-1)** | <15 min | PagerDuty |
| **Median Response (SEV-2)** | <1 hour | Case system |
| **Appeal Overturn Rate** | <5% | Appeals / total |
| **Moderator Satisfaction** | >4.5/5 | Quarterly survey |

---

*Confidential. For Nodbusiness Technologies internal use only.*