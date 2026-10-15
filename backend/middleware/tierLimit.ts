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

const CACHE_TTL = 300; // Redis TTL in seconds (5 minutes)
const LOCAL_TTL = 120_000; // In-process TTL in ms (2 minutes)

interface CachedSub {
  tier: Tier;
  status: string;
  expiresAt: string | null;
}

// ── In-process tier cache (per pod, zero Redis commands on hit) ───────────────
// Subscription tier changes very rarely (upgrade/cancel/webhook).
// A 2-minute in-process cache means at most 1 Redis GET per businessId per
// 2 minutes instead of 1 per authenticated request.

const localSubCache = new Map<string, { value: CachedSub; expiresAt: number }>();

function localSubGet(businessId: string): CachedSub | undefined {
  const entry = localSubCache.get(businessId);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { localSubCache.delete(businessId); return undefined; }
  return entry.value;
}

function localSubSet(businessId: string, value: CachedSub): void {
  localSubCache.set(businessId, { value, expiresAt: Date.now() + LOCAL_TTL });
}

// ── Business-id lookup cache (avoids repeated DB SELECTs for the same user) ──
// owner_id → business_id mapping never changes once a business is created.

const localBizCache = new Map<string, { id: string | null; expiresAt: number }>();
const BIZ_LOCAL_TTL = 300_000; // 5 minutes

async function getBusinessId(userId: string): Promise<string | null> {
  const cached = localBizCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.id;

  const { rows } = await pool.query(
    'SELECT id FROM businesses WHERE owner_id = $1 LIMIT 1',
    [userId],
  );
  const id = rows[0]?.id ?? null;
  localBizCache.set(userId, { id, expiresAt: Date.now() + BIZ_LOCAL_TTL });
  return id;
}

async function getTierForBusiness(businessId: string): Promise<CachedSub> {
  // 1. In-process cache (zero Redis commands)
  const localHit = localSubGet(businessId);
  if (localHit) return localHit;

  const redis = getRedis();
  const key = `sub:${businessId}`;

  // 2. Redis cache
  if (!redis.isNoOp) {
    try {
      const cached = await (redis as RedisClient).get(key);
      if (cached) {
        const result = JSON.parse(cached) as CachedSub;
        localSubSet(businessId, result);
        return result;
      }
    } catch {
      // fall through to DB
    }
  }

  // 3. Database
  const { rows } = await pool.query(
    `SELECT tier, status, current_period_end
     FROM business_subscriptions
     WHERE business_id = $1
     LIMIT 1`,
    [businessId],
  );

  const result: CachedSub = rows.length
    ? {
        tier: rows[0].current_period_end && new Date(rows[0].current_period_end).getTime() > Date.now()
          ? ((rows[0].tier as Tier) ?? 'freemium') : 'freemium',
        status: rows[0].status ?? 'active',
        expiresAt: rows[0].current_period_end ?? null,
      }
    : { tier: 'freemium', status: 'active', expiresAt: null };

  localSubSet(businessId, result);

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
  // Always bust in-process cache immediately so the next request gets fresh data
  localSubCache.delete(businessId);

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
