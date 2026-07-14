# Implementation Plan: Showroom External API Integration

## Overview

Implementation plan for the Showroom External API Integration feature. Tasks are ordered by dependency: database first, then backend services, then routes, then frontend, then tests.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2, 3, 4] },
    { "wave": 3, "tasks": [5] },
    { "wave": 4, "tasks": [6] },
    { "wave": 5, "tasks": [7, 8, 9] },
    { "wave": 6, "tasks": [10, 11, 12] },
    { "wave": 7, "tasks": [13, 14, 15, 16] },
    { "wave": 8, "tasks": [17] },
    { "wave": 9, "tasks": [18] }
  ]
}
```

## Notes

- All backend services go in `backend/services/`; all routes in `backend/routes/`
- Frontend components go in `frontend-next/components/showroom/`
- TypeScript types go in `frontend-next/types/externalApi.ts`
- Use `fast-check` for property-based tests (install as devDependency in `backend/`)
- Never return the `credential` field from any API response
- HTTP 422 is the only status code used for all URL validation failures

---

## Tasks

- [x] 1. Database migration — create external_data_sources, field_mappings, external_health_records tables
  - Create `backend/db/migrate9.js` with the three new tables and indexes defined in design.md
  - Add `EXTERNAL_API_ENCRYPTION_KEY` to `backend/.env.example`
  - Update `backend/db/migrate-all.js` to include migrate9
  - **Requirements:** 1.7, 10.5
  - **Design refs:** Data Models → PostgreSQL Tables

- [x] 2. Credential encryption service
  - Create `backend/services/credentialEncryption.js` with `encrypt(plaintext)` and `decrypt(obj)` using AES-256-GCM and `crypto` (Node built-in)
  - Read key from `EXTERNAL_API_ENCRYPTION_KEY` env var (64 hex chars → 32 bytes)
  - `encrypt` returns `{ iv, authTag, ciphertext }` all as hex strings; random IV per call
  - `decrypt` reverses the operation; throws on bad key/tampered data
  - **Requirements:** 1.6
  - **Design refs:** Components → credentialEncryption.js, Property 3

- [x] 3. SSRF validator service
  - Create `backend/services/ssrfValidator.js` with `isBlockedIp(ip)` and `validateUrl(urlString)`
  - `isBlockedIp` checks RFC-1918 (10/8, 172.16/12, 192.168/16), loopback (127/8), link-local (169.254/16), IPv6 loopback (::1), and `localhost`
  - `validateUrl` checks HTTPS scheme first; all validation failures (scheme, SSRF, malformed) return `{ ok: false, error: string }` — the route layer maps all failures to HTTP 422
  - After scheme check, resolve DNS with `dns.promises.lookup({ all: true })` and call `isBlockedIp` on each resolved address
  - Returns `{ ok: boolean, error?: string }` — never throws
  - **Requirements:** 1.3, 1.4, 2.1, 2.2, 2.3, 2.5
  - **Design refs:** Components → ssrfValidator.js, Properties 1, 2

- [x] 4. Rate limiter service
  - Create `backend/services/rateLimiter.js` with `checkLimit(ip, showroomId, sectionKey)`
  - Redis key `ratelimit:{ip}:{showroomId}:{sectionKey}` with 60 s expiry; max 1 fetch per window
  - `checkLimit` returns `{ allowed: false }` ONLY when the per-IP limit is actually exceeded — never for any other reason
  - On Redis unavailability, fall back to in-process `Map<string, {count, expiresAt}>` and log a warning via `backend/lib/logger.js`
  - Switch back to Redis automatically when it becomes available again (check on each call)
  - Returns `{ allowed: boolean, retryAfter?: number }`
  - **Requirements:** 5.1, 5.2, 5.3, 5.4
  - **Design refs:** Components → rateLimiter.js, Property 12

- [x] 5. Proxy Gateway service — core transformation logic
  - Create `backend/services/proxyGateway.js`
  - Implement `resolveDotPath(obj, path)` — pure function, dot-notation, returns `undefined` if any segment missing
  - Implement `applyMappings(items, mappings)` — pure function; sorts mappings alphabetically by `target_field`; applies per-element to array; omits fields with missing source paths; returns only mapped keys
  - Implement `buildCacheKey(showroomId, sectionKey)` → `proxy:{showroomId}:{sectionKey}`
  - Implement `injectCredentials(fetchOptions, source)` — adds `Authorization: Bearer` header, custom header, or query param based on `auth_method`; decrypts credential using credentialEncryption service; never includes credential in return value
  - Implement `writeHealthRecord(pool, { showroomId, sectionKey, sourceId, httpStatus, success, errorMsg })`
  - **Requirements:** 3.5, 3.6, 3.8, 4.6, 4.7, 4.10, 4.11, 4.12, 7.1, 7.2, 11.1, 11.3
  - **Design refs:** Components → proxyGateway.js, Properties 5, 6, 8, 9, 16

- [x] 6. Proxy Gateway service — fetchSection orchestration
  - Add `fetchSection(pool, redis, { showroomId, sectionKey, ip })` to `backend/services/proxyGateway.js`
  - If source `is_enabled = false`: return `[]` immediately, no cache read, no outbound fetch
  - Check Redis cache; on hit return cached value (no rate-limit check, no outbound fetch); if cache lookup fails or cached data is corrupted, treat as cache miss and fall through to live fetch
  - On cache miss: call `rateLimiter.checkLimit`; if blocked return `{ rateLimited: true, retryAfter: 60 }`
  - Load External_Data_Source + Field_Mappings from DB
  - If no Field_Mappings: return `[]` without fetching — do NOT pass through the raw external response
  - Re-validate URL with ssrfValidator at fetch time; abort outbound request and write health record `success: false` regardless of whether logging succeeds
  - Outbound fetch with 10 s timeout via `node-fetch` or built-in fetch; inject credentials
  - On 4xx/5xx upstream: write health record `success: false`, return `{ upstreamError: true, status }`
  - On timeout: write health record `success: false`, return `{ timeout: true }`
  - Unwrap JSON array directly, or unwrap single-key object whose value is an array; apply `applyMappings` to each element using the same per-element logic for both cases
  - If mapping application throws: return `{ mappingFailed: true }` — do NOT return unmapped data
  - Store result via Redis `SETEX` with stored `ttl_seconds` (default 300 if missing)
  - Write health record `success: true`; return mapped array
  - **Requirements:** 4.1–4.12, 5.5, 6.3, 7.3, 10.2, 11.4, 11.5
  - **Design refs:** Request Flows, Properties 10, 15, 16

- [x] 7. External sources route
  - Create `backend/routes/externalSources.js` mounted at `/api/showrooms/:showroomId/external-sources`
  - All routes use `requireAuth` + `assertOwnership` helper (load showroom, compare `owner_id` to `req.user.id`; return 403 if mismatch and not admin)
  - `GET /` — list all External_Data_Sources for showroom (never return `credential` field)
  - `POST /` — validate fields (HTTPS scheme via ssrfValidator, valid `auth_method`, `ttl_seconds >= 1`, valid `section_key` from repeater sections list); all validation failures return HTTP 422; encrypt credential with credentialEncryption; upsert into DB; return 201
  - `PUT /:sourceId` — same validation as POST; update record; if URL changed re-run SSRF validation
  - `DELETE /:sourceId` — delete record (DB cascade handles field_mappings and health_records); evict Redis cache key
  - `GET /:sourceId/mappings` — list Field_Mappings for source
  - `POST /:sourceId/mappings` — upsert mapping (one per `target_field`); store `{ source_path, target_field }`
  - `DELETE /:sourceId/mappings/:mappingId` — delete single mapping
  - `POST /:sourceId/refresh` — delete Redis cache key `proxy:{showroomId}:{sectionKey}` for the source's section
  - `GET /../health` (i.e., `GET /api/showrooms/:showroomId/external-sources/health`) — return latest Health_Record per section with computed `status` field; server-side guard ensures `success = false` always maps to `failing`, never `healthy`
  - Register route in `backend/index.js`
  - **Requirements:** 1.1–1.8, 3.3, 3.4, 3.7, 6.2, 6.4, 8.5, 9.1–9.5, 10.1, 10.5–10.7
  - **Design refs:** Components → externalSources.js, Error Handling tables

- [x] 8. Proxy route
  - Create `backend/routes/proxy.js` — no `requireAuth` (explicitly public endpoint)
  - `GET /api/proxy/:showroomId/:sectionKey`
  - Call `fetchSection`; map its return value to HTTP responses:
    - `rateLimited` → 429 + `Retry-After: 60` header + `{ "error": "rate_limit_exceeded" }` — only when per-IP limit is actually exceeded
    - `upstreamError` → 502 + `{ "error": "upstream_error", "status": <status> }`
    - `timeout` → 504 + `{ "error": "upstream_timeout" }`
    - `mappingFailed` → 500 + `{ "error": "mapping_failed" }`
    - array (including empty) → 200 + array body
  - Register route in `backend/index.js` as `app.use('/api/proxy', require('./routes/proxy'))`
  - **Requirements:** 4.1, 4.8, 4.9, 5.2, 9.1, 9.4
  - **Design refs:** Components → proxy.js, Error Handling → Proxy Gateway Errors

- [x] 9. Frontend TypeScript types
  - Create `frontend-next/types/externalApi.ts` with `ExternalDataSource`, `FieldMapping`, and `HealthRecord` interfaces as defined in design.md
  - **Requirements:** (supports all frontend tasks)
  - **Design refs:** Data Models → TypeScript Interfaces

- [x] 10. ExternalDataSourcePanel component
  - Create `frontend-next/components/showroom/ExternalDataSourcePanel.tsx`
  - Props: `showroomId`, `sectionKey`, `sectionLabel`, `existingSource?: ExternalDataSource`
  - Toggle to enable/disable (calls `PUT /:sourceId` with `is_enabled`)
  - URL input with client-side HTTPS prefix enforcement
  - Auth method selector (`none`, `bearer_token`, `api_key_header`, `api_key_query`)
  - Credential input: rendered when auth method ≠ `none`; may appear on next user interaction but must be accessible before save is allowed — block save with error if field is not yet rendered and accessible
  - TTL input in minutes: default 5, min 1, max 1440; converts to seconds before POST/PUT
  - Save button: POST or PUT; display server-side 422 errors inline
  - Delete button: opens confirmation dialog before `DELETE /:sourceId`
  - Never display credential value returned from server (server never sends it anyway)
  - **Requirements:** 1.1, 1.2, 1.5, 1.8, 6.1, 6.4, 10.1, 10.7
  - **Design refs:** Components → ExternalDataSourcePanel

- [x] 11. FieldMapperPanel component
  - Create `frontend-next/components/showroom/FieldMapperPanel.tsx`
  - Props: `showroomId`, `sectionKey`, `sourceId`, `sectionItemFields: FieldDef[]`
  - "Test & Map Fields" button: calls `GET /api/proxy/:showroomId/:sectionKey` and displays top-level keys from the sample response
  - For each `itemField` in section definition: one row with target field label + text input for `source_path` (dot-notation)
  - Save Mappings button: calls `POST /:sourceId/mappings` for each filled row (upsert)
  - Per-row delete button: calls `DELETE /:sourceId/mappings/:mappingId`
  - **Requirements:** 3.1, 3.2, 3.3, 3.6, 3.7, 3.8
  - **Design refs:** Components → FieldMapperPanel

- [x] 12. DataSourceStatusPanel component
  - Create `frontend-next/components/showroom/DataSourceStatusPanel.tsx`
  - Props: `showroomId`
  - Fetches `GET /api/showrooms/:showroomId/external-sources/health` when panel mounts or when user navigates to tab (no full page reload)
  - For each source: section name, truncated URL (no credentials), last-fetched timestamp, status badge (`healthy` = green, `failing` = red + HTTP code, `never_fetched` = grey)
  - Implement `getDisplayStatus(record)` helper: `success === true` → `'healthy'`, `success === false` → `'failing'`, no record → `'never_fetched'`; add explicit guard so `success = false` can never reach the `healthy` branch
  - "Refresh Cache" button per source: calls `POST /:sourceId/refresh`
  - **Requirements:** 8.1–8.6
  - **Design refs:** Components → DataSourceStatusPanel, Property 17

- [x] 13. Integrate panels into BuilderForm
  - Update `frontend-next/components/showroom/BuilderForm.tsx`
  - For each section with a `repeater` field type, render `ExternalDataSourcePanel` below the section's manual fields
  - After an External_Data_Source is saved for a section, render `FieldMapperPanel` for that section
  - Add a "Data Sources" tab to the builder that renders `DataSourceStatusPanel`
  - When an External_Data_Source is disabled, fall back to displaying `formData` for that section; if `formData` is empty for the section, render the section as empty
  - **Requirements:** 1.1, 8.6, 10.4
  - **Design refs:** Components → ExternalDataSourcePanel, DataSourceStatusPanel

- [x] 14. Unit tests — credential encryption and SSRF validator
  - Create `backend/test/credentialEncryption.test.js`
    - Encrypt → decrypt round-trip for various string lengths and character sets
    - Verify `encrypt(x) !== x` for all non-empty inputs
    - Verify two calls to `encrypt(x)` produce different ciphertexts (random IV)
  - Create `backend/test/ssrfValidator.test.js`
    - `isBlockedIp` with boundary values across all blocked ranges
    - `validateUrl` with HTTP, FTP, and valid HTTPS URLs — all non-HTTPS return `{ ok: false }`
    - DNS mock to simulate private IP resolution
  - **Requirements:** 1.6, 2.1, 2.2, 2.5
  - **Design refs:** Testing Strategy → Unit Tests

- [x] 15. Unit tests — field mapper and rate limiter
  - Create `backend/test/fieldMapper.test.js`
    - `applyMappings` with flat objects, nested dot-notation, missing paths, extra unmapped fields
    - `resolveDotPath` with simple keys, multi-level paths, missing segments
    - Alphabetical ordering of output keys
    - Array and wrapped-array response unwrapping
  - Create `backend/test/rateLimiter.test.js`
    - Redis-backed counter increments and blocks on second call within 60 s window (mocked Redis)
    - In-memory fallback when Redis mock throws
    - Warning logged when fallback activates
  - **Requirements:** 3.5, 3.6, 3.8, 5.1, 5.4, 11.1, 11.3
  - **Design refs:** Testing Strategy → Unit Tests

- [x] 16. Property-based tests — SSRF and encryption
  - Install `fast-check` as devDependency in `backend/`
  - Create `backend/test/ssrf.pbt.test.js`
    - Property 1: HTTPS-only URL acceptance — `fc.webUrl()` and non-HTTPS scheme URLs; all non-HTTPS rejected with HTTP 422
    - Property 2: SSRF blocked IP ranges — `fc.ipV4()` filtered to private subnets; public IPs filtered to non-private
  - Create `backend/test/encryption.pbt.test.js`
    - Property 3: Credential encryption round-trip — `fc.string()` for plaintext
  - Tag each test: `// Feature: showroom-external-api, Property N: <text>`
  - **Requirements:** 1.3, 1.4, 1.6, 2.1, 2.2
  - **Design refs:** Testing Strategy → PBT table, Properties 1, 2, 3

