'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Eye, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const OPACITY_KEY  = 'nb_studio_panel_opacity';
export const MIN_OPACITY = 40;

function readOpacity(): number {
  try {
    const v = Number(localStorage.getItem(OPACITY_KEY));
    return v >= MIN_OPACITY && v <= 100 ? v : 100;
  } catch { return 100; }
}

function saveOpacity(v: number) {
  try { localStorage.setItem(OPACITY_KEY, String(v)); } catch { /* ok */ }
}

/**
 * Sections bottom-sheet for the phone Studio layout.
 *
 * Uses `position: fixed` so it can slide up past the Studio top bar
 * and the Wizard step bar, all the way to just below the app header.
 *
 * Drag behaviour is fully controlled by the parent (ShowroomCreate)
 * which measures window height and passes topPx / tabBarH down.
 *
 * Props:
 *  topPx          — distance from viewport top to sheet top (px)
 *  tabBarH        — height of the bottom tab bar (px) — sheet bottom sits here
 *  isMax          — true when sheet is near the top (removes rounded corners)
 *  isDragging     — true while the user is actively dragging
 *  onDragHandleDown    — pointerdown handler for the drag pill
 *  onDragHandleDoubleTap — double-tap handler to reset height
 */
export default function SeeThroughPanel({
  open, title, onClose, children,
  topPx, tabBarH, isMax, isDragging,
  onDragHandleDown, onDragHandleDoubleTap,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  topPx?: number;
  tabBarH?: number;
  isMax?: boolean;
  isDragging?: boolean;
  onDragHandleDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragHandleDoubleTap?: () => void;
}) {
  const [opacity,  setOpacity]  = useState(100);
  const [peeking,  setPeeking]  = useState(false);
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

  const changeOpacity = (v: number) => { setOpacity(v); saveOpacity(v); };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={title}
      className={`fixed inset-x-0 z-30 flex flex-col border-t border-border bg-card shadow-2xl transition-[opacity] duration-150
        ${isMax ? '' : 'rounded-t-2xl'}`}
      style={{
        top:     topPx  ?? 0,
        bottom:  tabBarH ?? 44,
        opacity: peeking ? 0.08 : opacity / 100,
      }}
    >
      {/* ── Drag handle ─────────────────────────────────────────────────── */}
      {onDragHandleDown && (
        <div
          role="separator"
          aria-label="Drag to resize panel"
          aria-orientation="horizontal"
          onPointerDown={onDragHandleDown}
          onDoubleClick={onDragHandleDoubleTap}
          className={`flex h-10 w-full shrink-0 cursor-row-resize select-none flex-col items-center justify-center gap-1
            ${isMax ? '' : 'rounded-t-2xl'}
            ${isDragging ? 'bg-primary/20' : 'hover:bg-secondary/60 active:bg-primary/20'}
            transition-colors touch-none`}
        >
          <span
            aria-hidden="true"
            className={`block h-1.5 w-12 rounded-full transition-colors
              ${isDragging ? 'bg-primary' : 'bg-muted-foreground/40'}`}
          />
          <span aria-hidden="true" className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className={`h-1 w-1 rounded-full transition-colors
                ${isDragging ? 'bg-primary' : 'bg-muted-foreground/25'}`} />
            ))}
          </span>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
        <p className="text-sm font-bold">{title}</p>

        <label className="ml-auto hidden min-[360px]:flex w-28 items-center gap-2 text-[11px] text-muted-foreground">
          <span className="shrink-0">Opacity</span>
          <Slider
            min={MIN_OPACITY} max={100} step={10}
            value={[opacity]}
            onValueChange={(v: number[]) => changeOpacity(v[0])}
            aria-label="Panel opacity"
          />
        </label>

        <button
          type="button"
          aria-label={`Opacity: ${opacity}%`}
          onClick={() => changeOpacity(opacity > MIN_OPACITY ? MIN_OPACITY : 100)}
          className="ml-auto flex min-[360px]:hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </button>

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

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className={`min-h-0 flex-1 overflow-hidden ${peeking ? 'pointer-events-none' : ''}`}>
        {children}
      </div>
    </div>
  );
}
