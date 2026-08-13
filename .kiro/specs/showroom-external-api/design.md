# Design Document: Showroom External API Integration

## Overview

The Showroom External API Integration extends Halehame's existing Showroom Builder to let Business Owners connect live REST API endpoints to their showroom sections. Instead of entering data manually, an owner configures an external URL, maps response fields to Halehame schema fields, and the Proxy Gateway fetches, transforms, and caches the data server-side.

The three pillars driving this design are:

- **Safety** — credentials never reach the browser; all outbound requests are proxied server-side with SSRF validation at both save time and fetch time.
- **Flexibility** — a field-mapper UI handles any REST API shape via dot-notation path mapping.
- **Selectivity** — only explicitly mapped fields are ever exposed to showroom visitors; everything else is discarded.

This feature integrates with the existing Express backend (`backend/routes/showrooms.js`), the existing Redis layer (`backend/lib/redis.js`), the existing JWT auth middleware (`backend/middleware/auth.js`), and the existing Next.js Showroom Builder (`frontend-next/components/showroom/BuilderForm.tsx`).

---

## Architecture

The system is composed of five layers that each have well-defined responsibilities:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                            │
│   BuilderForm.tsx   FieldMapperPanel   DataSourceStatusPanel    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                  Express Backend (Node.js)                       │
│                                                                  │
│  ┌────────────────────┐  ┌──────────────────────────────────┐   │
│  │ /api/showrooms/    │  │  /api/proxy/:showroomId/         │   │
│  │ :id/external-      │  │  :sectionKey  (public)           │   │
│  │ sources  (authed)  │  │                                  │   │
│  └────────┬───────────┘  └───────────────┬──────────────────┘   │
│           │                              │                       │
│  ┌────────▼──────────────────────────────▼──────────────────┐   │
│  │            Proxy Gateway Service                          │   │
│  │  SSRF Validator │ Field Mapper │ Credential Injector      │   │
│  │  Rate Limiter   │ Health Recorder                         │   │
│  └──────┬──────────────────────────────────────────────────┘    │
│         │                                                         │
│  ┌──────▼──────────┐   ┌──────────────────────────────────────┐  │
│  │   Redis Cache   │   │       PostgreSQL Database            │  │
│  │  (ioredis)      │   │  external_data_sources               │  │
│  │  proxy:*:* keys │   │  field_mappings                      │  │
│  │  ratelimit:*    │   │  external_health_records             │  │
│  └─────────────────┘   └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │ HTTPS only, post-SSRF validation
                    ┌────────▼────────┐
                    │  External APIs  │
                    │  (Business own  │
                    │   endpoints)    │
                    └─────────────────┘
