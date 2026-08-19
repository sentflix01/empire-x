# Nodbusiness — Trust & Safety Framework

> **The platform-wide system for keeping Nodbusiness safe, fair, and trustworthy.**
> Trust is Nodbusiness's most valuable product. Without it, the marketplace fails, the community disappears, and the platform dies. This framework is not optional — it is foundational.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| T&S | Trust and Safety |
| KYC | Know Your Customer |
| AML | Anti-Money Laundering |
| PII | Personally Identifiable Information |
| IP | Intellectual Property / Internet Protocol (context-dependent) |
| CSAM | Child Sexual Abuse Material |
| DMCA | Digital Millennium Copyright Act (US) |
| NLP | Natural Language Processing |
| ML | Machine Learning |
| API | Application Programming Interface |
| SLA | Service Level Agreement |
| ToS | Terms of Service |
| GMV | Gross Merchandise Value |
| SaaS | Software as a Service |
| NCMEC | National Center for Missing and Exploited Children (US) |
| CyberTipline | NCMEC mandatory reporting system for CSAM |
| CSAT | Customer Satisfaction Score |
| QA | Quality Assurance |

---

## 1. Trust & Safety Philosophy

Nodbusiness's Trust & Safety model is built on four principles:

1. **Prevention first** — Stop harm before it happens through design, onboarding, and signals
2. **Fast detection** — Catch harm within minutes using automated systems
3. **Fair enforcement** — Apply rules consistently; give users a chance to appeal
4. **Continuous learning** — Every incident improves the system

We do NOT apply a zero-tolerance, instant-ban approach to everything. Different violations require different responses. The goal is a safe platform, not a sterile one.

---

## 2. Threat Categories

### 2.1 Content Threats
| Category | Severity | Response |
|---------|---------|---------|
| CSAM (Child Sexual Abuse Material) | Critical | Immediate removal, account ban, report to NCMEC CyberTipline |
| Terrorism / violent extremism | Critical | Immediate removal, account ban, report to authorities |
| Hate speech | High | Remove content, warn user, escalate to ban on repeat |
| Graphic violence | High | Remove content, warn user |
| Spam / mass unsolicited content | Medium | Remove, rate-limit, ban on repeat |
| Misinformation / fake news | Medium | Label (do not remove), context added |
| Nudity / adult content | Medium | Remove if against policy, age-gate if platform allows |
| Copyright infringement | Medium | DMCA takedown process |
| Misleading business claims | Medium | Request verification, remove on confirmed fraud |

### 2.2 Commerce / Marketplace Threats
| Category | Severity | Response |
|---------|---------|---------|
| Counterfeit goods | High | Remove listing, ban seller, report if requested |
| Prohibited items (weapons, drugs) | Critical | Remove, ban, report |
| Fake reviews | High | Remove, penalize review score, ban account |
| Shill bidding / review manipulation | High | Remove, suspend account |
| Non-delivery fraud | High | Escalate to buyer protection, suspend seller |
| Bait-and-switch pricing | Medium | Remove listing, warn seller |
| False advertising | Medium | Request correction or remove |

### 2.3 Account & Identity Threats
| Category | Severity | Response |
|---------|---------|---------|
| Account takeover / unauthorized access | Critical | Lock account, notify owner, force re-authentication |
| Impersonation (fake brand/person accounts) | High | Remove, ban |
| Fake identity (KYC fraud) | Critical | Ban, report to payment processor |
| Bot accounts / artificial engagement | Medium | Ban, reverse fake engagement |
| Multiple accounts (multi-accounting) | Medium | Merge or ban depending on intent |

### 2.4 Financial Threats
| Category | Severity | Response |
|---------|---------|---------|
| Payment fraud / stolen cards | Critical | Freeze transaction, refund buyer, ban seller |
| Money laundering via marketplace | Critical | Freeze funds, file SAR, ban account |
| Chargeback abuse (friendly fraud) | High | Dispute chargeback, suspend abusive buyer |
| Price manipulation / collusion | Medium | Remove, warn, escalate |

---

## 3. Detection Systems

### 3.1 Automated Detection (Layer 1)
These systems run without human intervention:

```
Image scanning:
  → All uploaded images scanned by PhotoDNA (Microsoft) or equivalent for CSAM
  → Adult content classifier (ML model) for policy violations
  → Trademark/brand logo detection (reduce counterfeit risk)

Text scanning:
  → NLP classifier for hate speech, harassment, spam
  → Keyword blocklist (continuously updated)
  → Spam signal detection (message velocity, duplicate content)

Behavioral signals:
  → Velocity limits (posts per hour, messages per minute)
  → New account action limits (posting, selling, messaging)
  → Anomalous activity detection (unusual login, IP mismatch, device fingerprint)

Transaction signals:
  → See fraud_prevention.md for full transaction monitoring rules
  → Chargebacks > 1% of GMV → automated account review trigger
```

