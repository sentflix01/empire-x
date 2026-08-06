/**
 * featureFlags.js — Simple feature flag system
 *
 * Flags can be:
 *   1. Hardcoded defaults (always on/off)
 *   2. Overridden via environment variables: FF_<FLAG_NAME>=true|false
 *   3. Stored in Redis for real-time updates (when Redis is available)
 *   4. Percentage rollouts (e.g. 10% of users see new feed algorithm)
 *
 * Usage:
 *   const { isEnabled } = require('./lib/featureFlags');
 *   if (await isEnabled('personalized_feed', userId)) { ... }
 *
 * Set flags via env:
 *   FF_PERSONALIZED_FEED=true
 *   FF_VIDEO_POSTS=false
 */
const logger = require('./logger');
const { getRedis } = require('./redis');

// ── Default flag definitions ──────────────────────────────────────────────────
// rollout: 0–100 (percentage of users who see this feature)
// enabled: true = on for everyone, false = off for everyone
const DEFAULT_FLAGS = {
  personalized_feed:       { enabled: false, rollout: 0,   description: 'Ranked feed algorithm instead of chronological' },
  video_posts:             { enabled: false, rollout: 0,   description: 'Allow video uploads in posts' },
  chapa_payments:          { enabled: false, rollout: 0,   description: 'Chapa local payment integration' },
  stripe_payments:         { enabled: true,  rollout: 100, description: 'Stripe hosted checkout (cards, wallets, local methods via automatic payment methods)' },
  promoted_posts:          { enabled: false, rollout: 0,   description: 'Promoted posts / ads system' },
  community_groups:        { enabled: false, rollout: 0,   description: 'Community groups feature' },
  ai_description_gen:      { enabled: true,  rollout: 100, description: 'AI product description generator' },
  ai_chat:                 { enabled: true,  rollout: 100, description: 'AI chat assistant' },
  map_clustering:          { enabled: true,  rollout: 100, description: 'Map pin clustering' },
  delivery_tracking:       { enabled: true,  rollout: 100, description: 'Delivery timeline tracking' },
  return_requests:         { enabled: true,  rollout: 100, description: 'Return & refund requests' },
  invoice_generator:       { enabled: true,  rollout: 100, description: 'PDF invoice generation' },
  low_stock_alerts:        { enabled: true,  rollout: 100, description: 'Low stock notifications for sellers' },
  nearby_product_search:   { enabled: true,  rollout: 100, description: 'Product/shop search on Nearby map' },
  profile_peek:            { enabled: true,  rollout: 100, description: 'Profile peek modal on map markers' },
  business_hours:          { enabled: false, rollout: 0,   description: 'Business hours + appointment booking' },
  two_factor_auth:         { enabled: false, rollout: 0,   description: '2FA authentication' },
  swipe_feed:              { enabled: false, rollout: 0,   description: 'TikTok-style swipe feed' },
  virtual_gifts:           { enabled: false, rollout: 0,   description: 'Virtual gifting on posts' },
  live_streaming:          { enabled: false, rollout: 0,   description: 'Live streaming' },
};

/**
 * Check if a flag is enabled for a given user.
 * Falls back to env vars, then defaults.
 */
async function isEnabled(flagName, userId = null) {
  // 1. Environment variable override (highest priority)
  const envKey = `FF_${flagName.toUpperCase()}`;
  if (process.env[envKey] !== undefined) {
    return process.env[envKey] === 'true' || process.env[envKey] === '1';
  }

  // 2. Redis override (real-time flag updates)
  const redis = getRedis();
  if (!redis.isNoOp) {
    try {
      const cached = await redis.get(`ff:${flagName}`);
      if (cached !== null) {
        const flag = JSON.parse(cached);
        return evaluateFlag(flag, userId);
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Feature flag Redis read failed');
    }
  }

  // 3. Default
  const flag = DEFAULT_FLAGS[flagName];
  if (!flag) {
    logger.warn({ flagName }, 'Unknown feature flag — defaulting to false');
    return false;
  }

  return evaluateFlag(flag, userId);
}

/**
 * Evaluate a flag against a user (percentage rollout logic).
 */
function evaluateFlag(flag, userId) {
  if (!flag.enabled) return false;
  if (flag.rollout >= 100) return true;
  if (flag.rollout <= 0) return false;
  if (!userId) return false;

  // Deterministic percentage rollout based on user ID hash
  const hash = simpleHash(String(userId));
  const bucket = hash % 100;
  return bucket < flag.rollout;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get all flags (for admin panel display).
 */
async function getAllFlags() {
  const result = {};
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

/**
 * Set a flag in Redis for real-time updates.
 */
async function setFlag(flagName, enabled, rollout = null) {
  const redis = getRedis();
  if (redis.isNoOp) {
    logger.warn('Cannot set flag — Redis not configured');
    return false;
  }
  const current = DEFAULT_FLAGS[flagName] || {};
  const updated = { ...current, enabled, rollout: rollout ?? current.rollout };
  await redis.setex(`ff:${flagName}`, 3600, JSON.stringify(updated));
  logger.info({ flagName, enabled, rollout }, 'Feature flag updated');
  return true;
}

module.exports = { isEnabled, getAllFlags, setFlag };
