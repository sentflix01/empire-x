# Nodbusiness — Patent Filing Package (Attorney-Ready)

> **Classification:** CONFIDENTIAL — ATTORNEY WORK PRODUCT
> **Version:** 1.0
> **Prepared:** August 2026
> **Status:** Ready for attorney review and USPTO provisional filing

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| AES-GCM | Advanced Encryption Standard — Galois/Counter Mode |
| HTTP | Hypertext Transfer Protocol |
| IP | Intellectual Property |
| JSON | JavaScript Object Notation |
| MVP | Minimum Viable Product |
| PCT | Patent Cooperation Treaty |
| PII | Personally Identifiable Information |
| REST | Representational State Transfer |
| SDK | Software Development Kit |
| SSRF | Server-Side Request Forgery |
| TLS | Transport Layer Security |
| TTL | Time To Live |
| USPTO | United States Patent and Trademark Office |

---

## Package Contents

| Document | Purpose | Status |
|----------|---------|--------|
| **COVER_LETTER.md** | Attorney engagement letter | Ready |
| **INVENTION_DISCLOSURE_1.md** | PATENT 1: AI Dynamic Template Pricing | Ready |
| **INVENTION_DISCLOSURE_2.md** | PATENT 2: Quality-Adjusted Revenue Share | Ready |
| **INVENTION_DISCLOSURE_3.md** | PATENT 3: Four-Factor Discovery | Ready |
| **INVENTION_DISCLOSURE_4.md** | PATENT 4: External Data Gateway | Ready |
| **PRIOR_ART_SEARCH.md** | Comprehensive prior art analysis | Ready |
| **CLAIMS_STRATEGY.md** | Claim drafting strategy per patent | Ready |
| **DRAWINGS_INDEX.md** | Drawing descriptions for each patent | Ready |
| **FILING_CHECKLIST.md** | Pre-filing verification checklist | Ready |
| **MICRO_ENTITY_CERT.md** | Micro entity status certification | Ready |

---

## Quick Summary for Attorney

| Patent | Title (Working) | Type | Priority | Key Differentiator |
|--------|-----------------|------|----------|-------------------|
| **1** | Method and System for Dynamic Pricing of Digital Templates in a Marketplace Based on Demand, Quality, and Competitive Signals | Provisional | HIGH | Multi-objective optimization (demand + quality + competition) |
| **2** | System and Method for Quality-Adjusted Revenue Sharing in a Digital Marketplace | Provisional | HIGH | Revenue share dynamically adjusted by composite quality score |
| **3** | Method for Unified Ranking of Business Showrooms Using Social Graph, Geographic, Category, and Trending Signals | Provisional | HIGH | Four orthogonal signals combined in single ranking function |
| **4** | System and Method for Composing Multi-Tenant Web Pages from Sections Bound to Tenant-Registered External Data Sources via Declarative Mappings Through a Secured Proxy Gateway | Provisional | CRITICAL | Tenant-registered external endpoints + declarative mappings + AES-GCM vault + SSRF-safe proxy + health telemetry |

**Urgency:** Platform is **publicly live** — US 12-month grace period (§102) running. File **immediately** to secure priority dates. EU/CN absolute novelty likely lost for disclosed features.

---

## Invention Ownership

- **Inventor(s):** [Founder Name], [Co-founder Name(s)]
- **Assignee:** Nodbusiness Technologies PLC (Ethiopia PLC, Registration No. [TBD])
- **Employment Agreement:** IP assignment clauses executed
- **NDA:** All developers/contractors under NDA

---

## Micro Entity Status

- **Gross Income:** < $200,000 (prior calendar year)
- **Patent Applications:** < 4 previously filed
- **Assignment:** Not assigned to non-micro entity
- **Certification:** Ready for USPTO SB/15A

---

## Filing Timeline

| Action | Deadline | Owner |
|--------|----------|-------|
| **Attorney Review Complete** | 3 business days | Attorney |
| **Draft Claims Finalized** | 5 business days | Attorney + Inventors |
| **Drawings Prepared** | 5 business days | Technical Illustrator |
| **Provisional 1-4 Filed** | 7 business days | Attorney |
| **Receipt Confirmation** | 1 business day | Attorney |
| **PCT Decision** | 10 months | Founder + Attorney |
| **Utility Conversion** | 11 months | Attorney |

---

## Budget Estimate (3 Provisionals + 1 Critical)

| Item | Cost (Micro Entity) |
|------|---------------------|
| **USPTO Filing Fees (4 × $320)** | $1,280 |
| **Attorney Drafting (4 × $2,500)** | $10,000 |
| **Drawings (4 × $500)** | $2,000 |
| **Prior Art Search (attorney)** | $1,500 |
| **Total Estimate** | **$14,780** |

**Note:** PATENT 4 is most complex — may require additional attorney hours.

---

## Code-to-Patent Mapping (Reduction to Practice Evidence)

| Patent | Code Location | Test Coverage |
|--------|---------------|---------------|
| **PATENT 1** | `backend/services/aiPricing.ts`, `backend/routes/templates.ts` | `test/aiPricing.test.js` (property-based) |
| **PATENT 2** | `backend/services/qualityScore.ts`, `backend/routes/marketplace.ts` | `test/qualityScore.test.js` |
| **PATENT 3** | `backend/services/discoveryRanking.ts`, `backend/routes/suggestions.ts` | `test/discoveryRanking.test.js` |
| **PATENT 4** | `backend/routes/externalSources.ts`, `backend/services/proxyGateway.ts`, `backend/services/credentialEncryption.ts`, `backend/services/ssrfValidator.ts`, `backend/services/rateLimiter.ts` | `test/proxyResilience.test.js`, `test/fieldMapper.test.js`, `test/credentialEncryption.test.js` |

**All tests passing:** 297 backend + 103 frontend + 9 E2E

---

## Prior Art Summary (Key Distinctions)

| Patent | Closest Art | Why We're Different |
|--------|-------------|---------------------|
| **1** | Shopify/Wix fixed pricing; dynamic pricing in ride-share | Multi-objective: demand + quality + competition simultaneously |
| **2** | Apple/Google/Shopify fixed splits (70/30, 85/15) | Quality-adjusted dynamic share (56-84%) |
| **3** | Google Maps (geo), LinkedIn (social), Shopify (none) | Four-factor unified ranking for business showrooms |
| **4** | Wix US9747258/US11874813 (AI layout), US12596558 (internal datastore binding) | **Tenant-registered external endpoints** + declarative mappings + AES-GCM vault + SSRF-safe proxy + health telemetry |

---

## Next Steps for Attorney

1. **Review** all invention disclosures (4 documents)
2. **Confirm** micro entity eligibility
3. **Draft claims** per CLAIMS_STRATEGY.md
4. **Prepare drawings** per DRAWINGS_INDEX.md
5. **File provisionals** via EFS-Web
6. **Provide filing receipts** with application numbers
7. **Calendar:** 12-month conversion deadline, PCT decision at 10 months

---

## Contact

**Inventor/Applicant:** [Founder Name]  
**Email:** [email@nodbusiness.app]  
**Phone:** +251-XXX-XXXX  
**Entity:** Nodbusiness Technologies PLC  
**Address:** [Addis Ababa, Ethiopia]  

**Attorney:** [Attorney Name/Firm]  
**Email:** [Attorney Email]  
**Phone:** [Attorney Phone]  

---

*Confidential. Attorney Work Product. For Nodbusiness Technologies internal use only.*