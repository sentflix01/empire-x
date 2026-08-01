'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/api/client';
import { friendsApi, MutualFriend } from '@/api/friends';
import { Suggestion, suggestionsApi } from '@/api/suggestions';
import { useCollapse } from '@/hooks/useCollapse';
import { UserCard } from '@/components/friends/UserCard';

// ── Skeleton card placeholder ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-3 flex items-start gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-secondary shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 bg-secondary rounded w-1/2" />
        <div className="h-2 bg-secondary rounded w-3/4" />
        <div className="h-6 bg-secondary rounded-full w-16 mt-2" />
      </div>
    </div>
  );
}

// ── Item shape used inside the Friends page ───────────────────────────────────
interface FriendItem {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  mutual_count?: number;
  is_seed?: boolean;
}

// ── Collapsible section component ─────────────────────────────────────────────
interface FriendsSectionProps {
  title: string;
  icon: React.ComponentType<any>;
  items: FriendItem[];
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  followsSet: Set<string>;
  onToggleFollow: (userId: string, currentlyFollowing: boolean) => void;
}

function FriendsSection({
  title,
  icon: Icon,
  items,
  loading,
  error,
  emptyMessage,
  followsSet,
  onToggleFollow,
}: FriendsSectionProps) {
  const { visibleCount, isExpanded, showMoreButton, expand, collapse } =
    useCollapse(items.length);

  return (
    <section className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold">{title}</h2>
        {!loading && !error && items.length > 0 && (
          <span className="text-xs text-muted-foreground">({items.length})</span>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-muted-foreground px-1">{emptyMessage}</p>
      )}

      {/* Cards */}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="space-y-2">
            {items.slice(0, visibleCount).map((item) => (
              <UserCard
                key={item.user_id}
                userId={item.user_id}
                displayName={item.display_name}
                avatarUrl={item.avatar_url}
                headline={item.headline}
                mutualCount={item.mutual_count}
                isFollowing={followsSet.has(item.user_id)}
                isSeed={item.is_seed}
                onToggleFollow={onToggleFollow}
              />
            ))}
          </div>

          {/* More / Show less buttons */}
          {showMoreButton && (
            <button
              onClick={expand}
              className="mt-2 w-full text-xs font-medium text-amber-600 hover:text-amber-700 py-2 rounded-xl hover:bg-amber-50 transition-colors"
            >
              Show {items.length - 5} more
            </button>
          )}
          {isExpanded && (
            <button
              onClick={collapse}
              className="mt-2 w-full text-xs font-medium text-muted-foreground hover:text-foreground py-2 rounded-xl hover:bg-secondary transition-colors"
            >
              Show less
            </button>
          )}
        </>
      )}
    </section>
  );
}

