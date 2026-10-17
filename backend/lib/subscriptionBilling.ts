/**
 * lib/subscriptionBilling.ts — Prepaid ETB billing rules (Phase 1).
 *
 * Owner decisions (2026-10-17):
 *   - Chapa has no recurring charges, so owners prepay 1, 3, 6 or 12 months
 *     and are reminded before the period ends.
 *   - Upgrading mid-period pays only the price difference for the days left;
 *     the end date stays the same unless months are added at the new price.
 *
 * `quote` is pure and decides kind, amount and the period a payment buys.
 * The amount is fixed at checkout; the period is recomputed with the same
 * rules when the payment is confirmed, so payments that land out of order or
 * close together still extend from the right end date.
 */
import { PLANS, TIER_ORDER, type Tier } from './subscriptionPlans';

export type PaidTier = 'normal' | 'premium' | 'pro';
export type PaymentKind = 'new' | 'renewal' | 'upgrade';

export const PREPAY_MONTHS = [1, 3, 6, 12] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Proration uses a 30-day month. */
const PRORATION_MONTH_DAYS = 30;

export interface CurrentSubscription {
  tier: Tier;
  status: string;
  current_period_end: Date | string | null;
  stripe_subscription_id?: string | null;
}

export interface Quote {
  kind: PaymentKind;
  tier: PaidTier;
  months: number;
  /** Whole birr. */
  amount: number;
  periodStart: Date;
  periodEnd: Date;
}

export type QuoteError =
  | { error: 'invalid_plan' }
  | { error: 'invalid_months' }
  | { error: 'downgrade_not_allowed'; currentTier: Tier; periodEnd: Date }
  | { error: 'stripe_subscription_active' }
  | { error: 'nothing_to_pay' };

export function isPaidTier(value: unknown): value is PaidTier {
  return value === 'normal' || value === 'premium' || value === 'pro';
}

/** The published plan for a paid tier (PLANS is keyed by plan, e.g. premium_monthly). */
export function planForTier(tier: PaidTier) {
  const plan = Object.values(PLANS).find((p) => p.tier === tier);
  if (!plan) throw new Error(`No plan for tier ${tier}`);
  return plan;
}

/** Accepts a tier ("premium") or a plan key ("premium_monthly"). */
export function normalizeTier(value: unknown): PaidTier | null {
  if (isPaidTier(value)) return value;
  if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLANS, value)) {
    const tier = PLANS[value as keyof typeof PLANS].tier;
    return isPaidTier(tier) ? tier : null;
  }
  return null;
}

export function monthlyPriceEtb(tier: PaidTier): number {
  return planForTier(tier).prices.ETB;
}

/** Calendar months, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function rank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

/** A period someone actually paid for (not the free legacy trial) that has not ended. */
function paidPeriodEnd(current: CurrentSubscription | null, now: Date): Date | null {
  if (!current || current.status !== 'active' || !current.current_period_end) return null;
  const end = new Date(current.current_period_end);
  return end.getTime() > now.getTime() && current.tier !== 'freemium' ? end : null;
}

export function quote(
  current: CurrentSubscription | null,
  targetTier: unknown,
  monthsInput: unknown,
  now: Date = new Date(),
): Quote | QuoteError {
  const target = normalizeTier(targetTier);
  if (!target) return { error: 'invalid_plan' };
  const months = Number(monthsInput);
  if (!Number.isInteger(months) || months < 0 || months > 12) return { error: 'invalid_months' };

  // A live Stripe subscription renews itself; paying through Chapa as well would double-charge.
  if (current?.stripe_subscription_id && current.status === 'active' && paidPeriodEnd(current, now)) {
    return { error: 'stripe_subscription_active' };
  }

  const paidEnd = paidPeriodEnd(current, now);
  const price = monthlyPriceEtb(target);

  if (paidEnd && current) {
    if (rank(target) < rank(current.tier)) {
      return { error: 'downgrade_not_allowed', currentTier: current.tier, periodEnd: paidEnd };
    }
    if (target === current.tier) {
      if (!(PREPAY_MONTHS as readonly number[]).includes(months)) return { error: 'invalid_months' };
      return { kind: 'renewal', tier: target, months, amount: price * months, periodStart: paidEnd, periodEnd: addMonths(paidEnd, months) };
    }
    // Upgrade: the difference for the days left, plus any added months at the new price.
    if (months !== 0 && !(PREPAY_MONTHS as readonly number[]).includes(months)) return { error: 'invalid_months' };
    const daysLeft = Math.ceil((paidEnd.getTime() - now.getTime()) / DAY_MS);
    const difference = price - monthlyPriceEtb(current.tier as PaidTier);
    const amount = Math.ceil((difference * daysLeft) / PRORATION_MONTH_DAYS) + price * months;
    if (amount <= 0) return { error: 'nothing_to_pay' };
    return { kind: 'upgrade', tier: target, months, amount, periodStart: now, periodEnd: addMonths(paidEnd, months) };
  }

  if (!(PREPAY_MONTHS as readonly number[]).includes(months)) return { error: 'invalid_months' };
  // A free (trialing) period keeps running: paid time starts when it ends.
  const trialEnd = current?.status === 'trialing' && current.current_period_end ? new Date(current.current_period_end) : null;
  const start = trialEnd && trialEnd.getTime() > now.getTime() ? trialEnd : now;
  return { kind: 'new', tier: target, months, amount: price * months, periodStart: start, periodEnd: addMonths(start, months) };
}

export const QUOTE_ERROR_MESSAGES: Record<QuoteError['error'], string> = {
  invalid_plan: 'Choose Normal, Premium or Pro.',
  invalid_months: 'Choose 1, 3, 6 or 12 months.',
  downgrade_not_allowed: 'You can move to a lower plan when your current period ends.',
  stripe_subscription_active: 'This business pays by card subscription. Cancel it before paying in ETB.',
  nothing_to_pay: 'There is nothing to pay for this change.',
};
