'use client';
/**
 * TierGatedSection — wraps any feature and shows UpgradePromptModal on 403
 *
 * Usage — wrap any component that requires a paid tier:
 *   <TierGatedSection feature="bulk_import">
 *     <BulkImportButton />
 *   </TierGatedSection>
 *
 * Or use the hook directly:
 *   const { allowed, currentTier, requiredTier } = useTierGate('bulk_import');
 *   if (!allowed) return <LockedState />;
 *
 * Files touched: frontend-next/components/subscription/TierGatedSection.tsx
 */
import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import client from '@/api/client';
import UpgradePromptModal from './UpgradePromptModal';
import { SECTION_TYPES } from '@/lib/builderSections';

// ── Tier ordering ─────────────────────────────────────────────────────────────
const TIER_ORDER = ['freemium', 'premium', 'pro'] as const;
type Tier = typeof TIER_ORDER[number];

const FEATURE_REQUIRED_TIER: Record<string, Tier> = {
  bulk_import:              'premium',
  live_location_tracking:   'pro',
  webhooks:                 'premium',
  api_keys:                 'premium',
  analytics:                'premium',
  builder_premium:          'premium',
  builder_pro:              'pro',
};

function tierMeets(current: Tier, required: Tier): boolean {
  return TIER_ORDER.indexOf(current) >= TIER_ORDER.indexOf(required);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
interface TierGateResult {
  allowed: boolean;
  loading: boolean;
  currentTier: Tier;
  requiredTier: Tier;
  tierFeatures: string[];
}

export function useTierGate(feature: string): TierGateResult {
  const [currentTier, setCurrentTier] = useState<Tier>('freemium');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/api/subscriptions/my')
      .then((r) => { setCurrentTier((r.data.tier as Tier) ?? 'freemium'); })
      .catch(() => { setCurrentTier('freemium'); })
      .finally(() => setLoading(false));
  }, []);

  const requiredTier: Tier = FEATURE_REQUIRED_TIER[feature] ?? 'premium';
  const allowed = tierMeets(currentTier, requiredTier);

  // Pull tierFeatures from builderSections if this is a section key
  const sectionDef = SECTION_TYPES.find((s) => s.key === feature);
  const tierFeatures = sectionDef?.tierFeatures ?? [];

  return { allowed, loading, currentTier, requiredTier, tierFeatures };
}

// ── Component ─────────────────────────────────────────────────────────────────
interface TierGatedSectionProps {
  feature: string;
  children: React.ReactNode;
  /** Custom lock UI — shown instead of default lock overlay when not allowed */
  fallback?: React.ReactNode;
}

export default function TierGatedSection({
  feature,
  children,
  fallback,
}: TierGatedSectionProps) {
  const { allowed, loading, currentTier, requiredTier, tierFeatures } = useTierGate(feature);
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl bg-secondary/40 h-12 w-full" />
    );
  }

  if (!allowed) {
    if (fallback) return <>{fallback}</>;

    return (
      <>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="relative w-full rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 dark:bg-amber-500/5 p-4 text-center hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors group"
        >
          <Lock className="w-5 h-5 text-amber-500 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {feature.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
          <p className="text-xs text-amber-600/70 mt-0.5">
            Requires {requiredTier === 'pro' ? 'Enterprise' : 'Pro'} plan — click to upgrade
          </p>
        </button>

        <UpgradePromptModal
          open={showModal}
          onClose={() => setShowModal(false)}
          feature={feature}
          currentTier={currentTier}
          requiredTier={requiredTier}
          tierFeatures={tierFeatures}
        />
      </>
    );
  }

  return <>{children}</>;
}
