'use client'
/**
 * DistanceRange — the viewer chooses how far around them to look, instead of
 * a fixed set of distances: a slider from 1 to 100 km with − / + buttons
 * (1 km steps up to 10 km, 5 km up to 50 km, then 10 km), and optionally
 * "Anywhere". Used by the Business feed ("Near you"), Search and the maps.
 *
 * The slider moves freely; the chosen distance is reported once the viewer
 * stops (after a short pause), so dragging does not send a request per km.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DISTANCE_MIN_KM = 1;
export const DISTANCE_MAX_KM = 100;

export function nextDistance(km: number): number {
  const step = km < 10 ? 1 : km < 50 ? 5 : 10;
  return Math.min(DISTANCE_MAX_KM, Math.floor(km / step) * step + step);
}

export function previousDistance(km: number): number {
  const step = km <= 10 ? 1 : km <= 50 ? 5 : 10;
  return Math.max(DISTANCE_MIN_KM, Math.ceil(km / step) * step - step);
}

interface Props {
  /** Kilometres, or null for "Anywhere" (only with allowAnywhere). */
  value: number | null;
  onChange: (km: number | null) => void;
  allowAnywhere?: boolean;
  /** Distance used when the viewer leaves "Anywhere". */
  defaultKm?: number;
  id?: string;
  className?: string;
  /** Milliseconds to wait after the last change before reporting it. */
  settleMs?: number;
}

export default function DistanceRange({ value, onChange, allowAnywhere = false, defaultKm = 10, id = 'distance-range', className = '', settleMs = 400 }: Props) {
  const { t } = useTranslation();
  const [km, setKm] = useState<number | null>(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setKm(value); }, [value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const choose = (next: number | null, now = false) => {
    setKm(next);
    if (timer.current) clearTimeout(timer.current);
    if (now) { onChange(next); return; }
    timer.current = setTimeout(() => onChange(next), settleMs);
  };

  const anywhere = km === null;
  const shown = km ?? defaultKm;
  const label = anywhere ? t('distance.anywhere', 'Anywhere') : `${t('distance.within', 'Within')} ${shown} km`;

  return (
    <div className={`space-y-1.5 ${className}`} data-testid="distance-range">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">{t('distance.howFar', 'How far to look')}</label>
        <span className="text-xs font-semibold text-foreground" aria-live="polite" data-testid="distance-label">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => choose(previousDistance(shown))} disabled={anywhere || shown <= DISTANCE_MIN_KM}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card hover:bg-secondary disabled:opacity-40"
          aria-label={t('distance.closer', 'Closer')}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          id={id} type="range" min={DISTANCE_MIN_KM} max={DISTANCE_MAX_KM} step={1} value={shown} disabled={anywhere}
          onChange={(e) => choose(Number(e.target.value))}
          aria-valuetext={label}
          className="h-2 w-full cursor-pointer accent-primary disabled:cursor-default disabled:opacity-40"
        />
        <button type="button" onClick={() => choose(nextDistance(shown))} disabled={anywhere || shown >= DISTANCE_MAX_KM}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card hover:bg-secondary disabled:opacity-40"
          aria-label={t('distance.farther', 'Farther')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {allowAnywhere && (
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={anywhere} onChange={(e) => choose(e.target.checked ? null : defaultKm, true)} className="h-4 w-4 accent-primary" />
          {t('distance.anywhereToggle', 'Anywhere (no distance limit)')}
        </label>
      )}
    </div>
  );
}
