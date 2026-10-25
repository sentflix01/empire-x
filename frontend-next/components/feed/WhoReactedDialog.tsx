'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import SafeImage from '@/components/ui/SafeImage';
import { reactionLabel, whoReacted, type Reaction, type Reactor } from '@/lib/socialApi';

/** "Who reacted", with a tab for all and one per reaction. */
export default function WhoReactedDialog({ postId, open, onOpenChange }: { postId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = useState<Reaction | 'all'>('all');
  const [counts, setCounts] = useState<Partial<Record<Reaction, number>>>({});
  const [people, setPeople] = useState<Reactor[] | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPeople(null);
    whoReacted(postId, tab === 'all' ? undefined : tab)
      .then((data) => {
        if (cancelled) return;
        setPeople(data.people);
        setHidden(data.like_count === null);
        if (tab === 'all' && data.counts) setCounts(data.counts);
      })
      .catch(() => { if (!cancelled) setPeople([]); });
    return () => { cancelled = true; };
  }, [open, postId, tab]);

  const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
  const tabs = (Object.keys(counts) as Reaction[]).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Reactions</DialogTitle>
        <DialogDescription className="sr-only">People who reacted to this post</DialogDescription>
        {hidden ? (
          <p className="text-sm text-muted-foreground">The owner hid the reaction count for this post.</p>
        ) : (
          <>
            <div role="tablist" aria-label="Filter reactions" className="flex gap-1 overflow-x-auto border-b border-border pb-2">
              <button type="button" role="tab" aria-selected={tab === 'all'} onClick={() => setTab('all')}
                className={`min-h-9 shrink-0 rounded-full px-3 text-sm font-semibold ${tab === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>
                All {total}
              </button>
              {tabs.map((r) => (
                <button key={r} type="button" role="tab" aria-selected={tab === r} aria-label={`${reactionLabel(r)} ${counts[r]}`} onClick={() => setTab(r)}
                  className={`min-h-9 shrink-0 rounded-full px-3 text-sm ${tab === r ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>
                  {r} {counts[r]}
                </button>
              ))}
            </div>
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {people === null ? <li role="status" className="py-4 text-center text-sm text-muted-foreground">Loading…</li>
                : people.length === 0 ? <li className="py-4 text-center text-sm text-muted-foreground">No one to show yet.</li>
                : people.map((p) => (
                  <li key={p.user_id}>
                    <Link href={`/profile/${p.user_id}?view=personal`} onClick={() => onOpenChange(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-secondary">
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-secondary">
                        <SafeImage src={p.avatar_url ?? undefined} alt="" className="h-full w-full object-cover" fallback={p.display_name?.charAt(0) ?? '?'} />
                        <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 text-sm">{p.reaction}</span>
                      </span>
                      <span className="truncate text-sm font-medium">{p.display_name ?? 'Member'}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
