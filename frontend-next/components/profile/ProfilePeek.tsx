import SafeImage from '@/components/ui/SafeImage';
/**
 * ProfilePeek — full-screen profile modal
 * Shared by PostCard and NearbyMap (Home feed Nearby tab).
 *
 * Usage:
 *   <ProfilePeek
 *     authorId="uuid"
 *     authorName="Display Name"
 *     initialView="personal" | "business"
 *     onClose={() => ...}
 *   />
 */
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { createPortal } from "react-dom";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import { useAuth } from "@/lib/AuthContext";

import { motion, AnimatePresence } from "framer-motion";
import { fromNow } from "@/lib/date";
import {
  Minimize2, UserIcon, Store, MapPin,
} from "lucide-react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Profile {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  cover_url?: string;
  bio?: string;
  headline?: string;
  location?: string;
  follower_count?: number;
  following_count?: number;
  connection_count?: number;
  skills?: string;
  experience?: string;
  is_verified?: boolean;
  verification_type?: string;
  [key: string]: unknown;
}

interface Business {
  id: string;
  business_name?: string;
  business_category?: string;
  business_theme_color?: string;
  business_logo_url?: string;
  business_cover_url?: string;
  business_description?: string;
  business_address?: string;
  business_contact_phone?: string;
  business_contact_email?: string;
  business_hours?: string;
  [key: string]: unknown;
}

