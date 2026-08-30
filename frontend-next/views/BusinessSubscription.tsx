'use client';
/**
 * BusinessSubscription.tsx — Subscription management page for business owners
 *
 * Shows: current plan, usage bars (products, storage), plan comparison,
 * upgrade CTA, cancel flow, billing period info.
 *
 * Route: /business/subscription
 * Files touched:
 *   frontend-next/views/BusinessSubscription.tsx    (this file)
 *   frontend-next/app/(app)/business/subscription/page.tsx
 *   backend/routes/subscriptions.ts                 (API)
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, TrendingUp, Package, HardDrive, Crown, Zap, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import client from '@/api/client';
import { toast } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';

interface Subscription {
  tier: 'freemium' | 'premium' | 'pro';
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  product_count: number;
  storage_used_bytes: number;
  businessId: string | null;
}

interface Plan {
  tier: string;
  label: string;
  priceUsd: number;
  priceEtb: number;
  features: string[];
  limits?: { maxProducts: number; maxStorageGB: number; maxShowrooms: number };
}

interface Plans {
  freemium: Plan;
  premium_monthly: Plan;
  pro_monthly: Plan;
}

const TIER_LIMITS = {
  freemium: { maxProducts: 50,     maxStorageGB: 5,   maxShowrooms: 1 },
  premium:  { maxProducts: 10_000, maxStorageGB: 50,  maxShowrooms: 3 },
  pro:      { maxProducts: Infinity, maxStorageGB: 500, maxShowrooms: Infinity },
};

function UsageBar({ label, used, max, icon: Icon }: { label: string; used: number; max: number; icon: React.ComponentType<{ className?: string }> }) {
  const pct = max === Infinity ? 0 : Math.min(100, (used / max) * 100);
  const isHigh = pct >= 80;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-muted-foreground text-xs">
          {max === Infinity ? `${used.toLocaleString()} / Unlimited` : `${used.toLocaleString()} / ${max.toLocaleString()}`}
        </span>
      </div>
      {max !== Infinity && (
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isHigh ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {isHigh && max !== Infinity && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {Math.round(pct)}% used — consider upgrading
        </p>
      )}
    </div>
  );
}

function BusinessSubscription() {
  const searchParams = useSearchParams();
  const [sub, setSub]       = useState<Subscription | null>(null);
  const [plans, setPlans]   = useState<Plans | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    // Show success/cancel banners from Stripe redirect
    const upgraded = searchParams.get('upgraded');
    const cancelled = searchParams.get('cancelled');
    if (upgraded) toast.success('Subscription activated! Your new features are unlocked.');
    if (cancelled) toast.info('Upgrade cancelled — no charge was made.');

    Promise.all([
      client.get('/api/subscriptions/my').then(r => r.data as Subscription),
      client.get('/api/subscriptions/plans').then(r => r.data as Plans),
    ]).then(([s, p]) => {
      setSub(s);
      setPlans(p);
    }).catch(() => {
      toast.error('Failed to load subscription data');
    }).finally(() => setLoading(false));
  }, []);

  async function handleUpgrade(planKey: string) {
    setUpgrading(planKey);
    try {
      const { data } = await client.post('/api/subscriptions/create', { plan: planKey });
      window.location.href = data.checkout_url;
    } catch (err: unknown) {
      const e = err as { error?: string };
      toast.error(e?.error ?? 'Failed to start upgrade');
      setUpgrading(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await client.post('/api/subscriptions/cancel');
      toast.success('Subscription will cancel at end of billing period.');
      setSub(prev => prev ? { ...prev, cancel_at_period_end: true } : prev);
      setShowCancelConfirm(false);
    } catch {
      toast.error('Failed to cancel subscription');
    }
    setCancelling(false);
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
    </div>
  );

  const tier = sub?.tier ?? 'freemium';
  const limits = TIER_LIMITS[tier];
  const storageGB = (sub?.storage_used_bytes ?? 0) / (1024 ** 3);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your plan and usage</p>
      </div>

      {/* Current plan card */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current plan</p>
            <p className="text-xl font-bold mt-0.5 capitalize">
              {tier === 'freemium' ? 'Free' : tier === 'premium' ? 'Pro' : 'Enterprise'}
            </p>
          </div>
          {sub?.cancel_at_period_end && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              Cancels {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'soon'}
            </Badge>
          )}
          {sub?.status === 'past_due' && (
            <Badge variant="destructive">Payment failed</Badge>
          )}
        </div>

        {/* Storage warning */}
        {storageGB / limits.maxStorageGB >= 0.9 && limits.maxStorageGB !== Infinity && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Storage at {Math.round((storageGB / limits.maxStorageGB) * 100)}% — upgrade to avoid interruption</span>
          </div>
        )}

        {/* Usage bars */}
        <div className="space-y-4 pt-1">
          <UsageBar
            label="Products"
            used={sub?.product_count ?? 0}
            max={limits.maxProducts}
            icon={Package}
          />
          <UsageBar
            label="Storage"
            used={parseFloat(storageGB.toFixed(2))}
            max={limits.maxStorageGB}
            icon={HardDrive}
          />
        </div>

        {tier !== 'freemium' && !sub?.cancel_at_period_end && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Cancel subscription
          </button>
        )}
      </div>

      {/* Cancel confirm */}
      {showCancelConfirm && (
        <div className="bg-card border border-destructive/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Cancel subscription?</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your plan stays active until the end of the billing period. After that, you'll be downgraded to Free.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, cancel'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCancelConfirm(false)}>
              <X className="w-4 h-4 mr-1" /> Keep plan
            </Button>
          </div>
        </div>
      )}

      {/* Plan comparison */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Available plans</h2>

        {/* Free */}
        <div className={`bg-card border rounded-2xl p-5 ${tier === 'freemium' ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/50'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold">Free</p>
              <p className="text-2xl font-bold mt-0.5">$0</p>
            </div>
            {tier === 'freemium' && <Badge>Current plan</Badge>}
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {['5 builder sections', '1 showroom', '50 products', '5GB storage', 'Basic sections'].map(f => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        {plans?.premium_monthly && (
          <div className={`bg-card border rounded-2xl p-5 ${tier === 'premium' ? 'border-amber-400/50 ring-1 ring-amber-400/20' : 'border-border/50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Pro</p>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">Popular</Badge>
                </div>
                <p className="text-2xl font-bold mt-0.5">${plans.premium_monthly.priceUsd}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
              {tier === 'premium' ? (
                <Badge className="bg-amber-100 text-amber-700 border-amber-300">Current plan</Badge>
              ) : tier === 'freemium' ? (
                <Button size="sm" onClick={() => handleUpgrade('premium_monthly')} disabled={!!upgrading}
                  className="bg-amber-500 hover:bg-amber-600 text-white">
                  {upgrading === 'premium_monthly' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upgrade'}
                </Button>
              ) : null}
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {plans.premium_monthly.features.map(f => (
                <li key={f} className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Enterprise */}
        {plans?.pro_monthly && (
          <div className={`bg-card border rounded-2xl p-5 ${tier === 'pro' ? 'border-violet-400/50 ring-1 ring-violet-400/20' : 'border-border/50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Enterprise</p>
                  <Crown className="w-4 h-4 text-violet-500" />
                </div>
                <p className="text-2xl font-bold mt-0.5">${plans.pro_monthly.priceUsd}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
              {tier === 'pro' ? (
                <Badge className="bg-violet-100 text-violet-700 border-violet-300">Current plan</Badge>
              ) : (
                <Button size="sm" onClick={() => handleUpgrade('pro_monthly')} disabled={!!upgrading}
                  className="bg-violet-500 hover:bg-violet-600 text-white">
                  {upgrading === 'pro_monthly' ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <><Zap className="w-3.5 h-3.5 mr-1" /> Upgrade</>
                  )}
                </Button>
              )}
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {plans.pro_monthly.features.map(f => (
                <li key={f} className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BusinessSubscriptionPage() {
  return <ErrorBoundary><BusinessSubscription /></ErrorBoundary>;
}
