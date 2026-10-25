'use client';
/**
 * Bar at the top of a chat showing a pinned message. Tapping it jumps to that
 * message (and highlights it); with several pins each tap moves to the next
 * older one, like Telegram.
 */
import React, { useEffect, useState } from 'react';
import { Pin } from 'lucide-react';

export interface PinnedPreview { id: string; text: string }

/** Short one-line preview of a message for the bar. */
export function pinPreviewText(m: { type?: string; content?: unknown } | undefined): string {
  if (!m) return 'Pinned message';
  if (m.type === 'image') return 'Photo';
  if (m.type === 'file') return 'File';
  if (m.type === 'product') return 'Product';
  if (m.type === 'order_update') return 'Order update';
  const text = typeof m.content === 'string' ? m.content.trim() : '';
  return text || 'Pinned message';
}

export default function PinnedBar({ pins, onJump }: {
  /** Newest first. */
  pins: PinnedPreview[];
  /** Scrolls to the message; returns false when it isn't loaded on screen. */
  onJump: (id: string) => boolean;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => { if (index >= pins.length) setIndex(0); }, [pins.length, index]);
  if (pins.length === 0) return null;
  const current = pins[Math.min(index, pins.length - 1)];

  return (
    <button
      type="button"
      onClick={() => { onJump(current.id); setIndex((i) => (i + 1) % pins.length); }}
      className="flex w-full min-h-11 items-center gap-2 border-b border-border/40 bg-card px-4 py-1.5 text-left hover:bg-secondary/40"
      aria-label={`Pinned message${pins.length > 1 ? ` ${index + 1} of ${pins.length}` : ''}: ${current.text}. Go to message`}
    >
      <Pin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-primary">
          Pinned message{pins.length > 1 ? ` ${index + 1} of ${pins.length}` : ''}
        </span>
        <span className="block truncate text-sm text-foreground">{current.text}</span>
      </span>
    </button>
  );
}