// ── Main Friends view ─────────────────────────────────────────────────────────
export default function Friends() {
  // Follow state — single source of truth for all sections
  const [followsSet, setFollowsSet] = useState<Set<string>>(new Set());
  const [loadingFollows, setLoadingFollows] = useState(true);
  const [followsError, setFollowsError] = useState<string | null>(null);

  // My Friends — derived from followsSet + profile data
  const [myFriends, setMyFriends] = useState<FriendItem[]>([]);
  const [loadingMyFriends, setLoadingMyFriends] = useState(true);
  const [myFriendsError, setMyFriendsError] = useState<string | null>(null);

  // Friend Suggestions
  const [suggestions, setSuggestions] = useState<FriendItem[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(true);
  const [suggError, setSuggError] = useState<string | null>(null);

  // Mutual Friends
  const [mutuals, setMutuals] = useState<FriendItem[]>([]);
  const [loadingMutual, setLoadingMutual] = useState(true);
  const [mutualError, setMutualError] = useState<string | null>(null);

  // Fire 3 parallel requests on mount
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      // 1. Follows list (needed to initialize button states)
      const followsPromise = client
        .get<string[]>('/api/profiles/me/follows')
        .then((r) => r.data)
        .catch(() => null);

      // 2. Suggestions
      const suggPromise = suggestionsApi.getPeople().catch(() => null);

      // 3. Mutual friends
      const mutualPromise = friendsApi.getMutual().catch(() => null);

      const [followedIds, suggData, mutualData] = await Promise.all([
        followsPromise,
        suggPromise,
        mutualPromise,
      ]);

      if (cancelled) return;

      // Process follows
      if (followedIds === null) {
        setFollowsError('Could not load your follows. Follow states may be inaccurate.');
        setFollowsSet(new Set());
        toast.error('Could not load your follows list.');
      } else {
        setFollowsSet(new Set(followedIds));
      }
      setLoadingFollows(false);

      // Process suggestions
      if (suggData === null) {
        setSuggError('Could not load suggestions. Please try again.');
      } else {
        setSuggestions(
          suggData.map((s) => ({
            user_id: s.user_id,
            display_name: s.display_name,
            avatar_url: s.avatar_url,
            headline: s.headline,
            mutual_count: s.mutual_count,
            is_seed: s.is_seed,
          }))
        );
      }
      setLoadingSugg(false);

      // Process mutuals
      if (mutualData === null) {
        setMutualError('Could not load mutual friends. Please try again.');
      } else {
        setMutuals(
          mutualData.map((m) => ({
            user_id: m.user_id,
            display_name: m.display_name,
            avatar_url: m.avatar_url,
            headline: m.headline,
            mutual_count: m.mutual_count,
          }))
        );
      }
      setLoadingMutual(false);

      // Build My Friends list: fetch profiles for all followed IDs
      if (followedIds !== null && followedIds.length > 0) {
        try {
          // Batch fetch profiles for followed users via the profiles list endpoint
          const profilePromises = followedIds.map((uid) =>
            client
              .get<{ user_id: string; display_name: string; avatar_url: string | null; headline: string | null; is_seed?: boolean }>(`/api/profiles/by-user/${uid}`)
              .then((r) => r.data)
              .catch(() => null)
          );
          const profiles = await Promise.all(profilePromises);
          if (!cancelled) {
            const validProfiles: FriendItem[] = profiles
              .filter((p): p is NonNullable<typeof p> => p !== null)
              .map((p) => ({
                user_id: p.user_id,
                display_name: p.display_name,
                avatar_url: p.avatar_url,
                headline: p.headline,
                is_seed: p.is_seed,
              }));
            setMyFriends(validProfiles);
          }
        } catch {
          if (!cancelled) {
            setMyFriendsError('Could not load friends list. Please try again.');
          }
        }
      } else if (followedIds !== null) {
        // followedIds is empty — no friends yet, no error
      }
      setLoadingMyFriends(false);
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  // Shared follow/unfollow handler
  const toggleFollow = useCallback(
    async (userId: string, currentlyFollowing: boolean) => {
      // Optimistic update
      setFollowsSet((prev) => {
        const next = new Set(prev);
        if (currentlyFollowing) {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        return next;
      });

      // If following a suggestion, remove it from the suggestions list
      if (!currentlyFollowing) {
        setSuggestions((prev) => prev.filter((s) => s.user_id !== userId));
      }

      try {
        await client.post(`/api/profiles/follow/${userId}`);
      } catch {
        // Revert optimistic update
        setFollowsSet((prev) => {
          const next = new Set(prev);
          if (currentlyFollowing) {
            next.add(userId);
          } else {
            next.delete(userId);
          }
          return next;
        });
        // Revert suggestions removal if we failed to follow
        toast.error('Failed to update follow status');
      }
    },
    []
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-6">Friends</h1>

      {/* My Friends */}
      <FriendsSection
        title="My Friends"
        icon={UserCheck}
        items={myFriends}
        loading={loadingFollows || loadingMyFriends}
        error={myFriendsError || followsError}
        emptyMessage="You are not following anyone yet."
        followsSet={followsSet}
        onToggleFollow={toggleFollow}
      />

      {/* Friend Suggestions */}
      <FriendsSection
        title="Friend Suggestions"
        icon={Sparkles}
        items={suggestions}
        loading={loadingSugg}
        error={suggError}
        emptyMessage="No new suggestions right now."
        followsSet={followsSet}
        onToggleFollow={toggleFollow}
      />

      {/* Mutual Friends */}
      <FriendsSection
        title="Mutual Friends"
        icon={Users}
        items={mutuals}
        loading={loadingMutual}
        error={mutualError}
        emptyMessage="No mutual friends yet."
        followsSet={followsSet}
        onToggleFollow={toggleFollow}
      />
    </div>
  );
}
