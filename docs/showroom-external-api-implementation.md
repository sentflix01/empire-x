# Showroom External API Integration — Full Implementation Reference

**Spec:** `.kiro/specs/showroom-external-api/`
**Status:** All 18 tasks completed
**Last updated:** 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Task Execution Order](#task-execution-order)
3. [Task 1 — Database Migration](#task-1--database-migration)
4. [Task 2 — Credential Encryption Service](#task-2--credential-encryption-service)
5. [Task 3 — SSRF Validator Service](#task-3--ssrf-validator-service)
6. [Task 4 — Rate Limiter Service](#task-4--rate-limiter-service)
7. [Task 5 — Proxy Gateway Core](#task-5--proxy-gateway-core)
8. [Task 6 — Proxy Gateway fetchSection](#task-6--proxy-gateway-fetchsection)
9. [Task 7 — External Sources Route](#task-7--external-sources-route)
10. [Task 8 — Proxy Route](#task-8--proxy-route)
11. [Task 9 — Frontend TypeScript Types](#task-9--frontend-typescript-types)
12. [Task 10 — ExternalDataSourcePanel](#task-10--externaldatasourcepanel)
13. [Task 11 — FieldMapperPanel](#task-11--fieldmapperpanel)
14. [Task 12 — DataSourceStatusPanel](#task-12--datasourcestatuspanel)
15. [Task 13 — BuilderForm Integration](#task-13--builderform-integration)
16. [Task 14 — Unit Tests: Encryption & SSRF](#task-14--unit-tests-encryption--ssrf)
17. [Task 15 — Unit Tests: Field Mapper & Rate Limiter](#task-15--unit-tests-field-mapper--rate-limiter)
18. [Task 16 — PBT: SSRF & Encryption](#task-16--pbt-ssrf--encryption)
19. [Task 17 — PBT: Field Mapper](#task-17--pbt-field-mapper)
20. [Task 18 — PBT: TTL, Rate Limiter, Ownership, Proxy, Health](#task-18--pbt-ttl-rate-limiter-ownership-proxy-health)
21. [Known Gap: Database Migration](#known-gap-database-migration)
22. [File Map](#file-map)

---

## Overview

The Showroom External API Integration lets Business Owners connect a live REST API to any repeater-type section in their Empire X Showroom. Instead of entering data manually, they point a section at their own endpoint, map fields, and the Proxy Gateway fetches, transforms, and caches data server-side.

**Three pillars:**
- **Safety** — credentials never reach the browser; all requests are proxied server-side with SSRF validation at both save time and fetch time.
- **Flexibility** — any REST API shape works via dot-notation field mapping.
- **Selectivity** — only explicitly mapped fields are ever exposed to showroom visitors.

**Architecture layers:**

```
Next.js Frontend (BuilderForm, ExternalDataSourcePanel, FieldMapperPanel, DataSourceStatusPanel)
        ↓ HTTPS
Express Backend (Node.js)
  /api/showrooms/:id/external-sources  [authenticated]
  /api/proxy/:showroomId/:sectionKey   [public]
        ↓
  Proxy Gateway Service
    SSRF Validator | Credential Encryption | Rate Limiter | Field Mapper | Health Recorder
        ↓                    ↓
  Redis Cache           PostgreSQL Database
  proxy:*:* keys        external_data_sources
  ratelimit:*:*         field_mappings
                        external_health_records
        ↓ HTTPS only, post-SSRF validation
  External APIs (Business-owned endpoints)
```

---

## Task Execution Order

Tasks were executed in dependency waves:

| Wave | Tasks | Description |
|------|-------|-------------|
| 1 | 1 | Database schema |
| 2 | 2, 3, 4 | Core services (parallel) |
| 3 | 5 | Proxy Gateway core logic |
| 4 | 6 | Proxy Gateway orchestration |
| 5 | 7, 8, 9 | Routes + TypeScript types (parallel) |
| 6 | 10, 11, 12 | Frontend components (parallel) |
| 7 | 13, 14, 15, 16 | Integration + unit tests (parallel) |
| 8 | 17 | PBT field mapper |
| 9 | 18 | PBT remaining properties |

---

## Task 1 — Database Migration

**File:** `backend/db/migrate9.js` *(conflict — see Known Gap)*
**Requirements:** 1.7, 10.5
**Design refs:** Data Models → PostgreSQL Tables

### What was specified

Three new PostgreSQL tables plus indexes, to be created in a new migration file registered in `migrate-all.js`. Also: add `EXTERNAL_API_ENCRYPTION_KEY` to `.env.example`.

### Tables

**`external_data_sources`**
```sql
CREATE TABLE external_data_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id UUID NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  url         TEXT NOT NULL,
  auth_method TEXT NOT NULL DEFAULT 'none'
              CHECK (auth_method IN ('none','bearer_token','api_key_header','api_key_query')),
  credential  JSONB,           -- { iv, authTag, ciphertext } AES-256-GCM encrypted
  header_name TEXT,
  query_param TEXT,
  ttl_seconds INTEGER NOT NULL DEFAULT 300 CHECK (ttl_seconds >= 1),
  is_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (showroom_id, section_key)
);
CREATE INDEX idx_ext_sources_showroom ON external_data_sources(showroom_id);
```

**`field_mappings`**
```sql
CREATE TABLE field_mappings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    UUID NOT NULL REFERENCES external_data_sources(id) ON DELETE CASCADE,
  source_path  TEXT NOT NULL,   -- dot-notation e.g. "product.details.price"
  target_field TEXT NOT NULL,   -- schema field key e.g. "price"
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, target_field)
);
CREATE INDEX idx_field_mappings_source ON field_mappings(source_id);
```

**`external_health_records`**
```sql
CREATE TABLE external_health_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showroom_id UUID NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  source_id   UUID REFERENCES external_data_sources(id) ON DELETE SET NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  http_status INTEGER,
  success     BOOLEAN NOT NULL,
  error_msg   TEXT
);
CREATE INDEX idx_health_showroom_section
  ON external_health_records(showroom_id, section_key, fetched_at DESC);
```

### Known conflict

`migrate9.js` was already occupied by the Chapa payment migration (adds `chapa_tx_ref` to orders). The external API tables need `migrate10.js` and registration in `migrate-all.js`.

---

## Task 2 — Credential Encryption Service

**File:** `backend/services/credentialEncryption.js`
**Requirements:** 1.6
**Design refs:** Components → credentialEncryption.js, Property 3

### What was implemented

AES-256-GCM symmetric encryption for API credentials stored in PostgreSQL.

### Key design decisions

- Key loaded **lazily** from `EXTERNAL_API_ENCRYPTION_KEY` (64 hex chars = 32 bytes). Throws at call time, not at module load — so the server starts normally in dev without the key and only fails when encryption is actually attempted.
- **Random 96-bit IV** generated on every `encrypt()` call using `crypto.randomBytes(12)`. Two encryptions of the same plaintext always produce different ciphertexts.
- **128-bit auth tag** (GCM default). `decrypt()` throws if the tag doesn't match — catches tampered data, wrong key, and corrupted ciphertext.
- Uses Node built-in `crypto` module only — no external dependencies.

### API

```js
// encrypt(plaintext: string) → { iv: string, authTag: string, ciphertext: string }
// All fields are hex-encoded strings.
const { iv, authTag, ciphertext } = encrypt('sk_live_abc123');

// decrypt({ iv, authTag, ciphertext }) → string
// Throws on bad key, tampered data, or missing fields.
const plaintext = decrypt({ iv, authTag, ciphertext });
```

### Storage

The `{ iv, authTag, ciphertext }` object is `JSON.stringify`'d and stored in the `credential` JSONB column of `external_data_sources`. The plaintext is **never** logged or returned in any API response.

### Security properties verified by tests

- Round-trip for 10+ string types (ASCII, unicode, emoji, JSON, special chars, empty string)
- `encrypt(x) !== x` for all non-empty inputs
- Two calls to `encrypt(x)` produce different `iv` and `ciphertext`
- Throws on tampered ciphertext, tampered authTag, wrong IV, wrong key
- Throws for non-string input (`TypeError`)
- Throws when env var missing or wrong length

---

## Task 3 — SSRF Validator Service

**File:** `backend/services/ssrfValidator.js`
**Requirements:** 1.3, 1.4, 2.1, 2.2, 2.3, 2.5
**Design refs:** Components → ssrfValidator.js, Properties 1, 2

### What was implemented

Two exported functions that together block all standard SSRF attack vectors.

### `isBlockedIp(ip: string): boolean`

Pure synchronous function. Checks a single IP string against all blocked ranges:

| Range | CIDR | First octet check |
|-------|------|-------------------|
| RFC-1918 private | 10.0.0.0/8 | `(num >>> 24) === 10` |
| RFC-1918 private | 172.16.0.0/12 | `((num >>> 20) & 0xFFF) === 2753` |
| RFC-1918 private | 192.168.0.0/16 | `(num >>> 16) === 49320` |
| Loopback | 127.0.0.0/8 | `(num >>> 24) === 127` |
| Link-local | 169.254.0.0/16 | `(num >>> 16) === 43518` |
| IPv6 loopback | `::1` | string equality |
| IPv6 full loopback | `0:0:0:0:0:0:0:1` | string equality |
| IPv4-mapped IPv6 | `::ffff:10.x.x.x` etc. | strips `::ffff:` prefix, recurses |
| Hostname alias | `"localhost"` | string equality (case-insensitive) |

Non-string input returns `true` (blocked) as a safe default.

### `validateUrl(urlString: string): Promise<{ ok: boolean, error?: string }>`

Async. **Never throws.** Executes these steps in order:

1. `new URL(urlString)` — if it throws, returns `{ ok: false, error: 'malformed_url' }`
2. Check `parsed.protocol === 'https:'` — if not, returns `{ ok: false, error: 'non_https_scheme' }`
3. If hostname is an IPv4/IPv6 literal — call `isBlockedIp` directly (no DNS)
4. If hostname is `"localhost"` — return `{ ok: false, error: 'blocked_address' }`
5. `dns.promises.lookup(hostname, { all: true })` — on failure returns `{ ok: false, error: 'dns_resolution_failed' }`
6. Check every resolved address with `isBlockedIp` — if any blocked, returns `{ ok: false, error: 'blocked_address' }`
7. Returns `{ ok: true }`

### Key decisions

- HTTPS check runs **before** DNS — avoids performing DNS resolution for non-HTTPS URLs.
- IP literals in the URL are handled **without a DNS round-trip** — prevents bypass via `https://127.0.0.1/`.
- `{ all: true }` in DNS lookup catches multi-homed hosts where one address is private.
- All route-layer error responses for URL validation failures use **HTTP 422** regardless of which step failed.

---

## Task 4 — Rate Limiter Service

**File:** `backend/services/rateLimiter.js`
**Requirements:** 5.1, 5.2, 5.3, 5.4
**Design refs:** Components → rateLimiter.js, Property 12

### What was implemented

Per-IP, per-section rate limiting with Redis primary and automatic in-memory fallback.

### `checkLimit(ip, showroomId, sectionKey): Promise<{ allowed: boolean, retryAfter?: number }>`

**Redis path (primary):**
- Key: `ratelimit:{ip}:{showroomId}:{sectionKey}`
- Uses `INCR` then `EXPIRE 60` on first call
- If counter > 1 (MAX_REQUESTS), returns `{ allowed: false, retryAfter: 60 }`
- If client is a no-op stub (`isNoOp: true` or `status: 'noop'`), throws immediately to trigger fallback

**In-memory fallback (when Redis throws):**
- Backed by `Map<string, { count: number, expiresAt: number }>` — same key format as Redis
- `sweepFallbackStore()` lazily purges expired entries on each call
- Same quota logic: first call allowed, second blocked within 60s window

**Transition logging:**
- Logs `logger.warn(...)` exactly **once** when first transitioning from healthy → unhealthy (avoids log spam)
- Logs `logger.info(...)` when switching back to Redis after recovery
- Module-level `redisHealthy` boolean tracks the current state

**Critical contract:**
`{ allowed: false }` is returned **only** when the per-IP quota is actually exceeded. Redis errors, fallback activation, unexpected exceptions — all cause the function to allow the request rather than falsely blocking it.

### Redis key schema

```
ratelimit:{ip}:{showroomId}:{sectionKey}
  Type: String (counter)
  TTL:  60 seconds
  Max:  1 (MAX_REQUESTS)
```

---

## Task 5 — Proxy Gateway Core

**File:** `backend/services/proxyGateway.js` (pure utility functions)
**Requirements:** 3.5, 3.6, 3.8, 4.6, 4.7, 4.10, 4.11, 4.12, 7.1, 7.2, 11.1, 11.3
**Design refs:** Components → proxyGateway.js, Properties 5, 6, 8, 9, 16

### `resolveDotPath(obj, path)`

Pure function. Traverses an object by dot-notation path string (e.g. `"a.b.c"`).

- Returns the value at the path, or `undefined` if any segment is missing/null/non-object
- Returns `undefined` for null/non-object `obj`, empty string path, or non-string path
- Never throws
- Does **not** traverse array indices — only plain object keys

```js
resolveDotPath({ a: { b: { c: 42 } } }, 'a.b.c')  // → 42
resolveDotPath({ a: 1 }, 'a.b')                    // → undefined
resolveDotPath(null, 'a')                          // → undefined
```

### `applyMappings(items, mappings)`

Pure function. Transforms an array of source objects into mapped objects.

**Algorithm:**
1. Validate `items` is an array (returns `[]` if not)
2. If `mappings` is empty/null, return array of empty objects (one per item)
3. Sort `mappings` alphabetically by `target_field` (stable sort, preserves determinism)
4. For each item, build a new object: for each mapping, call `resolveDotPath(item, source_path)` — include the key only if the result is not `undefined`
5. Return the mapped array — never mutates inputs

Key properties:
- Output keys are **always in alphabetical order** by `target_field` (Requirement 11.3)
- Unmapped source fields are **discarded** (Requirement 7.1)
- Missing source paths are **silently omitted** per item (Requirement 3.6)

### `buildCacheKey(showroomId, sectionKey)`

```js
buildCacheKey('abc', 'items')  // → 'proxy:abc:items'
```

### `injectCredentials(fetchOptions, source)`

Clones `fetchOptions` and adds auth based on `source.auth_method`:

| auth_method | What is injected |
|-------------|-----------------|
| `none` | Nothing — returns clone unchanged |
| `bearer_token` | `Authorization: Bearer <decrypted>` header |
| `api_key_header` | `source.header_name: <decrypted>` header |
| `api_key_query` | `source.query_param=<decrypted>` appended to URL via `URL` API |

The raw credential never appears in the return value. Uses `credentialEncryption.decrypt()` — throws if credential is missing or tampered (caller writes a failed health record).

### `writeHealthRecord(pool, params)`

Inserts a row into `external_health_records`. **Never throws** — errors are caught and logged so a health record failure never disrupts the main fetch flow.

---

## Task 6 — Proxy Gateway fetchSection

**File:** `backend/services/proxyGateway.js` (orchestration function)
**Requirements:** 4.1–4.12, 5.5, 6.3, 7.3, 10.2, 11.4, 11.5
**Design refs:** Request Flows, Properties 10, 15, 16

### `fetchSection(pool, redis, { showroomId, sectionKey, ip })`

12-step orchestration flow:

**Step 1 — Load source**
```sql
SELECT * FROM external_data_sources WHERE showroom_id=$1 AND section_key=$2
```
- No source found → return `[]`
- `is_enabled = false` → return `[]` immediately (no cache read, no rate-limit, no fetch)

**Step 2 — Redis cache check**
```js
const raw = await redis.get(cacheKey);
if (raw) return JSON.parse(raw);
```
- Cache hit → return parsed value immediately (no rate-limit consumed)
- Cache error or corrupt JSON → log warning, treat as miss, fall through to live fetch

**Step 3 — Rate limit check** (only on cache miss)
```js
const { allowed, retryAfter } = await rateLimiter.checkLimit(ip, showroomId, sectionKey);
if (!allowed) return { rateLimited: true, retryAfter: retryAfter ?? 60 };
```

**Step 4 — Load field mappings**
```sql
SELECT source_path, target_field FROM field_mappings WHERE source_id=$1 ORDER BY target_field ASC
```
- Zero mappings → return `[]` (no outbound fetch — selectivity principle)

**Step 5 — SSRF re-validation at fetch time**
```js
const ssrfResult = await ssrfValidator.validateUrl(source.url);
if (!ssrfResult.ok) {
  await writeHealthRecord(..., { success: false });
  return { ssrfBlocked: true };
}
```
- Abort is **unconditional** — happens regardless of whether health record write succeeds

**Step 6 — Credential injection**
```js
fetchOptions = injectCredentials({ url: source.url, headers: {} }, source);
```
- On credential decryption failure: write health record, return `{ upstreamError: true }`

**Step 7 — Outbound fetch with 10s timeout**
```js
const signal = AbortSignal.timeout(10000); // or AbortController fallback for Node < 17.3
const response = await fetch(url, { method: 'GET', headers, signal });
```
- `AbortError` / `TimeoutError` → write health record, return `{ timeout: true }`
- Network error (ECONNREFUSED etc.) → write health record, return `{ upstreamError: true }`

**Step 8 — Handle non-2xx upstream**
```js
if (!response.ok) {
  await writeHealthRecord(..., { httpStatus: response.status, success: false });
  return { upstreamError: true, status: response.status };
}
```

**Step 9 — Parse and unwrap response body**
```js
const body = await response.json();
// Unwrap logic:
if (Array.isArray(body))                          items = body;
else if (Object.keys(body).length === 1 &&
         Array.isArray(body[Object.keys(body)[0]])) items = body[Object.keys(body)[0]];
else                                               items = [body];
```

**Step 10 — Apply field mappings**
```js
try {
  result = applyMappings(items, mappings);
} catch {
  return { mappingFailed: true }; // never return unmapped data
}
```

**Step 11 — Cache result**
```js
const ttl = source.ttl_seconds >= 1 ? source.ttl_seconds : 300;
await redis.setex(cacheKey, ttl, JSON.stringify(result));
```
- Cache write failure is non-fatal (logged, not thrown)

**Step 12 — Write success health record and return**
```js
await writeHealthRecord(..., { httpStatus: response.status, success: true });
return result;
```

### Return value shape

| Value | Meaning |
|-------|---------|
| `[]` or `[{...}, ...]` | Success (including empty) |
| `{ rateLimited: true, retryAfter: 60 }` | Per-IP quota exceeded |
| `{ ssrfBlocked: true }` | SSRF violation at fetch time |
| `{ upstreamError: true, status: N }` | 4xx/5xx or network error |
| `{ timeout: true }` | 10s timeout |
| `{ mappingFailed: true }` | `applyMappings` threw |

---

## Task 7 — External Sources Route

**File:** `backend/routes/externalSources.js`
**Mounted at:** `/api/showrooms/:showroomId/external-sources`
**Requirements:** 1.1–1.8, 3.3, 3.4, 3.7, 6.2, 6.4, 8.5, 9.1–9.5, 10.1, 10.5–10.7
**Design refs:** Components → externalSources.js, Error Handling tables

### Middleware applied to all routes

```js
router.use(requireAuth);       // JWT validation — returns 401 if missing/invalid
router.use(assertOwnership);   // Loads showroom, compares owner_id to req.user.id
                               // Returns 403 if not owner and not admin
```

### `assertOwnership` helper

```js
async function assertOwnership(req, res, next) {
  const { rows } = await pool.query('SELECT owner_id FROM showrooms WHERE id=$1', [showroomId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Showroom not found' });
  if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Forbidden' });
  next();
}
```

### Route table

| Method | Path | Behaviour |
|--------|------|-----------|
| `GET` | `/` | Lists all sources — `credential` excluded from SELECT |
| `POST` | `/` | Validates section_key, HTTPS URL, auth_method, ttl_seconds ≥ 1. Encrypts credential. `ON CONFLICT (showroom_id, section_key) DO UPDATE`. Returns 201. |
| `PUT` | `/:sourceId` | Partial update. Re-runs SSRF if URL changed. Keeps existing encrypted credential if none provided. Switching to `auth_method = 'none'` clears credential. |
| `DELETE` | `/:sourceId` | Deletes source (DB cascade handles mappings + health records). Evicts `proxy:{showroomId}:{sectionKey}` from Redis. |
| `GET` | `/:sourceId/mappings` | Lists mappings ordered by `target_field ASC` |
| `POST` | `/:sourceId/mappings` | Upserts mapping: `ON CONFLICT (source_id, target_field) DO UPDATE source_path` |
| `DELETE` | `/:sourceId/mappings/:mappingId` | Deletes mapping; joins through `external_data_sources` to verify showroom ownership |
| `POST` | `/:sourceId/refresh` | Evicts `proxy:{showroomId}:{sectionKey}` from Redis |
| `GET` | `/health` | `DISTINCT ON (section_key)` query for latest record per section; joins to get URL preview; applies `getDisplayStatus` guard |

### Validation constants

```js
const VALID_AUTH_METHODS = ['none', 'bearer_token', 'api_key_header', 'api_key_query'];
const VALID_SECTION_KEYS = [
  'items', 'services', 'gallery', 'testimonials', 'team', 'faq',
  'features', 'stats', 'portfolio', 'pricing', 'process', 'caseStudies',
  'partners', 'awards', 'careers', 'industries',
];
```

### `getDisplayStatus` (health endpoint)

```js
function getDisplayStatus(record) {
  if (!record) return 'never_fetched';
  if (record.success === false) return 'failing';  // explicit guard — Property 17
  if (record.success === true) return 'healthy';
  return 'never_fetched';
}
```

### URL preview (health endpoint)

Strips query params before truncating to 80 chars — prevents leaking `api_key_query` credentials that may be in the URL's query string.

### Registration in `index.js`

```js
app.use('/api/showrooms/:showroomId/external-sources', require('./routes/externalSources'));
```

---

## Task 8 — Proxy Route

**File:** `backend/routes/proxy.js`
**Requirements:** 4.1, 4.8, 4.9, 5.2, 9.1, 9.4
**Design refs:** Components → proxy.js, Error Handling → Proxy Gateway Errors

### `GET /api/proxy/:showroomId/:sectionKey`

Public endpoint — **no auth middleware**.

**IP detection:**
```js
const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
           || req.ip
           || '0.0.0.0';
```
Respects `X-Forwarded-For` for proxied/load-balanced environments.

**Response mapping:**

| `fetchSection` returns | HTTP | Body |
|------------------------|------|------|
| Array (any length, including `[]`) | 200 | The array |
| `{ rateLimited: true }` | 429 | `{ "error": "rate_limit_exceeded" }` + `Retry-After: 60` header |
| `{ ssrfBlocked: true }` | 502 | `{ "error": "upstream_blocked" }` |
| `{ upstreamError: true, status: N }` | 502 | `{ "error": "upstream_error", "status": N }` |
| `{ timeout: true }` | 504 | `{ "error": "upstream_timeout" }` |
| `{ mappingFailed: true }` | 500 | `{ "error": "mapping_failed" }` |
| Unexpected throw | 502 | `{ "error": "upstream_error", "status": null }` |

**Registration in `index.js`:**
```js
app.use('/api/proxy', require('./routes/proxy'));
```

---

## Task 9 — Frontend TypeScript Types

**File:** `frontend-next/types/externalApi.ts`
**Requirements:** Supports all frontend tasks

### Interfaces

```typescript
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
  source_id?: string;      // present in health response; used for refresh
  section_key: string;
  section_label?: string;  // falls back to section_key if absent
  url_preview: string;     // truncated, no credentials
  fetched_at: string | null;
  http_status: number | null;
  success?: boolean;       // raw flag; used in getDisplayStatus guard
  status: 'healthy' | 'failing' | 'never_fetched';
}
```

---

## Task 10 — ExternalDataSourcePanel

**File:** `frontend-next/components/showroom/ExternalDataSourcePanel.tsx`
**Requirements:** 1.1, 1.2, 1.5, 1.8, 6.1, 6.4, 10.1, 10.7
**Design refs:** Components → ExternalDataSourcePanel

### Props

```typescript
interface Props {
  showroomId: string;
  sectionKey: string;
  sectionLabel: string;
  existingSource?: ExternalDataSource;
  onSaved?: (source: ExternalDataSource) => void;
  onDeleted?: () => void;
}
```

### State

| State | Purpose |
|-------|---------|
| `isEnabled` | Toggle state; initialised from `existingSource.is_enabled` |
| `url` | API URL input |
| `authMethod` | `'none' \| 'bearer_token' \| 'api_key_header' \| 'api_key_query'` |
| `credential` | Password input value — never pre-filled from server |
| `headerName` | Shown only for `api_key_header` |
| `queryParam` | Shown only for `api_key_query` |
| `ttlMinutes` | Integer 1–1440; converted to seconds on save |
| `credentialRef` | `useRef<HTMLInputElement>` — tracks DOM presence |

### Key behaviours

**HTTPS enforcement (client-side):**
```tsx
function handleUrlChange(value: string) {
  setUrl(value);
  if (value.trim() && !value.trim().startsWith('https://'))
    setUrlError('URL must start with https://');
  else setUrlError('');
}
```

**Credential field gate:**
The credential input is conditionally rendered: `{needsCredential && <input ref={credentialRef} ... />}`. Before saving, `validate()` checks `credentialRef.current !== null` — if the field is not yet in the DOM, save is blocked with an error message.

**Save flow:**
- New source → `POST /api/showrooms/:showroomId/external-sources`
- Existing source → `PUT /api/showrooms/:showroomId/external-sources/:sourceId`
- 422 errors displayed inline below the form
- Credential input cleared after successful save (server never returns the value)

**Toggle enable/disable:**
- Rendered only in edit mode (existing source)
- `PUT /:sourceId` with `{ is_enabled: !isEnabled }`

**Delete:**
- "Delete" button opens an inline confirmation dialog
- Confirmed → `DELETE /:sourceId` → calls `onDeleted()`

**TTL:**
- Input range `min=1 max=1440` (minutes)
- Hint shows current seconds: `currently 300 seconds`
- Converts to seconds on save: `ttl_seconds: ttlMinutes * 60`

---

## Task 11 — FieldMapperPanel

**File:** `frontend-next/components/showroom/FieldMapperPanel.tsx`
**Requirements:** 3.1, 3.2, 3.3, 3.6, 3.7, 3.8
**Design refs:** Components → FieldMapperPanel

### Props

```typescript
interface Props {
  showroomId: string;
  sectionKey: string;
  sourceId: string;
  sectionItemFields: FieldDef[]; // { key: string, label: string }[]
}
```

### State

| State | Purpose |
|-------|---------|
| `rows` | One `MappingRow` per `sectionItemFields` entry — tracks `sourcePath` and `mappingId` |
| `sampleKeys` | Top-level keys detected from the proxy sample response |
| `sampleKeysOpen` | Collapsible chip list toggle |
| `saving / testing / deletingId` | Loading state flags |

### Key behaviours

**Load existing mappings on mount:**
```js
GET /api/showrooms/:showroomId/external-sources/:sourceId/mappings
```
Pre-fills rows where `target_field` matches a saved mapping's `target_field`.

**"Test & Map Fields" button:**
```js
GET /api/proxy/:showroomId/:sectionKey
```
- Unwraps response the same way `fetchSection` does (array → first element; single-key wrapper → inner array first element)
- Extracts top-level keys from the first item
- Displays them as collapsible monospace chips

**Save Mappings:**
- Filters rows where `sourcePath` is non-empty
- Sends parallel `POST /:sourceId/mappings` for each (upsert by `target_field`)
- Updates `mappingId` in local state from server response

**Per-row delete:**
```js
DELETE /api/showrooms/:showroomId/external-sources/:sourceId/mappings/:mappingId
```
Clears `sourcePath` and `mappingId` for that row on success.

---

## Task 12 — DataSourceStatusPanel

**File:** `frontend-next/components/showroom/DataSourceStatusPanel.tsx`
**Requirements:** 8.1–8.6
**Design refs:** Components → DataSourceStatusPanel, Property 17

### Props

```typescript
interface Props { showroomId: string; }
```

### Key behaviours

**Data fetch:**
```js
GET /api/showrooms/:showroomId/external-sources/health
```
Called by `useEffect([fetchHealth])` on mount — no full page reload needed; works on tab navigation.

**`getDisplayStatus(record)` — explicit Property 17 guard:**
```typescript
export function getDisplayStatus(record: HealthRecord | null | undefined): DisplayStatus {
  if (!record) return 'never_fetched';
  if (record.success === false) return 'failing';   // GUARD: can never reach 'healthy'
  if (record.status === 'healthy' || ...) return record.status;
  return 'never_fetched';
}
```
The `success === false` check runs **before** consulting `record.status` — so even if the server sends a wrong `status` value, a failed record can never display as healthy.

**StatusBadge:**

| Status | Appearance |
|--------|-----------|
| `healthy` | Green dot + "Healthy" |
| `failing` | Red dot + "Failing (HTTP code)" |
| `never_fetched` | Grey dot + "Never fetched" |

**URL preview:** query params stripped before truncation (prevents `api_key_query` credential leakage).

**"Refresh Cache" button per source:**
```js
POST /api/showrooms/:showroomId/external-sources/:sourceId/refresh
```
Re-fetches health data after refresh to show the cleared cache state.

---

## Task 13 — BuilderForm Integration

**File:** `frontend-next/components/showroom/BuilderForm.tsx`
**Requirements:** 1.1, 8.6, 10.4
**Design refs:** Components → ExternalDataSourcePanel, DataSourceStatusPanel

### Changes made

1. **Tab bar** (only when `showroomId` is available):
   - "Content" tab — existing manual field editing
   - "Data Sources" tab — renders `DataSourceStatusPanel`

2. **`SectionWithExternalSource` component** wraps every section that has a `repeater` field type:
   - Loads existing source on mount via `GET /api/showrooms/:showroomId/external-sources`
   - Renders `ExternalDataSourcePanel` below the manual fields
   - Renders `FieldMapperPanel` after a source is saved (when `source && sectionItemFields.length > 0`)

3. **Disabled source fallback logic:**
   ```tsx
   const suppressRepeater = field.type === 'repeater' && hasActiveSource && isSourceEnabled;
   if (suppressRepeater) return null; // external data takes over
   ```
   When `is_enabled = false`: the repeater field renders normally with `formData` values.
   When `formData` is empty: section renders as empty (no error state).

4. **Non-repeater sections** (or no `showroomId`): original layout unchanged.

### Sections that get the external source treatment

Any section returned by `getSectionType(secKey)` where `sec.fields.some(f => f.type === 'repeater')`:
`items`, `services`, `gallery`, `testimonials`, `team`, `faq`, `features`, `stats`, `portfolio`, `pricing`, `process`, `caseStudies`, `partners`, `awards`, `careers`, `industries`

---

## Task 14 — Unit Tests: Encryption & SSRF

### `backend/test/credentialEncryption.test.js`

**Requirements:** 1.6

| Test group | What's covered |
|------------|---------------|
| Round-trip | 10 string types: ASCII, long, unicode/emoji, whitespace, newlines, JSON, special chars, control chars, empty string |
| Ciphertext ≠ plaintext | 5 inputs including JWT; verifies no substring match for inputs ≥ 4 chars |
| Random IV | Three inputs × 2 calls each — IVs differ; 10-call uniqueness check |
| Output structure | `iv` = 24 hex chars (96 bits); `authTag` = 32 hex chars (128 bits); valid hex regex |
| Tamper detection | Modified ciphertext, modified authTag, wrong IV, wrong encryption key |
| Input validation | `TypeError` for non-string; throws for missing/wrong-length env var |

### `backend/test/ssrfValidator.test.js`

**Requirements:** 2.1, 2.2, 2.5

Uses `jest.mock('dns', ...)` to intercept `dns.promises.lookup` — no real network calls.

| Test group | What's covered |
|------------|---------------|
| `isBlockedIp` — 10.0.0.0/8 | 4 addresses in range; 2 boundary addresses outside |
| `isBlockedIp` — 172.16.0.0/12 | 4 addresses in range; 2 boundary addresses outside |
| `isBlockedIp` — 192.168.0.0/16 | 4 addresses; 2 boundaries |
| `isBlockedIp` — 127.0.0.0/8 | 4 loopback addresses; 1 boundary |
| `isBlockedIp` — 169.254.0.0/16 | 4 link-local addresses including AWS metadata IP; 2 boundaries |
| `isBlockedIp` — IPv6 | `::1`, full form, `::ffff:127.0.0.1`, `::ffff:10.0.0.1`; public IPv6 not blocked |
| `isBlockedIp` — localhost | `"localhost"`, `"LOCALHOST"` (case-insensitive) |
| `isBlockedIp` — public IPs | 7 known-public addresses (Cloudflare, Google, AWS ranges) |
| `isBlockedIp` — invalid input | `null`, `undefined`, number → all blocked |
| `validateUrl` — scheme | HTTP, FTP, data:, javascript:, malformed, empty string all rejected |
| `validateUrl` — HTTPS OK | Public DNS mock → `ok: true` |
| `validateUrl` — IP literals | `127.0.0.1`, `10.0.0.1`, `192.168.1.1`, `172.20.0.1`, `169.254.169.254`, `[::1]` all blocked without DNS |
| `validateUrl` — DNS SSRF | Loopback, RFC-1918, link-local via mock DNS; multi-record response blocks if any private |
| `validateUrl` — localhost | `https://localhost/` and with port |
| `validateUrl` — never throws | 8 weird inputs including `null`, `undefined`, objects |

---

## Task 15 — Unit Tests: Field Mapper & Rate Limiter

### `backend/test/fieldMapper.test.js`

**Requirements:** 3.5, 3.6, 3.8, 11.1, 11.3

Tests `resolveDotPath` and `applyMappings` exported from `proxyGateway.js`.

**`resolveDotPath` tests:**

| Group | Cases |
|-------|-------|
| Simple keys | string, number, boolean, null value, 0, empty string (all valid values returned) |
| Multi-level | 2-level, 3-level, 4-level, path to nested object, path to nested array |
| Missing segments | Missing top-level key, missing intermediate, null intermediate, primitive intermediate, empty path |
| Guards | null obj, undefined obj, string obj, number obj, non-string path |

**`applyMappings` tests:**

| Group | Cases |
|-------|-------|
| Flat objects | Single field, multiple fields, multiple items |
| Nested paths | 2-level, 3-level dot-notation |
| Missing paths | Single missing field omitted, all missing → empty object, mixed items |
| Extra fields | Unmapped source fields discarded; output contains only target_field keys |
| Alphabetical order | Mappings in reverse order → output keys still sorted; stability confirmed by running twice |
| Array of items | 3 items mapped; empty array; non-array input returns `[]` |
| Empty/null mappings | Returns array of empty objects |
| Wrapped-array | Pre-unwrapped `data` and `results` wrappers work correctly |
| Immutability | Original items array not mutated; original mappings array order not changed |

### `backend/test/rateLimiter.test.js`

**Requirements:** 5.1, 5.4

Uses `jest.mock('../lib/redis')` and `jest.mock('../lib/logger')`. Uses `jest.resetModules()` in `beforeEach` to get a fresh module with clean fallback store state per test group.

**`makeRedisMock()`** — in-process Map with real INCR+EXPIRE semantics. `_expire(key)` method simulates TTL expiry.
**`makeThrowingRedisMock()`** — every method throws `'Redis connection refused'`.

| Group | Cases |
|-------|-------|
| Redis-backed counter | First allowed; second blocked; retryAfter defined; independent IPs; independent showrooms; independent sections; re-allowed after window expiry; third call also blocked |
| In-memory fallback | First allowed; second blocked; independent IPs/sections; retryAfter present |
| Warning logging | `logger.warn` called once on fallback activation; not called again on subsequent calls; not called when Redis healthy |
| No-op stub | Falls back when `isNoOp: true`; correctly blocks on second call |

---

## Task 16 — PBT: SSRF & Encryption

**Files:** `backend/test/ssrf.pbt.test.js`, `backend/test/encryption.pbt.test.js`
**Requirements:** 1.3, 1.4, 1.6, 2.1, 2.2
**Tag format:** `// Feature: showroom-external-api, Property N: <text>`

### `ssrf.pbt.test.js` — Properties 1 & 2

**Property 1: HTTPS-only URL acceptance** (100 runs)

```js
// Non-HTTPS URLs always rejected
const nonHttpsUrlArb = fc.tuple(
  fc.oneof(fc.constant('http'), fc.constant('ftp'), fc.constant('data'), ...),
  fc.domain(),
).map(([scheme, host]) => `${scheme}://${host}/path`);
// → result.ok === false && result.error === 'non_https_scheme'

// HTTPS URLs with mocked public DNS always accepted
// dns.promises.lookup overridden per-run to return 8.8.8.8
// → result.ok === true
```

**Property 2: SSRF blocked IP ranges** (100 runs)

Separate arbitraries for each private subnet keep the generator semantically correct:
```js
// 10.0.0.0/8
fc.tuple(fc.integer(0,255), fc.integer(0,255), fc.integer(0,255))
  .map(([b,c,d]) => `10.${b}.${c}.${d}`)

// 172.16.0.0/12 — second octet constrained to 16–31
fc.tuple(fc.integer(16,31), ...)

// Public IPs — curated safe first-octet ranges filtered with isPublicIpv4()
```

Also tests:
- `::1` is always blocked (deterministic)
- 172.x outside 16–31 is never blocked (boundary test)

### `encryption.pbt.test.js` — Property 3

**Property 3: Credential encryption round-trip** (100 runs each)

```js
// P3a: round-trip recovers original plaintext
fc.property(fc.string(), plaintext => {
  expect(decrypt(encrypt(plaintext))).toBe(plaintext);
})

// P3b: ciphertext hex !== plaintext hex for non-empty inputs
fc.property(fc.string({ minLength: 1 }), plaintext => {
  const { ciphertext } = encrypt(plaintext);
  expect(ciphertext).not.toBe(Buffer.from(plaintext,'utf8').toString('hex'));
})

// P3c: two encryptions produce different iv and ciphertext (random IV)
fc.property(fc.string({ minLength: 1 }), plaintext => {
  const e1 = encrypt(plaintext), e2 = encrypt(plaintext);
  expect(e1.iv).not.toBe(e2.iv);
  expect(e1.ciphertext).not.toBe(e2.ciphertext);
})
```

Note: empty-string plaintext always produces an empty ciphertext (valid AES-GCM behaviour), so the random-IV property only applies to `minLength: 1`.

---

## Task 17 — PBT: Field Mapper

**File:** `backend/test/fieldMapper.pbt.test.js`
**Requirements:** 3.5, 3.8, 11.1, 11.2, 11.3, 4.10, 4.11

### Shared helpers

```js
// Collects all dot-notation paths from an object up to maxDepth
// Skips keys with embedded dots or empty-string keys
function collectPaths(obj, prefix, depth) { ... }

// Mirrors fetchSection's body unwrap logic
function unwrapBody(body) {
  if (Array.isArray(body)) return body;
  if (keys.length === 1 && Array.isArray(body[keys[0]])) return body[keys[0]];
  return [body];
}
```

### Property 5: Exact output key set (100 runs)

```js
fc.property(fc.object({ maxDepth: 2 }), mappingsArb, (sourceObj, mappings) => {
  const result = applyMappings([sourceObj], mappings);
  // Every output key must be a target_field
  // Every target_field whose source_path resolves must appear in output
  // No extra source keys may appear
})
```

### Property 6: Dot-notation path resolution (100 runs)

```js
// Test 1: derived paths always resolve to their expected value
fc.property(fc.object({ maxDepth: 2 }), obj => {
  const paths = collectPaths(obj, '', 3);
  for (const path of paths) {
    const manual = segments.reduce((cur, seg) => cur?.[seg], obj);
    if (manual !== undefined) expect(resolveDotPath(obj, path)).toBe(manual);
  }
})

// Test 2: impossible paths always return undefined
fc.property(fc.object({ maxDepth: 2 }), fc.string({ minLength: 1 }), (obj, suffix) => {
  expect(resolveDotPath(obj, `__nonexistent_${suffix}__`)).toBeUndefined();
})
```

### Property 7: JSON serialization round-trip (100 runs)

```js
fc.property(objectArb, mappingsArb, (sourceObj, mappings) => {
  const original = applyMappings([sourceObj], mappings);
  const roundTripped = applyMappings([sourceObj], JSON.parse(JSON.stringify(mappings)));
  expect(roundTripped).toEqual(original);
  expect(Object.keys(roundTripped[0])).toEqual(Object.keys(original[0]));
})
```

### Property 8: Determinism + alphabetical order (100 runs, 3 tests)

```js
// Test 1: two calls produce identical output
// Test 2: output keys are always alphabetically sorted
// Test 3: shuffled mappings produce same result (deterministic shuffle via seed integer)
fc.property(objectArb, mappingsArb, fc.integer({min:0,max:99}), (obj, mappings, seed) => {
  const shuffled = mappings.map((m,i) => ({m, sort: (i*seed*1013) % (mappings.length+1)}))
    .sort((a,b) => a.sort - b.sort).map(({m}) => m);
  expect(applyMappings([obj], mappings)).toEqual(applyMappings([obj], shuffled));
})
```

### Property 9: Array and wrapped-array (100 runs, 3 tests)

```js
// Test 1: plain array — result length matches input length; only target_field keys present
// Test 2: wrapped-array via unwrapBody — identical to direct array mapping
// Test 3: unwrapBody + direct array produce identical applyMappings result for same items
```

---

## Task 18 — PBT: TTL, Rate Limiter, Ownership, Proxy, Health

### `backend/test/ttl.pbt.test.js` — Property 11 (100 runs)

Tests the pure conversion function `convertTtlToSeconds(minutes) = minutes * 60`.

```js
// P11: M × 60 for all integers [1, 1440]
fc.property(fc.integer({ min: 1, max: 1440 }), minutes => {
  return convertTtlToSeconds(minutes) === minutes * 60;
})
```

Additional tests: always positive integer ≥ 60; boundary 1→60; boundary 1440→86400; strictly increasing.

---

### `backend/test/rateLimiter.pbt.test.js` — Property 12 (50 runs)

Uses `fc.ipV4()` for real IP generation. Uses `fc.uniqueArray(fc.ipV4(), { minLength: 2 })` for independence tests. Resets `redisMock._reset()` before each property iteration.

```js
// First call ALWAYS allowed
fc.asyncProperty(fc.ipV4(), fc.string(), fc.string(), async (ip, showroomId, sectionKey) => {
  redisMock._reset();
  return (await checkLimit(ip, showroomId, sectionKey)).allowed === true;
})

// Second call ALWAYS blocked
// 429 NEVER on first call (negative invariant)
// Independent IPs — exhausting one doesn't block others
// Blocked result ALWAYS includes retryAfter number > 0
```

---

### `backend/test/ownership.pbt.test.js` — Property 13 (200 runs)

Tests the pure `checkOwnership(userId, ownerId, isAdmin)` function that mirrors `assertOwnership` route logic. Uses `fc.uuid()` and `fc.pre(userId !== ownerId)` to filter same-value pairs.

```js
// Non-owner + non-admin → ALWAYS false (403)
// Owner (userId === ownerId) → ALWAYS true
// Admin → ALWAYS true regardless of ownership
// Combined: non-owner + non-admin false, admin true, owner true — all in one property
```

---

### `backend/test/proxyGateway.pbt.test.js` — Property 15 (100 runs)

Mocks all external dependencies (`redis`, `logger`, `rateLimiter`, `ssrfValidator`, `credentialEncryption`). Uses `disabledSourceArb` that forces `is_enabled: fc.constant(false)`.

```js
// Returns [] for any disabled source config
// Redis.get is never called (cache bypassed)
// Global fetch is never called (no outbound request)
```

`makePool(sourceRow)` returns a mock with `query: jest.fn().mockResolvedValue({ rows: [sourceRow] })`.

---

### `backend/test/healthStatus.pbt.test.js` — Property 17 (200 runs)

Tests the pure `getDisplayStatus(record)` function (JS mirror of the TypeScript implementation).

```js
// success=false NEVER returns 'healthy' — 200 runs
fc.property(fc.record({ success: fc.constant(false), ... }), record => {
  return getDisplayStatus(record) !== 'healthy';
})

// success=false ALWAYS returns 'failing'
// success=true ALWAYS returns 'healthy'
// boolean success → correct status (combined property)
// null/undefined → 'never_fetched'
// record with no success field → 'never_fetched'
// output is always one of ['healthy', 'failing', 'never_fetched']
```

---

## Known Gap: Database Migration

The three new tables are **not yet in the database**. This is the only thing blocking a live test of the feature.

### Problem

`migrate9.js` was already occupied by the Chapa payment migration (adds `chapa_tx_ref` to orders). The spec task 1 was marked complete, but the migration content does not match what the external API feature needs.

### Fix required

1. Create `backend/db/migrate10.js` with the SQL from Task 1 above (three tables + indexes)
2. Register it in `backend/db/migrate-all.js`:
   ```js
   const { migrate: migrate10 } = require('./migrate10');
   // add to the sequential execution list
   ```
3. Add to `backend/.env.example`:
   ```
   EXTERNAL_API_ENCRYPTION_KEY=  # 64 hex chars = 32 bytes for AES-256-GCM
   ```
4. Update `backend/index.js` `checkEnv()` to warn in dev (not error) if the key is absent

### Generate a key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## File Map

### Backend — New files

| File | Purpose |
|------|---------|
| `backend/db/migrate10.js` | ⚠️ Needs to be created — three new DB tables |
| `backend/services/credentialEncryption.js` | AES-256-GCM encrypt/decrypt |
| `backend/services/ssrfValidator.js` | URL validation + IP blocking |
| `backend/services/rateLimiter.js` | Per-IP rate limiting with Redis fallback |
| `backend/services/proxyGateway.js` | Core proxy logic + fetchSection orchestration |
| `backend/routes/externalSources.js` | All authenticated CRUD routes |
| `backend/routes/proxy.js` | Public proxy endpoint |

### Backend — Modified files

| File | Change |
|------|--------|
| `backend/index.js` | Two new `app.use()` registrations |
| `backend/db/migrate-all.js` | ⚠️ Needs migrate10 registration |
| `backend/.env.example` | ⚠️ Needs `EXTERNAL_API_ENCRYPTION_KEY` |

### Frontend — New files

| File | Purpose |
|------|---------|
| `frontend-next/types/externalApi.ts` | TypeScript interfaces |
| `frontend-next/components/showroom/ExternalDataSourcePanel.tsx` | Source config form |
| `frontend-next/components/showroom/FieldMapperPanel.tsx` | Field mapping UI |
| `frontend-next/components/showroom/DataSourceStatusPanel.tsx` | Health dashboard |

### Frontend — Modified files

| File | Change |
|------|--------|
| `frontend-next/components/showroom/BuilderForm.tsx` | Tab bar + SectionWithExternalSource wrapper |

### Tests — New files

| File | Type | Properties |
|------|------|-----------|
| `backend/test/credentialEncryption.test.js` | Unit | — |
| `backend/test/ssrfValidator.test.js` | Unit | — |
| `backend/test/fieldMapper.test.js` | Unit | — |
| `backend/test/rateLimiter.test.js` | Unit | — |
| `backend/test/ssrf.pbt.test.js` | PBT | P1, P2 |
| `backend/test/encryption.pbt.test.js` | PBT | P3 |
| `backend/test/fieldMapper.pbt.test.js` | PBT | P5, P6, P7, P8, P9 |
| `backend/test/ttl.pbt.test.js` | PBT | P11 |
| `backend/test/rateLimiter.pbt.test.js` | PBT | P12 |
| `backend/test/ownership.pbt.test.js` | PBT | P13 |
| `backend/test/proxyGateway.pbt.test.js` | PBT | P15 |
| `backend/test/healthStatus.pbt.test.js` | PBT | P17 |

---

## Running Tests

```bash
cd backend
npm test                          # all tests
npm test credentialEncryption     # single unit test file
npm test ssrf.pbt                 # single PBT file
npm test -- --coverage            # with coverage report
```

`fast-check` is installed as a devDependency in `backend/`. Each PBT runs **100–200 iterations** per property.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EXTERNAL_API_ENCRYPTION_KEY` | Yes (prod) / warned (dev) | 64 hex chars = 32 bytes AES-256 key |
| `REDIS_URL` | Optional | If absent, rate limiter uses in-memory fallback; cache disabled |
| `DATABASE_URL` | Yes | PostgreSQL connection string |

---

*This document was generated from the complete implementation of the showroom-external-api spec. Cross-reference with `.kiro/specs/showroom-external-api/tasks.md`, `requirements.md`, and `design.md` for the full specification.*
