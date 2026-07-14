'use strict';

/**
 * externalSources.js — External Data Sources route
 *
 * Mounted at /api/showrooms/:showroomId/external-sources
 *
 * All routes require authentication (requireAuth) and ownership validation
 * (assertOwnership). Credentials are never returned in any response.
 *
 * Routes:
 *   GET    /                              List all External_Data_Sources for showroom
 *   POST   /                              Create/upsert External_Data_Source for a section
 *   PUT    /:sourceId                     Update an existing External_Data_Source
 *   DELETE /:sourceId                     Delete source (cascade via DB); evict Redis cache
 *   GET    /:sourceId/mappings            List Field_Mappings for a source
 *   POST   /:sourceId/mappings            Upsert a Field_Mapping (one per target_field)
 *   DELETE /:sourceId/mappings/:mappingId Delete a single Field_Mapping
 *   POST   /:sourceId/refresh             Evict Redis cache key for the source's section
 *   GET    /../health                     Latest Health_Record per section with computed status
 *     (accessible at /api/showrooms/:showroomId/external-sources/health)
 */

const router = require('express').Router({ mergeParams: true });
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { validateUrl } = require('../services/ssrfValidator');
const credentialEncryption = require('../services/credentialEncryption');
const { buildCacheKey } = require('../services/proxyGateway');
const { getRedis } = require('../lib/redis');

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_AUTH_METHODS = ['none', 'bearer_token', 'api_key_header', 'api_key_query'];

const VALID_SECTION_KEYS = [
  'items', 'services', 'gallery', 'testimonials', 'team', 'faq',
  'features', 'stats', 'portfolio', 'pricing', 'process', 'caseStudies',
  'partners', 'awards', 'careers', 'industries',
];

// ── assertOwnership helper ────────────────────────────────────────────────────

/**
 * Load the showroom by ID and verify the current user owns it.
 *
 * Steps:
 *   1. SELECT owner_id FROM showrooms WHERE id=$1
 *   2. If not found → 404
 *   3. If owner_id !== req.user.id AND req.user.role !== 'admin' → 403
 *   4. Otherwise call next()
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function assertOwnership(req, res, next) {
  try {
    const { showroomId } = req.params;
    const { rows } = await pool.query(
      'SELECT owner_id FROM showrooms WHERE id = $1',
      [showroomId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Showroom not found' });
    }

    const { owner_id } = rows[0];

    if (owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  } catch (err) {
    next(err);
  }
}

// ── URL validation helper ─────────────────────────────────────────────────────

/**
 * Validate a URL using the SSRF validator.
 * All failures (scheme, SSRF, malformed) return HTTP 422.
 *
 * Returns true if valid; writes 422 response and returns false if not.
 *
 * @param {string}                     url
 * @param {import('express').Response} res
 * @returns {Promise<boolean>}
 */
async function validateSourceUrl(url, res) {
  const result = await validateUrl(url);
  if (!result.ok) {
    let detail;
    if (result.error === 'non_https_scheme') {
      detail = 'URL must use the HTTPS scheme';
    } else if (result.error === 'malformed_url') {
      detail = 'malformed_url';
    } else {
      detail = result.error;
    }
    res.status(422).json({ error: 'url_validation_failed', detail });
    return false;
  }
  return true;
}

// ── Source field validation helper ───────────────────────────────────────────

/**
 * Validate POST/PUT body fields for creating or updating an External_Data_Source.
 * On failure writes a 422 response and returns false.
 *
 * @param {object}                     body
 * @param {import('express').Response} res
 * @returns {boolean}
 */
function validateSourceFields(body, res) {
  const { auth_method, ttl_seconds, section_key } = body;

  if (auth_method !== undefined && !VALID_AUTH_METHODS.includes(auth_method)) {
    res.status(422).json({ error: 'validation_failed', detail: 'invalid auth_method' });
    return false;
  }

  if (ttl_seconds !== undefined) {
    const ttl = Number(ttl_seconds);
    if (!Number.isInteger(ttl) || ttl < 1) {
      res.status(422).json({ error: 'validation_failed', detail: 'ttl_seconds must be >= 1' });
      return false;
    }
  }

  if (section_key !== undefined && !VALID_SECTION_KEYS.includes(section_key)) {
    res.status(422).json({ error: 'validation_failed', detail: 'section does not support external data' });
    return false;
  }

  return true;
}

// ── Health status helper ──────────────────────────────────────────────────────

