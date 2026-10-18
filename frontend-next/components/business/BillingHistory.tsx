'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2 } from 'lucide-react';
import { describePayment, formatBirr, formatDate, getPayments, type PaymentStatus, type SubscriptionPayment } from '@/lib/etbBilling';

const STATUS: Record<PaymentStatus, { label: string; cls: string }> = {
  paid: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  pending: { label: 'Waiting', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  expired: { label: 'Not completed', cls: 'bg-secondary text-muted-foreground' },
};

/** The business's ETB plan payments, newest first, with receipts for paid ones. */
export default function BillingHistory({ businessId, refreshKey = 0 }: { businessId: string; refreshKey?: number }) {
  const [payments, setPayments] = useState<SubscriptionPayment[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPayments(null);
    setFailed(false);
    getPayments(businessId)
      .then((rows) => { if (!cancelled) setPayments(rows); })
      .catch(() => { if (!cancelled) { setFailed(true); setPayments([]); } });
    return () => { cancelled = true; };
  }, [businessId, refreshKey]);

  return (
    <section aria-labelledby="billing-history-title" className="space-y-3 rounded-2xl border border-border/50 bg-card p-5">
      <h2 id="billing-history-title" className="text-sm font-semibold text-foreground">Billing history</h2>
      {payments === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…</p>
      ) : failed ? (
        <p className="text-sm text-muted-foreground">Billing history could not be loaded. Refresh to try again.</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments yet. Receipts for ETB plan payments appear here.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{describePayment(p)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(p.paid_at ?? p.created_at)}
                  {p.status === 'paid' && p.period_end ? ` · active until ${formatDate(p.period_end)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{formatBirr(p.amount)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[p.status]?.cls ?? ''}`}>{STATUS[p.status]?.label ?? p.status}</span>
                {p.status === 'pending' && p.checkout_url && (
                  <a href={p.checkout_url} className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                    Continue payment
                  </a>
                )}
                {p.status === 'paid' && (
                  <Link href={`/business/subscription/receipt/${p.id}`} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Receipt
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
