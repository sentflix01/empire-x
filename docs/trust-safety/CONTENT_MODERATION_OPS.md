# Nodbusiness — Content Moderation Operations

> **How Nodbusiness moderates user-generated content at scale — from automated detection through human review to policy enforcement.**
> Moderation protects the community, satisfies legal obligations, and maintains advertiser/partner confidence.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| UGC | User-Generated Content |
| T&S | Trust and Safety |
| ML | Machine Learning |
| NLP | Natural Language Processing |
| CSAM | Child Sexual Abuse Material |
| SLA | Service Level Agreement |
| QA | Quality Assurance |
| API | Application Programming Interface |
| DMCA | Digital Millennium Copyright Act |
| ToS | Terms of Service |
| KPI | Key Performance Indicator |
| BPO | Business Process Outsourcing — outsourced moderation vendors |
| FTE | Full-Time Equivalent |
| AHT | Average Handle Time — time to review one piece of content |
| FPR | False Positive Rate — legitimate content incorrectly removed |
| FNR | False Negative Rate — harmful content incorrectly allowed |

---

## 1. Content Types Requiring Moderation

| Content Type | Volume Estimate | Risk Level |
|-------------|----------------|-----------|
| User posts / feed content | High | Medium |
| Business listings / showrooms | Medium | Medium |
| Product photos | High | Medium |
| User profile photos | Medium | Medium-High |
| Chat messages | Very High | Medium-High |
| Reviews and ratings | Medium | Medium |
| Comments | High | Medium |
| File uploads (PDFs, documents) | Low | Low |
| Video content (if enabled) | Medium | High |
| AI-generated content (from platform AI) | Medium | Medium |

---

## 2. Three-Layer Moderation Model

### Layer 1 — Pre-Upload Filtering (automated, milliseconds)
Runs before content is ever stored or displayed:

```
Image content:
  → PhotoDNA / Microsoft Azure Content Moderator → CSAM detection
  → ML nudity/adult content classifier (confidence threshold: 95% for auto-block)
  → File type validation (only allowed MIME types accepted)
  → File size limits (prevent storage abuse)
  → Malware scan on all file uploads

Text content:
  → Keyword blocklist (50–500 words/phrases, continuously updated)
  → Language detection (for localized moderation rules)
  → Spam classifier (NLP model)
  → NLP hate speech classifier

Link content:
  → URL reputation check (Google Safe Browsing API, URLhaus)
  → Block known phishing/malware domains
  → Auto-expand shortened URLs before checking
```

**Outcome:**
- Auto-blocked: content never stored (CSAM, known malware links, keyword blacklist matches)
- Auto-flagged: content stored but quarantined pending review
- Cleared: content published, may still be flagged by users later

### Layer 2 — User Reporting (asynchronous, within SLA)
Any user can report any content:

```
Report flow:
  1. User taps "Report" on post/profile/listing/message
  2. User selects reason from list
  3. Report logged with: reporter ID, content ID, reason, timestamp
  4. Content enters moderation queue
  5. Reporter receives acknowledgment ("We received your report")

Report triage:
  CSAM reports → Immediate: 15 minutes
  Violence threats → 1 hour
  Harassment/hate speech → 4 hours
  Fraud/scam reports → 4 hours
  Spam → 24 hours
  Other → 72 hours
```

### Layer 3 — Human Review (moderators)
Moderators review:
- All content flagged by Layer 1 (above auto-block threshold)
- All user reports (Layer 2)
- Random 1% QA sample of published content
- All appeals from users who disagree with enforcement actions

---

## 3. Moderation Decision Framework

When reviewing a piece of content, the moderator answers:

```
Decision Tree:
1. Does this content violate any rule in the Community Standards?
   YES → proceed to step 2
   NO  → Clear the content, close the ticket

2. How severe is the violation?
   CRITICAL (CSAM, terrorism, credible violence threat) → 
     Immediate removal + account termination + escalate to legal
   HIGH (hate speech, serious harassment, fraud) → 
     Remove content + Level 2 warning or temporary ban
   MEDIUM (spam, fake reviews, misleading content) → 
     Remove content + Level 1 warning
   LOW (minor policy breach, first offense) → 
     Remove content + in-app guidance (no formal warning)

3. Is this the user's first violation?
   YES → Apply minimum enforcement for the severity level
   NO (check history) → Step up enforcement by one level

4. Document the decision:
   → Content ID
   → Rule violated (specific section of Community Standards)
   → Action taken
   → Moderator ID
   → Any escalation reason
```

---

## 4. Moderator Operations

