'use strict';

/**
 * proxy.js — Public Proxy Route
 *
 * GET /api/proxy/:showroomId/:sectionKey
 *
 * This is a public endpoint — NO auth middleware.
 * It delegates all business logic to the Proxy Gateway Service (fetchSection).
 *
 * Response mapping:
 *   rateLimited    → 429 + Retry-After: 60 + { error: "rate_limit_exceeded" }
 *   upstreamError  → 502 + { error: "upstream_error", status: <status> }
 *   timeout        → 504 + { error: "upstream_timeout" }
 *   mappingFailed  → 500 + { error: "mapping_failed" }
 *   ssrfBlocked    → 502 + { error: "upstream_blocked" }
 *   array          → 200 + array body (including empty array)
 *
 * Requirements: 4.1, 4.8, 4.9, 5.2, 9.1, 9.4
 */

const express = require('express');
const router = express.Router();

const pool = require('../db/pool');
const { getRedis } = require('../lib/redis');
const { fetchSection } = require('../services/proxyGateway');

/**
 * GET /api/proxy/:showroomId/:sectionKey
 *
 * Public endpoint — no authentication required.
 * Retrieves (possibly cached) mapped section data for a showroom.
 */
router.get('/:showroomId/:sectionKey', async (req, res) => {
  const { showroomId, sectionKey } = req.params;

  // Determine caller IP — respect X-Forwarded-For for proxied environments,
  // fall back to req.ip (set by Express when trust proxy is configured).
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.ip ||
    '0.0.0.0';

  const redis = getRedis();

  let result;
  try {
    result = await fetchSection(pool, redis, { showroomId, sectionKey, ip });
  } catch (err) {
    // Unexpected error in the gateway — surface as 502 to avoid leaking internals.
    return res.status(502).json({ error: 'upstream_error', status: null });
  }

  // ── Map fetchSection return value to HTTP responses ───────────────────────

  // Array (including empty []) → 200
  if (Array.isArray(result)) {
    return res.status(200).json(result);
  }

  // Rate limited — only fires when the per-IP quota is actually exceeded
  if (result.rateLimited === true) {
    res.set('Retry-After', '60');
    return res.status(429).json({ error: 'rate_limit_exceeded' });
  }

  // SSRF blocked at fetch time
  if (result.ssrfBlocked === true) {
    return res.status(502).json({ error: 'upstream_blocked' });
  }

  // Upstream returned 4xx / 5xx
  if (result.upstreamError === true) {
    return res.status(502).json({ error: 'upstream_error', status: result.status ?? null });
  }

  // Outbound request timed out
  if (result.timeout === true) {
    return res.status(504).json({ error: 'upstream_timeout' });
  }

  // Field mapping application failed
  if (result.mappingFailed === true) {
    return res.status(500).json({ error: 'mapping_failed' });
  }

  // Unknown result shape — safe fallback
  return res.status(502).json({ error: 'upstream_error', status: null });
});

module.exports = router;
