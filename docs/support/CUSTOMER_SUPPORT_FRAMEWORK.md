# Nodbusiness — Customer Support Framework

> **How Nodbusiness delivers world-class customer support — from first contact through resolution.**
> Support is a trust-building function. Every interaction is an opportunity to deepen user loyalty or destroy it.

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| SLA | Service Level Agreement — committed response and resolution times |
| CSAT | Customer Satisfaction Score |
| NPS | Net Promoter Score — "how likely are you to recommend us?" |
| FCR | First Contact Resolution — resolved without escalation or follow-up |
| AHT | Average Handle Time — time spent on a single ticket |
| TTR | Time to Resolution |
| FRT | First Response Time |
| CRM | Customer Relationship Management |
| FAQ | Frequently Asked Questions |
| KB | Knowledge Base — self-service help articles |
| VIP | Very Important Person — high-value users |
| API | Application Programming Interface |
| AI | Artificial Intelligence |
| T&S | Trust and Safety |
| QA | Quality Assurance |
| KPI | Key Performance Indicator |
| GDPR | General Data Protection Regulation |

---

## 1. Support Philosophy

Nodbusiness's support model is built on three commitments:
1. **Fast** — every user deserves a response, not a wait
2. **Human** — even when AI helps, a real person is accountable
3. **Honest** — we tell users what happened and what we will do, even when the answer is uncomfortable

We do not aim to close tickets quickly. We aim to resolve problems completely.

---

## 2. Support Tiers

### Tier 0 — Self-Service (no agent required)
The best support interaction is one the user solves themselves:
- Help Center / FAQ (Knowledge Base)
- In-app tooltips and guided walkthroughs
- Status page (uptime.nodbusiness.com) for platform issues
- Community forum (Phase 2+)

Target: 60–70% of support inquiries resolved at Tier 0 (no agent contact).

### Tier 1 — Frontline Support
- First response to all incoming tickets
- Handles: account questions, billing clarifications, how-to questions, password resets, general navigation
- Tool: Zendesk, Intercom, or custom support system
- Agent type: Generalist agents (Phase 1: CEO/founder handles; Phase 2: 1–3 agents)

### Tier 2 — Technical Support
- Complex technical issues escalated from Tier 1
- Handles: payment errors, feature bugs, data sync issues, API integration problems
- Agent type: Engineering-adjacent support; collaborates with dev team

### Tier 3 — Senior / Specialist Support
- Escalations from Tier 2
- Handles: fraud disputes, account termination appeals, legal requests, major refunds, VIP issues
- Agent type: T&S specialists, senior support, CEO (Phase 1)

### Tier 4 — Executive / Legal
- Extremely rare escalations
- Handles: regulatory inquiries, media escalations, legal threats, large enterprise issues
- Handled by: CEO, legal counsel

---

## 3. SLAs (Service Level Agreements) by Priority

| Priority | Example | First Response | Resolution |
|---------|---------|---------------|-----------|
| P0 — Critical | Platform-wide outage, data breach | 15 minutes | ASAP — all-hands |
| P1 — Urgent | Payment charged but order not confirmed, account illegally locked | 1 hour | 4 hours |
| P2 — High | Listing not appearing, seller not receiving payouts | 4 hours | 24 hours |
| P3 — Medium | Feature not working as expected, billing question | 8 hours | 48 hours |
| P4 — Low | How-to question, general feedback, feature request | 24 hours | 72 hours |

**SLA adherence target:** > 95% of tickets responded to within SLA.

---

## 4. Support Channels

| Channel | Use Case | Hours |
|---------|---------|-------|
| In-app chat | Real-time support for active users | Phase 2: 9AM–9PM UTC |
| Email (support@nodbusiness.com) | All issues; creates ticket | 24/7 (async) |
| Help Center (self-service) | FAQs, guides, how-tos | Always available |
| Social media (@nodbusiness) | Public complaints, visibility | Monitored weekdays |
| Phone | VIP / enterprise only (Phase 3) | Business hours |

**Phase 1 (bootstrap):** Email only + in-app help center. Founder manages support.
**Phase 2 (post-seed):** Add live chat. Hire 1–2 support agents.
**Phase 3 (scale):** Multi-channel, 24/7, dedicated team by language/region.

---

## 5. Support Categories and Scripts

### 5.1 Payment Issues
**Scenario: User charged but order not confirmed**
```
Investigation steps:
  1. Check payment status in Stripe/Chapa dashboard
  2. Check order status in admin panel
  3. Check webhook logs for payment confirmation receipt

Resolution:
  A. Payment processed + order confirmed in DB → likely UI issue; send confirmation manually
  B. Payment processed + order NOT in DB → webhook missed; manually create order, notify user
  C. Payment pending → inform user, set 24-hour follow-up
  D. Payment failed (card declined) → inform user, ask them to retry with another method

Response template:
  "Hi [Name], I've investigated your payment and found that [explanation]. 
  Here's what I've done: [action]. If you have any further questions, I'm here."
```

