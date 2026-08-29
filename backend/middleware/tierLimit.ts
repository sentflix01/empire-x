/**
 * middleware/tierLimit.ts — Subscription tier enforcement
 *
 * Usage:
 *   router.post('/bulk-import', requireAuth, checkTierLimit('bulk_import'), handler)
 *
 * How it works:
 *   1. Looks up the caller's business_id from req.user.id (via businesses table)
 *   2. Reads sub:{business_id} from Redis (TTL 300s)
 *   3. On cache miss: queries business_subscriptions; writes to Redis
 *   4. If no row exists: treats as freemium (backward compatible)
 *   5. Checks tier against FEATURE_MIN_TIER[feature]
 *   6. Returns 403 { error: 'upgrade_required', currentTier, requiredTier, feature }
 *      or calls next()
 *
 * Files touched:
 *   backend/middleware/tierLimit.ts     (this file)
 *   backend/lib/subscriptionPlans.ts    (tier/feature constants)
 *   backend/lib/redis.ts                (cache layer)
 *   backend/db/pool.ts                  (DB lookup)
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Redis as RedisClient } from 'ioredis';
import pool from '../db/pool';
import { getRedis } from '../lib/redis';
import logger from '../lib/logger';
import {
  type Tier,
  type TierFeature,
  FEATURE_MIN_TIER,
  tierMeetsRequirement,
} from '../lib/subscriptionPlans';

const CACHE_TTL = 300; // 5 minutes

interface CachedSub {
  tier: Tier;
  status: string;
  expiresAt: string | null;
}

async function getBusinessId(userId: string): Promise<string | null> {
  const { rows } = await pool.query(
    'SELECT id FROM businesses WHERE owner_id = $1 LIMIT 1',
    [userId],
  );
  return rows[0]?.id ?? null;
}

async function getTierForBusiness(businessId: string): Promise<CachedSub> {
  const redis = getRedis();
  const key = `sub:${businessId}`;

  // Try Redis cache first
  if (!redis.isNoOp) {
    try {
      const cached = await (redis as RedisClient).get(key);
      if (cached) return JSON.parse(cached) as CachedSub;
    } catch {
      // fall through to DB
    }
  }

  // Query DB
  const { rows } = await pool.query(
    `SELECT tier, status, current_period_end
     FROM business_subscriptions
     WHERE business_id = $1
     LIMIT 1`,
    [businessId],
  );

  const result: CachedSub = rows.length
    ? {
        tier: (rows[0].tier as Tier) ?? 'freemium',
        status: rows[0].status ?? 'active',
        expiresAt: rows[0].current_period_end ?? null,
      }
    : { tier: 'freemium', status: 'active', expiresAt: null };

  // Write to Redis cache
  if (!redis.isNoOp) {
    try {
      await (redis as RedisClient).setex(key, CACHE_TTL, JSON.stringify(result));
    } catch {
      // non-fatal
    }
  }

  return result;
}

/**
 * Invalidate the cached subscription tier for a business.
 * Call this after any subscription change (upgrade, cancel, webhook).
 */
export async function invalidateSubCache(businessId: string): Promise<void> {
  const redis = getRedis();
  if (redis.isNoOp) return;
  try {
    await (redis as RedisClient).del(`sub:${businessId}`);
  } catch { /* non-fatal */ }
}

/**
 * Express middleware factory that gates a route behind a minimum subscription tier.
 */
export function checkTierLimit(feature: TierFeature): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const businessId = await getBusinessId(req.user.id);
      if (!businessId) {
        // No business — default to freemium check
        const required = FEATURE_MIN_TIER[feature];
        if (!tierMeetsRequirement('freemium', required)) {
          res.status(403).json({
            error: 'upgrade_required',
            currentTier: 'freemium',
            requiredTier: required[0],
            feature,
          });
          return;
        }
        next();
        return;
      }

      // Attach businessId to request for downstream handlers
      (req as Request & { businessId?: string }).businessId = businessId;

      const sub = await getTierForBusiness(businessId);
      const required = FEATURE_MIN_TIER[feature];

      if (!tierMeetsRequirement(sub.tier, required)) {
        res.status(403).json({
          error: 'upgrade_required',
          currentTier: sub.tier,
          requiredTier: required[0],
          feature,
        });
        return;
      }

      next();
    } catch (err) {
      logger.error({ err: (err as Error).message, feature }, 'tierLimit check failed');
      // Fail safe — default to most restrictive
      res.status(403).json({
        error: 'upgrade_required',
        currentTier: 'freemium',
        requiredTier: FEATURE_MIN_TIER[feature][0],
        feature,
      });
    }
  };
}
