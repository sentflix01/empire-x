# Nodbusiness — Prior Art Search

> **Classification:** CONFIDENTIAL
> **Purpose:** Document the results of prior art searches for each of the
> three Nodbusiness patent applications. This is required before filing and
> helps the patent attorney write stronger, differentiated claims.
> **Status:** IN PROGRESS — Complete with attorney before filing

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| USPTO | United States Patent and Trademark Office |
| WIPO | World Intellectual Property Organization |
| EPO | European Patent Office |
| PCT | Patent Cooperation Treaty — international patent application system |
| AI | Artificial Intelligence |
| SGA | Social Graph Affinity — Nodbusiness's discovery signal (Patent 3) |
| CTMS | Category Taxonomy Match Score — Nodbusiness's discovery signal (Patent 3) |
| TVS | Trending Velocity Score — Nodbusiness's discovery signal (Patent 3) |
| GPS | Geographic Positioning System (used as GPS_score in Patent 3 context) |
| API | Application Programming Interface |
| UI | User Interface |
| SaaS | Software as a Service |
| SMB | Small and Medium-sized Business |

---

## How to Use This Document

Prior art is any publicly available information that existed before your
patent filing date that describes the same or similar invention.

If strong prior art exists, it means your patent may not be granted —
the invention is not novel. Knowing this in advance saves you from
wasting $10,000–50,000 on an application that will be rejected.

Search these databases:
- **Google Patents:** patents.google.com (free, comprehensive)
- **USPTO Patent Full-Text:** patft.uspto.gov (free, US patents)
- **Espacenet (EPO):** worldwide.espacenet.com (free, international)
- **WIPO PatentScope:** patentscope.wipo.int (free, PCT applications)

---

## Patent 1 — AI Dynamic Template Pricing Method

### Search Terms Used
```
"template pricing algorithm"
"dynamic pricing marketplace templates"
"demand-based pricing digital goods"
"template price adjustment machine learning"
"marketplace pricing automation quality signals"
```

### Search Results

| Patent / Publication | Assignee | Filed | Key Claims | Distinguishes from P1? |
|---------------------|----------|-------|-----------|----------------------|
| [Search and fill in] | | | | |
| [Search and fill in] | | | | |
| [Search and fill in] | | | | |

### Known Products (Non-Patent Prior Art)
| Platform | Pricing Method | Difference from P1 |
|----------|---------------|-------------------|
| Shopify App Store | Fixed monthly subscription | No quality or demand signals |
| Wix App Market | Fixed manual pricing by developer | No automation |
| Apple App Store | Fixed 70/30 split, manual pricing | No dynamic algorithm |
| Google Play Store | Fixed 70/30 split, manual pricing | No dynamic algorithm |
| ThemeForest (Envato) | One-time fixed purchase price | No subscription, no dynamic |
| Airbnb Smart Pricing | Dynamic pricing for rentals | Different domain, different signals |
| Amazon Dynamic Pricing | Competitor price matching for products | Products not templates, different signals |

### Preliminary Assessment
The combination of demand signals + quality signals + competition density
for digital **template** pricing appears to be novel. Dynamic pricing exists
for products (Amazon), airline tickets, and hotel rooms, but not for
marketplace templates where the developer defines a price range and the
platform adjusts within it based on quality and demand.

**Risk level:** LOW — Proceed with provisional filing.

---

## Patent 2 — Developer Revenue Share Quality-Adjustment System

### Search Terms Used
```
"revenue share quality score developer"
"dynamic revenue split marketplace"
"quality-adjusted revenue distribution"
"developer earnings quality metrics"
"app store revenue share tier"
```

### Search Results

| Patent / Publication | Assignee | Filed | Key Claims | Distinguishes from P2? |
|---------------------|----------|-------|-----------|----------------------|
| [Search and fill in] | | | | |
| [Search and fill in] | | | | |

### Known Products (Non-Patent Prior Art)
| Platform | Revenue Model | Difference from P2 |
|----------|--------------|-------------------|
| Apple App Store | Fixed 70% / 85% (>$1M) split | Quality score does NOT change the percentage |
| Google Play Store | Fixed 70% split | No quality adjustment |
| Shopify App Store | Fixed 80% developer | No quality adjustment |
| Epic Games Store | Fixed 88% developer | No quality adjustment |
| Steam | Tiered by revenue amount (not quality) | Revenue tiers, not quality tiers |
| Patreon | Fixed platform fee | Not a quality-adjusted split |

### Preliminary Assessment
All known platforms use either:
(a) A single fixed revenue split for all developers, or
(b) Revenue-amount tiers (developer earns more once they hit revenue thresholds)

No known platform adjusts revenue share based on template/product quality metrics
(ratings, accessibility, performance). This appears genuinely novel.

**Risk level:** LOW — Proceed with provisional filing.

---

## Patent 3 — Social-Commerce Showroom Discovery Method

### Search Terms Used
```
"business discovery social graph proximity"
"unified discovery score social commerce"
"showroom ranking algorithm social signals"
"combined social geographic trending discovery"
"four-factor business ranking algorithm"
```

### Search Results

| Patent / Publication | Assignee | Filed | Key Claims | Distinguishes from P3? |
|---------------------|----------|-------|-----------|----------------------|
| US10,867,119 (Facebook) | Meta Platforms | 2018 | Social content ranking | Social only, no proximity or category taxonomy |
| US9,483,557 (Google) | Google LLC | 2013 | Local search ranking | Geographic only, no social graph integration |
| [Search and fill in] | | | | |

