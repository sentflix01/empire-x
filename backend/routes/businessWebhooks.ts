/**
 * routes/businessWebhooks.ts — Business webhook management
 *
 * Endpoints:
 *   GET    /api/business-webhooks           — list webhooks (requires premium+)
 *   POST   /api/business-webhooks           — create webhook (requires premium+)
 *   PUT    /api/business-webhooks/:id       — update webhook
 *   DELETE /api/business-webhooks/:id       — delete webhook
 *
 * Security:
 *   - HMAC-SHA256 signing for payload verification
 *   - Secret generated server-side, never exposed after creation
 *   - Webhook delivery via BullMQ with exponential backoff retry
 *
 * Files touched:
 *   backend/routes/businessWebhooks.ts     (this file)
 *   backend/lib/queue.ts                   (webhookDeliveryQueue, usageRecalcQueue)
 *   backend/routes/subscriptions.ts        (usageRecalcQueue trigger)
 *   backend/db/migrate37.js                (business_webhooks table)
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import pool from '../db/pool';
import logger from '../lib/logger';
import { requireAuth } from '../middleware/auth';
import { checkTierLimit } from '../middleware/tierLimit';
import { queueWebhookDelivery, queueUsageRecalc } from '../lib/queue';
import { validateUrl } from '../services/ssrfValidator';

const router = Router();

// ── HMAC Helpers ────────────────────────────────────────────────────────────────

/**
 * Sign a webhook payload with HMAC-SHA256 using the webhook secret.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify a webhook signature against the payload and secret.
 */
export function verifyWebhookSignature(signature: string, payload: string, secret: string): boolean {
  const expected = signWebhookPayload(payload, secret);
  // Use timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ── Webhook CRUD ────────────────────────────────────────────────────────────────

/**
 * GET /api/business-webhooks — List all webhooks for the business
 * Requires: premium+ tier (checkTierLimit('webhooks'))
 */
router.get('/', requireAuth, checkTierLimit('webhooks'), async (req: Request, res: Response) => {
  try {
    const businessId = (req as Request & { businessId?: string }).businessId!;
    const { rows } = await pool.query(
      `SELECT id, url, events, is_enabled, created_at, updated_at
       FROM business_webhooks
       WHERE business_id = $1
       ORDER BY created_at DESC`,
      [businessId],
    );
    // Never return the secret in list responses
    res.json({ webhooks: rows });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'GET /business-webhooks failed');
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

/**
 * POST /api/business-webhooks — Create a new webhook endpoint
 * Requires: premium+ tier (checkTierLimit('webhooks'))
 * Body: { url: string, events: string[] }
 * Returns: { id, url, events, is_enabled, secret (only once), created_at }
 */
router.post('/', requireAuth, checkTierLimit('webhooks'), async (req: Request, res: Response) => {
  try {
    const businessId = (req as Request & { businessId?: string }).businessId!;
    const { url, events } = req.body as { url?: string; events?: string[] };

    const urlCheck = typeof url === 'string' && url.length <= 2048 ? await validateUrl(url) : { ok: false };
    if (!urlCheck.ok) {
      res.status(400).json({ error: 'Valid HTTPS URL is required' });
      return;
    }
    if (!events || !Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: 'At least one event type is required' });
      return;
    }

    // Validate event types
    const validEvents = [
      'order.created', 'order.updated', 'order.cancelled',
      'product.created', 'product.updated', 'product.deleted',
      'payment.completed', 'payment.failed', 'payment.refunded',
      'user.registered', 'user.updated',
      'showroom.published', 'showroom.updated',
      'inventory.low_stock', 'inventory.updated',
      'subscription.created', 'subscription.updated', 'subscription.cancelled',
    ];
    const invalidEvents = events.filter((e) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      res.status(400).json({ error: `Invalid event types: ${invalidEvents.join(', ')}` });
      return;
    }

    // Generate a secure random secret (32 bytes = 64 hex chars)
    const secret = crypto.randomBytes(32).toString('hex');

    const { rows } = await pool.query(
      `INSERT INTO business_webhooks (business_id, url, secret, events, is_enabled)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, url, events, is_enabled, created_at, updated_at`,
      [businessId, url, secret, events],
    );

    const webhook = rows[0];
    // Return secret ONLY on creation — never again
    res.status(201).json({ ...webhook, secret });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'POST /business-webhooks failed');
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

/**
 * PUT /api/business-webhooks/:id — Update a webhook endpoint
 * Requires: ownership (auth + business_id match)
 * Body: { url?, events?, is_enabled? }
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = (req as Request & { businessId?: string }).businessId!;
    const webhookId = req.params.id;
    const { url, events, is_enabled } = req.body as { url?: string; events?: string[]; is_enabled?: boolean };

    // Verify ownership
    const { rows: existing } = await pool.query(
      'SELECT id FROM business_webhooks WHERE id = $1 AND business_id = $2',
      [webhookId, businessId],
    );
    if (!existing.length) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    // Validate URL if provided
    if (url !== undefined) {
      const urlCheck = typeof url === 'string' && url.length <= 2048 ? await validateUrl(url) : { ok: false };
      if (!urlCheck.ok) {
        res.status(400).json({ error: 'Valid HTTPS URL is required' });
        return;
      }
    }

    // Validate events if provided
    if (events) {
      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({ error: 'At least one event type is required' });
        return;
      }
      const validEvents = [
        'order.created', 'order.updated', 'order.cancelled',
        'product.created', 'product.updated', 'product.deleted',
        'payment.completed', 'payment.failed', 'payment.refunded',
        'user.registered', 'user.updated',
        'showroom.published', 'showroom.updated',
        'inventory.low_stock', 'inventory.updated',
        'subscription.created', 'subscription.updated', 'subscription.cancelled',
      ];
      const invalidEvents = events.filter((e) => ![
        'order.created', 'order.updated', 'order.cancelled',
        'product.created', 'product.updated', 'product.deleted',
        'payment.completed', 'payment.failed', 'payment.refunded',
        'user.registered', 'user.updated',
        'showroom.published', 'showroom.updated',
        'inventory.low_stock', 'inventory.updated',
        'subscription.created', 'subscription.updated', 'subscription.cancelled',
      ].includes(e));
      if (invalidEvents.length > 0) {
        res.status(400).json({ error: `Invalid event types: ${invalidEvents.join(', ')}` });
        return;
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [webhookId, businessId];
    let paramIndex = 3;

    if (url !== undefined) {
      updates.push(`url = $${paramIndex++}`);
      values.push(url);
    }
    if (events !== undefined) {
      updates.push(`events = $${paramIndex++}`);
      values.push(events);
    }
    if (is_enabled !== undefined) {
      updates.push(`is_enabled = $${paramIndex++}`);
      values.push(is_enabled);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);

    const { rows } = await pool.query(
      `UPDATE business_webhooks SET ${updates.join(', ')} WHERE id = $1 AND business_id = $2 RETURNING id, url, events, is_enabled, created_at, updated_at`,
      values,
    );

    res.json(rows[0]);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'PUT /business-webhooks/:id failed');
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

/**
 * DELETE /api/business-webhooks/:id — Delete a webhook endpoint
 * Requires: ownership (auth + business_id match)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = (req as Request & { businessId?: string }).businessId!;
    const webhookId = req.params.id;

    const { rowCount } = await pool.query(
      'DELETE FROM business_webhooks WHERE id = $1 AND business_id = $2',
      [webhookId, businessId],
    );

    if (rowCount === 0) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'DELETE /business-webhooks/:id failed');
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

module.exports = router;
