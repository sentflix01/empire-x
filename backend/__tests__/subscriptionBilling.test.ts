/**
 * Prepaid ETB pricing (owner decisions 2026-10-17): 1/3/6/12 months up front,
 * renewals extend from the current end, upgrades pay the difference for the
 * days left, a free legacy trial keeps running before paid time starts.
 */
import { addMonths, normalizeTier, quote } from '../lib/subscriptionBilling';

const now = new Date('2026-11-01T00:00:00Z');
const inDays = (days: number) => new Date(now.getTime() + days * 86_400_000);

describe('quote', () => {
  it('prices a new plan for the chosen months, starting now', () => {
    const q = quote(null, 'premium', 3, now);
    expect(q).toMatchObject({ kind: 'new', tier: 'premium', months: 3, amount: 1500 });
    if ('error' in q) throw new Error('unexpected');
    expect(q.periodStart).toEqual(now);
    expect(q.periodEnd).toEqual(new Date('2027-02-01T00:00:00Z'));
  });

  it('accepts plan keys as well as tiers', () => {
    expect(normalizeTier('pro_monthly')).toBe('pro');
    expect(quote(null, 'normal_monthly', 1, now)).toMatchObject({ tier: 'normal', amount: 100 });
  });

  it('only sells 1, 3, 6 or 12 months', () => {
    for (const months of [0, 2, 5, 13, 1.5, 'x']) expect(quote(null, 'normal', months, now)).toEqual({ error: 'invalid_months' });
    expect(quote(null, 'enterprise', 1, now)).toEqual({ error: 'invalid_plan' });
  });

  it('renews the same plan from the current end date', () => {
    const q = quote({ tier: 'normal', status: 'active', current_period_end: inDays(10) }, 'normal', 12, now);
    expect(q).toMatchObject({ kind: 'renewal', amount: 1200 });
    if ('error' in q) throw new Error('unexpected');
    expect(q.periodStart).toEqual(inDays(10));
    expect(q.periodEnd).toEqual(addMonths(inDays(10), 12));
  });

  it('charges the prorated difference to upgrade and keeps the end date', () => {
    // Normal (100) -> Pro (1000) with 15 of 30 days left: 900 * 15 / 30 = 450.
    const q = quote({ tier: 'normal', status: 'active', current_period_end: inDays(15) }, 'pro', 0, now);
    expect(q).toMatchObject({ kind: 'upgrade', tier: 'pro', months: 0, amount: 450 });
    if ('error' in q) throw new Error('unexpected');
    expect(q.periodEnd).toEqual(inDays(15));
  });

  it('adds months at the new price when upgrading with an extension', () => {
    const q = quote({ tier: 'normal', status: 'active', current_period_end: inDays(15) }, 'premium', 1, now);
    // 400 * 15 / 30 = 200, plus one Premium month (500).
    expect(q).toMatchObject({ kind: 'upgrade', amount: 700 });
  });

  it('rounds a partial-day upgrade up to whole birr', () => {
    const q = quote({ tier: 'normal', status: 'active', current_period_end: new Date(now.getTime() + 3_600_000) }, 'premium', 0, now);
    expect(q).toMatchObject({ kind: 'upgrade', amount: 14 }); // 1 day: ceil(400 / 30)
  });

  it('does not sell a downgrade during a paid period', () => {
    expect(quote({ tier: 'pro', status: 'active', current_period_end: inDays(5) }, 'normal', 1, now))
      .toMatchObject({ error: 'downgrade_not_allowed', currentTier: 'pro' });
  });

  it('starts paid time after a free legacy trial ends', () => {
    const trialEnd = new Date('2027-04-16T00:00:00Z');
    const q = quote({ tier: 'pro', status: 'trialing', current_period_end: trialEnd }, 'normal', 1, now);
    expect(q).toMatchObject({ kind: 'new', amount: 100 });
    if ('error' in q) throw new Error('unexpected');
    expect(q.periodStart).toEqual(trialEnd);
  });

  it('treats an expired plan as new from today', () => {
    const q = quote({ tier: 'premium', status: 'active', current_period_end: inDays(-3) }, 'premium', 1, now);
    expect(q).toMatchObject({ kind: 'new' });
    if ('error' in q) throw new Error('unexpected');
    expect(q.periodStart).toEqual(now);
  });

  it('refuses ETB while a Stripe subscription is renewing itself', () => {
    expect(quote({ tier: 'premium', status: 'active', current_period_end: inDays(20), stripe_subscription_id: 'sub_1' }, 'pro', 0, now))
      .toEqual({ error: 'stripe_subscription_active' });
  });
});

describe('addMonths', () => {
  it('clamps to the last day of shorter months', () => {
    expect(addMonths(new Date('2027-01-31T10:00:00Z'), 1)).toEqual(new Date('2027-02-28T10:00:00Z'));
    expect(addMonths(new Date('2027-10-31T00:00:00Z'), 12)).toEqual(new Date('2028-10-31T00:00:00Z'));
  });
});
