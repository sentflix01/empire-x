/**
 * lib/featureFlags.ts — Runtime feature flag system
 *
 * Priority:
 *   1. Env var  FF_<FLAG_NAME>=true|false   (highest)
 *   2. Redis    ff:<flag_name>               (real-time admin updates)
 *   3. Hardcoded defaults
 *
 * Supports percentage rollouts keyed on userId (deterministic hash).
 *
 * Usage:
 *   import { isEnabled } from './lib/featureFlags';
 *   if (await isEnabled('stripe_payments', userId)) { ... }
 */
import logger from './logger';
import { getRedis } from './redis';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FlagDefinition {
  enabled: boolean;
  rollout: number;      // 0–100 percentage
  description: string;
}

export interface FlagStatus extends FlagDefinition {
  env_override: boolean | null;
  effective: boolean;
}

type FlagName = keyof typeof DEFAULT_FLAGS;

// ── Hardcoded defaults ────────────────────────────────────────────────────────

const DEFAULT_FLAGS = {
  personalized_feed:     { enabled: false, rollout: 0,   description: 'Ranked feed algorithm instead of chronological' },
  video_posts:           { enabled: false, rollout: 0,   description: 'Allow video uploads in posts' },
  chapa_payments:        { enabled: false, rollout: 0,   description: 'Chapa local payment integration (ETH)' },
  stripe_payments:       { enabled: true,  rollout: 100, description: 'Stripe hosted checkout (automatic payment methods)' },
  promoted_posts:        { enabled: false, rollout: 0,   description: 'Promoted posts / ads system' },
  community_groups:      { enabled: false, rollout: 0,   description: 'Community groups feature' },
  ai_description_gen:    { enabled: true,  rollout: 100, description: 'AI product description generator' },
  ai_chat:               { enabled: true,  rollout: 100, description: 'AI chat assistant' },
  page_guided_tours:     { enabled: false, rollout: 0,   description: 'Interactive page-by-page onboarding tours' },
  map_clustering:        { enabled: true,  rollout: 100, description: 'Map pin clustering' },
  delivery_tracking:     { enabled: true,  rollout: 100, description: 'Delivery timeline tracking' },
  return_requests:       { enabled: true,  rollout: 100, description: 'Return and refund requests' },
  invoice_generator:     { enabled: true,  rollout: 100, description: 'PDF invoice generation' },
  low_stock_alerts:      { enabled: true,  rollout: 100, description: 'Low stock notifications for sellers' },
  nearby_product_search: { enabled: true,  rollout: 100, description: 'Product/shop search on Nearby map' },
  profile_peek:          { enabled: true,  rollout: 100, description: 'Profile peek modal on map markers' },
  business_hours:        { enabled: false, rollout: 0,   description: 'Business hours and appointment booking' },
  two_factor_auth:       { enabled: false, rollout: 0,   description: 'TOTP two-factor authentication' },
  swipe_feed:            { enabled: false, rollout: 0,   description: 'TikTok-style swipe feed' },
  virtual_gifts:         { enabled: false, rollout: 0,   description: 'Virtual gifting on posts' },
  live_streaming:        { enabled: false, rollout: 0,   description: 'Live streaming via Agora/LiveKit' },
} as const satisfies Record<string, FlagDefinition>;

// ── In-process flag cache ─────────────────────────────────────────────────────
// Flag definitions change very rarely (only via setFlag() or a redeploy).
// Cache them in-process for 60s to avoid a Redis GET on every isEnabled() call.
// setFlag() busts this cache so real-time admin updates still propagate quickly.

const FLAG_LOCAL_TTL = 60_000; // ms
const localFlagCache = new Map<string, { flag: FlagDefinition; expiresAt: number }>();

function localFlagGet(flagName: string): FlagDefinition | undefined {
  const entry = localFlagCache.get(flagName);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { localFlagCache.delete(flagName); return undefined; }
  return entry.flag;
}

