/**
 * routes/businessApiKeys.ts — Business API key management
 *
 * Endpoints:
 *   GET    /api/business-api-keys       — list keys (masked, requires premium+)
 *   POST   /api/business-api-keys       — create key (requires premium+)
 *   DELETE /api/business-api-keys/:id   — revoke key
 *
 * Security:
 *   - Keys are 32-byte random hex (256 bits)
 *   - Stored as SHA-256 hash (key_hash) — plaintext never stored
 *   - First 8 chars stored as key_prefix for identification
 *   - Plaintext returned ONLY on creation response
 *
 * Files touched:
 *   backend/routes/businessApiKeys.ts     (this file)
 *   backend/db/migrate37.js               (business_api_keys table)
 *   backend/middleware/tierLimit.ts       (checkTierLimit middleware)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import pool from '../db/pool';
import logger from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import { checkTierLimit } from '../middleware/tierLimit';

const router = Router();

// ── Helper: get business_id for authenticated user ─────────────────────────────
async function getBusinessId(userId: string): Promise<string | null> {
  const { rows } = await pool.query(
    'SELECT id FROM businesses WHERE owner_id = $1 LIMIT 1',
    [userId],
  );
  return rows[0]?.id ?? null;
}

// ── GET /api/business-api-keys — List API keys (masked) ───────────────────────
// Requires: premium+ tier (checkTierLimit('api_keys'))
router.get('/', requireAuth, checkTierLimit('api_keys'), async (req: Request, res: Response) => {
  try {
    const businessId = (req as Request & { businessId?: string }).businessId!;
    const { rows } = await pool.query(
      `SELECT id, name, key_prefix, last_used_at, is_active, created_at
       FROM business_api_keys
       WHERE business_id = $1 AND is_active = TRUE
       ORDER BY created_at DESC`,
      [businessId],
    );
    // key_hash is NEVER returned
    res.json({ apiKeys: rows });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'GET /business-api-keys failed');
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/**
 * POST /api/business-api-keys — Create a new API key
 * Requires: premium+ tier (checkTierLimit('api_keys'))
 * Body: { name: string }
 * Returns: { id, name, key_prefix, key (plaintext - ONLY ONCE), created_at }
 * The plaintext key is returned ONLY ONCE in the creation response.
 * The key_hash (SHA-256) is stored; plaintext is NEVER stored.
 */
router.post('/', requireAuth, checkTierLimit('api_keys'), async (req: Request, res: Response) => {
  try {
    const businessId = (req as Request & { businessId?: string }).businessId!;
    const { name } = req.body as { name?: string };

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Key name is required' });
      return;
    }

    // Generate a secure 32-byte (256-bit) random key
    const rawKey = crypto.randomBytes(32).toString('hex'); // 64 hex chars = 256 bits
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8); // First 8 chars for display

    const { rows } = await pool.query(
      `INSERT INTO business_api_keys (business_id, name, key_hash, key_prefix, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, name, key_prefix, last_used_at, is_active, created_at`,
      [businessId, name.trim(), keyHash, keyPrefix],
    );

    const apiKey = rows[0];
    // Return the plaintext key ONLY ONCE in the creation response
    res.status(201).json({
      ...apiKey,
      key: rawKey, // Only returned once!
      warning: 'This is the only time the full API key will be shown. Store it securely.',
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'POST /business-api-keys failed');
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * DELETE /api/business-api-keys/:id — Revoke (soft delete) an API key
 * Requires: ownership (auth + business_id match)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    // Ownership comes from the caller's businesses, not checkTierLimit's
    // req.businessId, so a key can always be revoked, even after a downgrade.
    // business_api_keys has no updated_at column (migrate37).
    const { rowCount } = await pool.query(
      `UPDATE business_api_keys SET is_active = FALSE
       WHERE id = $1 AND is_active = TRUE
         AND business_id IN (SELECT id FROM businesses WHERE owner_id = $2)`,
      [req.params.id, req.user!.id],
    );

    if (rowCount === 0) {
      res.status(404).json({ error: 'API key not found or already revoked' });
      return;
    }

    res.json({ success: true, message: 'API key revoked' });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'DELETE /business-api-keys/:id failed');
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * Internal helper: Validate an API key and return the associated business_id.
 * Used by API key authentication middleware (to be implemented separately).
 * Returns the business_id if valid and active, null otherwise.
 */
export async function validateApiKey(rawKey: string): Promise<string | null> {
  if (!rawKey || rawKey.length !== 64) return null;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { rows } = await pool.query(
    `SELECT business_id FROM business_api_keys WHERE key_hash = $1 AND is_active = TRUE`,
    [keyHash],
  );
  return rows[0]?.business_id ?? null;
}

module.exports = router;