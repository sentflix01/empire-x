'use client';
import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from "@/api/auth";
import { entities } from "@/api/entities";
import client from "@/api/client";
import { useTranslation } from 'react-i18next';

import { motion, AnimatePresence } from "framer-motion";
import { Edit2, LogOut, MapPin, Crown, Store, Settings, Plus, ShoppingBag, ClipboardList, ChevronDown, Pencil, ArrowLeft, Radio, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PersonalProfile from "@/components/profile/PersonalProfile";
import BusinessProfile from "@/components/profile/BusinessProfile";
import ProfileToggle from "@/components/profile/ProfileToggle";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import TickerBar from "@/components/feed/TickerBar";
import { DemoBadge } from "@/components/profile/DemoBadge";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export default function Profile() {
  const { t } = useTranslation();
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("personal"); // "personal" | "business"
  const [flipping, setFlipping] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBizId, setSelectedBizId] = useState(null);
  const [bizSelectorOpen, setBizSelectorOpen] = useState(false);
  const [tickerOn, setTickerOn] = useState(false);
  const [tickerToggling, setTickerToggling] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [id, viewParam]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const me = await auth.me();
      setUser(me);
      const targetUserId = id || me.id;
      const profiles = await entities.UserProfile.filter({ user_id: targetUserId });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        setTickerOn((profiles[0].ticker_type || 'none') !== 'none');
        if (viewParam === "business" || viewParam === "personal") {
          setView(viewParam);
        } else {
          setView(profiles[0].profile_type === "business" ? "business" : "personal");
        }
      }
      // Load businesses from Business entity
      const bizList = await entities.Business.filter({ owner_id: targetUserId }, "-created_at", 50).catch(() => []);
      setBusinesses(bizList);
      if (bizList.length > 0) setSelectedBizId(bizList[0].id);
    } catch (err) {
      if (err?.message?.includes("Authentication required") || err?.message?.includes("auth")) {
        auth.redirectToLogin(window.location.pathname);
        return;
      }
    }
    setLoading(false);
  };

  const handleFlip = () => {
    if (businesses.length === 0 && !profile?.has_business_profile) return;
    setFlipping(true);
    setTimeout(() => {
      setView(v => v === "personal" ? "business" : "personal");
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
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
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
          {/* Cover */}
          <div className="h-28 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 relative">
            {view === "business" && profile.business_cover_url && (
              <img src={profile.business_cover_url} alt={`${profile.business_name || 'Business'} cover photo`} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="px-5 pb-4">
            {/* Row 1: Avatar (left) + Edit/Logout buttons (right) */}
            <div className="flex items-end justify-between -mt-12">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-card p-0.5 shadow-lg">
                  {view === "personal" ? (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt={`${profile.display_name || 'User'} avatar`} className="w-full h-full object-cover" />
                        : (profile.display_name?.charAt(0) || "U")}
                    </div>
                  ) : profile.business_logo_url ? (
                    <img src={profile.business_logo_url} alt={`${profile.business_name || 'Business'} logo`} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                      {profile.business_name?.charAt(0) || "B"}
                    </div>
                  )}
                </div>
              </div>

              {isOwner && (
                <div className="mb-2 flex flex-col gap-2 items-end">
                  <div className="flex gap-2">
                    <Link href="/profile/edit">
                      <Button variant="outline" size="sm" className="rounded-full h-8"><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="rounded-full h-8 text-muted-foreground" onClick={() => auth.logout("/")}>
                      <LogOut className="w-3 h-3" />
                    </Button>
                  </div>
                  {/* Ticker quick-toggle */}
                  <button
                    onClick={handleTickerQuickToggle}
                    disabled={tickerToggling}
                    aria-label={tickerOn ? 'Ticker is on — click to disable' : 'Ticker is off — click to enable'}
                    aria-pressed={tickerOn}
                    className={`flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium border transition-all ${
                      tickerOn
                        ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {tickerOn
                      ? <ToggleRight className="w-3.5 h-3.5 text-amber-500" />
                      : <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                    }
                    Ticker {tickerOn ? 'On' : 'Off'}
                  </button>
                </div>
              )}
            </div>

            {/* Row 2: ProfileToggle — full-width row below avatar */}
            <div className="mt-3 flex justify-center w-full overflow-hidden">
              <div className="max-w-full overflow-x-auto">
                <ProfileToggle
                  view={view}
                  onFlip={handleFlip}
                  flipping={flipping}
                  theme={theme}
                  onTheme={setTheme}
                  showBusiness={hasBusinessView}
                />
              </div>
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
        {/* Owner prompt when ticker is off — subtle nudge to turn it on */}
        {isOwner && !tickerOn && (
          <div className="mb-4 flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="text-xs text-slate-500">
                Ticker is off. Turn it on to show promotions, contact info, or announcements under your posts.
              </p>
            </div>
            <button
              onClick={handleTickerQuickToggle}
              disabled={tickerToggling}
              className="shrink-0 ml-3 text-xs font-medium text-amber-600 hover:underline whitespace-nowrap"
            >
              Turn on →
            </button>
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



