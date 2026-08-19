# Nodbusiness — Crisis Communication Playbook

> **What to say, who says it, and when — when things go wrong.**
> A platform that communicates badly in a crisis loses more users than the crisis itself caused.
> The goal: Be transparent, be fast, take responsibility, and show what you're doing about it.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| CEO | Chief Executive Officer |
| CTO | Chief Technology Officer |
| PR | Public Relations |
| SLA | Service Level Agreement |
| SRE | Site Reliability Engineering |
| RCA | Root Cause Analysis |
| MTTR | Mean Time to Resolve |
| GDPR | General Data Protection Regulation |
| SAR | Suspicious Activity Report |
| ToS | Terms of Service |
| KPI | Key Performance Indicator |
| CRM | Customer Relationship Management |
| ETA | Estimated Time to Arrival / of resolution |
| UTC | Coordinated Universal Time — global time standard |

---

## 1. What Counts as a Crisis

Not every incident requires a crisis communication response. This playbook activates for:

| Situation | Crisis Level |
|-----------|-------------|
| Platform-wide outage > 30 minutes | Major |
| Data breach exposing user PII or payment data | Major |
| Security vulnerability exploited (even if contained) | Major |
| Payment processing failure affecting many users | Major |
| Critical bug causing financial loss to users | Major |
| Partial outage or degraded performance > 2 hours | Moderate |
| Single-user data incident (resolved) | Minor |
| Negative press coverage | Moderate/Major depending on scale |
| Regulatory inquiry or investigation | Major |
| High-profile user complaint going viral on social media | Moderate |
| Key team member departure (public) | Minor |

---

## 2. Crisis Response Team

| Role | Responsibility | Primary | Backup |
|------|---------------|---------|--------|
| Incident Commander | Coordinates all crisis activities | CEO | CTO |
| Technical Lead | Investigates, resolves, provides status | CTO / Senior Engineer | Engineering Lead |
| Communications Lead | Drafts and publishes all external communications | CEO (Phase 1) | Head of Marketing (Phase 2+) |
| Legal Liaison | Advises on what can and cannot be said | Legal Counsel | CEO |
| Customer Support Lead | Manages inbound user communications | Support Lead | CEO |

**Golden Rule:** Only one person speaks publicly in a crisis. That person is the CEO (or delegated Communications Lead). Everyone else is silent externally.

---

## 3. The 4 Phases of Crisis Response

### Phase 1: Detect (0–15 minutes)
```
→ Someone identifies an incident
→ Alert Incident Commander (CEO/CTO) immediately
→ Create a private incident channel (Slack, WhatsApp, or Signal)
→ Assign Technical Lead to investigate
→ Assign Support Lead to monitor inbound user contacts
→ Decision: Is this a crisis-level event? If yes, activate this playbook.
```

### Phase 2: Contain (15 minutes – 2 hours)
```
→ Technical Lead works to contain the problem (isolate, patch, roll back)
→ Incident Commander posts first public update (see templates below)
→ Support team prepared with initial response scripts
→ Legal Liaison informed if data breach, regulatory issue, or financial loss
→ All public communications approved by Incident Commander before publishing
```

### Phase 3: Communicate (ongoing during incident)
```
→ Status page updated every 30 minutes during active incident
→ Social media posts every 30–60 minutes if incident is public
→ Email to affected users: within 2 hours of confirmed impact
→ Keep communications honest — do not promise what you cannot deliver
→ Do not assign blame to third parties publicly (even if they are at fault)
```

### Phase 4: Recover and Learn (after resolution)
```
→ Post "all clear" message across all channels
→ Full post-mortem within 72 hours (internal) and 7 days (public if warranted)
→ Compensation / goodwill offered if users suffered real loss
→ Update runbooks, monitoring, and prevention based on learnings
```

---

## 4. Communication Templates

### Template 1: Immediate Acknowledgment (first 15 minutes)
Use this immediately when you know something is wrong but don't know details yet.

> **Status Page / Social Media:**
> 
> "We're aware that some users are experiencing issues with [feature/platform]. Our team is investigating and working on a fix. We'll provide an update within 30 minutes. We're sorry for the disruption."

### Template 2: Status Update (every 30 minutes during incident)
Replace [PLACEHOLDERS] with specifics:

> **Status Page / Social Media:**
> 
> "Update [TIME UTC]: We've identified [the root cause / an issue affecting X]. Our team is actively [working to resolve / deploying a fix]. 
> Affected: [describe who is affected]
> Not affected: [clarify what is working normally]
> ETA for resolution: [time or "we will update you in 30 minutes if not resolved"]"

### Template 3: Resolution Announcement
> **Status Page:**
> 
> "Resolved [TIME UTC]: The issue affecting [feature] has been resolved. All services are now operating normally. If you're still experiencing problems, please [clear your cache / try logging out and back in / contact support at support@nodbusiness.com].
>
> We apologize for the inconvenience. A full post-mortem will be published within [48 hours / 7 days]."

