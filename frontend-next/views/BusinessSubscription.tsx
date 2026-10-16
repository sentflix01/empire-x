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
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Package, HardDrive, Crown, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import client from '@/api/client';
import { toast } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/AuthContext';

interface Subscription {
  tier: 'freemium' | 'normal' | 'premium' | 'pro';
  status: string;
  currency: BillingCurrency | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  product_count: number;
  storage_used_bytes: number;
  businessId: string | null;
}

type BillingCurrency = 'ETB' | 'USD';

interface Plan {
  tier: Subscription['tier'];
  label: string;
  prices: Record<BillingCurrency, number>;
  currencyAvailability: Record<BillingCurrency, boolean>;
  features: string[];
  limits?: { maxProducts: number; maxStorageGB: number; maxShowrooms: number };
}

interface Plans {
  freemium: Plan;
  normal_monthly: Plan;
  premium_monthly: Plan;
  pro_monthly: Plan;
  enterprise: {
    label: string;
    prices: Record<BillingCurrency, null>;
    pricingCurrencies: BillingCurrency[];
    features: string[];
    contactRequired: true;
  };
}

const TIER_LIMITS = {
  freemium: { maxProducts: 50,     maxStorageGB: 5,   maxShowrooms: 1 },
  normal:   { maxProducts: 50,     maxStorageGB: 5,   maxShowrooms: 1 },
  premium:  { maxProducts: 10_000, maxStorageGB: 50,  maxShowrooms: 3 },
  pro:      { maxProducts: Infinity, maxStorageGB: 500, maxShowrooms: Infinity },
};

const PAID_PLAN_KEYS = ['normal_monthly', 'premium_monthly', 'pro_monthly'] as const;
const REQUIRED_PLAN_KEYS = {
  normal: 'normal_monthly',
  premium: 'premium_monthly',
  pro: 'pro_monthly',
} as const;

