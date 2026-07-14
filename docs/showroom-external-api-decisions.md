# Showroom External API Integration — Spec Decisions

**Spec location:** `.kiro/specs/showroom-external-api/`  
**Files:** `requirements.md` · `design.md` · `tasks.md`  
**Type:** Feature spec (requirements-first)

---

## Introduction

The Showroom External API Integration lets Business Owners attach a live REST API endpoint
to any repeater-type section in their Empire X Showroom. A Proxy Gateway fetches, transforms,
and caches the data server-side; a Field Mapper UI connects external response fields to the
section's schema fields; a Health Dashboard shows the status of each integration.

Three pillars drive every decision below:
- **Safety** — credentials never reach the browser.
- **Flexibility** — any REST API shape works via dot-notation field mapping.
- **Selectivity** — only explicitly mapped fields are ever exposed to visitors.

---

## Requirement 1 — External Data Source Configuration

### Decision 1.1 — What happens when validation fails on save?

**Question:** Should the system save whatever it can and warn the user, or reject the entire
request and save nothing when any validation check fails?

**Context:** Req 1, AC 8 — `WHEN a Business_Owner saves an external endpoint configuration`

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Partial save + warning | Save the record with whatever is valid; surface errors for invalid fields |
| **B — All-or-nothing rejection** ✅ | Reject the entire request if any validation check fails; return an error; save nothing |
| C — Queue for retry | Accept the save but mark it as "pending validation" |

**Decision Made:** Option B — all-or-nothing rejection.

**Rationale:** Partial saves create an inconsistent state (e.g., a record saved with an
unvalidated URL that later causes SSRF exploits). The system must only return HTTP 200/201
when the configuration is fully valid. This aligns with the safety pillar.

**Impact:** AC 8 now reads: `THE System SHALL validate all fields before saving; IF any
validation check fails, THE System SHALL reject the request and SHALL NOT create or replace
the External_Data_Source record`.

---

### Decision 1.2 — Should HTTPS validation short-circuit or run all validations first?

**Question:** If a URL fails the HTTPS scheme check, should the system immediately reject
it or continue running other validations (SSRF, malformed URL) and report all errors at once?

**Context:** Req 1, AC 4 — `IF the submitted URL does not use the HTTPS scheme`

**Options Considered:**
| Option | Description |
|--------|-------------|
| **A — Immediate rejection on HTTPS failure** ✅ | Return HTTP 422 as soon as the scheme check fails; do not run further validations |
| B — Collect all errors | Run all validation checks and return a combined error list |

**Decision Made:** Option A — immediate rejection on HTTPS failure.

**Rationale:** HTTPS is a hard security requirement. Letting a non-HTTPS URL proceed to DNS
resolution (needed for SSRF checking) could itself be a security risk on some configurations.
Fail fast on the cheapest and most critical check first.

**Impact:** AC 4 specifies rejection `regardless of whether the URL passes other validation
checks`. HTTP 422 is the uniform code for all URL validation failures.

---

### Decision 1.3 — Credential input visibility: immediate or on next interaction?

**Question:** When the Business Owner selects an auth method (e.g., `bearer_token`), must
the credential input field appear immediately, or can it appear on the next user interaction?

**Context:** Req 1, AC 5

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Must appear immediately on selection | Synchronous render; no delay |
| **B — May appear on next interaction, but must be accessible before save** ✅ | Allows for React state batching; blocks save with an error if the field is not yet rendered |
| C — Lazy render; save is not blocked | Credential field can be absent at save time without blocking |

**Decision Made:** Option B.

**Rationale:** React state batches can sometimes delay a render by one tick. Requiring strict
synchronous appearance would be fragile to test and implement. What matters for safety is
that the field is accessible *before the user can save* — the UI must block save with an
error if the credential field is not yet rendered.

**Impact:** AC 5 reads: `IF the credential input field is not properly displayed and
accessible at the time the Business_Owner attempts to save, THE Field_Mapper_UI SHALL
prevent saving and SHALL display an error message`.

---

## Requirement 2 — SSRF and URL Security Validation

### Decision 2.1 — Should SSRF rejection use HTTP 422 or another 4xx?

**Question:** What HTTP status code should the Proxy Gateway return when a URL fails SSRF
validation at save time?