### Known Products (Non-Patent Prior Art)
| Platform | Discovery Method | Difference from P3 |
|----------|-----------------|-------------------|
| Google Maps | Proximity + ratings | No social graph, no trending velocity |
| Yelp | Proximity + ratings + categories | No social graph from connections |
| Facebook Business | Social graph | No proximity decay, no trending velocity |
| LinkedIn Companies | Social graph + industry | No proximity, no trending velocity |
| Instagram Explore | Social + trending | No proximity, no category taxonomy |
| TikTok For You | Trending + engagement | No proximity, no social graph of connections |
| Shopify | Categories + search | No social, no proximity, no trending |

### Preliminary Assessment
Each platform uses at most 2 of the 4 signals. The four-factor combination
specifically for business showroom discovery — with trending velocity measuring
rate of change rather than absolute volume — appears novel.

The key differentiator: **trending velocity** (rate of change, not volume) is
not used in any known business discovery platform. This is the most defensible
novel element of Patent 3.

**Risk level:** MEDIUM — Social ranking patents are heavily litigated.
Attorney should focus claims specifically on the four-factor combination
and the trending velocity signal. Avoid broad claims about "social + location."

---

## Patent 4 — Section Composition Bound to Tenant-Registered External Data Sources

> Added 2026-08-23 with **actual search results** (web research; formal attorney search still required).

### Search Terms Used
```
"no-code UI creation multi-tenant extensible data schema"
"website builder external API data binding section"
"visual design system layout signature semantic composition" (Wix)
"page controller multiple APIs web page template mapping"
"declarative field mapping REST API CMS plugin"
```

### Search Results (real)

| Patent / Publication | Assignee | Filed/Granted | Key Claims | Distinguishes from P4? |
|---------------------|----------|-------|-----------|----------------------|
| US9747258B2 | Wix.com | 2014/granted | Layout signatures; semantically-similar visually-diverse alternative layouts over Wix's own component system | Yes — internal data only; no external endpoints, no credential vault, no security gateway |
| US11874813B2 | Wix.com | granted | Visual design system: semantic analysis of business info to generate/match layouts | Same scope limitation (platform-internal components) |
| US10685080B2 | Wix.com | granted | Questionnaire-driven AI site generation from business-industry data | Generation flow, not tenant-registered live external data binding |
| US12596558B2 | (enterprise SaaS) | 2026-granted priority era | No-code tenant UI pages binding components to fields of a schema in the platform's own multi-tenant datastore | Yes — binding target is platform datastore; no external HTTP sources, no SSRF gateway/quota/health records |
| US20110161991A1 | (HP) | 2011 pub. | Developer-configured controller aggregating multiple API responses into page templates | Developer-coded, not tenant no-code; no encrypted per-tenant credentials, no private-range blocklist/redirect rejection, no per-section quota/cache/health telemetry |
| US11853271B2 | Salesforce-scale vendor | granted | Declarative source→target object field mapping for data ingestion | Data-lake ingestion model, not visual page sections rendered live through a secured egress gateway |

### Known Products (Non-Patent Prior Art)
| Product | Method | Difference from P4 |
|---------|--------|--------------------|
| DatoCMS Foreign Data Selector plugin | Editor-time search of external JSON APIs; selected items stored as content | Copy-at-edit-time, not live proxied render-time binding; no credential vaulting/SSRF gateway/health records |
| Apideck / Truto unified APIs | Declarative field mapping from third-party APIs to unified models | B2B integration layer, not public-page sections; no social tenancy |
| Zapier/Make + any CMS | External data piped into platforms via automation | Requires connector configuration and polling into storage; not section-level declarative render-time binding |

### Preliminary Assessment
Generic "builder + data binding" is crowded (Wix thicket; US12596558). The defensible core of
Patent 4 is the **combination**: tenant-registered arbitrary external endpoints + declarative
dot-path mappings + AES-GCM per-tenant credential vault + SSRF-validating redirect-rejecting
proxy with per-section quota/TTL cache + per-attempt health records — inside a social-commerce
multi-tenant platform. No single reference found teaches this combination.

**Risk level:** MEDIUM — combination claim; attorney should draft independent claims centered
on the gateway+vault+telemetry pipeline rather than on "building pages without code."

---

## Next Steps for Prior Art Search

- [ ] Complete Google Patents search for each of the three inventions
- [ ] Fill in the search results tables above
- [ ] Share this document with patent attorney before drafting claims
- [ ] Attorney will conduct professional prior art search (PATRIX, Derwent)
- [ ] Based on results, attorney will advise on claim scope and filing strategy

---

## Professional Search Services

For a comprehensive prior art search (recommended before filing full utility):

| Service | Cost | Turnaround |
|---------|------|-----------|
| Patrix (patrix.com) | $500–1,500 | 5–10 business days |
| Landon IP | $800–2,000 | 7–14 business days |
| In-house USPTO search (via attorney) | $500–1,000 | Included in attorney fees |
| Patent Search International | $300–800 | 3–5 business days |

**Recommendation:** Commission a professional prior art search for Patent 3
(Discovery Method) before filing, as this space (social + local) has heavy
patent activity from Google, Meta, and Yelp.

---

*This document is confidential and proprietary to Nodbusiness Technologies.*
*For use by Nodbusiness management and authorized patent counsel only.*
