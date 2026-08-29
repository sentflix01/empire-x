'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Loader2, Check, X, ArrowRight, Lock, Shield, TrendingUp, Zap, Globe, CreditCard, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TierGatedSection } from '@/components/subscription/TierGatedSection';
import { UpgradePromptModal } from '@/components/subscription/UpgradePromptModal';
import { format } from 'date-fns';

interface Plan {
  tier: string;
  stripePriceId: string;
  interval: 'month' | 'year';
  label: string;
  priceUsd: number;
  priceEtb: number;
  features: string[];
}

interface SubscriptionData {
  tier: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  product_count?: number;
  storage_used_bytes?: number;
}

interface PlanData {
  freemium: {
    tier: string;
    label: string;
    priceUsd: number;
    priceEtb: number;
    limits: Record<string, number>;
    features: string[];
  };
  premium_monthly: Plan;
  pro_monthly: Plan;
}

export default function SubscriptionManagementPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<{ feature: string; currentTier: string; requiredTier: string } | null>(null);

  const tierLabels: Record<string, string> = {
    freemium: 'Free',
    premium: 'Pro',
    pro: 'Enterprise',
  };

  const tierColors: Record<string, string> = {
    freemium: 'bg-gray-100 text-gray-700 border-gray-200',
    premium: 'bg-amber-100 text-amber-700 border-amber-200',
    pro: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  const tierIcons = {
    freemium: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>,
    premium: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>,
    pro: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>,
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [subRes, plansRes] = await Promise.all([
          fetch('/api/subscriptions/my', { credentials: 'include' }),
          fetch('/api/subscriptions/plans', { credentials: 'include' }),
        ]);

        const subData = await subRes.json();
        const plansData = await plansRes.json();

        setSubscription({
          tier: subData.tier || 'freemium',
          status: subData.status || 'active',
          current_period_start: subData.current_period_start,
          current_period_end: subData.current_period_end,
          cancel_at_period_end: subData.cancel_at_period_end || false,
          product_count: subData.product_count,
          storage_used_bytes: subData.storage_used_bytes,
        });

        // Merge freemium with paid plans
        setPlans({
          freemium: {
            tier: 'freemium',
            label: 'Free',
            priceUsd: 0,
            priceEtb: 0,
            limits: { maxSections: 5, maxShowrooms: 1, maxProducts: 50, maxStorageGB: 5 },
            features: ['5 builder sections', '1 showroom', '50 products', '5GB storage', 'Basic sections'],
          },
          ...(plansData as object),
        } as unknown as PlanData);
      } catch (err) {
        console.error('Failed to fetch subscription data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleUpgrade = (planKey: string) => {
    if (!plans) return;
    const plan = (plans as Record<string, any>)[planKey];
    if (!plan) return;

    setUpgrading(planKey);
    fetch('/api/subscriptions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ plan: planKey }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else if (data.error === 'upgrade_required') {
          // Show upgrade modal with feature details
        } else {
          alert(data.error || 'Failed to create checkout session');
        }
      })
      .catch((err) => {
        console.error('Upgrade failed:', err);
        alert('Failed to create checkout session');
      })
      .finally(() => setUpgrading(null));
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the billing period.')) {
      return;
    }

    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setSubscription((prev) => prev ? { ...prev, cancel_at_period_end: true } : null);
        setCancelDialogOpen(false);
      } else {
        alert(data.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Cancel failed:', err);
      alert('Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-gray-600">Loading subscription...</p>
        </div>
      </div>
    );
  }

  const currentTier = subscription?.tier || 'freemium';
  const currentPlanKey = (currentTier === 'freemium' ? 'freemium' : `${currentTier}_monthly`) as keyof PlanData;
  const currentPlan: any = plans ? (plans as any)[currentPlanKey] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600 mt-1">Manage your Nodbusiness subscription and billing</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${({ freemium: 'bg-gray-100 text-gray-700', premium: 'bg-amber-100 text-amber-700', pro: 'bg-purple-100 text-purple-700' } as Record<string,string>)[subscription?.tier || 'freemium']}`}>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-current opacity-80" />
              {tierLabels[subscription?.tier || 'freemium']}
            </span>
          </div>
          {subscription?.cancel_at_period_end && (
            <Badge variant="secondary" className="text-xs">Cancels at period end</Badge>
          )}
        </div>
      </div>

      {/* Current Plan Card */}
      <Card className={currentPlan?.tier === 'pro' ? 'border-purple-200 bg-purple-50' : currentPlan?.tier === 'premium' ? 'border-amber-200 bg-amber-50' : ''}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${({ freemium: 'bg-gray-100', premium: 'bg-amber-100', pro: 'bg-purple-100' } as Record<string,string>)[subscription?.tier || 'freemium']}`}>
                <span className="text-2xl">{subscription?.tier === 'pro' ? '👑' : subscription?.tier === 'premium' ? '⭐' : '🆓'}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{tierLabels[subscription?.tier || 'freemium']} Plan</h3>
                <p className="text-gray-500 text-sm">{subscription?.status === 'past_due' ? '⚠️ Payment past due' : subscription?.status === 'cancelled' ? 'Cancelled' : 'Active subscription'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Billing Period</p>
                <p className="font-medium">
                  {formatDate(subscription?.current_period_start)} – {formatDate(subscription?.current_period_end)}
                </p>
              </div>
              {subscription?.cancel_at_period_end && (
                <Badge variant="destructive" className="text-xs">Cancels at period end</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Products</p>
              <p className="text-2xl font-bold text-gray-900">{subscription?.product_count || 0}</p>
              <p className="text-xs text-gray-500">of {({ freemium: 50, premium: 10000, pro: '∞' } as Record<string,any>)[subscription?.tier || 'freemium']} max</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {(subscription?.storage_used_bytes || 0) > 1024 * 1024 * 1024
                  ? `${((subscription?.storage_used_bytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB`
                  : `${((subscription?.storage_used_bytes || 0) / (1024 * 1024)).toFixed(1)} MB`}
              </p>
              <p className="text-xs text-gray-500">of {({ freemium: '5 GB', premium: '50 GB', pro: '500 GB' } as Record<string,string>)[subscription?.tier || 'freemium']}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{subscription?.status || 'active'}</p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {subscription?.tier === 'freemium' && (
              <>
                <Button onClick={() => handleUpgrade('premium_monthly')} disabled={upgrading === 'premium_monthly'}>
                  Upgrade to Pro — $12/mo
                </Button>
                <Button variant="outline" onClick={() => handleUpgrade('pro_monthly')} disabled={upgrading === 'pro_monthly'}>
                  Upgrade to Enterprise — $49/mo
                </Button>
              </>
            )}
            {subscription?.tier === 'premium' && (
              <>
                <Button onClick={() => handleUpgrade('pro_monthly')} disabled={upgrading === 'pro_monthly'}>
                  Upgrade to Enterprise — $49/mo
                </Button>
                <Button variant="outline" onClick={() => setCancelDialogOpen(true)}>
                  Cancel Subscription
                </Button>
              </>
            )}
            {subscription?.tier === 'pro' && (
              <Button variant="outline" onClick={() => setCancelDialogOpen(true)} disabled={subscription?.cancel_at_period_end}>
                {subscription?.cancel_at_period_end ? 'Cancelling at period end...' : 'Cancel Subscription'}
              </Button>
            )}
            {subscription?.cancel_at_period_end && !['freemium'].includes(subscription?.tier || '') && (
              <Button variant="default" onClick={handleCancel} className="text-green-600 bg-green-50 hover:bg-green-100">
                Reactivate Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Compare Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['freemium', 'premium_monthly', 'pro_monthly'] as const).map((planKey) => {
            const plan: any = plans?.[planKey as keyof PlanData];
            if (!plan) return null;

            const isCurrent = subscription?.tier === plan.tier;
            const isUpgrade = ['freemium', 'premium', 'pro'].indexOf(plan.tier) > ['freemium', 'premium', 'pro'].indexOf(subscription?.tier || 'freemium');

            return (
              <Card
                key={planKey}
                className={`relative h-full transition-all ${isCurrent ? 'ring-2 ring-amber-400 border-amber-400' : 'border-gray-200'} ${isUpgrade ? 'shadow-lg' : ''}`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-white text-xs">Current Plan</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${({ freemium: 'bg-gray-100', premium: 'bg-amber-100', pro: 'bg-purple-100' } as Record<string,string>)[plan.tier]}`}>
                      <span className="text-2xl">{plan.tier === 'pro' ? '👑' : plan.tier === 'premium' ? '⭐' : '🆓'}</span>
                    </div>
                    <CardTitle className="text-lg">{plan.label}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {plan.priceUsd === 0 ? 'Free forever' : `$${plan.priceUsd}/month`}
                      {plan.priceEtb > 0 && ` • ${plan.priceEtb.toLocaleString()} ETB/mo`}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pb-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t">
                    <p className="text-2xl font-bold text-gray-900 mb-1">${plan.priceUsd}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                    {plan.priceEtb > 0 && (
                      <p className="text-sm text-gray-500">≈ {plan.priceEtb.toLocaleString()} ETB/mo</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  {(['freemium', 'premium', 'pro'].indexOf(plan.tier) <= ['freemium', 'premium', 'pro'].indexOf(subscription?.tier || 'freemium')) ? (
                    <Button variant="outline" className="w-full" disabled>
                      {plan.tier === subscription?.tier ? 'Current Plan' : 'Downgrade'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleUpgrade(`${plan.tier === 'premium' ? 'premium' : 'pro'}_monthly`)}
                      className="w-full"
                      disabled={upgrading !== null}
                    >
                      {upgrading ? 'Processing...' : isUpgrade ? 'Upgrade' : 'Select Plan'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? Your {tierLabels[subscription?.tier || 'freemium']} plan will remain active until the end of the current billing period ({formatDate(subscription?.current_period_end)}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradePromptModal
        open={upgradeFeature !== null}
        onClose={() => setUpgradeFeature(null)}
        feature={upgradeFeature?.feature || ''}
        currentTier={upgradeFeature?.currentTier || 'freemium'}
        requiredTier={upgradeFeature?.requiredTier || 'premium'}
      />
    </div>
  );
}
