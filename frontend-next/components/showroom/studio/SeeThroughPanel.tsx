'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const OPACITY_KEY  = 'nb_studio_panel_opacity';
const HEIGHT_KEY   = 'nb_studio_panel_height_pct';
export const MIN_OPACITY = 40;

// Height as a percentage of the containing block (clamped).
const MIN_H_PCT = 20;
const MAX_H_PCT = 92;
const DEFAULT_H_PCT = 60;

function readOpacity(): number {
  try {
    const v = Number(localStorage.getItem(OPACITY_KEY));
    return v >= MIN_OPACITY && v <= 100 ? v : 100;
  } catch { return 100; }
}

function readHeightPct(): number {
  try {
    const v = Number(localStorage.getItem(HEIGHT_KEY));
    return v >= MIN_H_PCT && v <= MAX_H_PCT ? v : DEFAULT_H_PCT;
  } catch { return DEFAULT_H_PCT; }
}

function save(key: string, value: number) {
  try { localStorage.setItem(key, String(Math.round(value))); } catch { /* ok */ }
}

/**
 * A bottom-sheet panel that slides up over the live preview.
 *
 * - Drag the pill handle at the top to resize (20 % – 92 % of container height).
 * - Double-tap the pill to reset to 60 %.
 * - Adjust opacity with the slider (remembered on this device).
 * - Hold the Eye button to peek through; Escape or × to close.
 */
export default function SeeThroughPanel({
  open, title, onClose, children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [opacity,    setOpacity]    = useState(100);
  const [heightPct,  setHeightPct]  = useState(DEFAULT_H_PCT);
  const [peeking,    setPeeking]    = useState(false);
  const [dragging,   setDragging]   = useState(false);
  const closeRef   = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY     = useRef(0);
  const startH     = useRef(DEFAULT_H_PCT);

  // Restore persisted values on mount.
  useEffect(() => {
    setOpacity(readOpacity());
    setHeightPct(readHeightPct());
  }, []);

  // Focus trap + Escape key.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const changeOpacity = (v: number) => {
    setOpacity(v);
    save(OPACITY_KEY, v);
  };

  // ── Drag-to-resize handlers ──────────────────────────────────────────────
  const onDragMove = useCallback((e: PointerEvent) => {
    const container = containerRef.current?.parentElement;
    if (!container) return;
    const containerH = container.getBoundingClientRect().height;
    if (containerH === 0) return;
    // Panel grows upward: dragging UP increases height, dragging DOWN decreases it.
    const deltaY   = startY.current - e.clientY;
    const deltaPct = (deltaY / containerH) * 100;
    const next     = Math.max(MIN_H_PCT, Math.min(MAX_H_PCT, startH.current + deltaPct));
    setHeightPct(next);
  }, []);

  const onDragEnd = useCallback((e: PointerEvent) => {
    setDragging(false);
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup',   onDragEnd);
    setHeightPct(h => { save(HEIGHT_KEY, h); return h; });
  }, [onDragMove]);

  const onDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startY.current = e.clientY;
    startH.current = heightPct;
    setDragging(true);
    document.body.style.cursor     = 'row-resize';
    document.body.style.userSelect = 'none';
    (e.target as Element).setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup',   onDragEnd);
  }, [heightPct, onDragMove, onDragEnd]);

  const onDragDoubleTap = useCallback(() => {
    setHeightPct(DEFAULT_H_PCT);
    save(HEIGHT_KEY, DEFAULT_H_PCT);
  }, []);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl transition-[opacity] duration-150"
      style={{
        height:  `${heightPct}%`,
        opacity: peeking ? 0.08 : opacity / 100,
      }}
    >
      {/* ── Drag handle pill ──────────────────────────────────────────────── */}
      <div
        role="separator"
        aria-label="Drag to resize panel"
        aria-orientation="horizontal"
        onPointerDown={onDragStart}
        onDoubleClick={onDragDoubleTap}
        className={`flex h-6 w-full shrink-0 cursor-row-resize select-none items-center justify-center rounded-t-2xl
          ${dragging ? 'bg-amber-400/20' : 'hover:bg-secondary/60'} transition-colors`}
      >
        {/* Visual pill */}
        <span
          aria-hidden="true"
          className={`h-1 w-10 rounded-full transition-colors ${dragging ? 'bg-amber-500' : 'bg-border'}`}
        />
      </div>

      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
        <p className="text-sm font-bold">{title}</p>

        {/* Opacity slider — hidden below 360 px to preserve space */}
        <label className="ml-auto hidden min-[360px]:flex w-28 items-center gap-2 text-[11px] text-muted-foreground">
          <span className="shrink-0">Opacity</span>
          <Slider
            min={MIN_OPACITY} max={100} step={10}
            value={[opacity]}
            onValueChange={(v: number[]) => changeOpacity(v[0])}
            aria-label="Panel opacity"
          />
        </label>

        {/* Narrow fallback: single tap-to-toggle opacity button */}
        <button
          type="button"
          aria-label={`Opacity: ${opacity}%`}
          onClick={() => changeOpacity(opacity > MIN_OPACITY ? MIN_OPACITY : 100)}
          className="ml-auto flex min-[360px]:hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Peek button — hidden on very narrow screens */}
        <button
          type="button"
          aria-label="Hold to peek at your page"
          onPointerDown={() => setPeeking(true)}
          onPointerUp={() => setPeeking(false)}
          onPointerLeave={() => setPeeking(false)}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setPeeking(true); }}
          onKeyUp={() => setPeeking(false)}
          className="hidden min-[360px]:flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className={`min-h-0 flex-1 overflow-hidden ${peeking ? 'pointer-events-none' : ''}`}>
        {children}
      </div>
    </div>
  );
}
