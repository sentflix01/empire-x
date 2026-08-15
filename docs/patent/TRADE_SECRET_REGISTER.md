# Halehame — Trade Secret Register

> **Classification:** STRICTLY CONFIDENTIAL — Do Not Distribute
> **Purpose:** Official register of all trade secrets held by Halehame Technologies.
> This document is maintained to establish the existence and value of trade secrets
> in any future legal proceeding.
> **Last Updated:** August 2026

---

## What Is a Trade Secret?

A trade secret is any information that:
1. Has commercial value because it is secret
2. Is known only to a limited group of people
3. Is subject to reasonable steps to keep it secret

Trade secrets are protected indefinitely — as long as they remain secret.
They do not require registration or filing fees.
They are protected under the Defend Trade Secrets Act (USA), TRIPS Agreement (international),
and Ethiopian trade secret law.

---

## Trade Secret #1 — AI Dynamic Template Pricing Algorithm

**Date of Creation:** August 2026
**Creator:** Halehame Technologies
**Location:** `backend/lib/featureFlags.js`, `backend/routes/devops.js` (pricing module)
**Access Level:** Restricted — CEO + 1 Lead Engineer only

**Description:**
The proprietary algorithm that calculates template prices dynamically based on:
- Real-time demand signals: view count, install rate, 30-day retention rate
- Quality signals: average user rating, accessibility score, performance score
- Competition density: number of active businesses in the same category
- Weighting formula: `price = base × demand_multiplier × quality_multiplier × competition_factor`
- The specific weight values assigned to each signal
- The thresholding logic that prevents price spikes and floors

**Why It Is Valuable:**
No competitor (Shopify, Wix, Squarespace, Telegram) uses this method.
It enables demand-responsive pricing that maximizes both developer revenue and
user satisfaction simultaneously. Replicating it requires significant data
that only Halehame possesses after operating the platform.

**Protection Measures in Place:**
- [ ] Algorithm code stored in access-controlled private repository
- [ ] Only 2 people have access to the pricing module source code
- [ ] All people with access have signed NDA (see NDA register)
- [ ] No algorithm logic exposed to frontend or API responses
- [ ] Access logs enabled on the pricing module
- [ ] Algorithm described in provisional patent application (Patent 1)

**NDA Signatories with Access:**
| Name | Role | NDA Date | NDA Reference |
|------|------|----------|---------------|
| [Founder name] | CEO | [Date] | NDA-001 |
| [Engineer name] | Lead Engineer | [Date] | NDA-002 |

---

## Trade Secret #2 — Developer Revenue Share Quality Score Formula

**Date of Creation:** August 2026
**Creator:** Halehame Technologies
**Location:** Revenue share calculation module (to be built)
**Access Level:** Restricted — CEO + Product Lead only

**Description:**
The specific formula used to calculate a developer's quality score, which
determines their revenue share percentage. Includes:
- Weighting of each quality metric (ratings, accessibility, performance, retention)
- The minimum quality threshold required for revenue share eligibility
- The bonus multiplier formula for top-rated templates
- The degradation curve when a template's quality score declines
- The time-windowing logic (30-day rolling vs. cumulative scores)

**Why It Is Valuable:**
Creates a self-regulating marketplace where developers are financially
incentivized to maintain quality. The specific formula values took
significant research and will take competitors significant time to calibrate.

**Protection Measures in Place:**
- [ ] Formula documented in this register with creation date
- [ ] Not exposed in any public documentation or API
- [ ] All team members with knowledge have signed NDAs
- [ ] Will be described in provisional patent application (Patent 2)

---

## Trade Secret #3 — Showroom Discovery Ranking Algorithm

**Date of Creation:** August 2026
**Creator:** Halehame Technologies
**Location:** `backend/routes/trending.js`, `backend/routes/suggestions.js`
**Access Level:** Restricted — CEO + Engineering Lead only