```

### Request Flows

**Cache Hit (visitor views section):**
1. Browser → `GET /api/proxy/:showroomId/:sectionKey`
2. Rate Limiter checks cached response exists → **no quota consumed**
3. Redis `GET proxy:{showroomId}:{sectionKey}` → cache hit
4. Return Mapped_Response directly

**Cache Miss (first visitor, or TTL expired):**
1. Browser → `GET /api/proxy/:showroomId/:sectionKey`
2. Rate Limiter checks per-IP counter in Redis → increments counter
3. Redis `GET proxy:{showroomId}:{sectionKey}` → miss (or corrupt/unavailable → treated as miss)
4. Load External_Data_Source + Field_Mappings from PostgreSQL
5. SSRF re-validation of resolved IP — **abort immediately if blocked, regardless of logging availability; write health record with `success=false`; return error to client**
6. Outbound HTTPS fetch with injected credentials (10 s timeout)
7. Apply Field_Mappings → Mapped_Response (**if mapping fails, return error; never return unmapped data**)
8. Redis `SETEX proxy:{showroomId}:{sectionKey}` with stored TTL
9. Write Health_Record to PostgreSQL
10. Return Mapped_Response

---

## Components and Interfaces

### Backend Components

#### 1. `backend/routes/externalSources.js` (new)

Handles all authenticated CRUD operations for External_Data_Sources and Field_Mappings. Mounted at `/api/showrooms/:showroomId/external-sources`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all External_Data_Sources for a showroom |
| `POST` | `/` | Create or replace an External_Data_Source for a section |
| `PUT` | `/:sourceId` | Update URL, auth method, TTL, or enabled state |
| `DELETE` | `/:sourceId` | Delete source, cascade field_mappings and health_records, evict cache |
| `GET` | `/:sourceId/mappings` | List all Field_Mappings for a source |
| `POST` | `/:sourceId/mappings` | Upsert a Field_Mapping (one per target_field) |
| `DELETE` | `/:sourceId/mappings/:mappingId` | Delete a single Field_Mapping |
| `POST` | `/:sourceId/refresh` | Manually evict the Redis cache entry for this section |
| `GET` | `/../health` | (at showroom level) Latest Health_Record per section |

All routes use `requireAuth` middleware and an `assertOwnership` helper that loads the showroom and compares `owner_id` to `req.user.id`.

#### 2. `backend/routes/proxy.js` (new)

Single public route: `GET /api/proxy/:showroomId/:sectionKey`

No auth middleware. Internally orchestrates the Proxy Gateway Service. Mounted in `index.js` as `app.use('/api/proxy', require('./routes/proxy'))`.

#### 3. `backend/services/proxyGateway.js` (new)

Core service module containing all business logic. Exported as individual functions to keep routes thin.

```javascript
// Key exports
module.exports = {
  fetchSection,        // orchestrates cache check, SSRF, fetch, transform, cache write
  validateUrl,         // HTTPS scheme check + SSRF IP validation
  applyMappings,       // pure transformation function: (items[], mappings[]) → MappedItem[]
  resolveDotPath,      // pure function: (obj, 'a.b.c') → value | undefined
  injectCredentials,   // attaches auth to outbound fetch options
  buildCacheKey,       // 'proxy:{showroomId}:{sectionKey}'
  writeHealthRecord,   // inserts into external_health_records
};
```

#### 4. `backend/services/ssrfValidator.js` (new)

Isolates all SSRF logic for testability.

```javascript
module.exports = {
  isBlockedIp,    // (ipString) → boolean — checks RFC-1918, loopback, link-local
  validateUrl,    // async (urlString) → { ok: boolean, error?: string }
                  // resolves hostname DNS, calls isBlockedIp on each resolved address
};
```

Uses Node's built-in `dns.promises.lookup` with `{ all: true }` to get all resolved IPs and checks each against the blocked ranges. Returns `{ ok: false, error: 'blocked_address' }` for SSRF violations. All validation failures — scheme check, SSRF, malformed URL — use HTTP 422 when surfaced through the route layer.

#### 5. `backend/services/credentialEncryption.js` (new)

AES-256-GCM encrypt/decrypt using `crypto` (Node built-in). Encryption key from `EXTERNAL_API_ENCRYPTION_KEY` environment variable (32-byte hex).

```javascript
module.exports = {
  encrypt,   // (plaintext) → { iv, authTag, ciphertext } — all hex strings
  decrypt,   // ({ iv, authTag, ciphertext }) → plaintext string
};
```

The encrypted credential is stored as a JSON column in PostgreSQL. The plaintext is never returned to any API response.

#### 6. `backend/services/rateLimiter.js` (new)

Per-IP, per-section rate limiting using Redis with in-memory fallback.

```javascript
module.exports = {
  checkLimit,  // async (ip, showroomId, sectionKey) → { allowed: boolean, retryAfter?: number }
               // Returns 429 only when per-IP limit is actually exceeded; never returns 429 otherwise.
               // On Redis unavailability: falls back to in-process Map, logs warning, auto-restores to Redis.
};
```

Redis key: `ratelimit:{ip}:{showroomId}:{sectionKey}` with 60-second expiry. On Redis unavailability, falls back to a `Map<string, {count, expiresAt}>` in-process store.

### Frontend Components

#### 1. `ExternalDataSourcePanel` (new)

Located at `frontend-next/components/showroom/ExternalDataSourcePanel.tsx`. Rendered inside `BuilderForm.tsx` for each section that has a `repeater` field type. Contains:

- Toggle to enable/disable the external data source for the section
- URL input (HTTPS enforced client-side too)
- Auth method selector (`none`, `bearer_token`, `api_key_header`, `api_key_query`)
- Credential input (rendered when auth method ≠ `none`; may render on the next user interaction after selection rather than immediately, but must be accessible before save is allowed — save is blocked with an error if the field is not yet rendered and accessible)
- TTL input in minutes (default 5, range 1–1440)
- Save / Test buttons
- Delete with confirmation dialog

#### 2. `FieldMapperPanel` (new)

Located at `frontend-next/components/showroom/FieldMapperPanel.tsx`. Appears after a source has been saved. Fetches a sample response via the proxy endpoint and lets the owner map source fields to target schema fields. Contains:

- "Test & Map Fields" button to fetch sample
- Display of top-level keys from sample response
- For each `itemField` in the section's `builderSections.ts` definition: a row with the target field name and a source path input (dot-notation)
- Save Mappings button
- Per-mapping delete controls

#### 3. `DataSourceStatusPanel` (new)

Located at `frontend-next/components/showroom/DataSourceStatusPanel.tsx`. Rendered on a "Data" tab in the Showroom Builder. Fetches from `GET /api/showrooms/:showroomId/external-sources/health` when the tab is activated (no full page reload). Displays for each source:

- Section name
- External URL (truncated, no credentials)
- Last-fetched timestamp (formatted)
- Status badge: `healthy` (green), `failing` (red + HTTP code), `never_fetched` (grey)
- Cache refresh button

The `getDisplayStatus(record)` function implementing the status logic must include an explicit guard: if `record.success === false`, it always returns `'failing'` — the `'healthy'` branch is only reachable when `record.success === true`. This guard is tested independently in the health status PBT (Property 17).

---

## Data Models

### PostgreSQL Tables (new migration: `migrate9.js`)

#### `external_data_sources`

```sql
CREATE TABLE external_data_sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id   UUID NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
  section_key   TEXT NOT NULL,
  url           TEXT NOT NULL,                      -- HTTPS URL
  auth_method   TEXT NOT NULL DEFAULT 'none'        -- none | bearer_token | api_key_header | api_key_query
                CHECK (auth_method IN ('none','bearer_token','api_key_header','api_key_query')),
  credential    JSONB,                              -- { iv, authTag, ciphertext } — AES-256-GCM encrypted
  header_name   TEXT,                              -- for api_key_header auth method
  query_param   TEXT,                              -- for api_key_query auth method
  ttl_seconds   INTEGER NOT NULL DEFAULT 300       -- validated: >= 1
                CHECK (ttl_seconds >= 1),
  is_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (showroom_id, section_key)                -- one source per section
);

