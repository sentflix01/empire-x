'use client'
/**
 * RateBusinessPrompt — on a completed order, asks the signed-in buyer to rate
 * the business (decision "Business reviews: verified customers only").
 * Asks the server first (GET …/reviews/mine) and renders nothing unless the
 * viewer may review; a buyer who already reviewed can edit their stars.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { StarRating } from '@/components/ui/Stars';
import { Button } from '@/components/ui/button';
import { fetchMyBusinessReview, saveBusinessReview } from '@/api/businessReviews';

export default function RateBusinessPrompt({ businessId, businessName }: { businessId: string; businessName?: string | null }) {
  const { t } = useTranslation();
  const [eligible, setEligible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hadReview, setHadReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    fetchMyBusinessReview(businessId).then((mine) => {
      if (!live || !mine?.can_review) return;
      setEligible(true);
      if (mine.review) {
        setHadReview(true);
        setRating(mine.review.rating);
        setComment(mine.review.comment ?? '');
      }
    }).catch(() => { /* signed out or offline: no prompt */ });
    return () => { live = false; };
  }, [businessId]);

  if (!eligible) return null;
  if (done) {
    return <p data-testid="rate-business-done" role="status" className="text-sm text-success">{t('reviews.thanks', 'Thanks — your review helps other customers.')}</p>;
  }

  const send = async () => {
    if (!rating) return;
    setSaving(true);
    try {
      await saveBusinessReview(businessId, rating, comment);
      setDone(true);
    } catch {
      toast.error(t('reviews.saveFailed', 'Could not save your review. Please try again.'));
    } finally { setSaving(false); }
  };

  const titleId = `rate-${businessId}`;
  return (
    <section data-testid="rate-business" aria-labelledby={titleId} className="rounded-xl border border-border/50 bg-secondary/30 p-3 space-y-2">
      <h3 id={titleId} className="text-sm font-semibold">
        {hadReview ? t('reviews.editTitle', 'Your review') : t('reviews.rateTitle', 'Rate this business')}{businessName ? `: ${businessName}` : ''}
      </h3>
      <StarRating value={rating} onChange={setRating} label={t('reviews.rateTitle', 'Rate this business')} />
      <label htmlFor={`${titleId}-comment`} className="sr-only">{t('reviews.commentLabel', 'Comment (optional)')}</label>
      <textarea
        id={`${titleId}-comment`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder={t('reviews.commentPlaceholder', 'What went well? (optional)')}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
      <Button size="sm" className="rounded-full" onClick={send} disabled={!rating || saving}>
        {hadReview ? t('reviews.update', 'Update review') : t('reviews.submit', 'Send review')}
      </Button>
    </section>
  );
}