- [x] 17. Property-based tests — field mapper
  - Create `backend/test/fieldMapper.pbt.test.js`
    - Property 5: Exact output key set — `fc.array(fc.record({ source_path: fc.string(), target_field: fc.string() }))` + `fc.object()`
    - Property 6: Dot-notation path resolution — `fc.object()` + derived dot-paths
    - Property 7: Mapping serialization round-trip — JSON stringify/parse produces same Mapped_Response
    - Property 8: Transformation determinism + alphabetical order — run `applyMappings` twice, compare output
    - Property 9: Array and wrapped-array response handling — `fc.array(fc.object())` and `fc.record({ items: fc.array(fc.object()) })`
  - **Requirements:** 3.5, 3.8, 11.1, 11.2, 11.3, 4.10, 4.11
  - **Design refs:** Testing Strategy → PBT table, Properties 5, 6, 7, 8, 9

- [x] 18. Property-based tests — TTL, rate limiter, ownership, proxy gateway, health status
  - Create `backend/test/ttl.pbt.test.js`
    - Property 11: TTL minutes-to-seconds — `fc.integer({ min: 1, max: 1440 })`, assert `ttl_seconds = M * 60`
  - Create `backend/test/rateLimiter.pbt.test.js`
    - Property 12: Per-IP quota enforcement — `fc.ipV4()` + section keys; first call allowed, second blocked with 429; 429 never fires unless limit exceeded
  - Create `backend/test/ownership.pbt.test.js`
    - Property 13: Ownership enforcement — `fc.uuid()` pairs where userId ≠ ownerId; assert 403
  - Create `backend/test/proxyGateway.pbt.test.js`
    - Property 15: Disabled source returns empty array — `fc.record()` for disabled source configs
  - Create `backend/test/healthStatus.pbt.test.js`
    - Property 17: Health status display consistency — `fc.record({ success: fc.boolean(), ... })`; `success=false` never returns `healthy`
  - **Requirements:** 5.1, 5.2, 6.2, 6.3, 9.2, 9.3, 10.2, 8.2, 8.3
  - **Design refs:** Testing Strategy → PBT table, Properties 11, 12, 13, 15, 17