**Context:** Req 2, AC 3

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — HTTP 400 Bad Request | Generic "bad input" |
| **B — HTTP 422 Unprocessable Entity** ✅ | Semantically correct: input was well-formed but failed validation |
| C — HTTP 403 Forbidden | Implies the caller lacks permission, not that the URL is blocked |

**Decision Made:** Option B — HTTP 422, consistent with all other URL validation failures.

**Rationale:** 422 is the standard for "the server understands the request but cannot process
it due to semantic errors." Since all other URL validation failures also use 422 (per Decision
1.2), using 422 here keeps the error handling uniform.

**Impact:** The design's Error Handling table lists HTTP 422 for all URL validation failure
types (scheme, SSRF, malformed).

---

### Decision 2.2 — Should SSRF validation abort outbound requests even if logging fails?

**Question:** At fetch time, if a blocked IP is detected but the logging system is unavailable,
should the Proxy Gateway still abort the request?

**Context:** Req 2, AC 4

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Abort only if logging succeeds | Logging acts as a gate; if it fails, let the request through |
| **B — Always abort; log if possible** ✅ | Security takes priority over logging completeness |
| C — Allow request; log asynchronously | Request proceeds; incident logged later |

**Decision Made:** Option B.

**Rationale:** Security must never depend on the availability of a secondary system like
logging. An attacker who can take down the logging service should not thereby unblock SSRF
attempts. The abort is unconditional.

**Impact:** AC 4: `THE Proxy_Gateway SHALL abort the outbound request regardless of whether
logging succeeds or fails … IF the logging system is unavailable, THE Proxy_Gateway SHALL
still abort the request`.

---

### Decision 2.3 — Should SSRF validation expand to cover other security checks?

**Question:** Beyond the listed SSRF checks (RFC-1918 ranges, loopback, link-local, ::1,
localhost), should the system reject URLs for other security reasons?

**Context:** Req 2 general scope

**Options Considered:**
| Option | Description |
|--------|-------------|
| **A — Only listed SSRF checks** ✅ | Validate exactly what the spec lists; no expansion |
| B — Broader security checks | Also block cloud metadata endpoints (169.254.169.254), other ranges |

**Decision Made:** Option A — scope limited to the listed checks only.

**Rationale:** Expanding scope without explicit requirements introduces hidden behavior and
makes the validator harder to test comprehensively. Additional checks can be added in a
future requirement. The current set covers all standard SSRF attack vectors.

**Impact:** The `ssrfValidator.js` service implements exactly the listed blocked ranges and
nothing more.

---

## Requirement 3 — Field Mapping Configuration

### Decision 3.1 — When no Field_Mappings are configured, should raw data pass through?

**Question:** If a Business Owner saves an External_Data_Source but hasn't configured any
Field_Mappings yet, should the proxy return the raw external response or an empty array?

**Context:** Req 3, AC 5 / Req 7, AC 3

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Return raw response | Convenient for testing; lets the owner see real data before mapping |
| **B — Return empty array** ✅ | Enforces the selectivity principle; no data leaks before explicit mapping |
| C — Return error | Signals that the configuration is incomplete |

**Decision Made:** Option B — empty array, no pass-through.

**Rationale:** The selectivity pillar is non-negotiable. An unmapped field could expose
sensitive internal data to showroom visitors. The "Test & Map Fields" panel in the UI
fetches a sample through the same proxy endpoint for the owner's use — visitors never
see unmapped data.

**Impact:** AC 5 requires `THE Proxy_Gateway SHALL only produce a Mapped_Response when
Field_Mappings have been configured and applied`. AC 7.3 requires an empty array when no
mappings exist.

---

### Decision 3.2 — Should missing source paths silently fail or surface debug information?

**Question:** If a configured source path (e.g., `product.details.price`) no longer exists
in the external API response, should the system silently omit it, or provide some feedback?

**Context:** Req 3, AC 6

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Silent omission only | Field is missing from Mapped_Response; no feedback anywhere |
| **B — Silent omission + optional logging/UI indicator** ✅ | Omit the field but log or surface a debug indicator for the owner |
| C — Return error | Treat missing source paths as hard failures |

**Decision Made:** Option B.

**Rationale:** Missing source paths are expected during development and API evolution.
Returning an error would break all mappings whenever one path changes. Logging or a UI
indicator helps the owner debug without breaking the integration.

**Impact:** AC 6: `THE System SHOULD log or surface a UI indicator to help the Business_Owner
debug missing source paths`. This is a SHOULD (not SHALL), keeping it optional for the
initial implementation.

