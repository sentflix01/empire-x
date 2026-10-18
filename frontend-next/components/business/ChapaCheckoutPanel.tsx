'use client';
import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TestModeHelper from '@/components/business/TestModeHelper';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import {
  PREPAY_MONTHS, TIER_LABEL, formatBirr, formatDate, getQuote, startChapaCheckout,
  type EtbQuote, type PaidTier,
} from '@/lib/etbBilling';

interface Props {
  businessId: string;
  plan: PaidTier;
  /** The website draft to publish once the payment is confirmed. */
  draftId?: string | null;
  /** Chapa test keys: show the published test numbers and cards. */
  testMode?: boolean;
  onClose: () => void;
}

/**
 * Step between "Choose plan" and Chapa: the owner picks how many months to
 * prepay and sees the server's exact amount and new end date before paying.
 */
export default function ChapaCheckoutPanel({ businessId, plan, draftId, testMode = false, onClose }: Props) {
  const [months, setMonths] = useState(1);
  const [quote, setQuote] = useState<EtbQuote | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getQuote(businessId, plan, months)
      .then((q) => { if (!cancelled) setQuote(q); })
      .catch((err) => {
        if (cancelled) return;
        setQuote(null);
        setError(apiErrorMessage(err, 'Could not price this plan.'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [businessId, plan, months]);

  // An upgrade may add 0 months (pay only the difference); other payments buy at least one.
  const isUpgrade = quote?.kind === 'upgrade';
  const monthChoices = isUpgrade ? [0, ...PREPAY_MONTHS] : [...PREPAY_MONTHS];

  const pay = async () => {
    if (!quote || paying) return;
    setPaying(true);
    try {
      const { checkout_url } = await startChapaCheckout({ businessId, plan, months: quote.months, draftId });
      window.location.href = checkout_url;
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start the payment. Try again.'));
      setPaying(false);
    }
  };

  return (
    <section aria-label={`Pay for the ${TIER_LABEL[plan]} plan`} className="mt-3 space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {isUpgrade ? `Upgrade to ${TIER_LABEL[plan]}` : quote?.kind === 'renewal' ? `Renew ${TIER_LABEL[plan]}` : `Pay for ${TIER_LABEL[plan]}`}
        </p>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-secondary">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{isUpgrade ? 'Add months (optional)' : 'Pay for'}</legend>
        <div className="flex flex-wrap gap-2">
          {monthChoices.map((m) => (
            <label key={m} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${months === m ? 'border-primary bg-primary/10 font-semibold text-foreground' : 'border-border text-foreground hover:bg-secondary'}`}>
              <input type="radio" name="prepay-months" value={m} checked={months === m} onChange={() => setMonths(m)} className="sr-only" />
              {m === 0 ? 'No extra months' : `${m} month${m === 1 ? '' : 's'}`}
            </label>
          ))}
        </div>
      </fieldset>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Calculating…</p>
      ) : quote ? (
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-muted-foreground">You pay</dt>
          <dd className="text-right text-lg font-bold text-foreground" data-testid="quote-amount">{formatBirr(quote.amount)}</dd>
          <dt className="text-muted-foreground">Active until</dt>
          <dd className="text-right text-foreground">{formatDate(quote.periodEnd)}</dd>
          {isUpgrade && <dd className="col-span-2 text-xs text-muted-foreground">Only the price difference for the days left in your current period{quote.months ? ', plus the added months' : ''}.</dd>}
          {quote.kind === 'new' && new Date(quote.periodStart).getTime() > Date.now() + 60_000 && (
            <dd className="col-span-2 text-xs text-muted-foreground">Paid time starts on {formatDate(quote.periodStart)}, when your free period ends.</dd>
          )}
        </dl>
      ) : null}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {testMode && <TestModeHelper provider="chapa" />}

      <Button onClick={pay} disabled={!quote || loading || paying} className="w-full rounded-full">
        {paying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : quote ? `Pay ${formatBirr(quote.amount)} with Chapa` : 'Pay with Chapa'}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> telebirr, CBE Birr, bank or card, on Chapa&apos;s secure page. No automatic charges.
      </p>
    </section>
  );
}
