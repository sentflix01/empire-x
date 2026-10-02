'use client';
import Image from 'next/image';
/**
 * CoverPositionEditor — drag-to-pan cover positioning overlay.
 *
 * Renders the cover image fitted to the frame (object-fit: cover) and lets
 * the user drag it with pointer events (mouse + touch) to choose which part
 * stays visible. The result is a CSS object-position string like "50% 20%".
 *
 * COLOR RULE (user mandate):
 *   theme="primary" → personal cover controls (blue/purple tokens only)
 *   theme="gold"    → business cover controls (gold/amber scheme only)
 * Never mix the two schemes.
 */
import React, { useRef, useState } from 'react';
import { Check, X, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CoverEditorTheme = 'primary' | 'gold';

const THEMES: Record<CoverEditorTheme, {
  confirm: string; cancel: string; hint: string; trigger: string; frame: string;
}> = {
  primary: {
    confirm: 'bg-blue-600 hover:bg-blue-700 text-white',
    cancel: 'bg-slate-900/50 hover:bg-slate-900/70 text-white',
    hint: 'bg-blue-600/85 text-white',
    trigger: 'bg-blue-600/75 hover:bg-blue-600 text-white',
    frame: 'ring-2 ring-blue-400/90',
  },
  gold: {
    confirm: 'bg-amber-500 hover:bg-amber-600 text-white',
    cancel: 'bg-slate-900/50 hover:bg-slate-900/70 text-white',
    hint: 'bg-amber-500/90 text-white',
    trigger: 'bg-amber-500/80 hover:bg-amber-500 text-white',
    frame: 'ring-2 ring-amber-400/90',
  },
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

/** Parse a stored "x% y%" position; falls back to centered. */
export function parseCoverPosition(pos?: string | null): { x: number; y: number } {
  if (typeof pos === 'string') {
    const m = pos.match(/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/);
    if (m) {
      const x = parseFloat(m[1]);
      const y = parseFloat(m[2]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
      }
    }
  }
  return { x: 50, y: 50 };
}

interface CoverPositionEditorProps {
  src: string;
  /** Stored position ("x% y%") — empty/null = centered start. */
  position?: string | null;
  theme: CoverEditorTheme;
  onConfirm: (position: string) => void;
  onCancel: () => void;
  className?: string;
}

export default function CoverPositionEditor({
  src, position, theme, onConfirm, onCancel, className,
}: CoverPositionEditorProps) {
  const t = THEMES[theme];
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ id: number; startX: number; startY: number; startXpct: number; startYpct: number } | null>(null);
  const [pos, setPos] = useState(() => parseCoverPosition(position));
  const [dragging, setDragging] = useState(false);

  /**
   * Convert a drag delta (px) from the current percentage position into a
   * new clamped percentage. object-position p% shifts the image by
   * (frame − displayed) * p/100 px, so movement is linear in p.
   */
  const shiftBy = (dxPx: number, dyPx: number, fromX: number, fromY: number) => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img || !img.naturalWidth || !img.naturalHeight) return { x: fromX, y: fromY };
    const cw = frame.clientWidth, ch = frame.clientHeight;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    const rangeX = cw - dw; // ≤ 0 — px travel available on this axis
    const rangeY = ch - dh;
    const x = rangeX >= -0.5 ? fromX : clamp(fromX + (dxPx / rangeX) * 100, 0, 100);
    const y = rangeY >= -0.5 ? fromY : clamp(fromY + (dyPx / rangeY) * 100, 0, 100);
    return { x: round1(x), y: round1(y) };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, startXpct: pos.x, startYpct: pos.y };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    setPos(shiftBy(e.clientX - d.startX, e.clientY - d.startY, d.startXpct, d.startYpct));
  };

  const endDrag = (e: React.PointerEvent<HTMLImageElement>) => {
    if (dragRef.current?.id === e.pointerId) {
      dragRef.current = null;
      setDragging(false);
    }
  };

  return (
    <div
      ref={frameRef}
      className={cn('relative overflow-hidden select-none rounded-[inherit]', t.frame, className)}
    >
      <Image unoptimized width={800} height={600} loading="lazy"
        ref={imgRef}
        src={src}
        alt="Cover preview — drag to reposition"
        draggable={false}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          'w-full h-full object-cover',
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{ objectPosition: `${pos.x}% ${pos.y}%`, touchAction: 'none' }}
      />

      {/* Subtle safe-area vignette so the draggable surface reads as a mode */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25" />

      {/* Hint pill */}
      <div className={cn(
        'pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm shadow-sm',
        t.hint
      )}>
        <Move className="w-3 h-3" />
        Drag to reposition
      </div>

      {/* Confirm / Cancel controls */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel repositioning"
          className={cn('w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm shadow-md transition-colors', t.cancel)}
        >
          <X className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onConfirm(`${pos.x}% ${pos.y}%`)}
          aria-label="Confirm cover position"
          className={cn('w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors', t.confirm)}
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Small overlay affordance that enters position-editing mode. */
export function CoverPositionTrigger({ theme, onClick, className }: {
  theme: CoverEditorTheme; onClick: () => void; className?: string;
}) {
  const t = THEMES[theme];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm shadow-sm transition-colors',
        t.trigger,
        className
      )}
    >
      <Move className="w-3 h-3" />
      Adjust position
    </button>
  );
}
