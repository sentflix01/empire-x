import pool from '../db/pool';
import { BUILDER_SECTION_TIERS, businessTierMeetsRequirement, getBusinessSubscriptionAccess, getRequiredBusinessTier } from '../lib/businessSubscriptionPolicy';
import { getPublicPlan, isBillingCurrency, isPlanKey, matchesPlanStripePrice, PLANS } from '../lib/subscriptionPlans';
import { SECTION_TYPES } from '../../frontend-next/lib/builderSections';

jest.mock('../db/pool', () => ({ __esModule: true, default: { query: jest.fn() } }));

const query = pool.query as jest.Mock;

describe('business subscription access policy', () => {
  beforeEach(() => query.mockReset());

  const accessAt = async (periodEnd: Date | null) => {
    query.mockResolvedValue({ rows: [{
      owner_id: 'owner-1', tier: periodEnd ? 'normal' : null,
      status: periodEnd && periodEnd > new Date() ? 'active' : 'cancelled',
      current_period_end: periodEnd,
    }] });
    return getBusinessSubscriptionAccess('business-1');
  };

  it('allows a paid subscription until its period ends', async () => {
    const result = await accessAt(new Date(Date.now() + 60_000));
    expect(result).toMatchObject({ paid: true, hiddenFromPublic: false, blockedForOwner: false });
  });

  it('hides a site immediately when it has no paid period', async () => {
    const result = await accessAt(null);
    expect(result).toMatchObject({ paid: false, hiddenFromPublic: true, blockedForOwner: false });
  });

  it('keeps a site visible during the 24-hour grace window', async () => {
    const result = await accessAt(new Date(Date.now() - 23 * 60 * 60 * 1000));
    expect(result).toMatchObject({ paid: false, hiddenFromPublic: false, blockedForOwner: false });
  });

  it('hides after 24 hours and blocks owner access after three days', async () => {
    const after24h = await accessAt(new Date(Date.now() - 24 * 60 * 60 * 1000));
    expect(after24h).toMatchObject({ paid: false, hiddenFromPublic: true, blockedForOwner: false });

    const after3d = await accessAt(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
    expect(after3d).toMatchObject({ paid: false, hiddenFromPublic: true, blockedForOwner: true });
  });
});

describe('monthly business plans', () => {
  it('matches the agreed Normal, Premium, and Pro prices in both currencies', () => {
    expect(PLANS.normal_monthly.prices).toEqual({ ETB: 100, USD: 1 });
    expect(PLANS.premium_monthly.prices).toEqual({ ETB: 500, USD: 5 });
    expect(PLANS.pro_monthly.prices).toEqual({ ETB: 1000, USD: 10 });
    expect(Object.values(PLANS).every(plan => plan.interval === 'month')).toBe(true);
  });

  it('accepts only supported billing currencies and owned plan keys', () => {
    expect(isBillingCurrency('ETB')).toBe(true);
    expect(isBillingCurrency('USD')).toBe(true);
    expect(isBillingCurrency('EUR')).toBe(false);
    expect(isBillingCurrency(null)).toBe(false);
    expect(isPlanKey('normal_monthly')).toBe(true);
    expect(isPlanKey('toString')).toBe(false);
  });

  it('accepts Stripe prices only when active amount, currency, and monthly interval match', () => {
    const plan = PLANS.normal_monthly;
    const validEtbPrice = {
      active: true,
      currency: 'etb',
      unit_amount: 10_000,
      recurring: { interval: 'month', interval_count: 1 },
    };
    const validUsdPrice = {
      ...validEtbPrice,
      currency: 'usd',
      unit_amount: 100,
    };

    expect(matchesPlanStripePrice(plan, 'ETB', validEtbPrice)).toBe(true);
    expect(matchesPlanStripePrice(plan, 'USD', validUsdPrice)).toBe(true);
    expect(matchesPlanStripePrice(plan, 'USD', validEtbPrice)).toBe(false);
    expect(matchesPlanStripePrice(plan, 'ETB', { ...validEtbPrice, unit_amount: 1 })).toBe(false);
    expect(matchesPlanStripePrice(plan, 'ETB', { ...validEtbPrice, active: false })).toBe(false);
    expect(matchesPlanStripePrice(plan, 'ETB', {
      ...validEtbPrice,
      recurring: { interval: 'year', interval_count: 1 },
    })).toBe(false);
  });

  it('publishes pricing availability without exposing private Stripe price IDs', () => {
    const plan = getPublicPlan(PLANS.normal_monthly);
    expect(plan.prices).toEqual({ ETB: 100, USD: 1 });
    expect(plan.currencyAvailability).toEqual({
      ETB: Boolean(PLANS.normal_monthly.stripePriceIds.ETB),
      USD: Boolean(PLANS.normal_monthly.stripePriceIds.USD),
    });
    expect(plan).not.toHaveProperty('stripePriceIds');
  });
});

describe('builder section subscription requirements', () => {
  it('requires Normal for up to five base sections', () => {
    expect(getRequiredBusinessTier([
      { type: 'hero' }, { type: 'about' }, { type: 'items' }, { type: 'contact' }, { type: 'social' },
    ])).toBe('normal');
  });

  it('requires Premium for a Premium section or more than five sections', () => {
    expect(getRequiredBusinessTier([{ type: 'hero' }, { type: 'portfolio' }])).toBe('premium');
    expect(getRequiredBusinessTier(SECTION_TYPES.slice(0, 6).map(section => ({ type: section.key })))).toBe('premium');
  });

  it('requires Pro if any Pro section is selected or section count exceeds Premium limits', () => {
    expect(getRequiredBusinessTier([{ type: 'hero' }, { type: 'caseStudies' }])).toBe('pro');
    expect(getRequiredBusinessTier(SECTION_TYPES.slice(0, 26).map(section => ({ type: section.key })))).toBe('pro');
    expect(getRequiredBusinessTier([{ type: 'portfolio' }, { type: 'awards' }])).toBe('pro');
  });

  it('accepts the builder JSON payload and rejects malformed section data', () => {
    expect(getRequiredBusinessTier('[{"type":"booking"}]')).toBe('premium');
    expect(getRequiredBusinessTier('{not-json')).toBeNull();
    expect(getRequiredBusinessTier(null)).toBeNull();
    expect(getRequiredBusinessTier([])).toBeNull();
    expect(getRequiredBusinessTier([{ type: 'not-a-real-section' }])).toBeNull();
    expect(getRequiredBusinessTier([{ title: 'Missing a section type' }])).toBeNull();
    expect(getRequiredBusinessTier([{ type: 'hero' }, { type: 'hero' }])).toBeNull();
  });

  it('keeps server entitlements aligned with every registered builder section', () => {
    for (const tier of ['freemium', 'premium', 'pro'] as const) {
      expect(SECTION_TYPES.filter(section => section.tier === tier).map(section => section.key).sort())
        .toEqual([...BUILDER_SECTION_TIERS[tier]].sort());
    }
  });

  it('compares tiers cumulatively so higher plans satisfy lower requirements', () => {
    expect(businessTierMeetsRequirement('pro', 'premium')).toBe(true);
    expect(businessTierMeetsRequirement('normal', 'pro')).toBe(false);
    expect(businessTierMeetsRequirement('freemium', 'normal')).toBe(false);
  });
});