### 3.2 User Reporting (Layer 2)
Every piece of content, every user profile, and every transaction has a report button.

```
Report categories:
  → Spam
  → Harassment / hate speech
  → Scam / fraud
  → Fake account / impersonation
  → Copyright infringement
  → Other (free text)

SLA on user reports:
  → Critical (CSAM, violence threat): 1 hour
  → High (hate speech, fraud): 4 hours
  → Medium (spam, fake reviews): 24 hours
  → Low (general): 72 hours
```

### 3.3 Human Review (Layer 3)
Trained moderators review:
- All content flagged by automated systems (before action is taken on medium/low severity)
- All user appeals
- All reports above medium severity
- Random 1% QA (Quality Assurance) sample of content passing automated checks

---

## 4. Enforcement Actions

### Action Ladder (Progressive)
```
Level 1 — Warning:
  Content removed. User receives in-app notification explaining the rule violated.
  No account restriction.
  Used for: First offense, low-severity violations

Level 2 — Temporary Restriction:
  Content removed. Feature access restricted for 7–30 days.
  (e.g., cannot post, cannot message, cannot list products)
  Used for: Repeat low violations, first high violations

Level 3 — Temporary Ban:
  Account suspended for 7–90 days.
  User can still access their data but cannot use the platform.
  Used for: Serious violations, repeated violations

Level 4 — Permanent Ban:
  Account terminated. Data held per legal retention policy.
  Email and IP blocked from re-registration.
  Used for: CSAM, terrorism, financial fraud, repeated severe violations

Level 5 — Legal Escalation:
  Account banned + data preserved + report filed with authorities.
  Used for: CSAM, credible violence threats, financial crimes
```

### No Double Jeopardy
A user cannot be punished twice for the same incident. If the automated system removes content AND a moderator reviews it, only one enforcement action applies.

---

## 5. Appeals Process

Every user who receives an enforcement action has the right to appeal, except for:
- CSAM cases (zero tolerance, no appeal)
- Cases where legal authorities have been notified

### Appeal Flow
```
Step 1: User submits appeal in-app (explain why decision was wrong)
Step 2: Appeal reviewed by a different moderator (not the original reviewer)
Step 3: Decision within:
  → 24 hours for account bans
  → 72 hours for content removals
Step 4: One of three outcomes:
  → Upheld: original decision stands, user notified with explanation
  → Overturned: action reversed, content restored, user notified
  → Modified: lesser action applied (e.g., ban reduced to restriction)
Step 5: CEO escalation available for permanent bans only
```

---

## 6. Transparency Reporting

Once at scale (> 100,000 users), Nodbusiness publishes a semi-annual Transparency Report covering:
- Total reports received by category
- Total content removed by category
- Total accounts banned
- Total government / law enforcement requests received
- Total CSAM reports filed with NCMEC
- Total appeals received and outcomes

This follows the model of Facebook, Twitter/X, and other major platforms. Transparency builds trust.

---

## 7. Trust Signals on the Platform

These features help users self-assess trustworthiness of sellers/buyers:

| Signal | Meaning |
|--------|---------|
| ✅ Verified badge | Identity verified via KYC |
| ⭐ Star rating | Aggregated from completed transactions |
| 📦 Transaction count | Number of completed orders |
| 🔒 Escrow | Funds held until buyer confirms delivery |
| 📋 Response rate | % of messages replied to within 24 hours |
| 📅 Member since | Account age (older = more trusted baseline) |
| 🌍 Location verified | Business address confirmed |

---

## 8. Special Populations Policy

### Minors
- No users under 13 permitted (align with COPPA)
- Users 13–17 require parental consent (where local law requires it)
- Minor accounts have restricted access to marketplace and messaging features
- If we identify a minor in an adult account, account is suspended

### Vulnerable Users
- Users who show signs of mental health crisis are shown crisis resources
- No targeted advertising to users in vulnerable states

---

## 9. Law Enforcement Cooperation

Nodbusiness cooperates with law enforcement where legally required:

| Request Type | Response |
|-------------|---------|
| Legal court order | Comply, provide data specified in order |
| Emergency disclosure (imminent threat to life) | Comply immediately, document |
| Informal request without legal process | Decline; require legal process |
| Government takedown request | Review with legal counsel; comply if legally required |

All law enforcement requests are logged. Government requests are included in Transparency Report.

---

*Owner: CEO (Phase 1), Head of Trust & Safety (Phase 2+)*
*Review cycle: Quarterly. Updated after any major incident or policy change.*
*T&S contact: safety@nodbusiness.com*
