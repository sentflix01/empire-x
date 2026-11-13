'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import client from "@/lib/api/client";
import { useAuth } from "@/lib/AuthContext";
import { HomeMapTabDynamic as HomeMapTab } from "@/components/map/DynamicMap";
import PostCard from "@/components/feed/PostCard";
import type { Post } from "@/lib/api/entities";
import CreatePostForm from "@/components/feed/CreatePostForm";
import Stories from "@/views/Stories";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Users, MapPin, LayoutGrid, RefreshCw, Loader2,
  Megaphone, Eye, X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import ErrorBoundary from "@/components/ErrorBoundary";
import FeedPromoBanner from "@/components/feed/FeedPromoBanner";
import BusinessShowroomFeed from "@/components/feed/BusinessShowroomFeed";
import { useProfileView } from "@/lib/ProfileViewContext";

const FILTERS = [
  { key: "all",       label: "feed.forYou",   icon: LayoutGrid },
  { key: "nearby",    label: "feed.nearby",   icon: MapPin },
  { key: "following", label: "feed.following",icon: Users },
  { key: "trending",  label: "feed.trending", icon: TrendingUp },
];

const COMPANY_TICKER =
  "Nodbusiness announcement: Launch your mini website from Showroom Studio, promote updates, and share new offers with your customers.";
const COMPANY_TICKER_HIDDEN_KEY = "nodbusiness_company_ticker_hidden";