/* ─── Personal profile embed ─────────────────────────────────────────── */
function PersonalProfileEmbed({ profile }: any) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const skills = (() => { try { return JSON.parse(profile?.skills || "[]"); } catch { return []; } })();
  const experience = (() => { try { return JSON.parse(profile?.experience || "[]"); } catch { return []; } })();

  useEffect(() => {
    entities.Post.filter({ author_id: profile.user_id }, "-created_at", 20)
      .then((p: any[]) => { setPosts(p); setLoadingPosts(false); })
      .catch(() => setLoadingPosts(false));
  }, [profile.user_id]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-12">
      {/* Avatar / cover card */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-amber-400 to-orange-500">
          {profile?.cover_url && (
            <SafeImage fill={false} width={800} height={600} loading="lazy" src={profile.cover_url} alt={`${profile.display_name || 'User'}'s cover`} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-5 pb-4">
          <div className="-mt-10 mb-3">
            <div className="w-20 h-20 rounded-2xl bg-card p-0.5 shadow-lg overflow-hidden">
              {profile?.avatar_url
                ? <SafeImage fill={false} width={800} height={600} loading="lazy" src={profile.avatar_url} alt={`${profile.display_name || 'User'}'s avatar`} className="w-full h-full object-cover rounded-xl" />
                : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                    {(profile?.display_name ?? "?").charAt(0)}
                  </div>
                )
              }
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl font-bold">{profile?.display_name}</h1>
            {profile?.is_verified && (
              <VerifiedBadge type={profile?.verification_type} size="lg" />
            )}
          </div>
          {profile?.headline && (
            <p className="text-sm text-muted-foreground">{profile.headline}</p>
          )}
          {profile?.bio && (
            <p className="text-sm mt-2 leading-relaxed">{profile.bio}</p>
          )}
          {profile?.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <MapPin className="w-3 h-3" />{profile.location}
            </p>
          )}
          <div className="flex gap-5 mt-3 text-sm border-t border-border/40 pt-3">
            <span><strong>{profile?.follower_count ?? 0}</strong> <span className="text-muted-foreground">Followers</span></span>
            <span><strong>{profile?.following_count ?? 0}</strong> <span className="text-muted-foreground">Following</span></span>
            <span><strong>{profile?.connection_count ?? 0}</strong> <span className="text-muted-foreground">Connections</span></span>
          </div>
        </div>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <h3 className="font-semibold text-sm mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((s: string, i: number) => (
              <span key={i} className="px-3 py-1 rounded-full bg-secondary text-xs font-medium">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <h3 className="font-semibold text-sm mb-3">Experience</h3>
          {experience.map((e: any, i: number) => (
            <div key={i} className="flex gap-3 mb-3 last:mb-0">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.company}</p>
                {e.period && <p className="text-xs text-muted-foreground">{e.period}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      <div>
        <h3 className="font-semibold text-sm mb-3 px-1">Posts</h3>
        {loadingPosts ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center text-sm text-muted-foreground">
            No posts yet
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((p: any) => (
              <div key={p.id} className="bg-card rounded-2xl border border-border/50 p-4">
                {p.image_url && (
                  <SafeImage fill={false} width={800} height={600} loading="lazy" src={p.image_url} alt={p.content?.slice(0, 120) || 'Post image'} className="w-full rounded-xl object-cover mb-3" style={{ maxHeight: 240 }} />
                )}
                <p className="text-sm leading-relaxed">{p.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  ❤️ {p.like_count ?? 0} · 💬 {p.comment_count ?? 0} · {fromNow(p.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Business profile embed ─────────────────────────────────────────── */
function BusinessProfileEmbed({ profile, business, businesses, themeColor }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const biz = { ...profile, ...(business ?? {}) };

  useEffect(() => {
    entities.Product.filter({ seller_id: profile.user_id, status: "active" }, "-created_at", 20)
      .then((p: any[]) => setProducts(p))
      .catch(() => {});
  }, [profile.user_id]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-12">
      {/* Business header card */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div
          className="h-28 relative"
          style={{ background: `linear-gradient(135deg, ${themeColor}cc, ${themeColor}66)` }}
        >
          {biz.business_cover_url && (
            <SafeImage fill={false} width={800} height={600} loading="lazy" src={biz.business_cover_url} alt={`${biz.business_name || 'Business'}'s cover`} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-5 pb-4">
          <div className="-mt-10 mb-3">
            <div className="w-20 h-20 rounded-2xl bg-card p-0.5 shadow-lg overflow-hidden">
              {biz.business_logo_url
                ? <SafeImage fill={false} width={800} height={600} loading="lazy" src={biz.business_logo_url} alt={`${biz.business_name || 'Business'}'s logo`} className="w-full h-full object-cover rounded-xl" />
                : (
                  <div
                    className="w-full h-full rounded-xl flex items-center justify-center text-white text-3xl font-bold"
                    style={{ backgroundColor: themeColor }}
                  >
                    {(biz.business_name ?? "B").charAt(0)}
                  </div>
                )
              }
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl font-bold">{biz.business_name || biz.display_name}</h1>
            {profile.is_verified && (
              <VerifiedBadge type={profile.verification_type} size="lg" />
            )}
          </div>
          {biz.business_category && (
            <p className="text-xs text-muted-foreground mt-0.5">{biz.business_category}</p>
          )}
          {biz.business_description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{biz.business_description}</p>
          )}
          {biz.business_address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <MapPin className="w-3 h-3" />{biz.business_address}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {biz.business_contact_phone && (
              <a href={`tel:${biz.business_contact_phone}`} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">
                📞 {biz.business_contact_phone}
              </a>
            )}
            {biz.business_contact_email && (
              <a href={`mailto:${biz.business_contact_email}`} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full">
                ✉️ {biz.business_contact_email}
              </a>
            )}
            {biz.business_hours && (
              <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">
                🕐 {biz.business_hours}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* All businesses list (when owner has more than one) */}
      {businesses.length > 1 && (
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <h3 className="font-semibold text-sm mb-3">All Businesses</h3>
          <div className="space-y-2">
            {businesses.map((b: any) => (
              <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                  style={{ backgroundColor: b.business_theme_color || "#2563EB" }}
                >
                  {b.business_name?.charAt(0) ?? "B"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{b.business_name}</p>
                  <p className="text-xs text-muted-foreground">{b.business_category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products grid */}
      {products.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-3 px-1">Products</h3>
          <div className="grid grid-cols-2 gap-3">
            {products.map((p: any) => {
              const imgs = (() => { try { return JSON.parse(p.images || "[]"); } catch { return []; } })();
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-sm transition-shadow"
                >
                  <div className="aspect-square bg-secondary/30">
                    {imgs[0] && (
                      <SafeImage fill={false} width={800} height={600} loading="lazy" src={imgs[0]} alt={p.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold truncate">{p.title}</p>
                    <p className="text-xs text-amber-600 font-bold mt-0.5">{p.price?.toLocaleString()} {p.currency}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main ProfilePeek ───────────────────────────────────────────────── */
export interface ProfilePeekProps {
  /** UUID of the user whose profile to show */
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  /**
   * Which view to open first.
   * "personal" → personal profile tab
   * "business" → business profile tab
   */
  initialView?: "personal" | "business";
  onClose: () => void;
}

export default function ProfilePeek({
  authorId,
  authorName,
  initialView = "personal",
  onClose,
}: ProfilePeekProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [peekView, setPeekView] = useState<"personal" | "business">(initialView);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { isAuthenticated } = useAuth();

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    Promise.all([
      entities.UserProfile.filter({ user_id: authorId }),
      entities.Business.filter({ owner_id: authorId }),
    ]).then(([profiles, bizs]) => {
      if (profiles.length) setProfile(profiles[0] as Profile);
      setBusinesses(bizs as Business[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authorId]);

  useEffect(() => {
    if (isAuthenticated) auth.me().then(setCurrentUser).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    // Update view if initialView changes (e.g. clicking a different marker)
    setPeekView(initialView);
  }, [authorId, initialView]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const hasBusiness = businesses.length > 0 || (profile as any)?.has_business_profile;
  const primaryBiz = businesses[0] ?? null;
  const themeColor: string =
    (primaryBiz?.business_theme_color as string) ??
    (profile as any)?.business_theme_color ??
    "#2563EB";
  const isOwner = currentUser?.id === (profile as any)?.user_id;

  return createPortal(
    <AnimatePresence>
      {/* Backdrop — z-[1000] sits above Leaflet map layers (max z ~650) */}
      <motion.div
        className="fixed inset-0 z-[1000] flex items-start justify-center pt-16 px-4 bg-transparent pointer-events-none"
        initial={{ y: -8 }}
        animate={{ y: 0 }}
        exit={{ y: -8 }}
        transition={{ duration: 0.12 }}
      >
        {/* Modal panel — drops from top */}
        <motion.div
          className="relative flex flex-col bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-hidden w-full pointer-events-auto"
          style={{
            maxWidth: "480px",
            maxHeight: "78vh",
            backgroundColor: "hsl(var(--card))",
            opacity: 1,
          }}
          initial={{ scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: -20 }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-border bg-card z-10"
            style={{ backgroundColor: "hsl(var(--card))", opacity: 1 }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <p className="font-semibold text-sm truncate">
                {peekView === "personal"
                  ? ((profile as any)?.display_name ?? authorName ?? "Profile")
                  : ((profile as any)?.business_name ?? primaryBiz?.business_name ?? "Business Profile")}
              </p>
              {hasBusiness && (
                <div className="flex bg-secondary/70 rounded-full p-0.5 gap-0.5 ring-1 ring-border/40 shrink-0">
                  <button
                    onClick={() => setPeekView("personal")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all ${
                      peekView === "personal"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UserIcon className="w-3 h-3" /> Personal
                  </button>
                  <button
                    onClick={() => setPeekView("business")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all ${
                      peekView === "business"
                        ? "text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={peekView === "business" ? { backgroundColor: themeColor } : {}}
                  >
                    <Store className="w-3 h-3" /> Business
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/profile/${authorId}${peekView === "business" ? "?view=business" : ""}`}
                onClick={onClose}
                className="text-xs font-medium text-amber-600 hover:underline"
              >
                Full page →
              </Link>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                title="Close (Esc)" aria-label="Close (Esc)"
              >
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : !profile ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <UserIcon className="w-10 h-10 opacity-20" />
                <p className="text-sm">Profile not found</p>
              </div>
            ) : peekView === "personal" ? (
              <PersonalProfileEmbed
                profile={profile}
                businesses={businesses}
                currentUser={currentUser}
                isOwner={isOwner}
              />
            ) : (
              <BusinessProfileEmbed
                profile={profile}
                business={primaryBiz}
                businesses={businesses}
                currentUser={currentUser}
                isOwner={isOwner}
                themeColor={themeColor}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
