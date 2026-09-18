'use client';

/**
 * BookmarkButton
 *
 * Behaviour:
 * - Double-click to save; double-click again to remove.
 * - Single click does nothing.
 * - Each button is fully independent — no cross-card re-renders.
 *
 * Implementation:
 * - Uses local useState only.
 * - Reads initial saved state once from the Zustand store snapshot (no subscription).
 * - A one-time subscription syncs the local state when store hydration completes
 *   (so buttons reflect persisted bookmarks on page load).
 * - doToggle is NOT wrapped in useCallback to avoid stale-closure issues;
 *   it reads the latest state via a ref pattern instead.
 */
import React, { useRef, useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { SavedItem } from '@/store/bookmarksSlice';
import { toast } from 'sonner';

interface BookmarkButtonProps {
  targetId: string;
  targetType: 'post' | 'product' | 'showroom' | 'task';
  itemData?: { title?: string; thumbnailUrl?: string };
  className?: string;
}

export default function BookmarkButton({
  targetId,
  targetType,
  itemData,
  className,
}: BookmarkButtonProps) {
  // ── Local state ───────────────────────────────────────────────────────────
  const [saved, setSaved] = useState<boolean>(() =>
    Object.prototype.hasOwnProperty.call(
      useAppStore.getState().savedIds,
      targetId,
    ),
  );
  const [isPending, setIsPending] = useState(false);

  // Keep refs to latest values so async doToggle never closes over stale state
  const savedRef     = useRef(saved);
  const isPendingRef = useRef(isPending);
  savedRef.current     = saved;
  isPendingRef.current = isPending;

  // Sync when store hydration completes (one-time subscription)
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      setSaved(
        Object.prototype.hasOwnProperty.call(state.savedIds, targetId),
      );
    });
    return unsub;
  }, [targetId]);

  // ── Double-click detection ────────────────────────────────────────────────
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const DOUBLE_CLICK_MS = 350;

  async function doToggle() {
    if (isPendingRef.current) return;

    const willSave = !savedRef.current;
    setSaved(willSave);
    setIsPending(true);
    isPendingRef.current = true;

    try {
      await useAppStore.getState().toggleSave(
        targetId,
        targetType,
        itemData as Pick<SavedItem, 'title' | 'thumbnailUrl'> | undefined,
      );
      toast.success(willSave ? 'Saved to bookmarks' : 'Removed from bookmarks', {
        duration: 1500,
      });
    } catch {
      setSaved(!willSave); // rollback
      toast.error('Could not update bookmark');
    } finally {
      setIsPending(false);
      isPendingRef.current = false;
    }
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (clickTimer.current) {
      // Second click within window → double-click confirmed → toggle
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      void doToggle();
    } else {
      // First click — start the window
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        // Window expired without a second click — single click, do nothing
      }, DOUBLE_CLICK_MS);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={saved}
      aria-label={saved ? 'Double-click to remove bookmark' : 'Double-click to bookmark'}
      title={saved ? 'Double-click to remove' : 'Double-click to save'}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
        saved ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-400',
        isPending && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      <Bookmark
        className={cn(
          'w-5 h-5 transition-all duration-150',
          saved
            ? 'fill-amber-500 text-amber-500 scale-110'
            : 'fill-none text-muted-foreground',
          isPending && 'animate-pulse',
        )}
      />
    </button>
  );
}
