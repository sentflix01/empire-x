'use client'
/**
 * Stars.tsx — star ratings shared by product and business reviews.
 *
 * StarRating: five stars, interactive when onChange is given.
 * RatingSummary: a compact "★ 4.5 · 12 reviews" line; renders nothing when
 * there are no reviews, so cards keep their height rules.
 */
import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StarRatingProps {
  value: number;
  onChange?: (n: number) => void;
  size?: 'sm' | 'md';
  label?: string;
}

export function StarRating({ value, onChange, size = 'md', label }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  const cls = (filled: boolean) => `${iconSize} transition-colors ${filled ? 'fill-rating text-rating' : 'text-muted-foreground'}`;

  if (onChange) {
    return (
      <div className="flex gap-0.5" role="radiogroup" aria-label={label ?? 'Rating'}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${n} star${n !== 1 ? 's' : ''}`}
          >
            <Star className={cls(n <= (hover || value))} aria-hidden="true" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cls(n <= Math.round(value))} aria-hidden="true" />)}
    </div>
  );
}

interface RatingSummaryProps {
  average: number | string | null | undefined;
  count: number | null | undefined;
  className?: string;
}

export function RatingSummary({ average, count, className = '' }: RatingSummaryProps) {
  const { t } = useTranslation();
  const n = Number(count ?? 0);
  if (!n || average === null || average === undefined) return null;
  const avg = Number(average).toFixed(1);
  const word = n === 1 ? t('reviews.one', 'review') : t('reviews.many', 'reviews');
  return (
    <span data-testid="rating-summary" className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
      <Star className="w-3.5 h-3.5 fill-rating text-rating" aria-hidden="true" />
      <span className="font-semibold text-foreground">{avg}</span>
      <span aria-hidden="true">·</span>
      <span>{n} {word}</span>
    </span>
  );
}
