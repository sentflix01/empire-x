'use client';
import React, { useState } from 'react';
import { X, MapPin, Users } from 'lucide-react';
import { Suggestion } from '@/api/suggestions';
import { DemoBadge } from '@/components/profile/DemoBadge';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onFollow: (userId: string) => void;
  onDismiss: (userId: string) => void;
}

/**
 * SuggestionCard — renders a single friend suggestion with follow / dismiss actions.
 *
 * - Displays avatar (fallback to initials) + display name + DemoBadge (when is_seed)
 * - Shows business name, location, and mutual connection count when available
 * - Optimistically shows "Following" state after the follow button is clicked
 */
export function SuggestionCard({ suggestion, onFollow, onDismiss }: SuggestionCardProps) {
  const [following, setFollowing] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const {
    user_id,
    display_name,
    avatar_url,
    business_name,
    location,
    mutual_count,
    is_seed,
  } = suggestion;

  const initials = display_name
    ? display_name
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('')
    : '?';

  function handleFollow() {
    setFollowing(true);
    onFollow(user_id);
  }

  function handleDismiss() {
    onDismiss(user_id);
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-3 flex items-start gap-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
        {avatar_url && !avatarFailed ? (
          <img
            src={avatar_url}
            alt={display_name ?? 'User avatar'}
            className="w-full h-full object-cover"
            onError={() => setAvatarFailed(true)}
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
            {display_name}
          </span>
          {is_seed && <DemoBadge />}
        </div>

        {/* Business identity — career headlines are intentionally not shown here. */}
        {business_name && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-1">
            {business_name}
          </p>
        )}

        {/* Location */}
        {location && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        )}

        {/* Mutual connections */}
        {mutual_count > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Users className="w-3 h-3 shrink-0" />
            {mutual_count} mutual connection{mutual_count !== 1 ? 's' : ''}
          </p>
        )}

        {/* Follow button */}
        <button
          onClick={handleFollow}
          disabled={following}
          className={`mt-2 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
            following
              ? 'bg-secondary text-muted-foreground cursor-default'
              : 'bg-amber-500 hover:bg-amber-600 text-white'
          }`}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss suggestion"
        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-secondary transition-colors shrink-0 mt-0.5"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
