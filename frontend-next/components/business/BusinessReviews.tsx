'use client'
/**
 * BusinessReviews.tsx — what verified customers say about a business:
 * the average, the count and the latest reviews, with "Show more".
 * Renders nothing until the business has at least one review.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StarRating, RatingSummary } from '@/components/ui/Stars';
import { Button } from '@/components/ui/button';
import { fetchBusinessReviews, type BusinessReview } from '@/api/businessReviews';

export default function BusinessReviews({ businessId }: { businessId: string }) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [next, setNext] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetchBusinessReviews(businessId).then((page) => {
      if (!live) return;
      setReviews(page.reviews);
      setSummary({ average: page.average_rating, count: page.review_count });
      setNext(page.next_offset);
    }).catch(() => { /* reviews are optional on the page */ });
    return () => { live = false; };
  }, [businessId]);

  const more = async () => {
    if (next === null) return;
    setBusy(true);
    try {
      const page = await fetchBusinessReviews(businessId, next);
      setReviews((r) => [...r, ...page.reviews]);
      setNext(page.next_offset);
    } finally { setBusy(false); }
  };

  if (!summary.count) return null;

  return (
    <section id="section-reviews" aria-labelledby="biz-reviews-title" className="px-5 py-8 border-t border-border/30">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <h2 id="biz-reviews-title" className="font-display text-xl font-bold">{t('reviews.title', 'Customer reviews')}</h2>
          <RatingSummary average={summary.average} count={summary.count} className="text-sm" />
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('reviews.verifiedNote', 'Only customers with a completed order can review.')}</p>
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} data-testid="business-review" className="rounded-xl border border-border/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{r.reviewer_name || t('reviews.customer', 'Customer')}</span>
                <StarRating value={r.rating} size="sm" />
              </div>
              {r.comment && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line break-words">{r.comment}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
            </li>
          ))}
        </ul>
        {next !== null && (
          <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={more} disabled={busy}>
            {t('reviews.showMore', 'Show more reviews')}
          </Button>
        )}
      </div>
    </section>
  );
}
