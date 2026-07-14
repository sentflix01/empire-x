'use strict';

/**
 * proxyGateway.js — Proxy Gateway Service
 *
 * Provides the core transformation, caching, credential injection, and health
 * recording logic for the Showroom External API integration.
 *
 * Exported functions:
 *   resolveDotPath(obj, path)                                        → value | undefined
 *   applyMappings(items, mappings)                                   → MappedItem[]
 *   buildCacheKey(showroomId, sectionKey)                            → string
 *   injectCredentials(fetchOptions, source)                          → fetchOptions (with auth injected)
 *   writeHealthRecord(pool, params)                                  → Promise<void>
 *   fetchSection(pool, redis, { showroomId, sectionKey, ip })        → Promise<result>
 */

const credentialEncryption = require('./credentialEncryption');
const logger = require('../lib/logger');
const ssrfValidator = require('./ssrfValidator');
const rateLimiter = require('./rateLimiter');

// ─────────────────────────────────────────────────────────────────────────────
// resolveDotPath
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Traverse `obj` using a dot-notation path string and return the value at that
 * path, or `undefined` if any segment is missing or `obj` is null / not an
 * object.
 *
 * This is a pure function: same inputs always produce the same output.
 *
 * @param {unknown} obj   - The object to traverse.
 * @param {string}  path  - Dot-notation path, e.g. "a.b.c".
 * @returns {unknown}       The value at the path, or `undefined`.
 *
 * @example
 *   resolveDotPath({ a: { b: { c: 42 } } }, 'a.b.c') // → 42
 *   resolveDotPath({ a: 1 }, 'a.b')                  // → undefined
 *   resolveDotPath(null, 'a')                         // → undefined
 */
function resolveDotPath(obj, path) {
  // Guard: obj must be a non-null object (or array — arrays are objects).
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return undefined;
  }

  // Guard: path must be a non-empty string.
  if (typeof path !== 'string' || path.length === 0) {
    return undefined;
  }

  const segments = path.split('.');
  let current = obj;

  for (const segment of segments) {
    // Stop traversal if the current node is not a traversable object.
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }

    // If the segment is absent on the current node, the path doesn't exist.
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

// ─────────────────────────────────────────────────────────────────────────────
// applyMappings
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a set of field mappings to each element of an items array and return
 * an array of mapped objects containing ONLY the mapped target fields.
 *
 * Rules:
 *  - Mappings are sorted alphabetically by `target_field` BEFORE processing
 *    (ensures deterministic, alphabetically-ordered output keys).
 *  - For each item, only keys present in the mappings set appear in the output.
 *  - If a `source_path` resolves to `undefined` on a given item, that target
 *    field is silently omitted from that item's output object.
 *  - The original items are never mutated.
 *
 * This is a pure function: same inputs always produce the same output.
 *
 * @param {object[]} items    - Array of source objects (e.g. external API items).
 * @param {{ source_path: string, target_field: string }[]} mappings
 *                            - Array of mapping descriptors.
 * @returns {object[]}          Array of mapped objects (one per input item).
 *
 * @example
 *   applyMappings(
 *     [{ name: 'Widget', price: 9.99 }],
 *     [{ source_path: 'price', target_field: 'cost' },
 *      { source_path: 'name',  target_field: 'title' }]
 *   )
 *   // → [{ cost: 9.99, title: 'Widget' }]  (sorted: cost < title)
 */
