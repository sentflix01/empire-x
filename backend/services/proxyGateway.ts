/**
 * services/proxyGateway.ts — Proxy Gateway Service
 *
 * Orchestrates transformation, caching, credential injection, and health
 * recording for the Showroom External API integration.
 */
import type { Pool } from 'pg';
import type { AnyRedis } from '../lib/redis';
import { encrypt, decrypt } from './credentialEncryption';
import logger from '../lib/logger';
import { validateUrl } from './ssrfValidator';
import { checkLimit } from './rateLimiter';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Mapping { source_path: string; target_field: string; }
type MappedItem = Record<string, unknown>;

export type FetchSectionResult =
  | MappedItem[]
  | { rateLimited: true; retryAfter: number }
  | { ssrfBlocked: true }
  | { upstreamError: true; status: number | null }
  | { timeout: true }
  | { mappingFailed: true };

interface SourceRecord {
  id: string;
  url: string;
  auth_method: string;
  credential: string | null;
  header_name: string | null;
  query_param: string | null;
  ttl_seconds: number | null;
  is_enabled: boolean;
}

interface HealthParams {
  showroomId: string;
  sectionKey: string;
  sourceId: string | null;
  httpStatus: number | null;
  success: boolean;
  errorMsg?: string | null;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function resolveDotPath(obj: unknown, path: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') return undefined;
  if (typeof path !== 'string' || !path) return undefined;
  let current: unknown = obj;
  for (const seg of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, seg)) return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

export function applyMappings(items: unknown[], mappings: Mapping[]): MappedItem[] {
  if (!Array.isArray(items)) return [];
  if (!Array.isArray(mappings) || !mappings.length) return items.map(() => ({}));
  const sorted = mappings.slice().sort((a, b) => a.target_field < b.target_field ? -1 : a.target_field > b.target_field ? 1 : 0);
  return items.map(item => {
    const mapped: MappedItem = {};
    for (const { source_path, target_field } of sorted) {
      const v = resolveDotPath(item, source_path);
      if (v !== undefined) mapped[target_field] = v;
    }
    return mapped;
  });
}

export function buildCacheKey(showroomId: string, sectionKey: string): string {
  return `proxy:${showroomId}:${sectionKey}`;
}

export function injectCredentials(
  fetchOptions: { url: string; headers: Record<string,string> },
  source: Pick<SourceRecord,'auth_method'|'credential'|'header_name'|'query_param'>,
): { url: string; headers: Record<string,string> } {
  const { auth_method } = source;
  if (!auth_method || auth_method === 'none') return { ...fetchOptions };
  const parsed = typeof source.credential === 'string' ? JSON.parse(source.credential) : source.credential;
  const decrypted = decrypt(parsed);
  const headers = { ...(fetchOptions.headers ?? {}) };
  if (auth_method === 'bearer_token') { headers['Authorization'] = `Bearer ${decrypted}`; return { ...fetchOptions, headers }; }
  if (auth_method === 'api_key_header') {
    if (!source.header_name) throw new Error('header_name required for api_key_header');
    headers[source.header_name] = decrypted; return { ...fetchOptions, headers };
  }
  if (auth_method === 'api_key_query') {
    if (!source.query_param) throw new Error('query_param required for api_key_query');
    const u = new URL(fetchOptions.url); u.searchParams.set(source.query_param, decrypted);
    return { ...fetchOptions, url: u.toString(), headers };
  }
  logger.warn({ auth_method }, 'injectCredentials: unknown auth_method — skipping');
  return { ...fetchOptions };
}

export async function writeHealthRecord(pool: Pool, params: HealthParams): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO external_health_records (showroom_id,section_key,source_id,http_status,success,error_msg) VALUES ($1,$2,$3,$4,$5,$6)`,
      [params.showroomId, params.sectionKey, params.sourceId??null, params.httpStatus??null, params.success, params.errorMsg??null],
    );
  } catch (err) {
    logger.error({ err: (err as Error).message, ...params }, 'writeHealthRecord: DB write failed');
  }
}

// ── fetchSection ──────────────────────────────────────────────────────────────

export async function fetchSection(
  pool: Pool,
  redis: AnyRedis,
  opts: { showroomId: string; sectionKey: string; ip: string },
): Promise<FetchSectionResult> {
  const { showroomId, sectionKey, ip } = opts;

  // 1. Load source
  const { rows: sourceRows } = await pool.query<SourceRecord>(
    'SELECT * FROM external_data_sources WHERE showroom_id=$1 AND section_key=$2',
    [showroomId, sectionKey],
  );
  if (!sourceRows.length) return [];
  const source = sourceRows[0];
  if (!source.is_enabled) return [];

  // 2. Cache check
  const cacheKey = buildCacheKey(showroomId, sectionKey);
  let cachedData: unknown = null;
  try {
    const raw = await (redis as import('ioredis').default).get(cacheKey);
    if (raw != null) cachedData = JSON.parse(raw);
  } catch (e) { logger.warn({ err: (e as Error).message, cacheKey }, 'fetchSection: cache miss/corrupt'); }
  if (cachedData !== null) return cachedData as MappedItem[];

  // 3. Rate limit
  const limitResult = await checkLimit(ip, showroomId, sectionKey);
  if (!limitResult.allowed) return { rateLimited: true, retryAfter: limitResult.retryAfter ?? 60 };

  // 4. Field mappings
  const { rows: mappings } = await pool.query<Mapping>(
    'SELECT source_path, target_field FROM field_mappings WHERE source_id=$1 ORDER BY target_field ASC',
    [source.id],
  );
  if (!mappings.length) return [];

  // 5. SSRF re-validation
  const ssrfResult = await validateUrl(source.url);
  if (!ssrfResult.ok) {
    await writeHealthRecord(pool, { showroomId, sectionKey, sourceId: source.id, httpStatus: null, success: false, errorMsg: ssrfResult.error });
    return { ssrfBlocked: true };
  }

  // 6. Inject credentials
  let fetchOpts: { url: string; headers: Record<string,string> } = { url: source.url, headers: {} };
  try { fetchOpts = injectCredentials(fetchOpts, source); }
  catch (e) {
    logger.error({ err: (e as Error).message, showroomId, sectionKey }, 'fetchSection: credential injection failed');
    await writeHealthRecord(pool, { showroomId, sectionKey, sourceId: source.id, httpStatus: null, success: false, errorMsg: (e as Error).message });
    return { upstreamError: true, status: null };
  }

  // 7-8. Outbound fetch
  let response: Response;
  try {
    const signal = (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout
      ? (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(10_000)
      : (() => { const c = new AbortController(); setTimeout(() => c.abort(), 10_000); return c.signal; })();
    response = await fetch(fetchOpts.url, { method: 'GET', headers: fetchOpts.headers, signal, redirect: 'error' });
  } catch (e) {
    const err = e as Error & { name?: string; code?: string };
    await writeHealthRecord(pool, { showroomId, sectionKey, sourceId: source.id, httpStatus: null, success: false, errorMsg: err.message });
    if (err.name === 'AbortError' || err.name === 'TimeoutError' || err.code === 'UND_ERR_CONNECT_TIMEOUT') return { timeout: true };
    return { upstreamError: true, status: null };
  }

  if (!response.ok) {
    await writeHealthRecord(pool, { showroomId, sectionKey, sourceId: source.id, httpStatus: response.status, success: false, errorMsg: `HTTP ${response.status}` });
    return { upstreamError: true, status: response.status };
  }

  // 9. Parse + unwrap
  let body: unknown;
  try { body = await response.json(); }
  catch (e) {
    await writeHealthRecord(pool, { showroomId, sectionKey, sourceId: source.id, httpStatus: response.status, success: false, errorMsg: `JSON parse error: ${(e as Error).message}` });
    return { upstreamError: true, status: response.status };
  }

  let items: unknown[];
  if (Array.isArray(body)) { items = body; }
  else if (body !== null && typeof body === 'object') {
    const keys = Object.keys(body as object);
    if (keys.length === 1 && Array.isArray((body as Record<string,unknown>)[keys[0]])) items = (body as Record<string,unknown>)[keys[0]] as unknown[];
    else items = [body];
  } else { items = [body]; }

  // 10. Apply mappings
  let result: MappedItem[];
  try { result = applyMappings(items, mappings); }
  catch (e) {
    logger.error({ err: (e as Error).message, showroomId, sectionKey }, 'fetchSection: applyMappings threw');
    return { mappingFailed: true };
  }

  // 11. Cache write
  const ttl = (source.ttl_seconds ?? 0) >= 1 ? source.ttl_seconds! : 300;
  (redis as import('ioredis').default).setex(cacheKey, ttl, JSON.stringify(result)).catch((e: Error) =>
    logger.warn({ err: e.message, cacheKey }, 'fetchSection: cache write failed'),
  );

  // 12. Health record + return
  await writeHealthRecord(pool, { showroomId, sectionKey, sourceId: source.id, httpStatus: response.status, success: true, errorMsg: null });
  return result;
}

module.exports = { resolveDotPath, applyMappings, buildCacheKey, injectCredentials, writeHealthRecord, fetchSection };