/**
 * Compute the display status for a health record.
 *
 * GUARD: success=false MUST always return 'failing' — never 'healthy'.
 *
 * @param {object|null} record
 * @returns {'healthy'|'failing'|'never_fetched'}
 */
function getDisplayStatus(record) {
  if (!record) return 'never_fetched';
  // GUARD: success=false MUST always return 'failing' — never 'healthy'
  if (record.success === false) return 'failing';
  if (record.success === true) return 'healthy';
  return 'never_fetched';
}

// ── Apply middleware to all routes ────────────────────────────────────────────

router.use(requireAuth);
router.use(assertOwnership);

// ── GET /api/showrooms/:showroomId/external-sources/health ────────────────────
// NOTE: Must be defined BEFORE /:sourceId routes so Express doesn't
// interpret "health" as a sourceId.

router.get('/health', async (req, res, next) => {
  try {
    const { showroomId } = req.params;

    // Get the latest health record per section_key for this showroom,
    // joined to external_data_sources to get the URL preview.
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (ehr.section_key)
         ehr.section_key,
         ehr.fetched_at,
         ehr.http_status,
         ehr.success,
         ehr.error_msg,
         eds.url,
         eds.id AS source_id
       FROM external_health_records ehr
       LEFT JOIN external_data_sources eds
         ON ehr.source_id = eds.id
       WHERE ehr.showroom_id = $1
       ORDER BY ehr.section_key, ehr.fetched_at DESC`,
      [showroomId]
    );

    // Also fetch all sources for showroom in case some have never been fetched
    const { rows: sources } = await pool.query(
      'SELECT id, section_key, url FROM external_data_sources WHERE showroom_id = $1',
      [showroomId]
    );

    // Build a map of section_key → latest health record
    const healthBySection = new Map();
    for (const row of rows) {
      healthBySection.set(row.section_key, row);
    }

    // Build the response — include all sources, with or without health records
    const result = sources.map((source) => {
      const record = healthBySection.get(source.section_key) || null;
      const status = getDisplayStatus(record);

      // Truncate URL for display — never expose credentials (they're not in URL anyway
      // for bearer/api_key_header; for api_key_query they could be in query params,
      // so strip the query string).
      let urlPreview = source.url;
      try {
        const parsed = new URL(source.url);
        parsed.search = '';
        urlPreview = parsed.toString();
        // Truncate to 80 chars
        if (urlPreview.length > 80) {
          urlPreview = urlPreview.slice(0, 77) + '...';
        }
      } catch {
        // If URL is somehow invalid, just use as-is but truncate
        if (urlPreview.length > 80) {
          urlPreview = urlPreview.slice(0, 77) + '...';
        }
      }

      return {
        source_id: source.id,
        section_key: source.section_key,
        url_preview: urlPreview,
        fetched_at: record ? record.fetched_at : null,
        http_status: record ? record.http_status : null,
        status,
        error_msg: record && status === 'failing' ? record.error_msg : null,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/showrooms/:showroomId/external-sources ───────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { showroomId } = req.params;

    const { rows } = await pool.query(
      `SELECT id, showroom_id, section_key, url, auth_method,
              header_name, query_param, ttl_seconds, is_enabled,
              created_at, updated_at
       FROM external_data_sources
       WHERE showroom_id = $1
       ORDER BY section_key ASC`,
      [showroomId]
    );

    // credential field is intentionally excluded from SELECT

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/showrooms/:showroomId/external-sources ─────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { showroomId } = req.params;
    const {
      section_key,
      url,
      auth_method = 'none',
      credential,
      header_name,
      query_param,
      ttl_seconds = 300,
      is_enabled = true,
    } = req.body;

    // Validate required fields
    if (!section_key) {
      return res.status(422).json({ error: 'validation_failed', detail: 'section_key is required' });
    }
    if (!url) {
      return res.status(422).json({ error: 'validation_failed', detail: 'url is required' });
    }

    // Validate fields
    if (!validateSourceFields({ auth_method, ttl_seconds, section_key }, res)) return;

    // Validate URL via SSRF validator — all failures → 422
    if (!(await validateSourceUrl(url, res))) return;

    // Encrypt credential if provided and auth_method requires it
    let encryptedCredential = null;
    if (auth_method !== 'none' && credential) {
      encryptedCredential = credentialEncryption.encrypt(String(credential));
    }

    // Upsert — one source per (showroom_id, section_key)
    const { rows } = await pool.query(
      `INSERT INTO external_data_sources
         (showroom_id, section_key, url, auth_method, credential,
          header_name, query_param, ttl_seconds, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (showroom_id, section_key)
       DO UPDATE SET
         url           = EXCLUDED.url,
         auth_method   = EXCLUDED.auth_method,
         credential    = EXCLUDED.credential,
         header_name   = EXCLUDED.header_name,
         query_param   = EXCLUDED.query_param,
         ttl_seconds   = EXCLUDED.ttl_seconds,
         is_enabled    = EXCLUDED.is_enabled,
         updated_at    = NOW()
       RETURNING id, showroom_id, section_key, url, auth_method,
                 header_name, query_param, ttl_seconds, is_enabled,
                 created_at, updated_at`,
      [
        showroomId,
        section_key,
        url,
        auth_method,
        encryptedCredential ? JSON.stringify(encryptedCredential) : null,
        header_name || null,
        query_param || null,
        Number(ttl_seconds),
        is_enabled !== false,
      ]
    );

    // credential intentionally excluded from response (already excluded in RETURNING)
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/showrooms/:showroomId/external-sources/:sourceId ─────────────────

router.put('/:sourceId', async (req, res, next) => {
  try {
    const { showroomId, sourceId } = req.params;
    const {
      url,
      auth_method,
      credential,
      header_name,
      query_param,
      ttl_seconds,
      is_enabled,
      section_key,
    } = req.body;

    // Load existing record to verify it belongs to this showroom
    const { rows: existing } = await pool.query(
      `SELECT id, url, auth_method, credential, header_name, query_param,
              ttl_seconds, is_enabled, section_key
       FROM external_data_sources
       WHERE id = $1 AND showroom_id = $2`,
      [sourceId, showroomId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'External data source not found' });
    }

    const current = existing[0];

    // Validate fields that are being updated
    const fieldsToValidate = {};
    if (auth_method !== undefined) fieldsToValidate.auth_method = auth_method;
    if (ttl_seconds !== undefined) fieldsToValidate.ttl_seconds = ttl_seconds;
    if (section_key !== undefined) fieldsToValidate.section_key = section_key;

    if (!validateSourceFields(fieldsToValidate, res)) return;

    // If URL changed, re-run SSRF validation
    const newUrl = url !== undefined ? url : current.url;
    if (url !== undefined && url !== current.url) {
      if (!(await validateSourceUrl(url, res))) return;
    }

    // Handle credential encryption
    const newAuthMethod = auth_method !== undefined ? auth_method : current.auth_method;
    let newCredential;
    if (credential !== undefined) {
      // New credential provided
      if (newAuthMethod !== 'none' && credential) {
        newCredential = JSON.stringify(credentialEncryption.encrypt(String(credential)));
      } else {
        newCredential = null;
      }
    } else if (auth_method === 'none') {
      // Switching to 'none' auth — clear credential
      newCredential = null;
    } else {
      // Keep existing encrypted credential
      newCredential = current.credential ? JSON.stringify(current.credential) : null;
    }

    const { rows } = await pool.query(
      `UPDATE external_data_sources
       SET url         = $1,
           auth_method = $2,
           credential  = $3,
           header_name = $4,
           query_param = $5,
           ttl_seconds = $6,
           is_enabled  = $7,
           section_key = $8,
           updated_at  = NOW()
       WHERE id = $9 AND showroom_id = $10
       RETURNING id, showroom_id, section_key, url, auth_method,
                 header_name, query_param, ttl_seconds, is_enabled,
                 created_at, updated_at`,
      [
        newUrl,
        newAuthMethod,
        newCredential,
        header_name !== undefined ? header_name : current.header_name,
        query_param !== undefined ? query_param : current.query_param,
        ttl_seconds !== undefined ? Number(ttl_seconds) : current.ttl_seconds,
        is_enabled !== undefined ? is_enabled : current.is_enabled,
        section_key !== undefined ? section_key : current.section_key,
        sourceId,
        showroomId,
      ]
    );

    // credential intentionally excluded from response
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/showrooms/:showroomId/external-sources/:sourceId ──────────────

router.delete('/:sourceId', async (req, res, next) => {
  try {
    const { showroomId, sourceId } = req.params;

    // Load the record to get section_key for cache eviction
    const { rows: existing } = await pool.query(
      'SELECT id, section_key FROM external_data_sources WHERE id = $1 AND showroom_id = $2',
      [sourceId, showroomId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'External data source not found' });
    }

    const { section_key } = existing[0];

    // Delete record — DB cascade handles field_mappings and health_records
    await pool.query(
      'DELETE FROM external_data_sources WHERE id = $1 AND showroom_id = $2',
      [sourceId, showroomId]
    );

    // Evict Redis cache key
    const redis = getRedis();
    const cacheKey = buildCacheKey(showroomId, section_key);
    try {
      await redis.del(cacheKey);
    } catch (redisErr) {
      // Cache eviction failure is non-fatal — log and continue
      const logger = require('../lib/logger');
      logger.warn({ err: redisErr.message, cacheKey }, 'externalSources: failed to evict cache key on delete');
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/showrooms/:showroomId/external-sources/:sourceId/mappings ─────────

router.get('/:sourceId/mappings', async (req, res, next) => {
  try {
    const { showroomId, sourceId } = req.params;

    // Verify source belongs to this showroom
    const { rows: source } = await pool.query(
      'SELECT id FROM external_data_sources WHERE id = $1 AND showroom_id = $2',
      [sourceId, showroomId]
    );

    if (source.length === 0) {
      return res.status(404).json({ error: 'External data source not found' });
    }

    const { rows } = await pool.query(
      `SELECT id, source_id, source_path, target_field, created_at, updated_at
       FROM field_mappings
       WHERE source_id = $1
       ORDER BY target_field ASC`,
      [sourceId]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/showrooms/:showroomId/external-sources/:sourceId/mappings ────────

router.post('/:sourceId/mappings', async (req, res, next) => {
  try {
    const { showroomId, sourceId } = req.params;
    const { source_path, target_field } = req.body;

    if (!source_path || !target_field) {
      return res.status(422).json({ error: 'validation_failed', detail: 'source_path and target_field are required' });
    }

    // Verify source belongs to this showroom
    const { rows: source } = await pool.query(
      'SELECT id FROM external_data_sources WHERE id = $1 AND showroom_id = $2',
      [sourceId, showroomId]
    );

    if (source.length === 0) {
      return res.status(404).json({ error: 'External data source not found' });
    }

    // Upsert — one mapping per target_field per source
    const { rows } = await pool.query(
      `INSERT INTO field_mappings (source_id, source_path, target_field)
       VALUES ($1, $2, $3)
       ON CONFLICT (source_id, target_field)
       DO UPDATE SET
         source_path = EXCLUDED.source_path,
         updated_at  = NOW()
       RETURNING id, source_id, source_path, target_field, created_at, updated_at`,
      [sourceId, source_path, target_field]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/showrooms/:showroomId/external-sources/:sourceId/mappings/:mappingId

router.delete('/:sourceId/mappings/:mappingId', async (req, res, next) => {
  try {
    const { showroomId, sourceId, mappingId } = req.params;

    // Verify source belongs to this showroom, and mapping belongs to source
    const { rows: existing } = await pool.query(
      `SELECT fm.id
       FROM field_mappings fm
       JOIN external_data_sources eds ON fm.source_id = eds.id
       WHERE fm.id = $1
         AND fm.source_id = $2
         AND eds.showroom_id = $3`,
      [mappingId, sourceId, showroomId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Field mapping not found' });
    }

    await pool.query('DELETE FROM field_mappings WHERE id = $1', [mappingId]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/showrooms/:showroomId/external-sources/:sourceId/refresh ─────────

router.post('/:sourceId/refresh', async (req, res, next) => {
  try {
    const { showroomId, sourceId } = req.params;

    // Load source to get section_key
    const { rows: source } = await pool.query(
      'SELECT id, section_key FROM external_data_sources WHERE id = $1 AND showroom_id = $2',
      [sourceId, showroomId]
    );

    if (source.length === 0) {
      return res.status(404).json({ error: 'External data source not found' });
    }

    const { section_key } = source[0];

    // Delete Redis cache key `proxy:{showroomId}:{sectionKey}`
    const redis = getRedis();
    const cacheKey = buildCacheKey(showroomId, section_key);
    try {
      await redis.del(cacheKey);
    } catch (redisErr) {
      const logger = require('../lib/logger');
      logger.warn({ err: redisErr.message, cacheKey }, 'externalSources: failed to evict cache key on refresh');
    }

    res.json({ success: true, cache_key: cacheKey });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
