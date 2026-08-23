/**
 * routes/externalSources.ts — External Data Sources
 *
 * Mounted at /api/showrooms/:showroomId/external-sources
 * All routes require auth + showroom ownership.
 * Credentials are never returned in any response.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { getRedis } from '../lib/redis';
import logger from '../lib/logger';
import type { Redis as RedisClient } from 'ioredis';

const router = Router({ mergeParams: true });

const VALID_AUTH_METHODS = ['none', 'bearer_token', 'api_key_header', 'api_key_query'];
const VALID_SECTION_KEYS = ['items','services','gallery','testimonials','team','faq','features','stats','portfolio','pricing','process','caseStudies','partners','awards','careers','industries'];

// ── Ownership middleware ──────────────────────────────────────────────────────

async function assertOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { showroomId } = req.params;
    const { rows } = await pool.query('SELECT owner_id FROM showrooms WHERE id=$1', [showroomId]);
    if (!rows.length) { res.status(404).json({ error: 'Showroom not found' }); return; }
    if (rows[0].owner_id !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    next();
  } catch (err) { next(err); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function validateSourceUrl(url: string, res: Response): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateUrl } = require('../services/ssrfValidator') as { validateUrl: (u: string) => Promise<{ ok: boolean; error?: string }> };
    const result = await validateUrl(url);
    if (!result.ok) {
      const detail = result.error === 'non_https_scheme' ? 'URL must use the HTTPS scheme' : result.error ?? 'invalid_url';
      res.status(422).json({ error: 'url_validation_failed', detail }); return false;
    }
    return true;
  } catch { res.status(422).json({ error: 'url_validation_failed', detail: 'validator_error' }); return false; }
}

function validateSourceFields(body: Record<string, unknown>, res: Response): boolean {
  const { auth_method, ttl_seconds, section_key } = body;
  if (auth_method !== undefined && !VALID_AUTH_METHODS.includes(auth_method as string)) {
    res.status(422).json({ error: 'validation_failed', detail: 'invalid auth_method' }); return false;
  }
  if (ttl_seconds !== undefined) {
    const ttl = Number(ttl_seconds);
    if (!Number.isInteger(ttl) || ttl < 1) { res.status(422).json({ error: 'validation_failed', detail: 'ttl_seconds must be >= 1' }); return false; }
  }
  if (section_key !== undefined && !VALID_SECTION_KEYS.includes(section_key as string)) {
    res.status(422).json({ error: 'validation_failed', detail: 'section does not support external data' }); return false;
  }
  return true;
}

function getDisplayStatus(record: Record<string, unknown> | null): 'healthy' | 'failing' | 'never_fetched' {
  if (!record) return 'never_fetched';
  if (record.success === false) return 'failing';
  if (record.success === true)  return 'healthy';
  return 'never_fetched';
}

function getBuildCacheKey(showroomId: string, sectionKey: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('../services/proxyGateway') as { buildCacheKey: (s: string, k: string) => string }).buildCacheKey(showroomId, sectionKey);
  } catch { return `proxy:${showroomId}:${sectionKey}`; }
}

function encrypt(value: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('../services/credentialEncryption') as { encrypt: (v: string) => unknown }).encrypt(value);
}

// ── Apply shared middleware ───────────────────────────────────────────────────

router.use(requireAuth);
router.use(assertOwnership);

// ── GET health ────────────────────────────────────────────────────────────────

router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showroomId } = req.params;
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (ehr.section_key) ehr.section_key,ehr.fetched_at,ehr.http_status,ehr.success,ehr.error_msg,eds.url,eds.id AS source_id
       FROM external_health_records ehr LEFT JOIN external_data_sources eds ON ehr.source_id=eds.id
       WHERE ehr.showroom_id=$1 ORDER BY ehr.section_key,ehr.fetched_at DESC`,
      [showroomId],
    );
    const { rows: sources } = await pool.query('SELECT id,section_key,url FROM external_data_sources WHERE showroom_id=$1', [showroomId]);
    const healthMap = new Map((rows as Record<string, unknown>[]).map((r) => [r.section_key, r]));
    const result = (sources as Record<string, unknown>[]).map((source) => {
      const record = healthMap.get(source.section_key) ?? null;
      const status = getDisplayStatus(record);
      let urlPreview = source.url as string;
      try { const p = new URL(urlPreview); p.search = ''; urlPreview = p.toString().slice(0, 80); } catch { urlPreview = urlPreview.slice(0, 80); }
      return { source_id: source.id, section_key: source.section_key, url_preview: urlPreview, fetched_at: record?.fetched_at ?? null, http_status: record?.http_status ?? null, status, error_msg: record && status === 'failing' ? record.error_msg : null };
    });
    res.json(result);
  } catch (err) { next(err); }
});

// ── GET list ──────────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT id,showroom_id,section_key,url,auth_method,header_name,query_param,ttl_seconds,is_enabled,created_at,updated_at FROM external_data_sources WHERE showroom_id=$1 ORDER BY section_key ASC`,
      [req.params.showroomId],
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── POST create/upsert ────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showroomId } = req.params;
    const { section_key, url, auth_method = 'none', credential, header_name, query_param, ttl_seconds = 300, is_enabled = true } = req.body as Record<string, unknown>;
    if (!section_key) { res.status(422).json({ error: 'validation_failed', detail: 'section_key is required' }); return; }
    if (!url) { res.status(422).json({ error: 'validation_failed', detail: 'url is required' }); return; }
    if (!validateSourceFields({ auth_method, ttl_seconds, section_key }, res)) return;
    if (!(await validateSourceUrl(url as string, res))) return;
    let encryptedCredential: string | null = null;
    if (auth_method !== 'none' && credential) encryptedCredential = JSON.stringify(encrypt(String(credential)));
    const { rows } = await pool.query(
      `INSERT INTO external_data_sources (showroom_id,section_key,url,auth_method,credential,header_name,query_param,ttl_seconds,is_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (showroom_id,section_key) DO UPDATE SET url=EXCLUDED.url,auth_method=EXCLUDED.auth_method,credential=EXCLUDED.credential,header_name=EXCLUDED.header_name,query_param=EXCLUDED.query_param,ttl_seconds=EXCLUDED.ttl_seconds,is_enabled=EXCLUDED.is_enabled,updated_at=NOW()
       RETURNING id,showroom_id,section_key,url,auth_method,header_name,query_param,ttl_seconds,is_enabled,created_at,updated_at`,
      [showroomId, section_key, url, auth_method, encryptedCredential, header_name ?? null, query_param ?? null, Number(ttl_seconds), is_enabled !== false],
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// ── PUT update ────────────────────────────────────────────────────────────────

router.put('/:sourceId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showroomId, sourceId } = req.params;
    const body = req.body as Record<string, unknown>;
    const { rows: existing } = await pool.query('SELECT * FROM external_data_sources WHERE id=$1 AND showroom_id=$2', [sourceId, showroomId]);
    if (!existing.length) { res.status(404).json({ error: 'External data source not found' }); return; }
    const cur = existing[0] as Record<string, unknown>;
    if (!validateSourceFields({ auth_method: body.auth_method, ttl_seconds: body.ttl_seconds, section_key: body.section_key }, res)) return;
    const newUrl = body.url !== undefined ? body.url as string : cur.url as string;
    if (body.url !== undefined && body.url !== cur.url) { if (!(await validateSourceUrl(newUrl, res))) return; }
    const newAuthMethod = body.auth_method !== undefined ? body.auth_method : cur.auth_method;
    let newCredential: string | null = cur.credential ? JSON.stringify(cur.credential) : null;
    if (body.credential !== undefined) newCredential = (newAuthMethod !== 'none' && body.credential) ? JSON.stringify(encrypt(String(body.credential))) : null;
    else if (body.auth_method === 'none') newCredential = null;
    const { rows } = await pool.query(
      `UPDATE external_data_sources SET url=$1,auth_method=$2,credential=$3,header_name=$4,query_param=$5,ttl_seconds=$6,is_enabled=$7,section_key=$8,updated_at=NOW()
       WHERE id=$9 AND showroom_id=$10 RETURNING id,showroom_id,section_key,url,auth_method,header_name,query_param,ttl_seconds,is_enabled,created_at,updated_at`,
      [newUrl, newAuthMethod, newCredential, body.header_name ?? cur.header_name, body.query_param ?? cur.query_param, body.ttl_seconds !== undefined ? Number(body.ttl_seconds) : cur.ttl_seconds, body.is_enabled !== undefined ? body.is_enabled : cur.is_enabled, body.section_key ?? cur.section_key, sourceId, showroomId],
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── DELETE source ─────────────────────────────────────────────────────────────

router.delete('/:sourceId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showroomId, sourceId } = req.params;
    const { rows } = await pool.query('SELECT section_key FROM external_data_sources WHERE id=$1 AND showroom_id=$2', [sourceId, showroomId]);
    if (!rows.length) { res.status(404).json({ error: 'External data source not found' }); return; }
    await pool.query('DELETE FROM external_data_sources WHERE id=$1', [sourceId]);
    const redis = getRedis();
    const cacheKey = getBuildCacheKey(showroomId, rows[0].section_key as string);
    (redis as RedisClient).del(cacheKey).catch((err: Error) => logger.warn({ err: err.message, cacheKey }, 'Failed to evict cache on delete'));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Field mappings ────────────────────────────────────────────────────────────

router.get('/:sourceId/mappings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showroomId, sourceId } = req.params;
    const { rows: src } = await pool.query('SELECT id FROM external_data_sources WHERE id=$1 AND showroom_id=$2', [sourceId, showroomId]);
    if (!src.length) { res.status(404).json({ error: 'External data source not found' }); return; }
    const { rows } = await pool.query('SELECT id,source_id,source_path,target_field,created_at,updated_at FROM field_mappings WHERE source_id=$1 ORDER BY target_field ASC', [sourceId]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/:sourceId/mappings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showroomId, sourceId } = req.params;
    const { source_path, target_field } = req.body as Record<string, string>;
    if (!source_path || !target_field) { res.status(422).json({ error: 'validation_failed', detail: 'source_path and target_field are required' }); return; }
    const { rows: src } = await pool.query('SELECT id FROM external_data_sources WHERE id=$1 AND showroom_id=$2', [sourceId, showroomId]);
    if (!src.length) { res.status(404).json({ error: 'External data source not found' }); return; }
    const { rows } = await pool.query(
      `INSERT INTO field_mappings (source_id,source_path,target_field) VALUES ($1,$2,$3) ON CONFLICT (source_id,target_field) DO UPDATE SET source_path=EXCLUDED.source_path,updated_at=NOW() RETURNING id,source_id,source_path,target_field,created_at,updated_at`,
      [sourceId, source_path, target_field],
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:sourceId/mappings/:mappingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showroomId, sourceId, mappingId } = req.params;
    const { rows } = await pool.query(`SELECT fm.id FROM field_mappings fm JOIN external_data_sources eds ON fm.source_id=eds.id WHERE fm.id=$1 AND fm.source_id=$2 AND eds.showroom_id=$3`, [mappingId, sourceId, showroomId]);
    if (!rows.length) { res.status(404).json({ error: 'Field mapping not found' }); return; }
    await pool.query('DELETE FROM field_mappings WHERE id=$1', [mappingId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Refresh cache ─────────────────────────────────────────────────────────────

router.post('/:sourceId/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showroomId, sourceId } = req.params;
    const { rows } = await pool.query('SELECT section_key FROM external_data_sources WHERE id=$1 AND showroom_id=$2', [sourceId, showroomId]);
    if (!rows.length) { res.status(404).json({ error: 'External data source not found' }); return; }
    const cacheKey = getBuildCacheKey(showroomId, rows[0].section_key as string);
    const redis = getRedis();
    (redis as RedisClient).del(cacheKey).catch((err: Error) => logger.warn({ err: err.message, cacheKey }, 'Failed to evict cache on refresh'));
    res.json({ success: true, cache_key: cacheKey });
  } catch (err) { next(err); }
});

module.exports = router;