### Phase 1 (0–50,000 users): Founder-led
- CEO or designated team member handles escalated reports
- Automated Layer 1 handles most volume
- Target: < 10 manual reviews per day
- Tool: Simple internal admin panel in the Admin dashboard

### Phase 2 (50,000–500,000 users): Small T&S team
- 2–3 dedicated moderators
- One T&S lead (sets policy, handles appeals)
- Tooling: Upgrade admin panel with moderation-specific features
- Language coverage: Primary user languages

### Phase 3 (500,000+ users): Scaled operations
- Dedicated T&S team (5–15 people) + BPO (Business Process Outsourcing) for volume
- 24/7 coverage via timezone distribution
- Specialist reviewers for: payments/fraud, legal escalations, hate speech
- Regular training refreshes (monthly)

### Moderator Guidelines
```
Every moderator must:
  □ Complete full training before reviewing live content
  □ Pass certification on Community Standards
  □ Never review content from their home country alone (potential bias)
  □ Take mandatory breaks when reviewing graphic content (mental health)
  □ Never discuss case specifics outside the moderation team
  □ Escalate any content that is difficult or uncertain — never guess on hard cases
  □ Meet AHT targets without sacrificing accuracy
```

### Moderator Wellbeing
Content moderators are exposed to harmful content. Required protections:
- Maximum 4 hours of graphic content review per day
- Access to confidential mental health counseling
- Regular team check-ins (at least bi-weekly)
- Ability to escalate and rotate away from difficult content types
- Annual mental health leave policy

---

## 5. Content Appeals Process

```
User receives enforcement action (content removed / account restricted)
  ↓
User can appeal within 30 days via in-app form
  ↓
Appeal enters separate queue — NOT reviewed by original moderator
  ↓
Review SLA: 24 hours (bans) / 72 hours (content removal)
  ↓
Three outcomes:
  A. Upheld: Action was correct. User notified with clear explanation.
  B. Overturned: Error made. Content restored. Account restored. Apology sent.
  C. Modified: Severity reduced. E.g., permanent ban → 30-day suspension.
  ↓
Second appeal: Available only for permanent bans. Reviewed by T&S Lead / CEO.
No further appeals after second review.
```

---

## 6. DMCA Takedown Process (Copyright)

For users claiming their copyrighted content is on the platform:

```
Step 1: Claimant submits takedown notice to legal@nodbusiness.com with:
  → Identification of the copyrighted work
  → Location of the infringing content (URL)
  → Good faith statement
  → Statement under penalty of perjury
  → Contact information and signature

Step 2: Nodbusiness reviews notice for completeness within 48 hours

Step 3: If valid:
  → Content removed within 24 hours
  → User who uploaded notified: content was removed + reason
  → User can submit counter-notice (has 10 business days)

Step 4: If counter-notice submitted:
  → Claimant notified — has 10 business days to file lawsuit
  → If no lawsuit: content restored
  → If lawsuit filed: content stays down until resolved

Step 5: Repeat infringers (3+ valid DMCA claims): account terminated
```

---

## 7. Moderation Metrics (KPIs)

Track these weekly:

| KPI | Target | Alert Threshold |
|-----|--------|----------------|
| CSAM response time | < 15 minutes | > 30 minutes |
| Critical report SLA adherence | > 99% | < 95% |
| High report SLA adherence | > 95% | < 90% |
| False Positive Rate (FPR) | < 5% | > 8% |
| False Negative Rate (FNR) | < 2% | > 3% |
| Moderator QA score | > 90% | < 85% |
| Appeal overturn rate | < 15% | > 20% (signals policy clarity problem) |
| Average review time (AHT) | < 3 minutes | > 5 minutes |
| Backlog (reports pending > SLA) | 0 | > 10 |

---

## 8. Tooling Requirements

| Function | Tool / Approach |
|---------|----------------|
| Image CSAM detection | PhotoDNA (Microsoft) or NCMEC CyberTipline API |
| Adult content ML | AWS Rekognition / Google Vision AI |
| Text classification | Custom NLP model or OpenAI moderation API |
| URL safety check | Google Safe Browsing API |
| Moderator dashboard | Custom admin panel (in-house) |
| Queue management | BullMQ (already in stack) |
| Case management | Custom or Zendesk (Phase 2+) |
| Transparency reporting | Custom reporting module |

---

*Owner: CEO / T&S lead (Phase 1), Head of Content Operations (Phase 2+)*
*Review cycle: Monthly metrics review, policy updated quarterly*
*Escalations: safety@nodbusiness.com*
