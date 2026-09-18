'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/api/auth";
import { entities } from "@/api/entities";
import client from "@/api/client";
import SafeImage from "@/components/ui/SafeImage";
import { useTranslation } from 'react-i18next';

import { motion, AnimatePresence } from "framer-motion";
import { Edit2, LogOut, MapPin, Crown, Store, Settings, Plus, ShoppingBag, ClipboardList, ChevronDown, Pencil, ArrowLeft, Radio, ToggleLeft, ToggleRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PersonalProfile from "@/components/profile/PersonalProfile";
import BusinessProfile from "@/components/profile/BusinessProfile";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import TickerBar from "@/components/feed/TickerBar";
import { DemoBadge } from "@/components/profile/DemoBadge";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import ErrorBoundary from '@/components/ErrorBoundary';
import { useProfileView } from '@/lib/ProfileViewContext';

function Profile() {
  const { t } = useTranslation();
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { profileViewMode: view, setProfileViewMode, profileViewTokens: accentTokens } = useProfileView();
  const [flipping, setFlipping] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState(null);
  const [bizSelectorOpen, setBizSelectorOpen] = useState(false);
  const [tickerOn, setTickerOn] = useState(false);
  const [tickerToggling, setTickerToggling] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // Honour ?view= URL param on initial entry only — read once on mount.
  // The sidebar pill sets profileViewMode via context before navigating,
  // so this only handles deep-link / direct URL entry cases.
  const viewParamRef = React.useRef(viewParam);
  useEffect(() => {
    const param = viewParamRef.current;
    if (param === 'business' || param === 'personal') {
      setProfileViewMode(param);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const targetUserId = id || user.id;

      // ── Parallel fetches — 2 RTTs instead of 3 ──────────────────────────
      const [profiles, bizList] = await Promise.all([
        entities.UserProfile.filter({ user_id: targetUserId }),
        entities.Business.filter({ owner_id: targetUserId }, "-created_at", 50).catch(() => []),
      ]);

      if (profiles.length > 0) {
        setProfile(profiles[0]);
        // Default ticker ON if not explicitly set to 'none'
        const tickerType = profiles[0].ticker_type;
        setTickerOn(tickerType !== 'none'); // on by default unless user turned it off
        // Only set view from profile_type if no ?view= param was in the URL on entry
        if (!viewParamRef.current) {
          setProfileViewMode(profiles[0].profile_type === "business" ? "business" : "personal");
        }
      }
      setBusinesses(bizList);
      if (bizList.length > 0) setSelectedBizId(bizList[0].id);
    } catch (err) {
      if (err?.message?.includes("Authentication required") || err?.message?.includes("auth")) {
        router.push("/login");
        return;
      }
    }
    setLoading(false);
  };

  const handleFlip = () => {
    if (businesses.length === 0 && !profile?.has_business_profile) return;
    const next = view === "personal" ? "business" : "personal";
    setFlipping(true);
    setTimeout(() => {
      setProfileViewMode(next);
      setFlipping(false);
    }, 200);
  };

  const handleTickerQuickToggle = async () => {
    if (!profile || tickerToggling) return;
    setTickerToggling(true);
    const newType = tickerOn ? 'none' : (profile.ticker_type && profile.ticker_type !== 'none' ? profile.ticker_type : 'auto');
    try {
      await client.patch('/api/profiles/me/ticker', { ticker_type: newType });
      setTickerOn(!tickerOn);
      setProfile(p => ({ ...p, ticker_type: newType }));
      toast.success(newType === 'none' ? 'Ticker turned off' : 'Ticker turned on');
    } catch {
      toast.error('Failed to update ticker');
    }
    setTickerToggling(false);
  };

  const isOwner = user?.id === profile?.user_id;
  const selectedBusiness = businesses.find(b => b.id === selectedBizId) || null;
  const hasBusinessView = businesses.length > 0 || profile?.has_business_profile;

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-3">
      {/* Cover skeleton */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <Skeleton className="h-28 w-full" />
        <div className="px-5 pb-4">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <Skeleton className="w-24 h-24 rounded-2xl" />
            <div className="flex gap-2 mb-2">
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-4 w-60 mb-2" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="max-w-xl mx-auto text-center py-20">
      <Crown className="w-12 h-12 text-amber-400 mx-auto mb-3" />
      <h2 className="font-display text-xl font-bold">Profile not found</h2>
      <p className="text-sm text-muted-foreground mt-1">This user hasn't set up their profile yet.</p>
      <Link href="/"><Button variant="outline" className="mt-4 rounded-full">Go Home</Button></Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
        {/* Demo account notice banner — non-dismissible, shown for seed/AI-generated profiles */}
        {profile.is_seed && (
          <div className="mb-3 flex items-center gap-2 px-4 py-3 bg-yellow-50 border border-yellow-300/70 rounded-2xl text-yellow-800 text-sm font-medium">
            <DemoBadge />
            <span>This is an AI-generated demo account</span>
          </div>
        )}
        {/* Back button — shown when navigated from another page */}
        <button
          onClick={() => router.back()}
          aria-label="Go back to previous page"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
        </button>
        {/* Profile Header Card */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden mb-4">
          {/* Cover — personal: primary/accent (blue→purple) · business: gold scheme */}
          <div className={`h-28 relative transition-all duration-300 ${view === "business" ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" : "bg-nodbusiness-gradient"}`}>
            {view === "business" && (
              <SafeImage src={profile.business_cover_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: profile.business_cover_position || 'center' }} />
            )}
            {view === "personal" && (
              <SafeImage src={profile.cover_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: profile.cover_position || 'center' }} />
            )}
            {/* Personal / Business toggle — top-right of cover, visible to all when business exists */}
            {hasBusinessView && (
              <div className="absolute top-3 right-3 z-10 flex items-center rounded-full p-0.5 gap-0.5 shadow-lg"
                style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <button
                  onClick={() => view !== 'personal' && handleFlip()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={{
                    backgroundColor: view === 'personal' ? '#fff' : 'transparent',
                    color: view === 'personal' ? '#1d4ed8' : 'rgba(255,255,255,0.8)',
                  }}
                >
                  <User className="w-3 h-3" /> Personal
                </button>
                <button
                  onClick={() => view !== 'business' && handleFlip()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={{
                    backgroundColor: view === 'business' ? '#fff' : 'transparent',
                    color: view === 'business' ? '#b45309' : 'rgba(255,255,255,0.8)',
                  }}
                >
                  <Store className="w-3 h-3" /> Business
                </button>
              </div>
            )}
          </div>
          <div className="px-5 pb-4">
            {/* Row 1: Avatar (left) + Edit/Logout buttons (right) */}
            <div className="flex items-end justify-between -mt-12">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-card p-0.5 shadow-lg">
                  {view === "personal" ? (
                    <div className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center text-white text-3xl font-bold"
                      style={{ background: 'linear-gradient(135deg,#60a5fa,#2563eb)' }}>
                      <SafeImage src={profile.avatar_url} alt={profile.display_name || 'User'} className="w-full h-full object-cover rounded-xl"
                        fallback={profile.display_name?.charAt(0) || "U"} />
                    </div>
                  ) : profile.business_logo_url ? (
                    <SafeImage src={profile.business_logo_url} alt={profile.business_name || 'Business'} className="w-full h-full rounded-xl object-cover"
                      fallback={<div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-3xl font-bold">{profile.business_name?.charAt(0) || "B"}</div>} />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                      {profile.business_name?.charAt(0) || "B"}
                    </div>
                  )}
                </div>
              </div>

              {isOwner && (
                <div className="mb-2 flex gap-2 items-end">
                  <Link href="/profile/edit">
                    <Button variant="outline" size="sm" className="rounded-full h-8"><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="rounded-full h-8 text-muted-foreground" onClick={() => auth.logout("/")}>
                    <LogOut className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Name + Info */}
            <div className="mt-3" style={{ perspective: "1000px" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, rotateY: -25, x: -10 }}
                  animate={{ opacity: 1, rotateY: 0, x: 0 }}
                  exit={{ opacity: 0, rotateY: 25, x: 10 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: "center", backfaceVisibility: "hidden" }}
                >
                  {view === "personal" ? (
                    <>
                      <div className="flex items-center gap-2">
                        <h1 className="font-display text-xl font-bold">{profile.display_name}</h1>
                        {profile.is_verified && (
                          <VerifiedBadge type={profile.verification_type} size="lg" />
                        )}
                        {profile.is_seed && <DemoBadge />}
                      </div>
                      {profile.headline && <p className="text-sm text-muted-foreground">{profile.headline}</p>}
                      {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
                      {profile.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><MapPin className="w-3 h-3" />{profile.location}</p>
                      )}
                      <div className="flex gap-4 mt-3 text-sm">
                        <span><strong>{profile.connection_count || 0}</strong> <span className="text-muted-foreground">connections</span></span>
                        <span><strong>{profile.follower_count || 0}</strong> <span className="text-muted-foreground">followers</span></span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-display text-xl font-bold">{selectedBusiness?.business_name || profile.business_name}</h1>
                        {profile.is_verified && (
                          <VerifiedBadge type={profile.verification_type} size="lg" />
                        )}
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">{selectedBusiness?.business_category || profile.business_category}</Badge>
                      </div>
                      {(selectedBusiness?.business_description || profile.business_description) && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedBusiness?.business_description || profile.business_description}</p>
                      )}
                      {(selectedBusiness?.business_address || profile.business_address) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><MapPin className="w-3 h-3" />{selectedBusiness?.business_address || profile.business_address}</p>
                      )}
                      {/* Business List - beside the business name */}
                      {businesses.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">My Businesses</span>
                            {isOwner && (
                              <Link href="/business/create" className="text-[10px] text-amber-600 hover:underline flex items-center gap-0.5">
                                <Plus className="w-2.5 h-2.5" /> Add
                              </Link>
                            )}
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {businesses.map(b => (
                              <button
                                key={b.id}
                                onClick={() => setSelectedBizId(b.id)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                                  b.id === selectedBizId
                                    ? "text-white shadow-sm"
                                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                                }`}
                                style={b.id === selectedBizId ? { backgroundColor: b.business_theme_color || "#D4AF37" } : {}}
                              >
                                <span>{b.business_name?.charAt(0) || "B"}</span>
                                <span>{b.business_name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {isOwner && businesses.length === 0 && (
                        <Link href="/business/create" className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline mt-3">
                          <Plus className="w-3 h-3" /> Create a business
                        </Link>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Ticker preview strip — visible when ticker is on (owner sees live preview; visitors see the ticker) */}
        {tickerOn && profile.ticker_text && profile.ticker_type && profile.ticker_type !== 'none' && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-border/50 shadow-sm">
            <TickerBar text={profile.ticker_text} type={profile.ticker_type} />
          </div>
        )}
        {/* Profile Content */}
        <div style={{ perspective: "1200px" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, rotateY: -18, scale: 0.96 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, rotateY: 18, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "center", backfaceVisibility: "hidden" }}
            >
              {view === "personal" ? (
                <PersonalProfile profile={profile} user={user} isOwner={isOwner} businesses={businesses} />
              ) : (
                <BusinessProfile profile={profile} business={selectedBusiness} user={user} isOwner={isOwner} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
  );
}

export default function ProfilePage() {
  return <ErrorBoundary><Profile /></ErrorBoundary>;
}
