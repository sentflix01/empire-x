'use client';
import React from 'react';
import { REACTIONS, REACTION_LABEL, type Reaction } from '@/lib/socialApi';

/** The row of reactions (top of the More menu, long-press on Like, comments). */
export default function ReactionPicker({ current, onPick, size = 'md' }: {
  current?: Reaction | null;
  onPick: (reaction: Reaction) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="group" aria-label="Reactions" className="flex items-center justify-between gap-0.5">
      {REACTIONS.map((r) => (
        <button key={r} type="button" onClick={() => onPick(r)} aria-label={REACTION_LABEL[r]} aria-pressed={current === r} title={REACTION_LABEL[r]}
          className={`flex items-center justify-center rounded-full transition-transform hover:scale-125 ${size === 'sm' ? 'h-9 w-9 text-lg' : 'h-11 w-11 text-2xl'} ${current === r ? 'bg-amber-100 dark:bg-amber-500/20' : ''}`}>
          <span aria-hidden="true">{r}</span>
        </button>
      ))}
    </div>
  );
}
