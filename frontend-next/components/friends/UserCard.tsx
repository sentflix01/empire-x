'use client';
import React, { useState } from 'react';
import { Users } from 'lucide-react';
import UserIdentity from '@/components/ui/UserIdentity';

export interface UserCardProps {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  businessName?: string | null;
  isVerified?: boolean;
  mutualCount?: number;
  isFollowing: boolean;
  isSeed?: boolean;
  onToggleFollow: (userId: string, currentlyFollowing: boolean) => void;
}

/**
 * UserCard — renders a single user with follow/unfollow toggle.
 *
 * - Displays avatar (fallback to initials) + display name + DemoBadge (when isSeed)
 * - Shows the user's business name and mutual connection count when available
 * - Optimistically flips follow state immediately on click
 * - No dismiss button (unlike SuggestionCard)
 */
export function UserCard({
  userId,
  displayName,
  avatarUrl,
  businessName,
  isVerified,
  mutualCount,
  isFollowing,
  isSeed,
  onToggleFollow,
}: UserCardProps) {
  const [localFollowing, setLocalFollowing] = useState(isFollowing);

  function handleToggleFollow() {
    const prev = localFollowing;
    setLocalFollowing(!prev);
    onToggleFollow(userId, prev);
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-3 flex items-start gap-3">
      {/* Identity */}
      <UserIdentity
        size="sm"
        displayName={displayName}
        avatarUrl={avatarUrl}
        businessName={businessName}
        isVerified={isVerified}
        isDemo={isSeed}
        className="flex-1 min-w-0"
      />

      {/* Right column — mutual connections + follow button */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {/* Mutual connections */}
        {mutualCount != null && mutualCount > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3 shrink-0" />
            {mutualCount} mutual
          </p>
        )}

        {/* Follow / Unfollow button */}
        <button
          data-page-guide="friends-follow-btn"
          onClick={handleToggleFollow}
          className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors min-h-[32px] ${
            localFollowing
              ? 'bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
              : 'bg-amber-500 hover:bg-amber-600 text-white'
          }`}
        >
          {localFollowing ? 'Unfollow' : 'Follow'}
        </button>
      </div>
    </div>
  );
}