function formatMonthlyPrice(amount: number, currency: BillingCurrency) {
  return currency === 'USD'
    ? `USD $${amount.toLocaleString('en-US')}`
    : `${amount.toLocaleString()} ETB`;
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [sub, setSub]       = useState<Subscription | null>(null);
  const [plans, setPlans]   = useState<Plans | null>(null);
  const [businesses, setBusinesses] = useState<Array<{ id: string; business_name: string }>>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState(searchParams.get('businessId') ?? '');
  const [selectedCurrency, setSelectedCurrency] = useState<BillingCurrency>('ETB');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const requestedTier = searchParams.get('requiredTier');
  const requiredTier = requestedTier === 'normal' || requestedTier === 'premium' || requestedTier === 'pro' ? requestedTier : null;
  const requiredTierLabel = requiredTier === 'pro' ? 'Pro' : requiredTier === 'premium' ? 'Premium' : 'Normal';
  const requiredPlan = requiredTier ? plans?.[REQUIRED_PLAN_KEYS[requiredTier]] : undefined;

  useEffect(() => {
    // Show success/cancel banners from Stripe redirect
    const upgraded = searchParams.get('upgraded');
    const cancelled = searchParams.get('cancelled');
    if (upgraded) toast.success('Subscription activated! Your new features are unlocked.');
    if (cancelled) toast.info('Upgrade cancelled — no charge was made.');

    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      client.get('/api/businesses', { params: { owner_id: user.id, limit: 100 } }).then(r => (r.data as Array<{ id: string; business_name: string }>)),
      client.get('/api/subscriptions/plans').then(r => r.data as Plans),
    ]).then(([owned, p]) => {
      setBusinesses(owned);
      setPlans(p);
      const requested = searchParams.get('businessId');
      setSelectedBusinessId(current => requested && owned.some(b => b.id === requested)
        ? requested
        : current && owned.some(b => b.id === current)
          ? current
          : owned.length === 1 ? owned[0].id : '');
    }).catch(() => toast.error('Failed to load subscription data'))
      .finally(() => setLoading(false));
  }, [user?.id, searchParams]);

  useEffect(() => {
    if (!selectedBusinessId) { setSub(null); return; }
    setLoading(true);
    client.get('/api/subscriptions/my', { params: { business_id: selectedBusinessId } })
      .then(r => {
        const subscription = r.data as Subscription;
        setSub(subscription);
        if (subscription.currency === 'ETB' || subscription.currency === 'USD') {
          setSelectedCurrency(subscription.currency);
        }
      })
      .catch(() => toast.error('Failed to load this business subscription'))
      .finally(() => setLoading(false));
  }, [selectedBusinessId]);

  async function handleUpgrade(planKey: string) {
    if (!selectedBusinessId) {
      toast.error('Choose the business website for this subscription first.');
      return;
    }
    setUpgrading(planKey);
    try {
      const businessId = selectedBusinessId;
      const draftId = searchParams.get('draftId');
      const { data } = await client.post('/api/subscriptions/create', {
        plan: planKey,
        currency: selectedCurrency,
        ...(businessId ? { business_id: businessId } : {}),
        ...(draftId ? { draft_id: draftId } : {}),
      });
      window.location.href = data.checkout_url;
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string; response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? e?.message ?? e?.error ?? 'Failed to start subscription');
      setUpgrading(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await client.post('/api/subscriptions/cancel', { business_id: selectedBusinessId });
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
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.freemium;
  const storageGB = (sub?.storage_used_bytes ?? 0) / (1024 ** 3);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your plan and usage</p>
      </div>

      {requiredTier && (
        <div role="status" className="rounded-xl border border-amber-400/50 bg-amber-400/10 p-4 text-sm">
          <p className="font-semibold">Your selected website sections require the {requiredTierLabel} plan.</p>
          <p className="mt-1 text-muted-foreground">
            {requiredPlan ? `${formatMonthlyPrice(requiredPlan.prices[selectedCurrency], selectedCurrency)} per month. ` : ''}
            The plan is required to publish this website.
          </p>
        </div>
      )}

      {businesses.length > 1 && (
        <div className="space-y-2">
          <label htmlFor="subscription-business" className="text-sm font-medium">Business website</label>
          <select id="subscription-business" value={selectedBusinessId}
            onChange={event => setSelectedBusinessId(event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <option value="">Choose a business</option>
            {businesses.map(business => <option key={business.id} value={business.id}>{business.business_name}</option>)}
          </select>
        </div>
      )}
      {businesses.length > 1 && !selectedBusinessId && (
        <p className="text-sm text-muted-foreground" role="status">Select a business to view its subscription and available plans.</p>
      )}

      {!businesses.length && !loading && (
        <div className="rounded-xl border border-border p-4 text-sm">
          Create a Business profile before choosing a monthly plan.
          <Button className="ml-3" size="sm" onClick={() => router.push('/business/create')}>Create Business profile</Button>
        </div>
      )}

      {searchParams.get('upgraded') === '1' && searchParams.get('draftId') && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm">Your subscription is confirmed. Continue to your saved website draft and publish it.</p>
          <Button onClick={() => router.push(`/showroom/create?edit=${encodeURIComponent(searchParams.get('draftId')!)}`)}>Continue to website</Button>
        </div>
      )}

      {/* Current plan card */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current plan</p>
            <p className="text-xl font-bold mt-0.5 capitalize">
              {tier === 'freemium' ? 'No active plan' : tier === 'normal' ? 'Normal' : tier === 'premium' ? 'Premium' : 'Pro'}
            </p>
            {tier !== 'freemium' && (
              <p className="text-sm text-muted-foreground mt-1">Billing currency: {sub?.currency ?? 'ETB'}</p>
            )}
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
                Your site stays public through the paid period. After expiry, it is hidden after 24 hours and the overdue recovery schedule begins.
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
        <h2 className="text-sm font-semibold">Choose a monthly plan</h2>
        <div className="max-w-xs space-y-2">
          <label htmlFor="subscription-currency" className="text-sm font-medium">Billing currency</label>
          <select id="subscription-currency" name="billing_currency" value={selectedCurrency}
            onChange={event => {
              if (event.target.value === 'ETB' || event.target.value === 'USD') {
                setSelectedCurrency(event.target.value);
              }
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <option value="ETB">ETB — Ethiopian birr</option>
            <option value="USD">USD — US dollars</option>
          </select>
        </div>
        {PAID_PLAN_KEYS.map((planKey, index) => {
          const plan = plans?.[planKey];
          if (!plan) return null;
          const selected = tier === plan.tier;
          const currencyAvailable = plan.currencyAvailability[selectedCurrency];
          const accent = index === 0 ? 'border-slate-300/50' : index === 1 ? 'border-amber-400/50' : 'border-violet-400/50';
          return (
            <div key={planKey} className={`bg-card border rounded-2xl p-5 ${selected ? `ring-1 ring-primary/20 ${accent}` : requiredTier === plan.tier ? `ring-1 ring-amber-400/40 ${accent}` : 'border-border/50'}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{plan.label}</p>
                  <p className="text-2xl font-bold mt-0.5">{formatMonthlyPrice(plan.prices[selectedCurrency], selectedCurrency)}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                </div>
                {selected ? <Badge>Current plan</Badge> : requiredTier === plan.tier ? <Badge variant="outline">Required by your sections</Badge> : null}
                {!selected && (
                  <Button size="sm" onClick={() => handleUpgrade(planKey)} disabled={!!upgrading || !selectedBusinessId || !currencyAvailable}
                    className={index === 2 ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}>
                    {upgrading === planKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Choose plan'}
                  </Button>
                )}
              </div>
              {!currencyAvailable && (
                <p className="mb-3 text-sm text-muted-foreground" role="status">
                  Checkout is not configured for {selectedCurrency} on this plan yet.
                </p>
              )}
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {plan.features.map(feature => <li key={feature} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{feature}</li>)}
              </ul>
            </div>
          );
        })}
        <div className="bg-card border border-violet-400/40 rounded-2xl p-5">
          <div className="flex items-center gap-2"><Crown className="w-4 h-4 text-violet-500" /><p className="font-semibold">Enterprise</p></div>
          <p className="text-sm text-muted-foreground mt-1">Custom pricing in ETB or USD, with tailored plan and service terms.</p>
          <a href="mailto:support@nodbusiness.app?subject=Nodbusiness%20Enterprise%20plan"
            className="inline-flex mt-3 items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary">
            Contact Nodbusiness
          </a>
        </div>
      </div>
    </div>
  );
}

export default function BusinessSubscriptionPage() {
  return <ErrorBoundary><BusinessSubscription /></ErrorBoundary>;
}
