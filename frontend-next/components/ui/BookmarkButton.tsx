'use client';

import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { SavedItem } from '@/store/bookmarksSlice';

interface BookmarkButtonProps {
  targetId: string;
  targetType: 'post' | 'product' | 'showroom' | 'task';
  /** Metadata stored in the store for Bookmarks page rendering */
  itemData?: {
    title?: string;
    thumbnailUrl?: string;
  };
  /** Optional CSS class override for the wrapping button */
  className?: string;
}

export default function BookmarkButton({
  targetId,
  targetType,
  itemData,
  className,
}: BookmarkButtonProps) {
  const [isPending, setIsPending] = useState<boolean>(false);

  // Select savedIds directly so the component re-renders whenever the map changes.
  // Selecting isSaved (a stable function ref) does NOT trigger re-renders on toggle.
  const savedIds = useAppStore((s) => s.savedIds);
  const toggleSave = useAppStore((s) => s.toggleSave);

  // Derive saved state from the reactive savedIds map
  const saved = Object.prototype.hasOwnProperty.call(savedIds, targetId);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPending) return;

    setIsPending(true);
    try {
      await toggleSave(
        targetId,
        targetType,
        itemData as Pick<SavedItem, 'title' | 'thumbnailUrl'> | undefined
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={saved}
      aria-label={saved ? 'Remove bookmark' : `Bookmark this ${targetType}`}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
        saved ? 'text-amber-500' : 'text-muted-foreground',
        isPending && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      <Bookmark
        className={cn(
          'w-5 h-5 transition-all',
          saved ? 'fill-amber-500 text-amber-500 scale-110' : 'fill-none text-muted-foreground'
        )}
      />
    </button>
  );
}