CREATE INDEX idx_ext_sources_showroom ON external_data_sources(showroom_id);
```

#### `field_mappings`

```sql
CREATE TABLE field_mappings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id      UUID NOT NULL REFERENCES external_data_sources(id) ON DELETE CASCADE,
  source_path    TEXT NOT NULL,    -- dot-notation path, e.g. "product.details.price"
  target_field   TEXT NOT NULL,    -- Schema_Field key, e.g. "price"
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, target_field)  -- one mapping per target field per source
);

CREATE INDEX idx_field_mappings_source ON field_mappings(source_id);
```

#### `external_health_records`

```sql
CREATE TABLE external_health_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id  UUID NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
  section_key  TEXT NOT NULL,
  source_id    UUID REFERENCES external_data_sources(id) ON DELETE SET NULL,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  http_status  INTEGER,             -- NULL if connection-level failure
  success      BOOLEAN NOT NULL,
  error_msg    TEXT                 -- optional detail for failures
);

CREATE INDEX idx_health_showroom_section ON external_health_records(showroom_id, section_key, fetched_at DESC);
```

### Redis Key Schema

| Key | Type | TTL | Purpose |
|-----|------|-----|---------|
| `proxy:{showroomId}:{sectionKey}` | String (JSON) | Configured TTL (default 300 s) | Cached Mapped_Response |
| `ratelimit:{ip}:{showroomId}:{sectionKey}` | String (counter) | 60 s | Per-IP fetch quota |

### TypeScript Interfaces (Frontend)

```typescript
// frontend-next/types/externalApi.ts

