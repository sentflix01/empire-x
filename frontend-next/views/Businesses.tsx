'use client';
import React, { useState, useEffect } from 'react';
import { Store, Star, Eye, Users, Building2, MapPin } from 'lucide-react';
import Link from 'next/link';
import client from '@/api/client';
import { useCollapse } from '@/hooks/useCollapse';
import ErrorBoundary from '@/components/ErrorBoundary';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Business {
  id: string;
  business_name: string;
  business_category: string;
  business_description: string | null;
  business_logo_url: string | null;
  owner_id: string;
  follower_count: number;
  view_count: number;
  latitude: number | null;
  longitude: number | null;
}

interface OwnerProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-3 flex items-start gap-3 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-secondary shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 bg-secondary rounded w-1/2" />
        <div className="h-2 bg-secondary rounded w-1/4" />
        <div className="h-2 bg-secondary rounded w-3/4" />
        <div className="h-6 bg-secondary rounded-full w-24 mt-2" />
      </div>
    </div>
  );
}

// ── Business card ─────────────────────────────────────────────────────────────
function BusinessCard({
  biz,
  ownerProfile,
}: {
  biz: Business;
  ownerProfile: OwnerProfile | null;
}) {
  const initial = biz.business_name.charAt(0).toUpperCase();

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-3 flex items-start gap-3 hover:border-amber-200 transition-colors">
      {/* Logo / initial */}
      <div className="w-11 h-11 rounded-xl shrink-0 overflow-hidden bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
        {biz.business_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img loading="lazy"
            src={biz.business_logo_url}
            alt={biz.business_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-amber-700 font-bold text-base">{initial}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold truncate">{biz.business_name}</p>
          <span className="text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 shrink-0 capitalize">
            {biz.business_category}
          </span>
        </div>

        {biz.business_description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {biz.business_description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="w-3 h-3" />
            {biz.follower_count ?? 0}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Eye className="w-3 h-3" />
            {biz.view_count ?? 0}
          </span>
        </div>

        {/* Owner row + CTA */}
        <div className="flex items-center justify-between mt-2 gap-2">
          {ownerProfile && (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                {ownerProfile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy"
                    src={ownerProfile.avatar_url}
                    alt={ownerProfile.display_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  ownerProfile.display_name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-[11px] text-muted-foreground truncate">
                {ownerProfile.display_name}
              </span>
            </div>
          )}
          <Link
            href="/showrooms"
            className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full px-2.5 py-1 transition-colors shrink-0 ml-auto"
          >
            View Showroom
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Collapsible business section ──────────────────────────────────────────────
interface BusinessSectionProps {
  title: string;
  icon: React.ComponentType<any>;
  items: Business[];
  ownerMap: Map<string, OwnerProfile>;
  loading: boolean;
  error: string | null;
  emptyMessage: string;
}

function BusinessSection({
  title,
  icon: Icon,
  items,
  ownerMap,
  loading,
  error,
  emptyMessage,
}: BusinessSectionProps) {
  const { visibleCount, isExpanded, showMoreButton, expand, collapse } =
    useCollapse(items.length);

  return (
    <section className="mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold">{title}</h2>
        {!loading && !error && items.length > 0 && (
          <span className="text-xs text-muted-foreground">({items.length})</span>
        )}
      </div>

      {/* Skeletons */}
      {loading && (
        <div className="space-y-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-muted-foreground px-1">{emptyMessage}</p>
      )}

      {/* Cards */}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="space-y-2">
            {items.slice(0, visibleCount).map((biz) => (
              <BusinessCard
                key={biz.id}
                biz={biz}
                ownerProfile={ownerMap.get(biz.owner_id) ?? null}
              />
            ))}
          </div>

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

// ── Main Businesses view ──────────────────────────────────────────────────────
function Businesses() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);
  const [friendsBusinesses, setFriendsBusinesses] = useState<Business[]>([]);
  const [suggestedBusinesses, setSuggestedBusinesses] = useState<Business[]>([]);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<Business[]>([]);

  // Owner profiles keyed by user_id
  const [ownerMap, setOwnerMap] = useState<Map<string, OwnerProfile>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        // Fetch current user profile (for owner_id)
        const mePromise = client
          .get<{ id: string }>('/api/auth/me')
          .then((r) => r.data)
          .catch(() => null);

        // Fetch follows list
        const followsPromise = client
          .get<string[]>('/api/profiles/me/follows')
          .then((r) => r.data)
          .catch(() => [] as string[]);

        // Fetch businesses (top 50)
        const bizPromise = client
          .get<Business[]>('/api/businesses?limit=50')
          .then((r) => r.data)
          .catch(() => [] as Business[]);

        const [me, followedIds, allBiz] = await Promise.all([
          mePromise,
          followsPromise,
          bizPromise,
        ]);

        if (cancelled) return;

        const followedSet = new Set(followedIds);
        const myId = me?.id ?? null;

        // Partition businesses
        const mine = myId ? allBiz.filter((b) => b.owner_id === myId) : [];
        const friends = allBiz.filter(
          (b) => b.owner_id !== myId && followedSet.has(b.owner_id)
        );
        const friendIds = new Set(friends.map((b) => b.id));
        const rest = allBiz
          .filter((b) => b.owner_id !== myId && !friendIds.has(b.id))
          .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));

        // Suggested: top by view_count from rest
        const suggested = rest.slice(0, 20);

        // Nearby: businesses that have lat/lon, top 5 by view_count
        const nearby = allBiz
          .filter((b) => b.latitude != null && b.longitude != null && b.owner_id !== myId)
          .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
          .slice(0, 5);

        setMyBusinesses(mine);
        setFriendsBusinesses(friends);
        setSuggestedBusinesses(suggested);
        setNearbyBusinesses(nearby);

        // Collect unique owner_ids to fetch profiles
        const ownerIds = new Set<string>();
        [...mine, ...friends, ...suggested, ...nearby].forEach((b) =>
          ownerIds.add(b.owner_id)
        );

        // Fetch owner profiles in parallel
        const profileResults = await Promise.all(
          Array.from(ownerIds).map((uid) =>
            client
              .get<OwnerProfile>(`/api/profiles/by-user/${uid}`)
              .then((r) => r.data)
              .catch(() => null)
          )
        );

        if (!cancelled) {
          const map = new Map<string, OwnerProfile>();
          profileResults.forEach((p) => {
            if (p) map.set(p.user_id, p);
          });
          setOwnerMap(map);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load businesses. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-6">Businesses</h1>

      {/* Global error */}
      {!loading && error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive mb-6">
          {error}
        </div>
      )}

      {/* Your Businesses */}
      <BusinessSection
        title="Your Businesses"
        icon={Building2}
        items={myBusinesses}
        ownerMap={ownerMap}
        loading={loading}
        error={null}
        emptyMessage="You haven't created a business yet."
      />

      {/* Friends' Businesses */}
      <BusinessSection
        title="Friends' Businesses"
        icon={Users}
        items={friendsBusinesses}
        ownerMap={ownerMap}
        loading={loading}
        error={null}
        emptyMessage="No businesses from people you follow yet."
      />

      {/* Suggested Businesses */}
      <BusinessSection
        title="Suggested Businesses"
        icon={Star}
        items={suggestedBusinesses}
        ownerMap={ownerMap}
        loading={loading}
        error={null}
        emptyMessage="No suggested businesses right now."
      />

      {/* Near You */}
      <BusinessSection
        title="Near You"
        icon={MapPin}
        items={nearbyBusinesses}
        ownerMap={ownerMap}
        loading={loading}
        error={null}
        emptyMessage="No nearby businesses found."
      />
    </div>
  );
}

export default function BusinessesPage() {
  return <ErrorBoundary><Businesses /></ErrorBoundary>;
}