function localFlagSet(flagName: string, flag: FlagDefinition): void {
  localFlagCache.set(flagName, { flag, expiresAt: Date.now() + FLAG_LOCAL_TTL });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function evaluateFlag(flag: FlagDefinition, userId: string | null): boolean {
  if (!flag.enabled) return false;
  if (flag.rollout >= 100) return true;
  if (flag.rollout <= 0) return false;
  if (!userId) return false;
  return (simpleHash(userId) % 100) < flag.rollout;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check if a feature flag is enabled for the given user.
 * userId is used for percentage rollouts — pass null for anonymous checks.
 *
 * Priority:
 *   1. Env var  FF_<FLAG_NAME>=true|false   (zero Redis commands)
 *   2. In-process cache (60s TTL)           (zero Redis commands on cache hit)
 *   3. Redis    ff:<flag_name>              (real-time admin updates)
 *   4. Hardcoded defaults
 */
export async function isEnabled(flagName: string, userId: string | null = null): Promise<boolean> {
  // 1. Env var override (highest priority, zero Redis)
  const envKey = `FF_${flagName.toUpperCase()}`;
  if (process.env[envKey] !== undefined) {
    return process.env[envKey] === 'true' || process.env[envKey] === '1';
  }

  // 2. In-process cache (avoids a Redis round-trip on every call)
  const localFlag = localFlagGet(flagName);
  if (localFlag !== undefined) {
    return evaluateFlag(localFlag, userId);
  }

  // 3. Redis override (real-time; only reached on cache miss ~once per 60s)
  const redis = getRedis();
  if (!redis.isNoOp) {
    try {
      const cached = await (redis as import('ioredis').default).get(`ff:${flagName}`);
      if (cached !== null) {
        const flag = JSON.parse(cached) as FlagDefinition;
        localFlagSet(flagName, flag);
        return evaluateFlag(flag, userId);
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Feature flag Redis read failed');
    }
  }

  // 4. Hardcoded defaults
  const flag = (DEFAULT_FLAGS as Record<string, FlagDefinition>)[flagName];
  if (!flag) {
    logger.warn({ flagName }, 'Unknown feature flag — defaulting to false');
    return false;
  }
  // Cache the hardcoded default too so repeated calls don't fall through every time
  localFlagSet(flagName, flag);
  return evaluateFlag(flag, userId);
}

/** Returns all flags with their effective values — used by admin panel. */
export async function getAllFlags(): Promise<Record<string, FlagStatus>> {
  const result: Record<string, FlagStatus> = {};
  for (const [name, defaults] of Object.entries(DEFAULT_FLAGS)) {
    const envKey = `FF_${name.toUpperCase()}`;
    const envOverride = process.env[envKey];
    result[name] = {
      ...defaults,
      env_override: envOverride !== undefined ? envOverride === 'true' : null,
      effective: envOverride !== undefined ? envOverride === 'true' : defaults.enabled,
    };
  }
  return result;
}

/** Update a flag in Redis for real-time changes without a redeploy. */
export async function setFlag(
  flagName: string,
  enabled: boolean,
  rollout: number | null = null,
): Promise<boolean> {
  const redis = getRedis();
  if (redis.isNoOp) {
    logger.warn('Cannot set flag — Redis not configured');
    return false;
  }
  const current = (DEFAULT_FLAGS as Record<string, FlagDefinition>)[flagName] ?? {};
  const updated: FlagDefinition = {
    ...(current as FlagDefinition),
    enabled,
    rollout: rollout ?? (current as FlagDefinition).rollout ?? 0,
    description: (current as FlagDefinition).description ?? '',
  };
  await (redis as import('ioredis').default).setex(`ff:${flagName}`, 3600, JSON.stringify(updated));
  // Bust the in-process cache so the new value takes effect immediately on this pod
  localFlagCache.delete(flagName);
  logger.info({ flagName, enabled, rollout }, 'Feature flag updated');
  return true;
}

module.exports = { isEnabled, getAllFlags, setFlag };
