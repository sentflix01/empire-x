'use client'
import Link from 'next/link';
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { useTranslation } from 'react-i18next';

import { Briefcase, GraduationCap, Plus, Store, Crown, ShoppingBag, ClipboardList, Users, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/feed/PostCard";
import { BUSINESS_CATEGORIES } from "@/lib/businessTemplates";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

export default function PersonalProfile({ profile, user, isOwner, businesses }) {
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState("posts");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    entities.Post.filter({ author_id: profile.user_id }, "-created_at", 20)
      .then(p => { setPosts(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, [profile.user_id]);

  const skills = (() => { try { return JSON.parse(profile.skills || "[]"); } catch { return []; } })();
  const experience = (() => { try { return JSON.parse(profile.experience || "[]"); } catch { return []; } })();
  const education = (() => { try { return JSON.parse(profile.education || "[]"); } catch { return []; } })();

  return (
    <div className="space-y-4">
      {/* Quick Actions for Owner */}
      {isOwner && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link href="/business/create" className="bg-card rounded-xl border border-border/50 p-3 text-center hover:shadow-sm transition-shadow">
            <Store className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-[10px] font-medium">Add Business</p>
          </Link>
          <Link href="/products/create" className="bg-card rounded-xl border border-border/50 p-3 text-center hover:shadow-sm transition-shadow">
            <ShoppingBag className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-[10px] font-medium">Sell Product</p>
          </Link>
          <Link href="/tasks/create" className="bg-card rounded-xl border border-border/50 p-3 text-center hover:shadow-sm transition-shadow">
            <ClipboardList className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-[10px] font-medium">Post Task</p>
          </Link>
          <Link href="/showroom/create" className="bg-card rounded-xl border border-border/50 p-3 text-center hover:shadow-sm transition-shadow">
            <Crown className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-[10px] font-medium">Showroom</p>
          </Link>
          <Link href="/profile/edit" className="bg-card rounded-xl border border-border/50 p-3 text-center hover:shadow-sm transition-shadow">
            <Users className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-[10px] font-medium">Network</p>
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-xl border border-border/50 p-1">
        {["posts", "about", "activity"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {isOwner ? "You haven't posted yet" : "No posts yet"}
            </div>
          ) : (
            posts.map(p => <PostCard key={p.id} post={p} currentUserId={user?.id} />)
          )}
        </div>
      )}

      {tab === "about" && (
        <div className="space-y-3">
          {profile.bio && (
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <h3 className="font-semibold text-sm mb-2">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
            </div>
          )}
          {profile.headline && (
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <h3 className="font-semibold text-sm mb-2">Headline</h3>
              <p className="text-sm text-muted-foreground">{profile.headline}</p>
            </div>
          )}
          {profile.location && (
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <h3 className="font-semibold text-sm mb-2">Location</h3>
              <p className="text-sm text-muted-foreground">{profile.location}</p>
            </div>
          )}
          {skills.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <h3 className="font-semibold text-sm mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => <span key={i} className="px-3 py-1 rounded-full bg-secondary text-xs font-medium">{s}</span>)}
              </div>
            </div>
          )}
          {experience.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4" />Experience</h3>
              <div className="space-y-3">
                {experience.map((e, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0"><Briefcase className="w-4 h-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.company}</p>
                      <p className="text-xs text-muted-foreground">{e.period}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {education.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><GraduationCap className="w-4 h-4" />Education</h3>
              <div className="space-y-3">
                {education.map((e, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0"><GraduationCap className="w-4 h-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-sm font-medium">{e.degree}</p>
                      <p className="text-xs text-muted-foreground">{e.school}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Multiple Businesses List */}
          {isOwner && businesses && businesses.length > 0 && (
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Store className="w-4 h-4" /> My Businesses</h3>
                <Link href="/business/create" className="text-xs text-amber-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add</Link>
              </div>
              <div className="space-y-2">
                {businesses.map(b => (
                  <Link key={b.id} href={`/business/edit?id=${b.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: b.business_theme_color || "#2563EB" }}>
                      {b.business_name?.charAt(0) || "B"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.business_name}</p>
                      <p className="text-xs text-muted-foreground">{b.business_category}</p>
                    </div>
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}
          {isOwner && (!businesses || businesses.length === 0) && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5 text-center">
              <Store className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Have a business?</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Create a business profile with a mini-website to sell products and services directly on Empire X.</p>
              <Link href="/business/create"><Button size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"><Plus className="w-3 h-3 mr-1" /> Create Business Profile</Button></Link>
            </div>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">Activity feed coming soon</p>
        </div>
      )}
    </div>
  );
}