---

## Requirement 4 — Proxy Gateway: Fetch, Transform, and Serve

### Decision 4.1 — On timeout, return fresh data or fall back to cached response?

**Question:** If the outbound request to the external URL takes longer than 10 seconds (hits
the timeout), but then succeeds (extremely slow but valid response), what should happen?

**Context:** Req 4, AC 9

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Always return 504 at 10s regardless | Simpler; predictable |
| **B — 504 on actual timeout; return fresh data if slow-but-successful** ✅ | Distinguishes timeout (connection dropped) from slow response |
| C — Return cached data if available, wait 10s if not | Avoids user-visible 504s but may serve stale data |

**Decision Made:** Option B.

**Rationale:** A 10-second timeout means the connection was cut. If the upstream responds
successfully in, say, 9 seconds, the response should be returned — falling back to cached
data would serve stale information unnecessarily.

**Impact:** AC 9: `WHEN the outbound request succeeds but takes longer than 10 seconds,
THE Proxy_Gateway SHALL wait for and return the fresh successful data`.

---

### Decision 4.2 — What should the proxy return for a successful 2xx upstream response?

**Question:** When the external URL returns HTTP 2xx, should the proxy return the raw
upstream body, the mapped response, or some wrapper?

**Context:** Req 4, AC 8

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Return raw upstream body | Would bypass field mappings and expose unmapped data |
| **B — Return mapped response data directly** ✅ | Apply all field mappings; return only mapped fields |
| C — Return wrapped response `{ data: [...], meta: {...} }` | Adds envelope; more structure but more frontend work |

**Decision Made:** Option B — mapped response data directly (no wrapper).

**Rationale:** The mapped array is the contract the frontend expects. Wrapping it would
require frontend changes across all section types. The selectivity pillar requires mapped
fields only.

**Impact:** AC 8: `WHEN the external URL returns HTTP 2xx, THE Proxy_Gateway SHALL return
the mapped response data directly to the caller`.

---

## Requirement 5 — Rate Limiting

### Decision 5.1 — When Redis is unavailable, bypass or fall back to in-memory?

**Question:** If the Redis instance is down, should the rate limiter let all requests through
(to avoid blocking traffic), or fall back to in-memory counters?

**Context:** Req 5, AC 4

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Bypass rate limiting entirely | All requests go through; risk of overwhelming external APIs |
| **B — Fall back to in-memory counters** ✅ | Maintain rate limiting with reduced persistence; log a warning |
| C — Return 503 to all callers | Maximally safe but blocks all traffic |

**Decision Made:** Option B.

**Rationale:** Bypassing rate limiting when Redis is down means a Redis outage becomes an
attack vector. In-memory counters are not shared across instances but they protect the
external API from a single instance's traffic. When Redis recovers, the limiter switches back
automatically.

**Impact:** AC 4: `THE Rate_Limiter SHALL fall back to in-memory counters to enforce rate
limits … WHEN the Redis instance becomes available again, THE Rate_Limiter SHALL immediately
switch back to using Redis`.

---

### Decision 5.2 — When should HTTP 429 be returned?

**Question:** Should the proxy return 429 aggressively (on any ambiguous rate-limit signal)
or only when the per-IP quota is definitively exceeded?

**Context:** Req 5, AC 2

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Return 429 on any rate-limit signal, including ambiguous ones | Safer; avoids under-limiting |
| **B — Return 429 only when per-IP limit is actually exceeded** ✅ | Precise; avoids false 429s for legitimate traffic |

**Decision Made:** Option B — 429 only when the specific per-IP rate limit has actually been
exceeded, never under any other condition.

**Rationale:** False 429s degrade the user experience for legitimate visitors and make the
rate limiter harder to reason about. The window and counter logic must be precise.

**Impact:** AC 2: `THE Proxy_Gateway SHALL only return HTTP 429 when the specific per-IP rate
limit for that section has actually been exceeded and SHALL NOT return HTTP 429 under any
other condition`.

---

## Requirement 6 — Configurable Cache TTL

### Decision 6.1 — Should TTL of 0 be allowed?

**Question:** If a Business Owner sets the TTL to 0 (or the minute-to-second conversion
produces 0), should the system allow it (effectively disabling the cache) or reject it?