export interface ExternalDataSource {
  id: string;
  showroom_id: string;
  section_key: string;
  url: string;
  auth_method: 'none' | 'bearer_token' | 'api_key_header' | 'api_key_query';
  header_name?: string;
  query_param?: string;
  ttl_seconds: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  // NOTE: credential is NEVER returned to the frontend
}

export interface FieldMapping {
  id: string;
  source_id: string;
  source_path: string;
  target_field: string;
}

export interface HealthRecord {
  section_key: string;
  section_label: string;
  url_preview: string;       // truncated URL, no credentials
  fetched_at: string | null;
  http_status: number | null;
  status: 'healthy' | 'failing' | 'never_fetched';
}
```

### Environment Variables (new)

```
EXTERNAL_API_ENCRYPTION_KEY=<64 hex chars = 32 bytes for AES-256>
```

Added to `backend/.env.example`. The `checkEnv()` function in `index.js` is updated to warn (not error) if this key is absent in dev, but error in production.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: HTTPS-only URL Acceptance

*For any* submitted URL string, the SSRF validator SHALL accept the URL if and only if its scheme is `https`. Any URL with a scheme of `http`, `ftp`, `data`, or any other non-HTTPS value SHALL be rejected with HTTP 422.

**Validates: Requirements 1.3, 1.4**

---

### Property 2: SSRF — Blocked IP Ranges are Always Rejected

*For any* hostname whose DNS resolution yields one or more IP addresses, if any resolved address falls within the RFC-1918 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), the loopback range (127.0.0.0/8), the link-local range (169.254.0.0/16), or the IPv6 loopback (::1), the SSRF validator SHALL return `blocked: true`. Public IP addresses outside all these ranges SHALL return `blocked: false`.

**Validates: Requirements 2.1, 2.2, 2.5**

---

### Property 3: Credential Encryption Round-Trip

*For any* plaintext credential string, encrypting it with AES-256-GCM and then decrypting the result SHALL produce a value strictly equal to the original plaintext. The encrypted representation SHALL differ from the plaintext for all non-empty inputs.

**Validates: Requirements 1.6**

---

### Property 4: Credentials Never Appear in API Responses

*For any* External_Data_Source configuration and any outbound proxy response, the plaintext credential value SHALL NOT appear anywhere in the JSON body returned to the caller — including but not limited to the `data`, `config`, or error fields.

**Validates: Requirements 1.6, 4.7**

---

### Property 5: Field Mapping Transformation — Exact Output Key Set

*For any* external API response object (or array element) and any non-empty set of Field_Mappings, the Mapped_Response object SHALL contain exactly the keys that correspond to `target_field` values in the mapping set. No additional keys from the external response SHALL appear, and no target field SHALL be missing unless its `source_path` does not exist in the source object (in which case it is silently omitted).

**Validates: Requirements 3.5, 7.1, 7.2**

---

### Property 6: Dot-Notation Path Resolution

*For any* JavaScript object (including deeply nested objects) and any valid dot-notation path string (e.g., `"a.b.c"`), the `resolveDotPath` function SHALL return the value at that path if it exists, or `undefined` if any segment of the path is absent.

**Validates: Requirements 3.8**

---

### Property 7: Field Mapping Serialization Round-Trip

*For any* array of Field_Mapping objects, serializing the array to JSON with `JSON.stringify` and deserializing with `JSON.parse` SHALL produce a Field_Mapping set that generates an identical Mapped_Response from any given external API response.

**Validates: Requirements 11.2**

---

### Property 8: Transformation Determinism

*For any* external API response body and any set of Field_Mappings, applying the `applyMappings` transformation any number of times SHALL always produce a structurally identical Mapped_Response. The output keys SHALL appear in alphabetical order by `target_field` regardless of the order mappings were saved or the order fields appear in the source response.

**Validates: Requirements 11.1, 11.3**

---

### Property 9: Array and Wrapped-Array Response Handling

*For any* external API response, if the body is a JSON array, `applyMappings` SHALL apply Field_Mappings to each element individually and return an array of Mapped_Response objects of the same length (excluding elements where all mapped paths are absent). If the body is a JSON object containing exactly one key whose value is an array, the gateway SHALL unwrap that array and apply the same per-element mapping.

**Validates: Requirements 4.10, 4.11**

---

### Property 10: Cache Hit Bypasses Outbound Fetch

*For any* showroom section with a valid Redis cache entry at key `proxy:{showroomId}:{sectionKey}`, a call to `fetchSection` SHALL return the cached value directly and SHALL NOT invoke any outbound HTTP fetch or increment the rate-limit counter.

**Validates: Requirements 4.2, 4.3, 5.5**

---

### Property 11: TTL Minutes-to-Seconds Conversion

*For any* integer minute value M in the range [1, 1440], when a Business_Owner saves a TTL of M minutes, the `ttl_seconds` value stored on the External_Data_Source record SHALL equal M × 60. The Redis `SETEX` call for the corresponding cache entry SHALL use exactly this stored value as its expiry.

**Validates: Requirements 6.2, 6.3**

---

### Property 12: Rate Limiting — Per-IP Quota Enforcement

*For any* IP address and any showroom section, after one outbound fetch has been performed within a 60-second window, any subsequent fetch request from the same IP within that same window SHALL be rejected with HTTP 429 and a `Retry-After: 60` header, regardless of whether the Redis primary or in-memory fallback is active.

**Validates: Requirements 5.1, 5.2, 5.4**

---

### Property 13: Ownership Enforcement on Protected Endpoints

*For any* authenticated user U and any showroom S where `S.owner_id ≠ U.id` and U does not have the `admin` role, any request from U to a protected external-source endpoint (create, read, update, delete sources or mappings) SHALL return HTTP 403.

**Validates: Requirements 9.2, 9.3**

---

### Property 14: Cascade Delete — No Orphaned Records

*For any* External_Data_Source that is deleted, after the delete operation completes, there SHALL be no `field_mappings` rows with `source_id` equal to the deleted source's `id`, no `external_health_records` rows with `source_id` equal to the deleted source's `id`, and no Redis cache entry at `proxy:{showroomId}:{sectionKey}` for that section.

**Validates: Requirements 10.5, 10.6**

---

### Property 15: Disabled Source Returns Empty Array

*For any* External_Data_Source with `is_enabled = false`, a call to `GET /api/proxy/:showroomId/:sectionKey` SHALL return an empty array (`[]`) without making any outbound HTTP request or reading from the Redis cache.

**Validates: Requirements 10.2**

---

### Property 16: Health Record Written on Every Fetch Attempt

*For any* outbound fetch attempt (whether it succeeds, returns a 4xx/5xx, times out, or is aborted by SSRF validation at fetch time), a row SHALL be written to `external_health_records` containing a non-null `showroom_id`, `section_key`, `fetched_at` timestamp, and `success` boolean. An abort due to SSRF failure at fetch time SHALL write a record with `success = false`.

**Validates: Requirements 4.12, 2.4**

---

### Property 17: Health Status Display Consistency

*For any* Health_Record, if `success = true` then the status displayed in the Data Source Status panel SHALL be `healthy`; if `success = false` then the status SHALL be `failing`. There is no input to `getDisplayStatus(record)` for which a `success = false` record returns `healthy`.

**Validates: Requirements 8.2, 8.3**

---

## Error Handling

### URL Validation Errors

All URL validation failures return HTTP 422 regardless of the specific failure reason.

| Condition | HTTP Status | Response Body |
|-----------|-------------|---------------|
| URL scheme is not HTTPS | 422 | `{ "error": "url_validation_failed", "detail": "URL must use the HTTPS scheme" }` |
| Hostname resolves to blocked IP (SSRF) | 422 | `{ "error": "url_validation_failed", "detail": "blocked_address" }` |
| URL is malformed (cannot parse) | 422 | `{ "error": "url_validation_failed", "detail": "malformed_url" }` |
| Any other URL validation failure | 422 | `{ "error": "url_validation_failed", "detail": "<specific reason>" }` |

### Proxy Gateway Errors

| Condition | HTTP Status | Response Body |
|-----------|-------------|---------------|
| External URL returns 4xx or 5xx | 502 | `{ "error": "upstream_error", "status": <upstream_status> }` |
| Outbound request times out (> 10 s) | 504 | `{ "error": "upstream_timeout" }` |
| SSRF violation detected at fetch time | 502 | `{ "error": "upstream_blocked" }` |
| Field mapping application fails | 500 | `{ "error": "mapping_failed" }` |
| No Field_Mappings configured | 200 | `[]` (empty array, no upstream call made) |
| External_Data_Source is disabled | 200 | `[]` |

### Authentication / Authorization Errors

| Condition | HTTP Status | Response Body |
|-----------|-------------|---------------|
| No JWT on protected endpoint | 401 | `{ "error": "Authentication required" }` |
| JWT valid but not showroom owner (and not admin) | 403 | `{ "error": "Forbidden" }` |

### Rate Limiting

| Condition | HTTP Status | Headers | Response Body |
|-----------|-------------|---------|---------------|
| Per-IP quota exceeded | 429 | `Retry-After: 60` | `{ "error": "rate_limit_exceeded" }` |

### Configuration Errors

| Condition | HTTP Status | Response Body |
|-----------|-------------|---------------|
| TTL value is 0 or negative | 422 | `{ "error": "validation_failed", "detail": "ttl_seconds must be >= 1" }` |
| section_key is not a valid repeater section | 422 | `{ "error": "validation_failed", "detail": "section does not support external data" }` |
| Auth method is not one of the allowed values | 422 | `{ "error": "validation_failed", "detail": "invalid auth_method" }` |

### Redis Unavailability

- Cache operations fail silently and fall through to the external fetch (existing `cached()` helper behaviour from `redis.js`). If the cached data is corrupted or the lookup itself fails, the gateway falls back to a live external fetch — it does not serve stale or partial data.
- Rate limiter falls back to an in-process `Map` and logs a warning with the existing `logger.warn`. When Redis becomes available again, the rate limiter switches back to Redis immediately without requiring a restart.
- Both fallback modes are logged; no user-facing error is surfaced for Redis downtime.

---

## Testing Strategy

### Unit Tests (Jest)

Unit tests focus on the pure functions that are most critical for correctness and security.

**`ssrfValidator.test.js`**
- `isBlockedIp` with values across all blocked ranges (boundary values)
- `validateUrl` with HTTP, FTP, and HTTPS URLs
- DNS mock to simulate private IP resolution at fetch time

**`credentialEncryption.test.js`**
- `encrypt` → `decrypt` round-trip for various string lengths and character sets
- Verifies that `encrypt(x) !== x` for all non-empty inputs
- Verifies that two calls to `encrypt(x)` produce different ciphertexts (random IV)

**`fieldMapper.test.js`**
- `applyMappings` with flat objects, nested dot-notation paths, missing paths, extra unmapped fields
- `resolveDotPath` with simple keys, multi-level paths, missing segments
- Alphabetical ordering of output keys
- Array and wrapped-array response unwrapping

**`rateLimiter.test.js`**
- Redis-backed counter increments and resets after 60 s (mocked time/Redis)
- In-memory fallback when Redis mock throws

**`ttlConversion.test.js`**
- Minutes-to-seconds conversion for boundary values (1 min → 60 s, 1440 min → 86400 s)

### Property-Based Tests (fast-check)

Property tests run 100 iterations per property. Each test is tagged with its corresponding design property.

> **Library:** [`fast-check`](https://github.com/dubzzz/fast-check) — install with `npm install --save-dev fast-check` in the backend.

> **Tag format:** `// Feature: showroom-external-api, Property N: <property text>`

