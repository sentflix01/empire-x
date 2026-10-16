/**
 * lib/subscriptionPlans.ts — Business subscription tier definitions
 *
 * Three tiers:
 *   freemium  — free, default for all businesses
 *   normal    — ETB 100 or USD $1/month
 *   premium   — ETB 500 or USD $5/month
 *   pro       — ETB 1,000 or USD $10/month
 *
 * Stripe price IDs are read from environment variables so they can differ
 * between test and live modes and billing currencies without code changes.
 *
 * Files touched: backend/lib/subscriptionPlans.ts (this file)
 * Used by: backend/middleware/tierLimit.ts, backend/routes/subscriptions.ts
 */

export type Tier = 'freemium' | 'normal' | 'premium' | 'pro';
export type BillingCurrency = 'ETB' | 'USD';

export const BILLING_CURRENCIES: BillingCurrency[] = ['ETB', 'USD'];

export type TierFeature =
  | 'bulk_import'             // premium+  — CSV/JSON product import
  | 'live_location_tracking'  // pro only  — GPS broadcast for ride/delivery
  | 'webhooks'                // premium+  — outbound webhook endpoints
  | 'api_keys'                // premium+  — programmatic data access
  | 'analytics'               // premium+  — full business analytics dashboard
  | 'builder_premium'         // premium+  — premium showroom sections
  | 'builder_pro'             // pro only  — enterprise showroom sections
  | 'external_data_sources';  // premium+  — showroom sections fed by the owner's API

/** Minimum tiers that satisfy each feature requirement */
export const FEATURE_MIN_TIER: Record<TierFeature, Tier[]> = {
  bulk_import:              ['premium', 'pro'],
  live_location_tracking:   ['pro'],
  webhooks:                 ['premium', 'pro'],
  api_keys:                 ['premium', 'pro'],
  analytics:                ['premium', 'pro'],
  builder_premium:          ['premium', 'pro'],
  builder_pro:              ['pro'],
  external_data_sources:    ['premium', 'pro'],
};

/** Ordered tier levels — higher index = higher tier */
export const TIER_ORDER: Tier[] = ['freemium', 'normal', 'premium', 'pro'];

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
  normal:   { maxSections: 5,        maxShowrooms: 1, maxProducts: 50,     maxStorageGB: 5    },
  premium:  { maxSections: 25,       maxShowrooms: 3, maxProducts: 10_000, maxStorageGB: 50   },
  pro:      { maxSections: Infinity, maxShowrooms: Infinity, maxProducts: Infinity, maxStorageGB: 500 },
};

// ── Stripe plan definitions ───────────────────────────────────────────────────

export interface PlanDefinition {
  tier: Tier;
  stripePriceIds: Record<BillingCurrency, string>;
  interval: 'month' | 'year';
  label: string;
  prices: Record<BillingCurrency, number>;
  features: string[];
}

export interface StripePriceForPlan {
  active: boolean;
  currency: string;
  unit_amount: number | null;
  recurring?: {
    interval: string;
    interval_count?: number | null;
  } | null;
}

export function isBillingCurrency(value: unknown): value is BillingCurrency {
  return value === 'ETB' || value === 'USD';
}

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLANS, value);
}

export function matchesPlanStripePrice(
  plan: PlanDefinition,
  currency: BillingCurrency,
  stripePrice: StripePriceForPlan,
): boolean {
  return stripePrice.active
    && stripePrice.currency === currency.toLowerCase()
    && stripePrice.unit_amount === plan.prices[currency] * 100
    && stripePrice.recurring?.interval === 'month'
    && stripePrice.recurring.interval_count === 1;
}

export function getPublicPlan(plan: PlanDefinition) {
  return {
    tier: plan.tier,
    interval: plan.interval,
    label: plan.label,
    prices: plan.prices,
    currencyAvailability: {
      ETB: Boolean(plan.stripePriceIds.ETB),
      USD: Boolean(plan.stripePriceIds.USD),
    },
    features: plan.features,
    limits: TIER_LIMITS[plan.tier],
  };
}

export const PLANS = {
  normal_monthly: {
    tier: 'normal' as Tier,
    stripePriceIds: {
      ETB: process.env.STRIPE_PRICE_NORMAL_MONTHLY_ETB ?? '',
      USD: process.env.STRIPE_PRICE_NORMAL_MONTHLY_USD ?? '',
    },
    interval: 'month' as const,
    label: 'Normal',
    prices: { ETB: 100, USD: 1 },
    features: [
      'Business website publishing',
      '1 showroom',
      'Up to 5 website sections',
      'Up to 50 products',
      '5GB storage',
    ],
  },
  premium_monthly: {
    tier: 'premium' as Tier,
    stripePriceIds: {
      ETB: process.env.STRIPE_PRICE_PREMIUM_MONTHLY_ETB ?? '',
      USD: process.env.STRIPE_PRICE_PREMIUM_MONTHLY_USD ?? '',
    },
    interval: 'month' as const,
    label: 'Premium',
    prices: { ETB: 500, USD: 5 },
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
    stripePriceIds: {
      ETB: process.env.STRIPE_PRICE_PRO_MONTHLY_ETB ?? '',
      USD: process.env.STRIPE_PRICE_PRO_MONTHLY_USD ?? '',
    },
    interval: 'month' as const,
    label: 'Pro',
    prices: { ETB: 1_000, USD: 10 },
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

export const ENTERPRISE_PLAN = {
  tier: 'pro' as Tier,
  label: 'Enterprise',
  prices: { ETB: null, USD: null },
  pricingCurrencies: BILLING_CURRENCIES,
  contactRequired: true,
  features: ['Custom pricing in ETB or USD', 'Custom plan and service terms'],
};

export type PlanKey = keyof typeof PLANS;
