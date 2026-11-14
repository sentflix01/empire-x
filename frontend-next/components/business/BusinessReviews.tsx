'use client'
/**
 * BusinessReviews.tsx — customer reviews, added by the platform to every
 * published website and business profile (decision "Reviews are
 * platform-owned and mandatory on every website", 14 Nov 2026).
 *
 * Owners cannot add, edit, hide or remove this block: it is not a builder
 * section. It shows the average and count, the latest reviews with a
 * "Verified customer" badge, "Show more", and an empty state. Below the list a
 * signed-in customer with a completed order can rate the business; everyone
 * else sees why they cannot (RateBusinessPrompt explain mode).
 * Without a business (an old or demo site) it says reviews are not available.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StarRating, RatingSummary } from '@/components/ui/Stars';
import { Button } from '@/components/ui/button';
import RateBusinessPrompt from '@/components/orders/RateBusinessPrompt';
import { fetchBusinessReviews, type BusinessReview } from '@/lib/api/businessReviews';

interface Props {
  businessId: string | null;
  businessName?: string | null;
  /** Called with the average and count once loaded (the site header shows them). */
  onSummary?: (summary: { average: number; count: number }) => void;
}

export default function BusinessReviews({ businessId, businessName, onSummary }: Props) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [next, setNext] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const page = await fetchBusinessReviews(businessId);
      setReviews(page.reviews);
      setSummary({ average: page.average_rating, count: page.review_count });
      onSummary?.({ average: page.average_rating, count: page.review_count });
      setNext(page.next_offset);
      setFailed(false);
    } catch { setFailed(true); } finally { setLoaded(true); }
  }, [businessId, onSummary]);

  useEffect(() => { void load(); }, [load]);

  const more = async () => {
    if (next === null || !businessId) return;
    setBusy(true);
    try {
      const page = await fetchBusinessReviews(businessId, next);
      setReviews((r) => [...r, ...page.reviews]);
      setNext(page.next_offset);
    } finally { setBusy(false); }
  };

  return (
    <section id="section-reviews" data-testid="site-reviews" aria-labelledby="biz-reviews-title" className="px-5 py-8 border-t border-border/30">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <h2 id="biz-reviews-title" className="font-display text-xl font-bold">{t('reviews.title', 'Customer reviews')}</h2>
          <RatingSummary average={summary.average} count={summary.count} className="text-sm" />
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('reviews.verifiedNote', 'Only customers with a completed order can review.')}</p>

        {!businessId ? (
          <p data-testid="site-reviews-unavailable" className="text-sm text-muted-foreground">
            {t('reviews.unavailable', 'Reviews are not available for this website yet.')}
          </p>
        ) : !loaded ? (
          <div className="h-16 rounded-xl bg-secondary/40 animate-pulse" aria-hidden="true" />
        ) : failed ? (
          <p className="text-sm text-muted-foreground">{t('reviews.loadFailed', 'Reviews could not be loaded. Please try again later.')}</p>
        ) : summary.count === 0 ? (
          <div data-testid="site-reviews-empty" className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            <MessageSquareText className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t('reviews.empty', 'No reviews yet. Reviews appear here after customers complete an order.')}
          </div>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} data-testid="business-review" className="rounded-xl border border-border/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{r.reviewer_name || t('reviews.customer', 'Customer')}</span>
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-success">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />{t('reviews.verified', 'Verified customer')}
                    </span>
                  </span>
                  <StarRating value={r.rating} size="sm" />
                </div>
                {r.comment && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line break-words">{r.comment}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              </li>
            ))}
          </ul>
        )}
        {next !== null && (
          <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={more} disabled={busy}>
            {t('reviews.showMore', 'Show more reviews')}
          </Button>
        )}
        {businessId && (
          <div className="mt-5">
            <RateBusinessPrompt businessId={businessId} businessName={businessName} explain onSaved={() => { void load(); }} />
          </div>
        )}
      </div>
    </section>
  );
}
