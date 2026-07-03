// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import client from "@/api/client";
import PostCard from "@/components/feed/PostCard";
import CreatePostForm from "@/components/feed/CreatePostForm";
import ProfileToggle from "@/components/profile/ProfileToggle";
import Stories from "@/pages/Stories";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Users, MapPin, LayoutGrid, Store, UtensilsCrossed, ShoppingBag, Briefcase, HeartPulse, Palette, CalendarDays, Home as HomeIcon, GraduationCap, X, RefreshCw } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/businessTemplates";
import BusinessShowroomFeed from "@/components/feed/BusinessShowroomFeed";

const FILTERS = [
  { key: "all", label: "For You", icon: LayoutGrid },
  { key: "trending", label: "Trending", icon: TrendingUp },
  { key: "following", label: "Following", icon: Users },
  { key: "nearby", label: "Nearby", icon: MapPin },
];

// Category filter chips shown when "Nearby" is active in business mode
const NEARBY_CATEGORIES = [
  { value: "", label: "All" },
  ...BUSINESS_CATEGORIES.map(c => ({ value: c.value, label: c.label, icon: c.icon })),
];

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [feedMode, setFeedMode] = useState("personal");
  const [feedFlipping, setFeedFlipping] = useState(false);

  // Nearby state
  const [nearbyBusinesses, setNearbyBusinesses] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyCategory, setNearbyCategory] = useState("");
  const locationRequested = useRef(false);

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
    loadPosts();
  }, []);

  // When switching to nearby filter, request location once
  useEffect(() => {
    if (filter === "nearby" && !locationRequested.current) {
      locationRequested.current = true;
      requestLocation();
    }
    if (filter === "nearby" && userLocation) {
      loadNearbyBusinesses(userLocation.lat, userLocation.lon, nearbyCategory);
    }
  }, [filter]);

  // Reload when category changes
  useEffect(() => {
    if (filter === "nearby" && userLocation) {
      loadNearbyBusinesses(userLocation.lat, userLocation.lon, nearbyCategory);
    }
  }, [nearbyCategory]);

  const requestLocation = () => {
    setNearbyLoading(true);
    setNearbyError(null);
    if (!navigator.geolocation) {
      setNearbyError("Location not supported by your browser.");
      setNearbyLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc);
        loadNearbyBusinesses(loc.lat, loc.lon, nearbyCategory);
      },
      () => {
        // Fallback to Addis Ababa center
        const loc = { lat: 9.0192, lon: 38.7525 };
        setUserLocation(loc);
        loadNearbyBusinesses(loc.lat, loc.lon, nearbyCategory);
        setNearbyError("Using Addis Ababa as default location.");
      },
      { timeout: 8000 }
    );
  };

  const loadNearbyBusinesses = async (lat, lon, category = "") => {
    setNearbyLoading(true);
    try {
      const params = new URLSearchParams({ lat, lon, radius_km: 30 });
      if (category) params.append("category", category);
      const res = await client.get(`/api/maps/nearby/businesses?${params}`);
      setNearbyBusinesses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setNearbyError("Failed to load nearby businesses.");
    }
    setNearbyLoading(false);
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await client.get("/api/posts", { params: { feed: "true", limit: 30 } });
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPosts([]);
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
    if (key === "nearby") {
      if (!locationRequested.current) {
        locationRequested.current = true;
        requestLocation();
      }
      return;
    }
    // Reload feed with appropriate sort
    setLoading(true);
    try {
      let res;
      if (key === "trending") {
        res = await client.get("/api/posts", { params: { sort: "-like_count", limit: 30 } });
      } else {
        res = await client.get("/api/posts", { params: { feed: "true", limit: 30 } });
      }
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch { setPosts([]); }
    setLoading(false);
  };

  const isNearbyActive = filter === "nearby";

  return (
      <div className="max-w-xl mx-auto space-y-4">
        {/* Feed Mode Toggle */}
        <div className="flex items-center justify-end pt-2">
          <ProfileToggle view={feedMode} onFlip={handleFeedFlip} flipping={feedFlipping} />
        </div>

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-2xl p-5 text-white">
          <h1 className="font-display text-xl font-bold">Welcome to Empire X 👑</h1>
          <p className="text-sm text-white/80 mt-1">
            {feedMode === "personal"
              ? "Your African super-app for social, commerce, and services."
              : isNearbyActive
                ? "Discover businesses near you."
                : "Browse business showrooms from across the community."}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
          {FILTERS.map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f.key
                    ? "bg-amber-500 text-white"
                    : "bg-card border border-border/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            );
          })}
          {/* Refresh button */}
          {!isNearbyActive && (
            <button
              onClick={loadPosts}
              disabled={loading}
              className="ml-auto shrink-0 p-2 rounded-full bg-card border border-border/50 text-muted-foreground hover:bg-secondary transition-all"
              title="Refresh feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>

        {/* Nearby Category Filter - only when nearby + business mode */}
        {isNearbyActive && (
          <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {NEARBY_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setNearbyCategory(cat.value)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      nearbyCategory === cat.value
                        ? "bg-amber-500 text-white"
                        : "bg-card border border-border/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {cat.label}
                  </button>
                );
              })}
            </div>
            {nearbyError && (
              <p className="text-xs text-muted-foreground px-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {nearbyError}
              </p>
            )}
          </div>
        )}

        {/* Create Post - only in personal feed, not nearby */}
        {feedMode === "personal" && !isNearbyActive && (
          <CreatePostForm user={user} onPostCreated={handlePostCreated} />
        )}

        {/* Stories row */}
        {feedMode === "personal" && !isNearbyActive && <Stories />}

        {/* Nearby Businesses Feed */}
        {isNearbyActive && (
          <AnimatePresence mode="wait">
            <motion.div
              key="nearby"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {nearbyLoading ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Finding businesses near you...</p>
                </div>
              ) : nearbyBusinesses.length === 0 ? (
                <div className="text-center py-16">
                  <MapPin className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <h3 className="font-display text-lg font-bold">No businesses nearby</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try a different category or expand your radius.
                  </p>
                </div>
              ) : (
                nearbyBusinesses.map(biz => (
                  <NearbyBusinessCard key={biz.id} business={biz} currentUser={user} />
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Regular Feed */}
        {!isNearbyActive && (
          <AnimatePresence mode="wait">
            <motion.div
              key={feedMode}
              initial={{ opacity: 0, rotateY: -12, scale: 0.97 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, rotateY: 12, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "center", perspective: "1200px" }}
              className="space-y-3"
            >
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">{feedMode === "personal" ? "✨" : "🏪"}</div>
                  <h3 className="font-display text-lg font-bold">
                    {feedMode === "personal" ? "Your feed is empty" : "No business showrooms yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feedMode === "personal" ? "Be the first to post something!" : "Business showrooms will appear here."}
                  </p>
                </div>
              ) : (
                // Deduplicate posts by id to prevent duplicate key warnings
                [...new Map(posts.map(p => [p.id, p])).values()].map(post => (
                  <PostCard key={post.id} post={post} currentUserId={user?.id} feedMode={feedMode} />
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
  );
}

// Nearby business card — wraps BusinessShowroomFeed with distance badge
function NearbyBusinessCard({ business, currentUser }) {
  const themeColor = business.business_theme_color || "#D4AF37";
  const profile = {
    user_id: business.owner_id,
    display_name: business.display_name,
    avatar_url: business.avatar_url,
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
      <BusinessShowroomFeed
        profile={profile}
        currentUser={currentUser}
        businesses={[business]}
      />
      {/* Distance badge */}
      {business.distance_km != null && (
        <div className="px-4 pb-3 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-amber-500" />
          <span className="text-xs text-muted-foreground">
            {business.distance_km < 1
              ? `${Math.round(business.distance_km * 1000)}m away`
              : `${business.distance_km.toFixed(1)} km away`}
          </span>
          {business.district && (
            <span className="text-xs text-muted-foreground">· {business.district}</span>
          )}
        </div>
      )}
    </div>
  );
}


