/**
 * The cheapest plan that can publish a set of website sections (mirrors the
 * backend's getRequiredBusinessTier, which is what actually enforces it).
 * More than 5 sections needs Premium, more than 25 needs Pro, and Premium or
 * Pro sections raise the requirement.
 */
import { getSectionType } from '@/lib/builderSections';

export type PlanTier = 'normal' | 'premium' | 'pro';

export function getSectionPlanRequirement(sectionKeys: string[]): { tier: PlanTier; label: string; price: number } {
  const rank = { normal: 1, premium: 2, pro: 3 } as const;
  let tier: PlanTier = sectionKeys.length > 25 ? 'pro' : sectionKeys.length > 5 ? 'premium' : 'normal';
  for (const key of sectionKeys) {
    const sectionTier = getSectionType(key)?.tier;
    if (sectionTier === 'pro') tier = 'pro';
    else if (sectionTier === 'premium' && rank[tier] < rank.premium) tier = 'premium';
  }
  return { tier, label: tier === 'pro' ? 'Pro' : tier === 'premium' ? 'Premium' : 'Normal', price: tier === 'pro' ? 1000 : tier === 'premium' ? 500 : 100 };
}
