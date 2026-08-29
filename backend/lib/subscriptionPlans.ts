/**
 * lib/subscriptionPlans.ts — Business subscription tier definitions
 *
 * Three tiers:
 *   freemium  — free, default for all businesses
 *   premium   — $12/month (Pro); unlocks inventory catalog, booking, analytics
 *   pro       — $49/month (Enterprise); adds live location, webhooks, API keys
 *
 * Stripe price IDs are read from environment variables so they can differ
 * between test and live modes without code changes.
 *
 * Files touched: backend/lib/subscriptionPlans.ts (this file)
 * Used by: backend/middleware/tierLimit.ts, backend/routes/subscriptions.ts
 */

export type Tier = 'freemium' | 'premium' | 'pro';

export type TierFeature =
  | 'bulk_import'             // premium+  — CSV/JSON product import
  | 'live_location_tracking'  // pro only  — GPS broadcast for ride/delivery
  | 'webhooks'                // premium+  — outbound webhook endpoints
  | 'api_keys'                // premium+  — programmatic data access
  | 'analytics'               // premium+  — full business analytics dashboard
  | 'builder_premium'         // premium+  — premium showroom sections
  | 'builder_pro';            // pro only  — enterprise showroom sections

/** Minimum tiers that satisfy each feature requirement */
export const FEATURE_MIN_TIER: Record<TierFeature, Tier[]> = {
  bulk_import:              ['premium', 'pro'],
  live_location_tracking:   ['pro'],
  webhooks:                 ['premium', 'pro'],
  api_keys:                 ['premium', 'pro'],
  analytics:                ['premium', 'pro'],
  builder_premium:          ['premium', 'pro'],
  builder_pro:              ['pro'],
};

/** Ordered tier levels — higher index = higher tier */
export const TIER_ORDER: Tier[] = ['freemium', 'premium', 'pro'];

export function tierMeetsRequirement(current: Tier, required: Tier[]): boolean {
  return required.includes(current);
}

// ── Per-tier hard limits ──────────────────────────────────────────────────────

export interface TierLimits {
  maxSections:  number;
  maxShowrooms: number;
  maxProducts:  number;
  maxStorageGB: number;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  freemium: { maxSections: 5,        maxShowrooms: 1, maxProducts: 50,     maxStorageGB: 5    },
  premium:  { maxSections: 25,       maxShowrooms: 3, maxProducts: 10_000, maxStorageGB: 50   },
  pro:      { maxSections: Infinity, maxShowrooms: Infinity, maxProducts: Infinity, maxStorageGB: 500 },
};

// ── Stripe plan definitions ───────────────────────────────────────────────────

export interface PlanDefinition {
  tier: Tier;
  stripePriceId: string;
  interval: 'month' | 'year';
  label: string;
  priceUsd: number;
  priceEtb: number;
  features: string[];
}

export const PLANS = {
  premium_monthly: {
    tier: 'premium' as Tier,
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? '',
    interval: 'month' as const,
    label: 'Pro',
    priceUsd: 12,
    priceEtb: 650,
    features: [
      'Up to 25 builder sections',
      '3 showrooms',
      '10,000 products',
      '50GB storage',
      'Inventory catalog section',
      'Booking & appointments',
      'External API data sources',
      'Bulk CSV import',
      'Full analytics dashboard',
    ],
  },
  pro_monthly: {
    tier: 'pro' as Tier,
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    interval: 'month' as const,
    label: 'Enterprise',
    priceUsd: 49,
    priceEtb: 2_700,
    features: [
      'Unlimited sections, showrooms & products',
      '500GB storage',
      'Everything in Pro',
      'Live GPS location tracking',
      'Webhook outbound events',
      'Business API keys',
      'Custom domain support',
      'White-label option',
      'Priority support',
    ],
  },
} as const satisfies Record<string, PlanDefinition>;

export type PlanKey = keyof typeof PLANS;