function applyMappings(items, mappings) {
  if (!Array.isArray(items)) {
    return [];
  }

  if (!Array.isArray(mappings) || mappings.length === 0) {
    return items.map(() => ({}));
  }

  // Sort alphabetically by target_field for deterministic output key ordering
  // (requirement 11.3 / Property 8).  Slice first to avoid mutating the caller's array.
  const sortedMappings = mappings.slice().sort((a, b) => {
    const af = String(a.target_field);
    const bf = String(b.target_field);
    if (af < bf) return -1;
    if (af > bf) return 1;
    return 0;
  });

  return items.map((item) => {
    const mapped = {};

    for (const { source_path, target_field } of sortedMappings) {
      const value = resolveDotPath(item, source_path);

      // Omit the field entirely when the source path is absent (undefined).
      if (value !== undefined) {
        mapped[target_field] = value;
      }
    }

    return mapped;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// buildCacheKey
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the Redis cache key for a showroom section's Mapped_Response.
 *
 * Format: `proxy:{showroomId}:{sectionKey}`
 *
 * @param {string} showroomId  - UUID of the showroom.
 * @param {string} sectionKey  - Section identifier string.
 * @returns {string}
 */
function buildCacheKey(showroomId, sectionKey) {
  return `proxy:${showroomId}:${sectionKey}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// injectCredentials
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inject authentication credentials into fetch options for an outbound request.
 *
 * Supports four authentication methods:
 *  - `none`            — returns fetchOptions unchanged.
 *  - `bearer_token`    — adds `Authorization: Bearer <decrypted>` header.
 *  - `api_key_header`  — adds `source.header_name: <decrypted>` header.
 *  - `api_key_query`   — appends `source.query_param=<decrypted>` to the URL.
 *
 * The credential is decrypted using `credentialEncryption.decrypt(source.credential)`.
 * The plaintext credential value is NEVER included at the top level of the
 * returned object and is NEVER logged.
 *
 * @param {{ url: string, headers?: object, [key: string]: unknown }} fetchOptions
 *   - The base fetch options object (will be cloned — not mutated).
 * @param {{ auth_method: string, credential: object, header_name?: string, query_param?: string }} source
 *   - External_Data_Source record fields needed for auth injection.
 * @returns {{ url: string, headers: object, [key: string]: unknown }}
 *   - New fetch options with credentials injected; never includes the raw credential.
 */
function injectCredentials(fetchOptions, source) {
  const { auth_method } = source;

  // For 'none', return a shallow clone without touching any headers.
  if (!auth_method || auth_method === 'none') {
    return { ...fetchOptions };
  }

  // Decrypt the credential — this throws if the credential is tampered/missing.
  // We intentionally let the error bubble up so the caller can log it and write
  // a failed health record without the plaintext ever appearing in this function's
  // return value.
  const decrypted = credentialEncryption.decrypt(source.credential);

  // Clone headers so we never mutate the caller's object.
  const headers = { ...(fetchOptions.headers || {}) };

  if (auth_method === 'bearer_token') {
    headers['Authorization'] = `Bearer ${decrypted}`;
    // Return without the credential value anywhere in the top-level object.
    return { ...fetchOptions, headers };
  }

  if (auth_method === 'api_key_header') {
    const headerName = source.header_name;
    if (!headerName) {
      throw new Error('injectCredentials: header_name is required for api_key_header auth');
    }
    headers[headerName] = decrypted;
    return { ...fetchOptions, headers };
  }

  if (auth_method === 'api_key_query') {
    const paramName = source.query_param;
    if (!paramName) {
      throw new Error('injectCredentials: query_param is required for api_key_query auth');
    }

    // Safely append the query parameter to the URL using the URL API.
    const urlObj = new URL(fetchOptions.url);
    urlObj.searchParams.set(paramName, decrypted);

    return { ...fetchOptions, url: urlObj.toString(), headers };
  }

  // Unknown auth_method — return unchanged options as a safe default.
  logger.warn({ auth_method }, 'injectCredentials: unknown auth_method — skipping credential injection');
  return { ...fetchOptions };
}

// ─────────────────────────────────────────────────────────────────────────────
// writeHealthRecord
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insert a Health_Record row into the `external_health_records` table.
 *
 * This function NEVER throws — all errors are caught and logged so that a
 * health-record write failure never disrupts the caller's main control flow.
 *
 * @param {import('pg').Pool} pool   - PostgreSQL connection pool.
 * @param {object} params
 * @param {string}      params.showroomId  - UUID of the showroom.
 * @param {string}      params.sectionKey  - Section identifier string.
 * @param {string|null} params.sourceId    - UUID of the External_Data_Source (may be null).
 * @param {number|null} params.httpStatus  - HTTP status from the upstream response, or null for
 *                                           connection-level failures.
 * @param {boolean}     params.success     - Whether the fetch succeeded.
 * @param {string}      [params.errorMsg]  - Optional error detail message.
 * @returns {Promise<void>}
 */
async function writeHealthRecord(pool, { showroomId, sectionKey, sourceId, httpStatus, success, errorMsg }) {
  try {
    await pool.query(
      `INSERT INTO external_health_records
         (showroom_id, section_key, source_id, http_status, success, error_msg)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        showroomId,
        sectionKey,
        sourceId ?? null,
        httpStatus ?? null,
        success,
        errorMsg ?? null,
      ]
    );
  } catch (err) {
    // Log the failure but never re-throw — health record writes are best-effort.
    logger.error(
      { err: err.message, showroomId, sectionKey },
      'writeHealthRecord: failed to insert health record'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchSection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Orchestrate a full proxy gateway request for a showroom section.
 *
 * Flow:
 *  1. Load source from DB; if `is_enabled = false` return [] immediately.
 *  2. Check Redis cache; on hit return cached value (no rate-limit consumed).
 *     If cache lookup throws or cached JSON is corrupt, treat as miss.
 *  3. On cache miss: check rate limit; if blocked return { rateLimited: true, retryAfter: 60 }.
 *  4. Load Field_Mappings; if none return [] (no outbound fetch).
 *  5. Re-validate URL with SSRF validator; abort and write health record on failure.
 *  6. Outbound fetch (10 s timeout); inject credentials.
 *  7. On 4xx/5xx: write health record (success: false), return { upstreamError: true, status }.
 *  8. On timeout: write health record (success: false), return { timeout: true }.
 *  9. Unwrap JSON response (array, single-key object wrapping array, or single item).
 * 10. Apply mappings; on throw return { mappingFailed: true } (never return unmapped data).
 * 11. Write result to Redis SETEX with stored ttl_seconds (default 300).
 * 12. Write health record (success: true); return mapped array.
 *
 * @param {import('pg').Pool} pool                         - PostgreSQL connection pool.
 * @param {object}            redis                        - ioredis client (or no-op stub).
 * @param {object}            opts
 * @param {string}            opts.showroomId              - UUID of the showroom.
 * @param {string}            opts.sectionKey              - Section identifier string.
 * @param {string}            opts.ip                      - Caller IP address (for rate limiting).
 * @returns {Promise<
 *   Array |
 *   { rateLimited: true, retryAfter: number } |
 *   { ssrfBlocked: true } |
 *   { upstreamError: true, status: number } |
 *   { timeout: true } |
 *   { mappingFailed: true }
 * >}
 */
async function fetchSection(pool, redis, { showroomId, sectionKey, ip }) {
  // ── 1. Load source from DB ────────────────────────────────────────────────
  const sourceResult = await pool.query(
    'SELECT * FROM external_data_sources WHERE showroom_id=$1 AND section_key=$2',
    [showroomId, sectionKey]
  );

  // No source configured — return empty (no outbound call, no cache).
  if (sourceResult.rows.length === 0) {
    return [];
  }

  const source = sourceResult.rows[0];

  // If the source is disabled, return empty immediately — no cache read, no fetch.
  if (!source.is_enabled) {
    return [];
  }

  // ── 2. Redis cache check ──────────────────────────────────────────────────
  const cacheKey = buildCacheKey(showroomId, sectionKey);

  let cachedData = null;
  try {
    const raw = await redis.get(cacheKey);
    if (raw != null) {
      // May throw on corrupt JSON — caught below and treated as miss.
      cachedData = JSON.parse(raw);
    }
  } catch (cacheErr) {
    // Corrupt data or Redis error — fall through to live fetch.
    logger.warn(
      { err: cacheErr.message, cacheKey },
      'fetchSection: cache lookup failed or corrupt — treating as miss'
    );
    cachedData = null;
  }

  if (cachedData !== null) {
    // Cache hit: return immediately without rate-limit check or outbound fetch.
    return cachedData;
  }

  // ── 3. Rate limit check (only on cache miss) ──────────────────────────────
  const limitResult = await rateLimiter.checkLimit(ip, showroomId, sectionKey);
  if (!limitResult.allowed) {
    return { rateLimited: true, retryAfter: limitResult.retryAfter ?? 60 };
  }

  // ── 4. Load Field_Mappings ─────────────────────────────────────────────────
  const mappingsResult = await pool.query(
    'SELECT source_path, target_field FROM field_mappings WHERE source_id=$1 ORDER BY target_field ASC',
    [source.id]
  );

  // No mappings — return empty without making an outbound fetch.
  if (mappingsResult.rows.length === 0) {
    return [];
  }

  const mappings = mappingsResult.rows;

  // ── 5. SSRF re-validation at fetch time ───────────────────────────────────
  const ssrfResult = await ssrfValidator.validateUrl(source.url);
  if (!ssrfResult.ok) {
    // Write health record (best-effort) then return ssrfBlocked.
    // The abort MUST happen regardless of whether the health record write succeeds.
    await writeHealthRecord(pool, {
      showroomId,
      sectionKey,
      sourceId: source.id,
      httpStatus: null,
      success: false,
      errorMsg: ssrfResult.error,
    });
    return { ssrfBlocked: true };
  }

  // ── 6. Build fetch options and inject credentials ─────────────────────────
  let fetchOptions = { url: source.url, headers: {} };
  try {
    fetchOptions = injectCredentials(fetchOptions, source);
  } catch (credErr) {
    logger.error(
      { err: credErr.message, showroomId, sectionKey },
      'fetchSection: credential injection failed'
    );
    await writeHealthRecord(pool, {
      showroomId,
      sectionKey,
      sourceId: source.id,
      httpStatus: null,
      success: false,
      errorMsg: credErr.message,
    });
    return { upstreamError: true, status: null };
  }

  // ── 7 & 8. Outbound fetch with 10 s timeout ───────────────────────────────
  let response;
  try {
    const controller = new AbortController();
    const timeoutSignal = AbortSignal.timeout
      ? AbortSignal.timeout(10000)
      : (() => {
          // Fallback for Node < 17.3
          const id = setTimeout(() => controller.abort(), 10000);
          controller.signal.addEventListener('abort', () => clearTimeout(id));
          return controller.signal;
        })();

    response = await fetch(fetchOptions.url, {
      method: 'GET',
      headers: fetchOptions.headers || {},
      signal: timeoutSignal,
    });
  } catch (fetchErr) {
    // Distinguish timeout (AbortError) from other network errors.
    const isTimeout =
      fetchErr.name === 'AbortError' ||
      fetchErr.name === 'TimeoutError' ||
      fetchErr.code === 'UND_ERR_CONNECT_TIMEOUT';

    await writeHealthRecord(pool, {
      showroomId,
      sectionKey,
      sourceId: source.id,
      httpStatus: null,
      success: false,
      errorMsg: fetchErr.message,
    });

    if (isTimeout) {
      return { timeout: true };
    }
    // Network-level failure (ECONNREFUSED, etc.) — surface as upstream error.
    return { upstreamError: true, status: null };
  }

  // ── Handle 4xx / 5xx upstream responses ──────────────────────────────────
  if (!response.ok) {
    await writeHealthRecord(pool, {
      showroomId,
      sectionKey,
      sourceId: source.id,
      httpStatus: response.status,
      success: false,
      errorMsg: `Upstream returned HTTP ${response.status}`,
    });
    return { upstreamError: true, status: response.status };
  }

  // ── 9. Parse and unwrap the response body ─────────────────────────────────
  let body;
  try {
    body = await response.json();
  } catch (parseErr) {
    await writeHealthRecord(pool, {
      showroomId,
      sectionKey,
      sourceId: source.id,
      httpStatus: response.status,
      success: false,
      errorMsg: `Failed to parse JSON response: ${parseErr.message}`,
    });
    return { upstreamError: true, status: response.status };
  }

  // Unwrap logic:
  //   a) body is already an array → use directly.
  //   b) body is an object with exactly one key whose value is an array → unwrap.
  //   c) anything else → wrap in a single-element array.
  let items;
  if (Array.isArray(body)) {
    items = body;
  } else if (body !== null && typeof body === 'object') {
    const keys = Object.keys(body);
    if (keys.length === 1 && Array.isArray(body[keys[0]])) {
      items = body[keys[0]];
    } else {
      items = [body];
    }
  } else {
    items = [body];
  }

  // ── 10. Apply field mappings ───────────────────────────────────────────────
  let result;
  try {
    result = applyMappings(items, mappings);
  } catch (mappingErr) {
    logger.error(
      { err: mappingErr.message, showroomId, sectionKey },
      'fetchSection: applyMappings threw — aborting, not returning unmapped data'
    );
    return { mappingFailed: true };
  }

  // ── 11. Cache the result ──────────────────────────────────────────────────
  const ttlSeconds = source.ttl_seconds && source.ttl_seconds >= 1 ? source.ttl_seconds : 300;
  try {
    await redis.setex(cacheKey, ttlSeconds, JSON.stringify(result));
  } catch (cacheWriteErr) {
    // Cache write failure is non-fatal — log and continue.
    logger.warn(
      { err: cacheWriteErr.message, cacheKey },
      'fetchSection: failed to write result to cache'
    );
  }

  // ── 12. Write success health record and return ────────────────────────────
  await writeHealthRecord(pool, {
    showroomId,
    sectionKey,
    sourceId: source.id,
    httpStatus: response.status,
    success: true,
    errorMsg: null,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  resolveDotPath,
  applyMappings,
  buildCacheKey,
  injectCredentials,
  writeHealthRecord,
  fetchSection,
};