**Context:** Req 6, AC 2 and AC 3

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Allow TTL of 0 | Effectively bypasses cache; every request hits the external API |
| **B — Reject TTL of 0; enforce minimum of 1 second** ✅ | Prevents accidental or intentional cache bypass |
| C — Treat 0 as "no cache" and serve live data always | Explicit behavior but outside the TTL model |

**Decision Made:** Option B.

**Rationale:** A TTL of 0 would make every single visitor request hit the external API,
potentially overwhelming it. The minimum 1-minute UI input converts to 60 seconds — well
above the 1-second floor. The floor exists to catch any edge cases in the conversion logic.

**Impact:** AC 2: `THE System SHALL enforce a minimum TTL of 1 second and SHALL reject TTL
values of 0`. AC 3: `THE Field_Mapper_UI SHALL enforce a minimum input value of 1 minute`.

---

### Decision 6.2 — Should the proxy honor out-of-range TTL values stored in the DB?

**Question:** If a TTL value in the database falls outside the 1–1440 minute range (e.g.,
due to a direct DB edit or a migration), should the proxy use it or clamp it?

**Context:** Req 6, AC 3

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Clamp to 1–86400 seconds | Prevents extreme values from being used |
| **B — Use whatever is stored in the DB** ✅ | Trust the DB as the source of truth; UI enforces the range on writes |

**Decision Made:** Option B.

**Rationale:** The proxy's job is to execute what was configured, not to re-validate it.
The UI enforces the range on writes. If a DB admin changes a value directly, that's
intentional. Adding runtime clamping would hide mis-configurations rather than surface them.

**Impact:** AC 3: `THE Proxy_Gateway SHALL use whatever TTL value is stored in the database
for Cache expiry, even if that value falls outside the 1–1440 minute range enforced by the UI`.

---

## Requirement 8 — Health Status Dashboard

### Decision 8.1 — What if the health status display logic shows "healthy" for a failed record?

**Question:** Should the `getDisplayStatus` function have an explicit guard to prevent a
`success: false` record from ever displaying as `healthy`, or is normal boolean logic sufficient?

**Context:** Req 8, AC 3

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Standard boolean: `if (record.success) return 'healthy'` | Simple; relies on correct boolean values |
| **B — Explicit guard: `if (record.success === false) return 'failing'` before the healthy branch** ✅ | Defensive; prevents any code path from reaching `healthy` for a failed record |

**Decision Made:** Option B — explicit guard with strict equality check.

**Rationale:** A health dashboard that shows `healthy` for a failing integration is worse
than no dashboard. The guard is independently tested (Property 17 in the design) to prove
no input to `getDisplayStatus` can produce `healthy` when `success === false`.

**Impact:** AC 3: `THE System SHALL strictly enforce that any Health_Record indicating
failure is always displayed as 'failing' and never as 'healthy'`. The design documents
a specific `getDisplayStatus` function with this guard.

---

## Requirement 9 — Access Control and Ownership

### Decision 9.1 — When an authenticated request is made to the public proxy endpoint, accept or reject?

**Question:** The proxy endpoint is public (no auth required). If an authenticated caller sends
a valid JWT anyway, should the endpoint reject it, ignore the token, or allow it through?

**Context:** Req 9, AC 4

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Reject requests that include auth credentials | Prevents confusion about the endpoint's public nature |
| **B — Allow requests regardless of auth credentials** ✅ | Public means everyone is allowed, including authenticated callers |
| C — Enforce auth if a JWT is provided | Mixed mode; complex logic |

**Decision Made:** Option B.

**Rationale:** "Public" means accessible without authentication. If an authenticated user's
browser happens to include a JWT (e.g., via a global Axios interceptor), that should not
cause a 403. The endpoint simply does not require auth — it doesn't prohibit it.

**Impact:** AC 4: `THE public proxy endpoint SHALL be accessible without authentication
and SHALL allow requests regardless of whether the caller provides authentication credentials`.

---

## Requirement 10 — Lifecycle Management

### Decision 10.1 — What should a disabled data source return, and should it ignore cache?

**Question:** When an External_Data_Source is disabled, the proxy must return an empty array.
Should it check the cache first, or ignore it entirely?

**Context:** Req 10, AC 2

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Check cache first; return empty only if cache misses | Could return stale cached data from before it was disabled |
| **B — Return empty array unconditionally, ignoring cache** ✅ | The disabled state is authoritative; cache is irrelevant |
| C — Return 204 No Content | Signals absence explicitly but breaks the array contract with the frontend |

**Decision Made:** Option B.

