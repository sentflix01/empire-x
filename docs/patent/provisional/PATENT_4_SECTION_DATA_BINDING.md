# Provisional Patent Application Draft — PATENT 4

> **Classification:** CONFIDENTIAL — Attorney Work Product (draft)
> **Working Title:** Method and System for Composing Multi-Tenant Web Pages from Sections
> Bound to Tenant-Registered External Data Sources via Declarative Mappings Through a
> Secured Proxy Gateway
> **Status:** DRAFT for attorney review — not filed
> **Created:** 2026-08-23

---

## Acronyms Used in This Document

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| SSRF | Server-Side Request Forgery |
| AES-GCM | Advanced Encryption Standard — Galois/Counter Mode (authenticated encryption) |
| TTL | Time To Live — cache expiry duration |
| TLS | Transport Layer Security |
| UI | User Interface |
| USPTO | United States Patent and Trademark Office |

---

## 1. Field of the Invention

Computer systems for website construction; more particularly, multi-tenant platforms in which
non-technical tenants compose public web pages from pre-defined visual sections whose data is
bound — at render time, through a security-enforcing server-side gateway — to data sources the
tenant registers themselves, including arbitrary third-party HTTP endpoints.

## 2. Background & Problem

Existing no-code builders (Wix, Squarespace, Duda) bind sections only to **platform-internal**
structured data (the vendor's own CMS objects). Integrating *external* data historically
requires a developer to write custom glue code, manage API keys, handle failures, and deploy.
Prior approaches also ignore the security surface: letting tenants point a server-side fetcher
at arbitrary URLs invites SSRF attacks, credential leakage, and abuse of egress.

Meanwhile, generic "no-code page builder + data binding" methods are known (e.g., binding UI
components to fields of a tenant's own datastore schema), so novelty cannot rest on data
binding alone.

**The unsolved problem:** how to let a non-technical tenant safely point a *visual section* of
their public web page at *any external REST endpoint they choose*, such that the platform can
render it live without exposing tenants or the platform to SSRF, credential theft, upstream
outages, or abusive traffic — all without code.

## 3. Summary of the Invention

A computer-implemented method on a multi-tenant platform comprising a section-component
registry, wherein each public web page of a tenant is composed of one or more section
instances, comprising:

**(a)** receiving, from a tenant, a registration of an external data source including an
HTTPS endpoint URL and a set of declarative field mappings, each mapping associating a
source path within the endpoint's response payload to a display field of a section;

**(b)** receiving, optionally, tenant-scoped credentials and storing them **encrypted at
rest** using authenticated encryption (AES-256-GCM) with a platform-managed key;

**(c)** upon a request to render the tenant's page, fetching the external endpoint through a
**server-side proxy gateway** that: validates the destination URL against a scheme allowlist
and a resolved-IP private/loopback/link-local blocklist spanning IPv4 and IPv6 ranges,
**rejects redirects**, injects decrypted credentials into headers, query parameters, or bearer
authorization per the registered auth method, enforces a **per-tenant-per-section request
quota**, applies a timeout, and caches the fetched payload per section for a per-source TTL;

**(d)** producing section display objects by applying the declarative source-path-to-display-field
mappings to cached response payloads (including unwrapping a response envelope when exactly one
top-level key contains an array);

**(e)** recording, for each fetch attempt, a **health record** including outcome, upstream HTTP
status, and error classification, thereby maintaining per-source observability; and

**(f)** rendering the section of the tenant's public page populated with the mapped display
objects under the tenant's theme, without exposing the external endpoint, credentials, or the
gateway to the client device.

Further embodiments: health-record-driven degradation (serving last-known-good cache on
upstream failure); per-tenant credential encryption keys derived from a platform secret;
mapping editor UI with live sample-response preview; and operation within a social platform
wherein each tenant page is associated with the tenant's social identity, followers, and
in-app messaging.

## 4. What Is New Over the Closest Prior Art

| Closest art | What it teaches | Why Patent 4 is different |
|---|---|---|
| Wix US9747258B2; US11874813B2; US10685080B2 | AI/semantic layout generation and layout-signature matching over the vendor's **own** component system | No tenant-registered external endpoints, no credential vaulting, no security gateway, no health telemetry. Binding source is platform-internal data. |
| US12596558B2 (multi-tenant no-code UI) | Tenants bind UI components to fields of a schema in the platform's **own multi-tenant datastore** | All data binding targets the platform datastore. Patent 4 binds to **arbitrary external HTTP endpoints the tenant registers**, with egress security and quotas — absent here. |
| US20110161991A1 (page controller over multiple APIs) | Developer-oriented controller maps API responses into page models | Requires developer code; no tenant-facing declarative mapping editor; no encrypted per-tenant credential storage; no SSRF-validating gateway; no per-section quota/cache/health records. |
| DatoCMS "Foreign Data Selector" plugin; Apideck/Truto field mapping (products) | Editor-time selection of external API results stored as content; unified-API field mapping | Editor-time copy into CMS, not live render-time proxied binding; no per-tenant AES-GCM vaulting, SSRF blocklist, redirect rejection, quotas, or section health records; not embedded in a social-commerce platform. |

**Novelty rests on the combination**: tenant-authored external-source registration + declarative
mappings + encrypted credential vault + SSRF-safe redirect-rejecting proxy with per-section
quota/TTL cache + per-attempt health telemetry + social-platform tenancy — none of which is
taught, individually or together, by the art above.

## 5. Draft Claims (for attorney refinement)

**Claim 1 (method).** A computer-implemented method for rendering a tenant-owned public web
page on a multi-tenant platform, comprising: maintaining a registry of pre-defined section
components; receiving from a tenant a registration of an external data source comprising an
HTTPS endpoint URL and one or more declarative field mappings each associating a path within
a response payload of the external endpoint to a display field of a selected section component;
storing, for the tenant, optional credentials for the external endpoint in encrypted form;
in response to a request for the public web page, retrieving, by a server-side gateway,
content from the external endpoint, wherein retrieving comprises validating a destination
address against a blocklist of private network ranges, refusing to follow redirects, injecting
the decrypted credentials according to a registered authentication mode, enforcing a request
quota associated with the tenant and the section, and caching retrieved content for a
configured duration; generating display objects by applying the declarative field mappings to
the cached content; recording a health record describing an outcome of the retrieving; and
transmitting the public web page including the section populated with the display objects.

**Claim 2.** The method of Claim 1, wherein validating comprises resolving DNS names and
rejecting destinations resolving to loopback, link-local, unique-local, or RFC1918 ranges.

**Claim 3.** The method of Claim 1, wherein cached content from a most recent successful
retrieval is served when retrieval fails, and the health record drives such fallback.

**Claim 4.** The method of Claim 1, wherein credentials are encrypted using authenticated
encryption with a key distinct per tenant.

**Claim 5.** The method of Claim 1, wherein generating display objects comprises unwrapping a
response envelope when exactly one top-level member of the payload contains an array.

**Claim 6 (system).** A corresponding system comprising at least one processor and memory
configured to perform the method of any preceding claim.

*(Attorney to renumber, add dependent claims for TTL-per-source, quota scope keys, mapping
editor with live preview, and social-identity association embodiments.)*

## 6. Implementation Evidence (enables reduction to practice)

| Claim element | Code location |
|---|---|
| Source registration + declarative mappings | `backend/routes/externalSources.ts`; `external_data_sources`, `field_mappings` tables (migrate10.js) |
| AES-256-GCM credential vault | `backend/services/credentialEncryption.ts` |
| **Per-tenant key derivation (HKDF, dependent claim 4)** | `credentialEncryption.getKey(context)` — encrypt/decrypt take showroom scope; legacy master-key payloads still decrypt (backward compatible). **Implemented 2026-08-23** |
| SSRF validation (IPv4+IPv6 ranges, HTTPS-only) | `backend/services/ssrfValidator.ts` |
| Redirect rejection, timeout, quota, cache, unwrap heuristic | `backend/services/proxyGateway.ts` (`redirect:'error'`, `AbortSignal.timeout`, `checkLimit`, `buildCacheKey`, single-key-array unwrap) |
| **Stale-cache fallback to last-known-good (claim 3)** | `proxyGateway` stale namespace (`stale:proxy:…`, 7-day TTL); upstream failure/circuit-open serves stale, route emits `X-Stale: true`. **Implemented 2026-08-23** |
| **Health-driven circuit breaker (degradation embodiment)** | Consecutive-failure counter per source; opens after 5 failures for a 5-minute cooldown, then half-open retry. **Implemented 2026-08-23** |
| Per-tenant-per-section rate limiting | `backend/services/rateLimiter.ts` (Redis INCR fixed window, fail-open) |
| Health records | `writeHealthRecord` → `external_health_records` table |
| Section composition + theming | `frontend-next/components/showroom/SectionRenderer.tsx`, layout templates |
| Executable evidence of reduction to practice | `backend/test/proxyResilience.test.js` (stale fallback + no-history failure paths) |

> **Filing note:** all four independent/dependent claim elements referenced above are now
> implemented AND unit-tested as of 2026-08-23 — strengthen the utility application by citing
> `proxyResilience.test.js` alongside the code map when converting the provisional.

## 7. Filing Notes

- File **provisional now** — the platform is publicly live; the US 12-month §102 grace period
  may already be running from first public availability of these features. EU/CN absolute
  novelty is likely already compromised for anything disclosed pre-filing; the provisional
  still secures the US priority date for improvements and the disclosure already made.
- Give the attorney this file plus `docs/patent/prior_art/PRIOR_ART_SEARCH.md § Patent 4`.
- Budget: provisional ~$320 micro-entity + $1.5–3K attorney.
- Keep the algorithmic details of the unwrap/fallback heuristics OUT of marketing material
  until filing.