function CompanyAnnouncementTicker() {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);
  const repeated = Array(5).fill(`${COMPANY_TICKER}   ·   `).join("");

  useEffect(() => {
    setHidden(localStorage.getItem(COMPANY_TICKER_HIDDEN_KEY) === "true");
  }, []);

  const hideTicker = () => {
    localStorage.setItem(COMPANY_TICKER_HIDDEN_KEY, "true");
    setHidden(true);
  };

  const showTicker = () => {
    localStorage.removeItem(COMPANY_TICKER_HIDDEN_KEY);
    setHidden(false);
  };

  if (hidden) {
    return (
      <div className="flex justify-end">
        <button type="button" onClick={showTicker}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/30 bg-white px-3 text-xs font-bold text-primary shadow-sm shadow-primary/5 transition-colors hover:bg-primary-subtle"
          title="Show announcements" aria-label="Show announcements">
          <Eye className="h-3.5 w-3.5" />
          {t('feed.showNews')}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/30 bg-white shadow-sm shadow-primary/5">
      <div className="h-[2px] bg-primary" />
      <div className="flex min-h-10 items-center overflow-hidden">
        <div className="flex h-10 shrink-0 items-center gap-1.5 bg-inverse px-3 text-white">
          <Megaphone className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Nodbusiness</span>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex w-max animate-marquee whitespace-nowrap py-2 text-primary-subtle-foreground">
            <span className="px-3 text-xs font-semibold">{repeated}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={hideTicker}
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-subtle"
          title="Hide Nodbusiness announcements"
          aria-label="Hide Nodbusiness announcements"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Home() {
  const { user, isAuthenticated, authChecked } = useAuth();
  const { t } = useTranslation();
  const { homeFeedTokens: accentTokens, homeFeedMode } = useProfileView();
  // Guests see public businesses only; personal posts need sign-in (decision §7).
  const isGuest = authChecked && !isAuthenticated;
  const feedMode = isGuest ? "business" : homeFeedMode;
  const [posts, setPosts]         = useState<FeedPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [feedError, setFeedError] = useState('');
  const [filter, setFilter]       = useState("all");
  const [highlightPostId, setHighlightPostId] = useState<string|null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Opaque cursor from the API (the ranked feed pages within a fixed snapshot).
  const cursorRef   = useRef<string | null>(null);
  const PAGE_SIZE   = 15;

  // Handle ?post=<id> from notification deep-link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    if (postId) {
      setHighlightPostId(postId);
      // Clean URL without reloading
      window.history.replaceState({}, '', '/feed');
    }
  }, []);

  // Once posts are loaded and highlight is set, scroll to the post
  useEffect(() => {
    if (!highlightPostId || loading) return;
    // Check if post is in current list
    const found = posts.find(p => p.id === highlightPostId);
    if (found) {
      setTimeout(() => {
        const el = document.getElementById(`post-${highlightPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Clear highlight after 3 seconds
          setTimeout(() => setHighlightPostId(null), 3000);
        }
      }, 300);
    } else {
      // Post not in feed — fetch it directly and prepend
      client.get(`/api/posts/${highlightPostId}`)
        .then(r => {
          if (r.data?.id) {
            setPosts(prev => [r.data, ...prev.filter(p => p.id !== r.data.id)]);
          }
        }).catch(() => {});
    }
  }, [highlightPostId, loading, posts]);

  useEffect(() => {
    loadPosts(true);
  }, []);

  const loadPosts = async (reset = false) => {
    if (reset) { setLoading(true); cursorRef.current = null; setHasMore(true); }
    setFeedError('');
    try {
      const params: Record<string, string | number> = { feed: "true", limit: PAGE_SIZE };
      if (!reset && cursorRef.current) params.cursor = cursorRef.current;
      const res = await client.get("/api/posts", { params });
      const payload = res.data;
      const data: FeedPost[] = Array.isArray(payload) ? payload : (payload?.posts ?? []);
      setPosts(reset ? data : prev => [...prev, ...data]);
      cursorRef.current = payload?.next_cursor ?? null;
      if (!cursorRef.current) setHasMore(false);
    } catch (err: any) {
      if (reset) setPosts([]);
      setFeedError(err?.error || err?.message || 'Failed to load posts. Check your connection.');
    }
    if (reset) setLoading(false);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const params: Record<string, string> = { limit: String(PAGE_SIZE), cursor: cursorRef.current };
      if (filter === "following") params.following = "true"; else params.feed = "true";
      const res = await client.get("/api/posts", { params });
      const payload = res.data;
      const data: FeedPost[] = Array.isArray(payload) ? payload : (payload?.posts ?? []);
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        return [...prev, ...data.filter(p => !existingIds.has(p.id))];
      });
      cursorRef.current = payload?.next_cursor ?? null;
      if (!cursorRef.current) setHasMore(false);
    } catch { /* silenced */ }
    setLoadingMore(false);
  }, [loadingMore, hasMore, filter]);

  // Intersection Observer — fires when sentinel enters viewport.
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadMore(); },
      { rootMargin: '300px' }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  const handlePostCreated = (post: Post) => {
    setPosts(prev => [post, ...prev]);
  };

  const handleFilterChange = async (key: string) => {
    setFilter(key);
    if (key === "nearby") return;

    // Trending — sort locally from already-fetched posts (no extra API call)
    if (key === "trending" && posts.length > 0) {
      setPosts(prev => [...prev].sort((a, b) => (b.like_count || 0) - (a.like_count || 0)));
      return;
    }

    setLoading(true);
    cursorRef.current = null;
    setHasMore(true);
    try {
      // Following: fetch posts from people the user follows
      const params: Record<string, any> = { limit: 30 };
      if (key === "following") {
        params.following = "true";
      } else {
        params.feed = "true";
      }
      const res = await client.get("/api/posts", { params });
      const payload = res.data;
      const data = Array.isArray(payload) ? payload : (payload?.posts ?? []);
      setPosts(key === "trending" ? [...data].sort((a, b) => (b.like_count || 0) - (a.like_count || 0)) : data);
      cursorRef.current = payload?.next_cursor ?? null;
      if (!cursorRef.current) setHasMore(false);
      setFeedError('');
    } catch (err: any) {
      setPosts([]);
      setFeedError(err?.error || err?.message || 'Failed to load posts.');
    }
    setLoading(false);
  };

  const isNearbyActive = filter === "nearby";

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Guest read-only banner — only shown after auth fully resolves to unauthenticated */}
      {authChecked && !isAuthenticated && (
        <div data-page-guide="feed-guest-banner" className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-subtle/80 px-4 py-3">
          <p className="text-xs font-medium text-primary-subtle-foreground">👋 Browsing as a guest: you see public businesses. Sign in to see personal posts, like and follow.</p>
          <Link href="/register" className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary/90 transition-colors">Join Free</Link>
        </div>
      )}
      <FeedPromoBanner isAuthenticated={isAuthenticated} />

      {/* Company-owned announcements. This is intentionally separate from user profile/post tickers. */}
      <div data-page-guide="feed-content"><CompanyAnnouncementTicker /></div>

      {/* Filter Bar — feed filter chips */}
      {feedMode === "personal" && (
        <div data-page-guide="feed-filters" className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
          {FILTERS.map(f => {
            const Icon = f.icon;
            return (
              <button key={f.key} onClick={() => handleFilterChange(f.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f.key ? accentTokens.activeTabClass : "bg-card border border-border/50 text-muted-foreground hover:bg-secondary"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {t(f.label)}
              </button>
            );
          })}
          {!isNearbyActive && (
            <button data-page-guide="feed-refresh" onClick={() => loadPosts(true)} disabled={loading}
              className="ml-auto shrink-0 p-2 rounded-full bg-card border border-border/50 text-muted-foreground hover:bg-secondary transition-all"
              title={t('feed.refreshFeed')}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      )}

      {/* Nearby / Map Tab */}
      {isNearbyActive && (
        <HomeMapTab user={user} />
      )}

      {/* Feed content */}
      {!isNearbyActive && (
        <>
          {/* Stories — always visible */}
          <Stories />

          {/* Create Post — always visible */}
          {user && (
            <div data-page-guide="feed-create-post">
              <CreatePostForm user={user} onPostCreated={handlePostCreated} />
            </div>
          )}

          {/* Business Showroom Feed */}
          {feedMode === "business" && (
            <BusinessShowroomFeed />
          )}

          {/* Personal Posts Feed */}
          {feedMode === "personal" && (
            <>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentTokens.primary }} />
                </div>
              ) : feedError ? (
                <div className="text-center py-12 rounded-2xl border border-destructive/20 bg-destructive/5">
                  <p className="text-sm text-destructive font-medium">{feedError}</p>
                  <button onClick={() => loadPosts()} className="mt-3 text-xs hover:underline font-medium" style={{ color: accentTokens.primary }}>Try again</button>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="font-medium">{t('feed.noPostsYet')}</p>
                  <p className="text-sm mt-1">{t('feed.beFirst')}</p>
                </div>
              ) : (
                <div data-page-guide="feed-posts">
                <AnimatePresence>
                  {posts.map((post, i) => (
                    <motion.div
                      key={post.id}
                      id={`post-${post.id}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 4) * 0.04, duration: 0.2 }}
                      className={post.id === highlightPostId
                        ? 'ring-2 ring-primary rounded-2xl transition-all duration-500'
                        : ''}
                    >
                      <ErrorBoundary>
                        <PostCard
                          post={post}
                          currentUser={user}
                          currentUserId={user?.id}
                          onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
                        />
                      </ErrorBoundary>
                    </motion.div>
                  ))}

                  {/* Infinite scroll sentinel */}
                  <div key="feed-infinite-scroll-sentinel" ref={sentinelRef} className="h-4" />
                  {loadingMore && (
                    <div key="feed-loading-more" className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                  {!hasMore && posts.length > 0 && (
                    <p key="feed-end-of-list" className="text-center text-xs text-muted-foreground py-4">You've seen all posts</p>
                  )}
                </AnimatePresence>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}




/** A post as the feed card shows it. */
type FeedPost = React.ComponentProps<typeof PostCard>['post'];

export default function HomePage() {
  return <ErrorBoundary><Home /></ErrorBoundary>;
}
