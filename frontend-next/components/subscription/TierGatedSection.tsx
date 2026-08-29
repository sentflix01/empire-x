'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UpgradePromptModal } from './UpgradePromptModal';

interface TierGatedSectionProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface TierGateState {
  allowed: boolean;
  upgradeReason: {
    currentTier: string;
    requiredTier: string;
    feature: string;
    tierFeatures?: string[];
    tierLabel?: string;
  } | null;
  loading: boolean;
}

/**
 * Hook to check tier access for a feature.
 * Returns { allowed, upgradeReason, loading }.
 */
export function useTierGate(feature: string): TierGateState {
  const [state, setState] = useState<TierGateState>({
    allowed: false,
    upgradeReason: null,
    loading: true,
  });

  const checkAccess = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/subscriptions/my`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setState({
          allowed: false,
          upgradeReason: { currentTier: 'freemium', requiredTier: 'premium', feature },
          loading: false,
        });
        return;
      }
      const data = await res.json();
      const currentTier = data.tier || 'freemium';

      // Check tier requirement using the same logic as backend
      const TIER_ORDER = ['freemium', 'premium', 'pro'] as const;
      const FEATURE_MIN_TIER: Record<string, string[]> = {
        bulk_import: ['premium', 'pro'],
        live_location_tracking: ['pro'],
        webhooks: ['premium', 'pro'],
        api_keys: ['premium', 'pro'],
        analytics: ['premium', 'pro'],
        builder_premium: ['premium', 'pro'],
        builder_pro: ['pro'],
      };

      const requiredTiers = FEATURE_MIN_TIER[feature] || ['pro'];
      const currentTierIndex = ['freemium', 'premium', 'pro'].indexOf(currentTier);
      const requiredTierIndex = Math.min(...requiredTiers.map((t) => ['freemium', 'premium', 'pro'].indexOf(t)));
      const allowed = currentTierIndex >= requiredTierIndex;

      if (allowed) {
        setState({ allowed: true, upgradeReason: null, loading: false });
      } else {
        const requiredTier = requiredTiers[0];
        setState({
          allowed: false,
          upgradeReason: {
            currentTier,
            requiredTier,
            feature,
            tierFeatures: [],
            tierLabel: requiredTier === 'pro' ? 'Pro feature' : 'Premium feature',
          },
          loading: false,
        });
      }
    } catch (err) {
      console.error('Tier gate check failed:', err);
      setState({
        allowed: false,
        upgradeReason: { currentTier: 'freemium', requiredTier: 'premium', feature },
        loading: false,
      });
    }
  }, [feature]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return state;
}

/**
 * Wrapper component that gates children behind a tier check.
 * Shows UpgradePromptModal when access is denied.
 */
export function TierGatedSection({
  feature,
  children,
  fallback,
}: TierGatedSectionProps) {
  const { allowed, upgradeReason, loading } = useTierGate(feature);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  if (!allowed && upgradeReason) {
    return (
      <>
        {fallback || (
          <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-200">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upgrade Required</h3>
            <p className="text-gray-600 mb-4">
              This feature requires <strong>{upgradeReason.requiredTier}</strong> plan or higher.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Your current plan: <strong>{upgradeReason.currentTier}</strong>
            </p>
          </div>
        )}
        <UpgradePromptModal
          open={!allowed}
          onClose={() => {}} // Modal handles its own close
          feature={feature}
          currentTier={upgradeReason.currentTier}
          requiredTier={upgradeReason.requiredTier}
          tierFeatures={upgradeReason.tierFeatures}
          tierLabel={upgradeReason.tierLabel}
        />
      </>
    );
  }

  return <>{children}</>;
}