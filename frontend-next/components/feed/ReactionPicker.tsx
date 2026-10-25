'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus } from 'lucide-react';
import { REACTIONS, reactionLabel, type Reaction } from '@/lib/socialApi';

// Loaded only when someone taps "+": the full emoji set isn't in any page bundle.
const EmojiPicker = dynamic(() => import('@/components/ui/EmojiPicker'), { ssr: false });

/**
 * Reactions for posts, comments and chat messages: the quick row first, and
 * "+" opens every emoji (search, categories, skin tones, recently used).
 */
export default function ReactionPicker({ current, onPick, size = 'md' }: {
  current?: Reaction | null;
  onPick: (reaction: Reaction) => void;
  size?: 'sm' | 'md';
}) {
  const [allOpen, setAllOpen] = useState(false);
  // Your own reaction stays visible in the row even when it isn't a quick one.
  const row: string[] = current && !(REACTIONS as readonly string[]).includes(current) ? [current, ...REACTIONS.slice(0, 6)] : [...REACTIONS];
  const btn = size === 'sm' ? 'h-9 w-9 text-lg' : 'h-11 w-11 text-2xl';

  return (
    <div className="flex flex-col gap-1">
      <div role="group" aria-label="Reactions" className="flex items-center justify-between gap-0.5">
        {row.map((r) => (
          <button key={r} type="button" onClick={() => onPick(r)} aria-label={reactionLabel(r)} aria-pressed={current === r} title={reactionLabel(r)}
            className={`flex items-center justify-center rounded-full transition-transform hover:scale-125 ${btn} ${current === r ? 'bg-amber-100 dark:bg-amber-500/20' : ''}`}>
            <span aria-hidden="true">{r}</span>
          </button>
        ))}
        <button type="button" onClick={() => setAllOpen((v) => !v)} aria-label="More emojis" aria-expanded={allOpen} title="More emojis"
          className={`flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:bg-secondary ${btn}`}>
          <Plus className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
        </button>
      </div>
      {allOpen && (
        <EmojiPicker label="All emojis" onPick={(e) => { setAllOpen(false); onPick(e); }} onClose={() => setAllOpen(false)} />
      )}
    </div>
  );
}
