'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Eye, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const OPACITY_KEY = 'nb_studio_panel_opacity';
export const MIN_OPACITY = 40;

function readOpacity(): number {
  try {
    const v = Number(localStorage.getItem(OPACITY_KEY));
    return v >= MIN_OPACITY && v <= 100 ? v : 100;
  } catch { return 100; }
}

/**
 * A panel that slides up over the live preview without blocking it: the owner
 * can make it see-through (40–100%, remembered on this device) or hold "Peek"
 * to look at the page underneath. Escape or × closes it.
 */
export default function SeeThroughPanel({ open, title, onClose, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [opacity, setOpacity] = useState(100);
  const [peeking, setPeeking] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpacity(readOpacity()); }, []);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const changeOpacity = (v: number) => {
    setOpacity(v);
    try { localStorage.setItem(OPACITY_KEY, String(v)); } catch { /* remembered for this visit only */ }
  };

  return (
    <div role="dialog" aria-modal="false" aria-label={title}
      className="absolute inset-x-0 bottom-0 z-30 flex h-[78%] flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl transition-opacity"
      style={{ opacity: peeking ? 0.08 : opacity / 100 }}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <p className="text-sm font-bold">{title}</p>
        {/* Opacity slider — hidden on very narrow screens to preserve space */}
        <label className="ml-auto hidden min-[360px]:flex w-32 items-center gap-2 text-[11px] text-muted-foreground">
          <span className="shrink-0">See-through</span>
          <Slider min={MIN_OPACITY} max={100} step={10} value={[opacity]} onValueChange={(v: number[]) => changeOpacity(v[0])}
            aria-label="Panel see-through level" />
        </label>
        {/* On very narrow screens: just a compact icon button that cycles opacity */}
        <button
          type="button"
          aria-label={`See-through: ${opacity}%`}
          onClick={() => changeOpacity(opacity > MIN_OPACITY ? MIN_OPACITY : 100)}
          className="ml-auto flex min-[360px]:hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Hold to peek at your page"
          onPointerDown={() => setPeeking(true)} onPointerUp={() => setPeeking(false)} onPointerLeave={() => setPeeking(false)}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setPeeking(true); }} onKeyUp={() => setPeeking(false)}
          className="hidden min-[360px]:flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
          <Eye className="h-4 w-4" aria-hidden="true" />
        </button>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={`Close ${title}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className={`min-h-0 flex-1 ${peeking ? 'pointer-events-none' : ''}`}>{children}</div>
    </div>
  );
}