### Template 4: Data Breach Notification (user email)
> **Subject:** Important security notice about your Nodbusiness account
>
> "Dear [Name],
>
> We're writing to inform you of a security incident that may have affected your Nodbusiness account. We take the security of your information extremely seriously and want to be transparent about what happened.
>
> **What happened:**
> On [date], we discovered that [brief description of what occurred].
>
> **What information was involved:**
> [List specific data types — e.g., email address, name. Be specific. Do not be vague.]
>
> **What we've done:**
> We immediately [contained the issue / revoked affected access / notified authorities]. We have also [specific security improvements made].
>
> **What you should do:**
> We recommend you [change your password / check your account for unusual activity / monitor your email for suspicious activity].
>
> **Our commitment:**
> We are continuing to investigate and will update you if we learn anything new. We have notified relevant regulatory authorities as required by law.
>
> If you have questions, please contact us at security@nodbusiness.com.
>
> Sincerely,
> [CEO Name]
> CEO, Nodbusiness Technologies"

### Template 5: Regulatory Breach Notification (GDPR 72-hour)
> *This template is for notifying the relevant Data Protection Authority (DPA) within 72 hours of discovering a breach affecting EU users.*
> 
> [Consult legal counsel before sending. This is a prompt, not a final template.]
> 
> Include: Nature of breach, categories and approximate number of individuals concerned, likely consequences, measures taken or proposed.

### Template 6: Negative Press Response
> "We're aware of the recent [article/social media post/report] regarding Nodbusiness. [Choose one:]
> - We take these concerns seriously and are investigating.
> - We disagree with the characterization and here is our position: [facts].
> - We have already addressed this: [what was done].
> 
> We're committed to [transparency / the safety of our users / continuous improvement]. For press inquiries: press@nodbusiness.com"

---

## 5. What NOT to Say in a Crisis

| ❌ Don't Say | ✅ Say Instead |
|------------|--------------|
| "This has never happened before" | Say nothing about history; focus on current response |
| "It's not our fault, it was [vendor/hacker]" | "We're investigating the root cause" |
| "Only a small number of users were affected" | State the actual number or range |
| "Your data is completely safe" (if unsure) | "We are still assessing the scope of the incident" |
| "This is a minor issue" | Let users judge severity; don't minimize |
| "We can't comment on this" | You can always say: "We take this seriously and are investigating" |
| "No comment" | Always say something. Silence signals guilt. |
| Technical jargon | Plain language always. |

---

## 6. Channel-Specific Protocol

| Channel | Use Case | Who Posts | Approval |
|---------|---------|---------|---------|
| Status page (status.nodbusiness.com) | All technical incidents | CTO / technical team | Incident Commander |
| In-app banner | Incidents affecting active users | Support team | CEO |
| Email (to affected users) | Data breaches, payment issues, major outages | CEO (from CEO email) | Legal review if breach |
| Twitter / X | Public incidents; fast acknowledgment | Communications Lead | CEO |
| LinkedIn | Post-incident transparency report | CEO | — |
| Press release | Major incidents with media coverage | CEO / PR firm | Legal |
| User community / forum | All incidents affecting community | Support Lead | CEO |

---

## 7. Post-Incident Review

Within 72 hours of any major incident, conduct a blameless post-mortem:

```
Post-Mortem Template:
  Incident date and duration:
  Summary (2 sentences):
  Timeline of events:
    [Time]: What happened
    [Time]: When detected
    [Time]: When contained
    [Time]: When resolved
  Root cause:
  Impact:
    → Number of users affected
    → Duration of impact
    → Financial impact (if any)
  What went well:
  What went wrong:
  Action items (owner, due date):
    1. [Specific action] — [Owner] — [Due date]
    2. [Specific action] — [Owner] — [Due date]
  Will we publish a public post-mortem? [Yes/No] [Why]
```

---

## 8. Compensation Policy

When a crisis causes real user harm, consider goodwill gestures:

| Impact | Compensation Approach |
|--------|----------------------|
| < 1 hour minor disruption | Public apology, no compensation required |
| 1–4 hour major disruption | Subscription credit (1 week free), public apology |
| > 4 hour outage | Subscription credit (1 month free) for affected users |
| Financial loss to user | Full financial restitution + goodwill credit |
| Data breach | Offer affected users 1 year identity monitoring (if practical) |

---

## 9. Crisis Drills

Every 6 months, run a simulated crisis drill:
1. Simulate a data breach scenario
2. Test detection-to-communication timeline
3. Practice filling out the post-mortem template
4. Update this playbook based on drill learnings

---

*Owner: CEO*
*Review cycle: Annually, or after any major incident*
*Crisis contact: ceo@nodbusiness.com | Press: press@nodbusiness.com | Security: security@nodbusiness.com*