**Scenario: User wants a refund**
```
Check: Is the order eligible per our refund policy?
  → Within 7 days + item not delivered → Full refund
  → Delivered but defective → Full refund after seller review (3 days)
  → Buyer's remorse (delivered correctly) → No refund (check policy)
  → Subscription → Prorated refund or full refund within 14 days (GDPR right of withdrawal)

Process: Initiate refund in Stripe/Chapa → Notify user → Update order status
```

### 5.2 Account Issues
**Scenario: User locked out of account**
```
Verification required: Email + phone OTP
If MFA lost: Identity verification + 24-hour cooling period before account restored
If account suspended: Explain reason, inform of appeal process
If account hacked: Follow account takeover protocol (see FRAUD_PREVENTION.md)
```

### 5.3 Seller Issues
**Scenario: Seller payout not received**
```
Check:
  1. Bank/wallet account verified?
  2. Payout schedule met? (payouts batch weekly)
  3. Account on hold due to risk review?
  4. Stripe/Chapa payout status?

Escalation: Finance team if payout shows as sent but not received by seller
```

### 5.4 Trust & Safety Referrals
Any ticket mentioning:
- Account hacking
- Fraud or scam
- Illegal content
- Child safety
→ Immediately escalate to T&S team, do not attempt to resolve in standard support queue.

---

## 6. Quality Assurance

### Ticket QA Review
- 10% of all resolved tickets reviewed monthly by support lead
- QA rubric: Accuracy, Tone, Completeness, Resolution quality, SLA adherence
- QA score target: > 90%
- Agents with < 80% QA score receive coaching

### CSAT Collection
- After every resolved ticket: 1-question survey: "How satisfied were you with your support experience?" (1–5)
- CSAT target: > 4.2/5.0
- Monthly CSAT trend tracked and reported to CEO

---

## 7. Knowledge Base Management

The Knowledge Base (KB) is the first line of support. It must be:
- **Accurate** — incorrect information damages trust more than no information
- **Current** — updated within 48 hours of any product change
- **Clear** — written for users, not engineers (no jargon)
- **Findable** — searchable, well-categorized

### KB Structure
```
Getting Started
  → Creating an account
  → Setting up your profile
  → Navigating the platform

For Buyers
  → Browsing and searching
  → Placing an order
  → Payment methods accepted
  → Refunds and returns
  → Tracking your order

For Sellers / Businesses
  → Creating a showroom
  → Listing products and services
  → Managing orders
  → Getting paid (payouts)
  → Handling disputes

Account & Security
  → Changing your password
  → Two-factor authentication
  → Privacy settings
  → Deleting your account (GDPR)

Billing & Subscriptions
  → Subscription plans explained
  → Upgrading or downgrading
  → Cancelling a subscription
  → Refund policy

Technical Help
  → App troubleshooting
  → Browser compatibility
  → API integration guide
```

### KB Update Protocol
```
Product ships a change → Support lead notified within 24 hours
Support lead updates KB article → Published within 48 hours of product change
Article reviewed for accuracy → Every 6 months
Outdated articles → Marked for review and updated
```

---

## 8. Escalation Matrix

| Issue Type | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|-----------|--------|--------|--------|--------|
| How-to question | Resolves | — | — | — |
| Bug report | Logs → | Engineering | — | — |
| Payment error | Investigates → | Finance | CEO | — |
| Account ban appeal | Logs → | — | T&S | CEO |
| Fraud / scam | Logs → | T&S | CEO | Legal |
| Data deletion request | Logs → | Engineering | Legal | — |
| Media inquiry | Routes to → | — | — | CEO / PR |
| Regulatory request | Routes to → | — | Legal | CEO |

---

## 9. Support KPIs Dashboard

Track these monthly:

| KPI | Target | Alert |
|-----|--------|-------|
| SLA adherence (P1–P2) | > 95% | < 90% |
| First Response Time (average) | < 2 hours | > 4 hours |
| FCR (First Contact Resolution) | > 75% | < 65% |
| CSAT score | > 4.2/5.0 | < 3.8/5.0 |
| Open ticket backlog | 0 at week end | > 20 |
| Ticket volume per 1,000 users | Track trend | Spike > 50% MoM |
| KB self-service deflection rate | > 60% | < 45% |
| Refund rate | < 5% of orders | > 8% |

---

## 10. VIP and Enterprise Support

High-value accounts (Business plan subscribers, large merchants) receive:
- Dedicated support contact (named account manager, Phase 3)
- Faster SLA: P2 response within 1 hour
- Quarterly business review call
- Early access to new features
- Direct escalation to engineering for integration issues

---

*Owner: CEO / Support Lead (Phase 1), Head of Customer Success (Phase 2+)*
*Review cycle: Monthly metrics; policy updated quarterly*
*Support: support@nodbusiness.com*