**Rationale:** A disabled source must immediately stop surfacing data. If the cache is
checked first, a recently-cached response could appear to visitors even though the owner
has paused the integration. The `is_enabled = false` flag is the authoritative signal.

**Impact:** AC 2: `THE Proxy_Gateway SHALL not fetch from the external URL and SHALL return
an empty array for that section, ignoring any cached data or errors encountered during that
operation`.

---

### Decision 10.2 — What should the Showroom Builder display when a disabled source has no manual fallback data?

**Question:** If an External_Data_Source is disabled and no manual `formData` exists for
that section, what should the Showroom Builder render?

**Context:** Req 10, AC 4

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Show an error/placeholder | Communicates that something is missing |
| **B — Render the section as empty** ✅ | Clean; no error state; consistent with "no data configured" |
| C — Hide the section entirely | Would change the page structure |

**Decision Made:** Option B — empty section.

**Rationale:** An empty section is the least surprising outcome. Hiding the section could
break page layout and confuse visitors. Showing an error might expose internal configuration
details. Empty is neutral and correct.

**Impact:** AC 4: `IF no manual data exists for the section, THE Showroom_Builder SHALL
display the section as empty`.

---

## Requirement 11 — Data Integrity and Round-Trip Consistency

### Decision 11.1 — If a fresh fetch succeeds but the cache write fails, what should be returned?

**Question:** If the proxy fetches fresh data from the external API successfully, but then
fails to write the result to the cache (Redis error), should it return the fresh data or nothing?

**Context:** Req 11, AC 5

**Options Considered:**
| Option | Description |
|--------|-------------|
| A — Return the fresh data anyway | User gets correct data; cache is just an optimization |
| **B — Return no data (empty / error)** ✅ | Ensures callers never see data that couldn't be durably stored |
| C — Return the previous cached value if available | Stale data is better than no data |

**Decision Made:** Option B — return no data rather than fall back to previously cached data.

**Rationale:** The spec explicitly requires: `IF a fresh fetch occurs but the subsequent data
update fails, THEN THE Proxy_Gateway SHALL return no data for that section rather than falling
back to the previously cached data`. This prevents divergence between what was fetched and
what is cached — a key data integrity property.

**Impact:** AC 5: `THE Proxy_Gateway SHALL return no data for that section rather than falling
back to the previously cached data` when the data update after a fresh fetch fails.

---

## Implementation Task Decisions

### Decision T.1 — Which HTTP library for outbound fetch?

**Options:** `node-fetch`, `axios`, Node 18+ built-in `fetch`

**Decision:** `node-fetch` or built-in `fetch` (the task spec allows either). The existing
backend uses `axios` for internal calls — using the same for outbound proxy requests would
also be acceptable. The key requirement is a configurable 10-second timeout.

---

### Decision T.2 — Task execution order

The task dependency graph places database migration (Task 1) in Wave 1 because all subsequent
services depend on the schema. Backend services (Tasks 2–6) come before routes (Tasks 7–8)
because routes are thin wrappers over services. Frontend tasks (9–13) come after the backend
is complete. Tests (14–18) are the final wave, running in dependency order per the PBT
coverage plan.

---

## Property-Based Test Coverage Summary

| Property | What It Tests | Test File |
|----------|---------------|-----------|
| P1 | HTTPS-only URL acceptance | `ssrf.pbt.test.js` |
| P2 | SSRF blocked IP ranges | `ssrf.pbt.test.js` |
| P3 | Credential encryption round-trip | `encryption.pbt.test.js` |
| P5 | Exact output key set after mapping | `fieldMapper.pbt.test.js` |
| P6 | Dot-notation path resolution | `fieldMapper.pbt.test.js` |
| P7 | Mapping serialization round-trip | `fieldMapper.pbt.test.js` |
| P8 | Transformation determinism + alphabetical order | `fieldMapper.pbt.test.js` |
| P9 | Array and wrapped-array response handling | `fieldMapper.pbt.test.js` |
| P11 | TTL minutes-to-seconds conversion | `ttl.pbt.test.js` |
| P12 | Per-IP rate limit quota enforcement | `rateLimiter.pbt.test.js` |
| P13 | Ownership enforcement (403 for non-owners) | `ownership.pbt.test.js` |
| P15 | Disabled source always returns empty array | `proxyGateway.pbt.test.js` |
| P17 | Health status display consistency | `healthStatus.pbt.test.js` |