**Properties to implement as PBT:**

| Design Property | Test File | fast-check Arbitraries |
|-----------------|-----------|------------------------|
| Property 1: HTTPS-only | `ssrf.pbt.test.js` | `fc.webUrl()`, `fc.oneof(fc.constant('http'), fc.constant('ftp'), fc.string())` prepended to a host |
| Property 2: SSRF blocked ranges | `ssrf.pbt.test.js` | `fc.ipV4()` constrained to private subnets via filtering; public IPs via `fc.ipV4()` filtered to public |
| Property 3: Credential encryption round-trip | `encryption.pbt.test.js` | `fc.string()` for plaintext |
| Property 5: Exact output key set | `fieldMapper.pbt.test.js` | `fc.array(fc.record({ source_path: fc.string(), target_field: fc.string() }))` + `fc.object()` |
| Property 6: Dot-notation path resolution | `fieldMapper.pbt.test.js` | `fc.object({ withDeletedKeys: false })` + dot-path derived from keys |
| Property 7: Mapping serialization round-trip | `fieldMapper.pbt.test.js` | Same arbitraries as Property 5 |
| Property 8: Transformation determinism + alphabetical order | `fieldMapper.pbt.test.js` | Same as Property 5; run transform twice; compare |
| Property 9: Array/wrapped-array handling | `fieldMapper.pbt.test.js` | `fc.array(fc.object())` and `fc.record({ items: fc.array(fc.object()) })` |
| Property 11: TTL conversion | `ttl.pbt.test.js` | `fc.integer({ min: 1, max: 1440 })` |
| Property 12: Rate limit enforcement | `rateLimiter.pbt.test.js` | `fc.ipV4()` + section key strings; assert 429 on second call |
| Property 13: Ownership enforcement | `ownership.pbt.test.js` | `fc.uuid()` for userId/ownerId pairs where they differ |
| Property 15: Disabled source empty array | `proxyGateway.pbt.test.js` | `fc.record()` for disabled source configs |
| Property 17: Health status display | `healthStatus.pbt.test.js` | `fc.record({ success: fc.boolean(), ... })` |

### Integration Tests

Integration tests use a real PostgreSQL instance (test database) and a real or mocked Redis.

- End-to-end source creation → field mapping → proxy fetch → cache verify
- Cascade delete: confirm no orphaned `field_mappings` or `health_records` after source deletion
- Auth: 401 without JWT, 403 with wrong-owner JWT, 200 with correct-owner JWT on all protected routes
- Proxy public access: 200 without auth on `GET /api/proxy/:showroomId/:sectionKey`
- Health record written after every fetch (success and failure paths)
- Cache TTL: verify Redis `SETEX` called with stored `ttl_seconds` value

### Dual Testing Note

Unit tests catch concrete bugs in specific inputs; property-based tests verify universal invariants across hundreds of generated inputs. Both are required. Avoid writing more than 2–3 unit test examples for any behaviour that is fully covered by a property test.
