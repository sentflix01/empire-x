'use client';
/**
 * /business/subscription/return — where Chapa sends the owner after paying.
 * Polls the payment, which the backend re-verifies with Chapa, so the plan
 * activates even when Chapa's webhook is late ("Payment received, activating").
 */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import { TIER_LABEL, formatBirr, formatDate, getPaymentStatus, type PaymentStatusResult } from '@/lib/etbBilling';

const POLL_MS = 2500;
/** After this long without confirmation, stop polling and explain what happens next. */
const GIVE_UP_MS = 2 * 60 * 1000;

function SubscriptionReturn() {
  const params = useSearchParams();
  const txRef = params.get('tx_ref') ?? '';
  const [result, setResult] = useState<PaymentStatusResult | null>(null);
  const [error, setError] = useState('');
  const [timedOut, setTimedOut] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => {
    if (!txRef) { setError('This page needs a payment reference.'); return; }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      try {
        const res = await getPaymentStatus(txRef);
        if (cancelled) return;
        setResult(res);
        setError('');
        if (res.status === 'pending') {
          if (Date.now() - started.current > GIVE_UP_MS) { setTimedOut(true); return; }
          timer = setTimeout(check, POLL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(apiErrorMessage(err, 'We could not check this payment yet.'));
        if (Date.now() - started.current <= GIVE_UP_MS) timer = setTimeout(check, POLL_MS * 2);
      }
    };
    void check();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [txRef]);

  const businessId = result?.business_id ?? params.get('businessId') ?? '';
  const planHref = `/business/subscription${businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''}`;

  return (
    <div className="mx-auto max-w-md space-y-5 py-8">
      {result?.status === 'paid' ? (
        <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-foreground">Payment received</h1>
          <p className="text-sm text-muted-foreground">
            Your {TIER_LABEL[result.tier]} plan is active until <strong className="text-foreground">{formatDate(result.period_end)}</strong>.
          </p>
          <dl className="grid grid-cols-2 gap-y-1 rounded-xl bg-secondary/50 p-3 text-left text-sm">
            <dt className="text-muted-foreground">Amount</dt><dd className="text-right font-semibold text-foreground">{formatBirr(result.amount)}</dd>
            <dt className="text-muted-foreground">Receipt</dt><dd className="text-right text-foreground">{result.receipt_number}</dd>
          </dl>
          {result.draft_id && (
            <p className="text-sm text-foreground">Your website has been published.</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {result.draft_id && (
              <Link href={`/showrooms/${result.draft_id}`} className="inline-flex justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">View your website</Link>
            )}
            <Link href={`/business/subscription/receipt/${result.payment_id}`} className="inline-flex justify-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">View receipt</Link>
            <Link href={planHref} className="inline-flex justify-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">Back to plan</Link>
          </div>
        </div>
      ) : result && (result.status === 'failed' || result.status === 'expired') ? (
        <div className="space-y-4 rounded-2xl border border-destructive/30 bg-card p-6 text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-foreground">Payment didn&apos;t go through</h1>
          <p className="text-sm text-muted-foreground">No plan was charged to your business. {result.draft_id ? 'Your website draft is still saved. ' : ''}You can try again.</p>
          <Link href={planHref} className="inline-flex justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Try again</Link>
        </div>
      ) : timedOut ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
          <Clock className="mx-auto h-12 w-12 text-amber-500" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-foreground">Still waiting for Chapa</h1>
          <p className="text-sm text-muted-foreground">
            If you completed the payment, your plan activates automatically as soon as Chapa confirms it, and you&apos;ll get a notification. You don&apos;t need to pay again.
          </p>
          <Link href={planHref} className="inline-flex justify-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">Back to plan</Link>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-6 text-center" role="status" aria-live="polite">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden="true" />
          <h1 className="font-display text-xl font-bold text-foreground">Payment received, activating…</h1>
          <p className="text-sm text-muted-foreground">We&apos;re confirming your payment with Chapa. This usually takes a few seconds. Please keep this page open.</p>
          {error && <p className="text-xs text-muted-foreground">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default function SubscriptionReturnPage() {
  return <ErrorBoundary><SubscriptionReturn /></ErrorBoundary>;
}
