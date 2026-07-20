'use client';
import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { DemoBadge } from '@/components/profile/DemoBadge';

export interface UserCardProps {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  mutualCount?: number;
  isFollowing: boolean;
  isSeed?: boolean;
  onToggleFollow: (userId: string, currentlyFollowing: boolean) => void;
}

/**
 * UserCard — renders a single user with follow/unfollow toggle.
 *
 * - Displays avatar (fallback to initials) + display name + DemoBadge (when isSeed)
 * - Shows headline and mutual connection count when available
 * - Optimistically flips follow state immediately on click
 * - No dismiss button (unlike SuggestionCard)
 */
export function UserCard({
  userId,
  displayName,
  avatarUrl,
  headline,
  mutualCount,
  isFollowing,
  isSeed,
  onToggleFollow,
}: UserCardProps) {
  const [localFollowing, setLocalFollowing] = useState(isFollowing);

  const initials = displayName
    ? displayName
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : '?';

  function handleToggleFollow() {
    const prev = localFollowing;
    setLocalFollowing(!prev);
    onToggleFollow(userId, prev);
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-3 flex items-start gap-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName ?? 'User avatar'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
            {initials}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold leading-tight truncate">
            {displayName}
          </span>
          {isSeed && <DemoBadge />}
        </div>

        {/* Headline */}
        {headline && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-1">
            {headline}
          </p>
        )}

        {/* Mutual connections */}
        {mutualCount != null && mutualCount > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Users className="w-3 h-3 shrink-0" />
            {mutualCount} mutual connection{mutualCount !== 1 ? 's' : ''}
          </p>
        )}

        {/* Follow / Unfollow button */}
        <button
          onClick={handleToggleFollow}
          className={`mt-2 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
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
