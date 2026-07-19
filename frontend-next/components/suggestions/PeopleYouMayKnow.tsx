'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { suggestionsApi, Suggestion } from '@/api/suggestions';
import client from '@/api/client';
import { SuggestionCard } from './SuggestionCard';
import { Skeleton } from '@/components/ui/skeleton';

const MAX_VISIBLE = 5;

/**
 * PeopleYouMayKnow — sidebar widget that surfaces friend suggestions.
 *
 * - Fetches up to 20 suggestions and displays the first 5
 * - Optimistically removes cards on follow / dismiss
 * - Shows a loading skeleton (3 placeholder cards) while fetching
 * - Shows a non-blocking inline error when the query fails
 * - Shows "No more suggestions" empty state when the list is empty
 */
export function PeopleYouMayKnow() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery<Suggestion[]>({
    queryKey: ['suggestions', 'people'],
    queryFn: () => suggestionsApi.getPeople(),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Visible list: remove dismissed/followed ids, cap at MAX_VISIBLE
  const visible = (data ?? [])
    .filter((s) => !dismissed.has(s.user_id))
    .slice(0, MAX_VISIBLE);

  async function handleFollow(userId: string) {
    // Optimistically remove from list
    setDismissed((prev) => new Set([...prev, userId]));
    try {
      await client.post(`/api/profiles/follow/${userId}`);
    } catch {
      // Fire-and-forget; follow failure is non-blocking
    }
  }

  async function handleDismiss(userId: string) {
    // Optimistically remove from list
    setDismissed((prev) => new Set([...prev, userId]));
    try {
      await suggestionsApi.dismiss(userId);
    } catch {
      // Fire-and-forget; dismiss failure is non-blocking
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4">
      <h2 className="text-sm font-semibold mb-3">People You May Know</h2>

      {/* Loading state — 3 skeleton cards */}
      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-5 w-16 rounded-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline error — non-blocking */}
      {isError && !isLoading && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Could not load suggestions. Try again later.
        </p>
      )}

      {/* Empty state */}
      {!isLoading && !isError && visible.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No more suggestions
        </p>
      )}

      {/* Suggestion cards */}
      {!isLoading && !isError && visible.length > 0 && (
        <div className="space-y-2">
          {visible.map((suggestion) => (
            <SuggestionCard
              key={suggestion.user_id}
              suggestion={suggestion}
              onFollow={handleFollow}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
