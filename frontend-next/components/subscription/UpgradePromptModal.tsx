'use client';

import React from 'react';
import { X, Crown, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface UpgradePromptModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  currentTier: string;
  requiredTier: string;
  tierFeatures?: string[];
  tierLabel?: string;
}

export function UpgradePromptModal({
  open,
  onClose,
  feature,
  currentTier,
  requiredTier,
  tierFeatures = [],
  tierLabel,
}: UpgradePromptModalProps) {
  if (!open) return null;

  const tierLabels: Record<string, string> = {
    freemium: 'Free',
    premium: 'Pro',
    pro: 'Enterprise',
  };

  const tierColors: Record<string, string> = {
    freemium: 'bg-gray-100 text-gray-700',
    premium: 'bg-amber-100 text-amber-700',
    pro: 'bg-purple-100 text-purple-700',
  };

  const tierIcons: Record<string, React.ReactNode> = {
    freemium: <Lock className="w-5 h-5" />,
    premium: <Crown className="w-5 h-5" />,
    pro: <Crown className="w-5 h-5" />,
  };

  const formatFeature = (feature: string) => {
    return feature
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${tierColors[requiredTier]} flex items-center justify-center`}>
              {tierIcons[requiredTier]}
            </div>
            <span>Upgrade Required</span>
          </DialogTitle>
          <DialogDescription className="mt-2">
            This feature requires <strong>{tierLabels[requiredTier]}</strong> plan or higher.
            You are currently on <strong>{tierLabels[currentTier]}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <h4 className="font-medium text-gray-900">Feature: {formatFeature(feature)}</h4>
            {tierLabel && (
              <p className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full inline-block">
                {tierLabel}
              </p>
            )}
            {tierFeatures.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-sm font-medium text-gray-700">Includes:</p>
                <ul className="space-y-1 pl-4">
                  {tierFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Current Plan</p>
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                {tierIcons[currentTier]}
                {tierLabels[currentTier]}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Required Plan</p>
              <p className="font-semibold text-gray-900 flex items-center gap-2 justify-end">
                {tierIcons[requiredTier]}
                {tierLabels[requiredTier]}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Maybe Later
            </Button>
            <Button onClick={() => { onClose(); window.location.href = '/business/subscription'; }} className="flex-1">
              <ArrowRight className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}