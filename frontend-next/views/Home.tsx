// @ts-nocheck
'use client';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import client from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { HomeMapTabDynamic as HomeMapTab } from "@/components/map/DynamicMap";
import PostCard from "@/components/feed/PostCard";
import CreatePostForm from "@/components/feed/CreatePostForm";
import ProfileToggle from "@/components/profile/ProfileToggle";
import Stories from "@/views/Stories";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Users, MapPin, LayoutGrid, RefreshCw, Loader2, Sparkles,
  Megaphone, Eye, X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import ErrorBoundary from "@/components/ErrorBoundary";
import BusinessShowroomFeed from "@/components/feed/BusinessShowroomFeed";

const FILTERS = [
  { key: "all",       label: "feed.forYou",   icon: LayoutGrid },
  { key: "nearby",    label: "feed.nearby",   icon: MapPin },
  { key: "following", label: "feed.following",icon: Users },
  { key: "trending",  label: "feed.trending", icon: TrendingUp },
];

const COMPANY_TICKER =
  "Empire X announcement: Launch your mini website from Showroom Studio, promote updates, and share new offers with your customers.";
const COMPANY_TICKER_HIDDEN_KEY = "empire_company_ticker_hidden";

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
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 shadow-sm shadow-blue-950/5 transition-colors hover:bg-blue-50 dark:border-blue-500/25 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-slate-800"
          title="Show announcements">
          <Eye className="h-3.5 w-3.5" />
          {t('feed.showNews')}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white shadow-sm shadow-blue-950/5 dark:border-blue-500/25 dark:bg-slate-900">
      <div className="h-[2px] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
      <div className="flex min-h-10 items-center overflow-hidden">
        <div className="flex h-10 shrink-0 items-center gap-1.5 bg-slate-950 px-3 text-white dark:bg-blue-600">
          <Megaphone className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Empire X</span>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex w-max animate-marquee whitespace-nowrap py-2 text-blue-950 dark:text-blue-100">
            <span className="px-3 text-xs font-semibold">{repeated}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={hideTicker}
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-blue-700 transition-colors hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-950/60"
          title="Hide Empire X announcements"
          aria-label="Hide Empire X announcements"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [feedError, setFeedError] = useState('');
  const [filter, setFilter]       = useState("all");
  const [feedMode, setFeedMode]   = useState("personal");
  const [feedFlipping, setFeedFlipping] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    setFeedError('');
    try {
      const res = await client.get("/api/posts", { params: { feed: "true", limit: 30 } });
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setPosts([]);
      setFeedError(err?.error || err?.message || 'Failed to load posts. Check your connection.');
    }
    setLoading(false);
  };

  const handlePostCreated = (post) => {
    setPosts(prev => [post, ...prev]);
  };

  const handleFeedFlip = () => {
    setFeedFlipping(true);
    setTimeout(() => {
      setFeedMode(v => v === "personal" ? "business" : "personal");
      setFeedFlipping(false);
    }, 200);
  };

  const handleFilterChange = async (key) => {
    setFilter(key);
    if (key === "nearby") return; // map tab handles its own data
    setLoading(true);
    try {
      const params = key === "trending"
        ? { sort: "-like_count", limit: 30 }
        : { feed: "true", limit: 30 };
      const res = await client.get("/api/posts", { params });
      setPosts(Array.isArray(res.data) ? res.data : []);
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
      {/* Feed Mode Toggle */}
      <div className="flex items-center justify-center pt-2 md:justify-end">
        <ProfileToggle view={feedMode} onFlip={handleFeedFlip} flipping={feedFlipping} />
      </div>

      {/* Mini Website Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-lg shadow-blue-600/20 min-h-[132px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_15%_90%,rgba(16,185,129,0.22),transparent_26%)]" />
        <div className="relative z-10 flex min-h-[132px] items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="max-w-[250px]">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/85 ring-1 ring-white/20">
              <Sparkles className="h-3 w-3" />
              {t('common.showroomStudio')}
            </div>
            <p className="text-sm font-semibold leading-none text-white/88">{t('feed.createBusiness')}</p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-normal sm:text-3xl">
              {t('feed.buildMiniWebsite')}
            </h1>
            <p className="mt-2 text-sm font-medium leading-snug text-white/82">{t('feed.shareEmpire')}</p>
            <Link href="/showroom/create"
              className="mt-4 inline-flex h-10 items-center rounded-xl bg-white px-5 text-sm font-bold text-blue-700 shadow-md shadow-black/10 transition-all duration-200 hover:bg-blue-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
              {t('feed.getStarted')}
            </Link>
          </div>

          <div className="relative hidden h-32 w-44 shrink-0 sm:block" aria-hidden="true">
            <div className="absolute left-2 top-8 h-2 w-3 rotate-[24deg] rounded-sm bg-cyan-300/85 shadow-[0_0_12px_rgba(103,232,249,0.8)]" />
            <div className="absolute left-9 top-0 h-2 w-4 rotate-[18deg] rounded-sm bg-pink-400/85 shadow-[0_0_12px_rgba(244,114,182,0.75)]" />
            <div className="absolute right-4 bottom-3 h-2 w-3 rotate-[-18deg] rounded-sm bg-blue-300/80 shadow-[0_0_12px_rgba(147,197,253,0.75)]" />

            <div className="absolute right-6 top-0 h-[7.5rem] w-20 rotate-[12deg] rounded-[1.55rem] bg-slate-950/78 p-1.5 shadow-2xl shadow-slate-950/45 ring-1 ring-white/20">
              <div className="h-full rounded-[1.18rem] bg-gradient-to-br from-blue-600/90 via-indigo-600/82 to-purple-600/90 p-2">
                <div className="mx-auto mb-3 h-1.5 w-7 rounded-full bg-slate-900/55" />
                <div className="space-y-2">
                  <div className="h-4 rounded-md bg-white/28" />
                  <div className="h-4 rounded-md bg-white/18" />
                  <div className="h-4 w-11 rounded-md bg-white/18" />
                </div>
              </div>
            </div>

            <div className="absolute left-0 top-14 flex h-12 w-24 rotate-[-9deg] items-center gap-2 rounded-xl bg-white/92 p-2 shadow-xl shadow-slate-950/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <span className="h-5 w-5 rounded-full border-[3px] border-emerald-400 border-t-transparent rotate-[-35deg]" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-2 rounded-full bg-slate-300" />
                <div className="h-2 w-9 rounded-full bg-slate-200" />
              </div>
            </div>

            <div className="absolute left-9 top-2 flex h-10 w-[5.5rem] rotate-[7deg] items-center gap-2 rounded-xl bg-white/22 p-2 shadow-xl ring-1 ring-white/25 backdrop-blur-md">
              <div className="h-5 w-5 rounded-full bg-white/35" />
              <div className="flex-1 space-y-1.5">
                <div className="h-1.5 rounded-full bg-white/60" />
                <div className="h-1.5 w-8 rounded-full bg-white/30" />
              </div>
            </div>

            <div className="absolute right-0 top-[4.25rem] h-12 w-[5.75rem] rotate-[3deg] rounded-xl bg-violet-400/82 p-2 shadow-xl shadow-slate-950/20 ring-1 ring-white/20">
              <div className="mb-2 flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-white/55" />
                <div className="h-1.5 w-8 rounded-full bg-white/70" />
              </div>
              <div className="h-1.5 rounded-full bg-white/45" />
              <div className="mt-1.5 h-1.5 w-11 rounded-full bg-white/35" />
            </div>

            <div className="absolute left-7 bottom-1 h-8 w-20 rotate-[5deg] rounded-xl bg-white/18 p-2 shadow-lg ring-1 ring-white/20 backdrop-blur-md">
              <div className="h-1.5 w-8 rounded-full bg-white/45" />
              <div className="mt-1.5 h-1.5 w-11 rounded-full bg-white/25" />
            </div>
          </div>
        </div>
      </section>

      {/* Company-owned announcements. This is intentionally separate from user profile/post tickers. */}
      <CompanyAnnouncementTicker />

      {/* Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
        {FILTERS.map(f => {
          const Icon = f.icon;
          return (
            <button key={f.key} onClick={() => handleFilterChange(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f.key ? "bg-amber-500 text-white" : "bg-card border border-border/50 text-muted-foreground hover:bg-secondary"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {t(f.label)}
            </button>
          );
        })}
        {!isNearbyActive && (
          <button onClick={loadPosts} disabled={loading}
            className="ml-auto shrink-0 p-2 rounded-full bg-card border border-border/50 text-muted-foreground hover:bg-secondary transition-all"
            title={t('feed.refreshFeed')}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {/* Nearby / Map Tab */}
      {isNearbyActive && (
        <HomeMapTab user={user} />
      )}

      {/* Feed content */}
      {!isNearbyActive && (
        <>
          {/* Stories */}
          <Stories />

          {/* Create Post */}
          {user && (
            <CreatePostForm user={user} onPostCreated={handlePostCreated} />
          )}

          {/* Business Showroom Feed */}
          {feedMode === "business" && (
            <BusinessShowroomFeed />
          )}

          {/* Posts */}
          {feedMode === "personal" && (
            <>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
              ) : feedError ? (
                <div className="text-center py-12 rounded-2xl border border-destructive/20 bg-destructive/5">
                  <p className="text-sm text-destructive font-medium">{feedError}</p>
                  <button onClick={loadPosts} className="mt-3 text-xs text-amber-600 hover:underline font-medium">Try again</button>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="font-medium">{t('feed.noPostsYet')}</p>
                  <p className="text-sm mt-1">{t('feed.beFirst')}</p>
                </div>
              ) : (
                <AnimatePresence>
                  {posts.map((post, i) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 10) * 0.03, duration: 0.25 }}
                    >
                      <ErrorBoundary>
                        <PostCard post={post} currentUser={user} />
                      </ErrorBoundary>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}