**Description:**
The four-factor discovery algorithm that ranks showrooms for each user:
- Social graph weight: how heavily follows/engagement influence ranking
- Proximity decay function: how distance reduces a showroom's score
- Category affinity score: how user history maps to business categories
- Trending velocity: rate of change in engagement rather than absolute numbers
- The specific numerical weights assigned to each factor
- How the algorithm handles cold-start (new users with no history)

**Why It Is Valuable:**
The combination of these four factors produces discovery results that are
more relevant and engaging than any single-factor approach. The specific
weights were determined through platform data and cannot be replicated without
the same user behavior dataset.

**Protection Measures in Place:**
- [ ] Algorithm weights not logged or exposed in any output
- [ ] API returns results only, not the scores or weights used
- [ ] Will be described in provisional patent application (Patent 3)
- [ ] All engineers with access have signed NDAs

---

## Trade Secret #4 — Platform User Behavior Dataset

**Date of Creation:** Ongoing from launch
**Creator:** Halehame Technologies (aggregated from user activity)
**Location:** Neon PostgreSQL database (encrypted)
**Access Level:** System only + CEO with admin credentials

**Description:**
The aggregated, anonymized dataset of user behavior on the platform including:
- Template view-to-install conversion rates per category
- User engagement patterns per time of day and geography
- Price elasticity data (how price changes affect install rates)
- Category demand seasonality patterns
- Cross-category user interest correlations

**Why It Is Valuable:**
This dataset makes the AI pricing algorithm progressively more accurate over time.
A competitor launching today cannot replicate this dataset without operating
the same platform for the same duration. It is a compounding data moat.

**Protection Measures in Place:**
- [ ] Database encrypted at rest (Neon PostgreSQL)
- [ ] All data access requires authentication
- [ ] No raw dataset export available via API
- [ ] Data retention and security policy documented in Privacy Policy
- [ ] Anonymized before any internal analytics use

---

## Trade Secret #5 — Business Templates Design System

**Date of Creation:** August 2026
**Creator:** Halehame Technologies
**Location:** `frontend-next/lib/showroomTemplates.ts`, `showroomTaxonomy.ts`
**Access Level:** Internal engineering team (read), CEO (full access)

**Description:**
The proprietary mapping system that:
- Assigns each of 500+ global business types to one of 20 categories
- Defines which section types are appropriate for each category
- Specifies default content, field labels, and sample data per business type
- The taxonomy hierarchy connecting global business classification to showroom sections

**Why It Is Valuable:**
This system enables any business owner in the world to instantly receive a
contextually appropriate showroom template. The accuracy of the category
mapping — particularly the keyword matching — required significant research
into global business classifications and is not replicable from public data alone.

**Protection Measures:**
- [ ] Code in private repository (proprietary license)
- [ ] Not exposed via any public API endpoint
- [ ] Copyright notice on all source files

---

## Trade Secret Maintenance Checklist

Perform this review annually to maintain trade secret status:

```
□ Review NDA list — has everyone with access signed?
□ Review access controls — does only the right people have access?
□ Review code repository access logs
□ Check for any inadvertent public disclosure (blog posts, talks, API docs)
□ Update this register with any new trade secrets created
□ Consult attorney if any disclosure may have occurred
□ Re-affirm confidentiality with all employees at annual review
```

---

## NDA Register (People with Access to Trade Secrets)

| NDA ID | Name | Role | Trade Secrets Access | Date Signed | Document Location |
|--------|------|------|---------------------|-------------|-------------------|
| NDA-001 | [To be filled] | Founder/CEO | All | [Date] | /docs/legal/ndas/ |
| NDA-002 | [To be filled] | Lead Engineer | TS-1, TS-3, TS-5 | [Date] | /docs/legal/ndas/ |
| NDA-003 | [To be filled] | Product Lead | TS-2, TS-4 | [Date] | /docs/legal/ndas/ |

*All NDAs must be signed before any trade secret is disclosed.*

---

*This register was created on August 2026 and constitutes evidence that
Halehame Technologies took reasonable steps to protect these trade secrets
as of this date.*

*This document is confidential attorney-work-product when prepared with
or reviewed by a licensed attorney.*
