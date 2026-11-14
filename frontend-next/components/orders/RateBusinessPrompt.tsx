'use client'
/**
 * RateBusinessPrompt — on a completed order, asks the signed-in buyer to rate
 * the business (decision "Business reviews: verified customers only").
 * Asks the server first (GET …/reviews/mine) and renders nothing unless the
 * viewer may review; a buyer who already reviewed can edit their stars.
 * With `explain` (the reviews block on every website), a viewer who may not
 * review sees why: signed out, the owner, or no completed order yet.
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { StarRating } from '@/components/ui/Stars';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { fetchMyBusinessReview, saveBusinessReview } from '@/lib/api/businessReviews';

type Reason = 'signed_out' | 'owner' | 'no_completed_order' | null;

export default function RateBusinessPrompt({ businessId, businessName, explain = false, onSaved }: { businessId: string; businessName?: string | null; explain?: boolean; onSaved?: () => void }) {
  const { t } = useTranslation();
  const [eligible, setEligible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hadReview, setHadReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState<Reason>(null);
  const { user, authChecked } = useAuth();

  useEffect(() => {
    let live = true;
    if (!authChecked) return () => { live = false; };
    // Signed out: nothing to ask the server (and no refresh-token round trip).
    if (!user) { setEligible(false); setReason('signed_out'); return () => { live = false; }; }
    fetchMyBusinessReview(businessId).then((mine) => {
      if (!live) return;
      if (!mine?.can_review) { setReason(mine?.reason === 'owner' ? 'owner' : 'no_completed_order'); return; }
      setEligible(true);
      if (mine.review) {
        setHadReview(true);
        setRating(mine.review.rating);
        setComment(mine.review.comment ?? '');
      }
    }).catch((err: { status?: number; response?: { status?: number } } | null) => {
      // 401: signed out. Anything else (offline): show nothing.
      const status = err?.status ?? err?.response?.status;
      if (live && status === 401) setReason('signed_out');
    });
    return () => { live = false; };
  }, [businessId, user, authChecked]);

  if (!eligible) {
    if (!explain || !reason) return null;
    const next = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : '';
    return (
      <p data-testid="rate-business-reason" className="text-xs text-muted-foreground">
        {reason === 'owner'
          ? t('reviews.ownerNote', 'This is your business. Reviews come from your customers after a completed order.')
          : reason === 'signed_out'
            ? <>{t('reviews.signInNote', 'Bought from this business?')} <Link href={`/login?return=${next}`} className="font-medium text-primary underline-offset-4 hover:underline">{t('reviews.signInLink', 'Sign in to leave a review')}</Link></>
            : t('reviews.notEligible', 'You can review this business after your order with them is completed.')}
      </p>
    );
  }
  if (done) {
    return <p data-testid="rate-business-done" role="status" className="text-sm text-success">{t('reviews.thanks', 'Thanks — your review helps other customers.')}</p>;
  }

  const send = async () => {
    if (!rating) return;
    setSaving(true);
    try {
      await saveBusinessReview(businessId, rating, comment);
      setDone(true);
      onSaved?.();
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
