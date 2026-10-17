'use client';
/** /business/subscription/receipt/[id] — a paid ETB plan payment's receipt, with PDF download. */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import BrandLogo from '@/components/brand/BrandLogo';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import { describePayment, formatBirr, formatDate, getReceipt, type SubscriptionReceipt as Receipt } from '@/lib/etbBilling';
import { generateSubscriptionReceipt } from '@/lib/generateSubscriptionReceipt';

function SubscriptionReceipt() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getReceipt(id).then(setReceipt).catch((err) => setError(apiErrorMessage(err, 'This receipt could not be found.')));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link href="/business/subscription" className="text-sm font-medium text-primary hover:underline">Back to plan</Link>
      </div>
    );
  }
  if (!receipt) {
    return <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Loading receipt" /></div>;
  }

  const rows: Array<[string, string]> = [
    ['Business', receipt.business_name],
    ['Plan', describePayment(receipt)],
    ['Active from', formatDate(receipt.period_start)],
    ['Active until', formatDate(receipt.period_end)],
    ['Paid on', formatDate(receipt.paid_at)],
    ['Paid with', receipt.provider === 'chapa' ? 'Chapa (telebirr, bank or card)' : receipt.provider],
    ['Payment reference', receipt.provider_ref],
  ];

  return (
    <div className="mx-auto max-w-lg space-y-4 py-4">
      <Link href={`/business/subscription?businessId=${encodeURIComponent(receipt.business_id)}`} className="inline-flex items-center gap-1.5 text-sm text-foreground/80 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to plan
      </Link>
      <article className="overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between gap-3 bg-primary px-5 py-4 text-primary-foreground">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-9 w-9" />
            <div>
              <p className="font-display text-lg font-bold">Nodbusiness</p>
              <p className="text-xs opacity-90">Plan payment receipt</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide opacity-90">Receipt</p>
            <p className="font-mono text-sm font-semibold">{receipt.receipt_number}</p>
          </div>
        </header>
        <dl className="divide-y divide-border/60 px-5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-all text-right text-foreground">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 py-3">
            <dt className="font-semibold text-foreground">Total paid</dt>
            <dd className="text-lg font-bold text-foreground">{formatBirr(receipt.amount)}</dd>
          </div>
        </dl>
        <p className="px-5 pb-4 text-xs text-muted-foreground">Prepaid plan: there are no automatic charges. Renew before the end date to keep your website published.</p>
      </article>
      <button
        type="button"
        onClick={async () => { setDownloading(true); try { await generateSubscriptionReceipt(receipt); } finally { setDownloading(false); } }}
        disabled={downloading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />} Download PDF
      </button>
    </div>
  );
}

export default function SubscriptionReceiptPage() {
  return <ErrorBoundary><SubscriptionReceipt /></ErrorBoundary>;
}
