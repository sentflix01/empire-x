'use client';
/**
 * A small dialog with a title, optional text and a list of choices (mute for
 * how long, why you report, confirm a delete). Escape or Cancel closes it.
 */
import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface Choice { label: string; value: string; destructive?: boolean }

export default function ChoiceDialog({ title, description, choices, onChoose, onClose }: {
  title: string;
  description?: string;
  choices: Choice[];
  onChoose: (value: string) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close.current(); } };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); before?.focus?.({ preventScroll: true }); };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="choice-dialog-title"
        className="w-full max-w-sm overflow-hidden rounded-t-3xl bg-card text-foreground shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pb-2 pt-5">
          <h2 id="choice-dialog-title" className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="py-1">
          {choices.map((c) => (
            <button key={c.value} type="button" onClick={() => onChoose(c.value)}
              className={cn('flex min-h-12 w-full items-center px-5 text-left text-sm font-medium hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none', c.destructive && 'text-destructive')}>
              {c.label}
            </button>
          ))}
          <button type="button" onClick={onClose} className="flex min-h-12 w-full items-center px-5 text-left text-sm text-muted-foreground hover:bg-secondary/60">
            Cancel
          </button>
        </div>
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </div>
    </div>
  );
}
