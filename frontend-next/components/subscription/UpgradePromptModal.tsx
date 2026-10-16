'use client';
/**
 * UpgradePromptModal — shown when a business owner tries to use a locked feature
 *
 * Displays: feature name, current tier, required tier, key features list,
 * and a CTA button that navigates to /business/subscription.
 *
 * Usage:
 *   <UpgradePromptModal
 *     open={showModal}
 *     onClose={() => setShowModal(false)}
 *     feature="bulk_import"
 *     currentTier="freemium"
 *     requiredTier="premium"
 *     tierFeatures={["CSV import", "10K products", "Analytics"]}
 *   />
 *
 * Files touched: frontend-next/components/subscription/UpgradePromptModal.tsx
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import { Lock, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const TIER_LABELS: Record<string, string> = {
  freemium: 'Free',
  normal: 'Normal',
  premium: 'Premium',
  pro: 'Pro',
};

const TIER_COLOR: Record<string, string> = {
  freemium: 'text-muted-foreground',
  premium:  'text-amber-600',
  pro:      'text-violet-600',
};

interface UpgradePromptModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  currentTier: string;
  requiredTier: string;
  tierFeatures?: string[];
}

export default function UpgradePromptModal({
  open,
  onClose,
  feature,
  currentTier,
  requiredTier,
  tierFeatures = [],
}: UpgradePromptModalProps) {
  const router = useRouter();

  const featureLabel = feature
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const requiredLabel = TIER_LABELS[requiredTier] ?? requiredTier;
  const currentLabel  = TIER_LABELS[currentTier]  ?? currentTier;

  function handleUpgrade() {
    onClose();
    router.push('/business/subscription');
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <DialogTitle className="text-lg">{featureLabel}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tier requirement */}
          <div className="rounded-xl bg-secondary/50 p-3 text-sm">
            <p className="text-muted-foreground">
              You're on the <span className="font-semibold text-foreground">{currentLabel}</span> plan.
            </p>
            <p className="mt-0.5">
              This feature requires{' '}
              <span className={`font-semibold ${TIER_COLOR[requiredTier] ?? ''}`}>
                {requiredLabel}
              </span>
              .
            </p>
          </div>

          {/* Feature highlights */}
          {tierFeatures.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                What you unlock:
              </p>
              {tierFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleUpgrade}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
            >
              Upgrade to {requiredLabel}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={onClose} className="px-3">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
