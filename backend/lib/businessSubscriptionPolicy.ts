import pool from '../db/pool';
const sectionRequirements = require('./builderSectionRequirements') as {
  BUILDER_SECTION_TIERS: { freemium: readonly string[]; premium: readonly string[]; pro: readonly string[] };
  getRequiredBusinessTier: (sections: unknown) => BusinessPlanTier | null;
};

export type BusinessPlanTier = 'normal' | 'premium' | 'pro';
const PLAN_RANK: Record<string, number> = { freemium: 0, normal: 1, premium: 2, pro: 3 };

export const BUILDER_SECTION_TIERS = sectionRequirements.BUILDER_SECTION_TIERS;

/** Return the minimum paid tier from selected builder sections and section-count limits. */
export const getRequiredBusinessTier = sectionRequirements.getRequiredBusinessTier;

export function businessTierMeetsRequirement(currentTier: string | null | undefined, requiredTier: BusinessPlanTier): boolean {
  return (PLAN_RANK[currentTier ?? 'freemium'] ?? 0) >= PLAN_RANK[requiredTier];
}

export interface BusinessSubscriptionAccess {
  businessId: string;
  ownerId: string;
  tier: string | null;
  status: string | null;
  currentPeriodEnd: Date | null;
  expiresAt: Date | null;
  paid: boolean;
  hiddenFromPublic: boolean;
  /** 'private' sites are for signed-in users only (lib/siteVisibility.ts). */
  visibility: 'public' | 'private';
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getBusinessSubscriptionAccess(businessId: string): Promise<BusinessSubscriptionAccess | null> {
  const { rows } = await pool.query<{
    owner_id: string;
    visibility: string | null;
    tier: string | null;
    status: string | null;
    current_period_end: Date | null;
  }>(
    `SELECT b.owner_id, b.visibility, bs.tier, bs.status, bs.current_period_end
       FROM businesses b
       LEFT JOIN business_subscriptions bs ON bs.business_id = b.id
      WHERE b.id = $1`,
    [businessId],
  );
  if (!rows.length) return null;
  const row = rows[0];
  const end = row.current_period_end ? new Date(row.current_period_end) : null;
  const now = Date.now();
  const paid = !!end && end.getTime() > now && row.tier !== 'freemium';
  const expiredFor = end ? now - end.getTime() : 0;
  return {
    businessId,
    ownerId: row.owner_id,
    tier: row.tier,
    status: row.status,
    currentPeriodEnd: end,
    expiresAt: end,
    paid,
    // The 24-hour recovery grace applies to a previously paid subscription
    // only. A site without any billing period has no paid access window.
    hiddenFromPublic: !paid && (!end || expiredFor >= DAY_MS),
    // The owner keeps full access (view, edit, renew) until the business is
    // deleted on Day 10 (decision record §6); there is no earlier lockout.
    visibility: row.visibility === 'private' ? 'private' : 'public',
  };
}

export async function canPublishBusinessSite(businessId: string, ownerId: string, sections: unknown): Promise<boolean> {
  const access = await getBusinessSubscriptionAccess(businessId);
  const requiredTier = getRequiredBusinessTier(sections);
  return !!access && access.ownerId === ownerId && access.paid && !!requiredTier && businessTierMeetsRequirement(access.tier, requiredTier);
}

export async function isBusinessOwnerBlocked(ownerId: string): Promise<boolean> {
  const { rows } = await pool.query<{ blocked: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM business_creation_blocks
       WHERE owner_id = $1 AND blocked_until > NOW()
     ) AS blocked`,
    [ownerId],
  );
  return rows[0]?.blocked === true;
}

export function paidBusinessSql(alias: 'b' | 's' | 'p'): string {
  const businessId = alias === 'b' ? 'b.id' : alias === 's' ? 's.business_id' : 'p.business_id';
  return `EXISTS (
    SELECT 1 FROM business_subscriptions paid_sub
    WHERE paid_sub.business_id = ${businessId}
      AND paid_sub.tier <> 'freemium'
      AND paid_sub.current_period_end > NOW()
  )`;
}

export const SUBSCRIPTION_PUBLIC_GRACE_SQL = `EXISTS (
  SELECT 1 FROM business_subscriptions paid_sub
  WHERE paid_sub.business_id = showrooms.business_id
    AND paid_sub.tier <> 'freemium'
    AND paid_sub.current_period_end > NOW() - INTERVAL '24 hours'
)`;
