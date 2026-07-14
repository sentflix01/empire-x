'use client';
import Link from 'next/link';
import React, { useState, useEffect } from "react";
import client from "@/api/client";
import { TrendingUp, ShoppingBag, Crown, ClipboardList, Users, Loader2, Banknote, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PostCard from "@/components/feed/PostCard";
import { auth } from "@/api/auth";
import moment from "moment";
import { useTranslation } from "react-i18next";

export default function Explore() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [hashtags, setHashtags] = useState([]);

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
    client.get("/api/trending").then(r => setData(r.data)).finally(() => setLoading(false));
    client.get("/api/hashtags/trending").then(r => setHashtags(r.data || [])).catch(() => {});
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-amber-500" />
          <h1 className="font-display text-2xl font-bold">{t('explore.title')}</h1>
        </div>
        {hashtags.length > 0 && (
          <Section title={t('explore.trendingHashtags')} icon={Hash}>
            <div className="flex flex-wrap gap-2 p-1">
              {hashtags.slice(0, 15).map(h => (
                <Link
                  key={h.name}
                  href={`/hashtag/${h.name}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  <Hash className="w-3 h-3" />{h.name}
                  <span className="text-xs text-amber-500 ml-1">{h.post_count}</span>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {data?.trending_posts?.length > 0 && (
          <Section title={t('explore.trendingPosts')} icon={TrendingUp}>
            <div className="space-y-3">
              {data.trending_posts.slice(0, 5).map(p => (
                <PostCard key={p.id} post={p} currentUserId={user?.id} />
              ))}
            </div>
          </Section>
        )}

        {data?.top_products?.length > 0 && (
          <Section title={t('explore.topProducts')} icon={ShoppingBag}>
            <div className="grid grid-cols-2 gap-3">
              {data.top_products.map(p => {
                const imgs = (() => { try { return JSON.parse(p.images || "[]"); } catch { return []; } })();
                return (
                  <Link key={p.id} href={`/products/${p.id}`} className="rounded-xl border border-border/40 overflow-hidden hover:shadow-sm transition-shadow group">
                    <div className="aspect-square bg-secondary/30 overflow-hidden">
                      {imgs[0] ? <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-8 h-8 text-muted-foreground/20" /></div>}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{p.title}</p>
                      <p className="text-xs text-amber-600 font-bold">{p.price?.toLocaleString()} {p.currency}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Section>
        )}

        {data?.featured_showrooms?.length > 0 && (
          <Section title={t('explore.featuredShowrooms')} icon={Crown}>
            <div className="grid grid-cols-2 gap-3">
              {data.featured_showrooms.map(s => (
                <Link key={s.id} href={`/showrooms/${s.id}`} className="rounded-xl border border-border/40 overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="h-24 bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">{s.view_count} {t('search.views')}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}
        {data?.open_tasks?.length > 0 && (
          <Section title={t('explore.openTasks')} icon={ClipboardList}>
            <div className="space-y-2">
              {data.open_tasks.map(task => (
                <Link key={task.id} href="/tasks" className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.task_type}{task.location ? ` • ${task.location}` : ""}</p>
                  </div>
                  <p className="text-sm font-bold text-amber-600 shrink-0 ml-2 flex items-center gap-1">
                    <Banknote className="w-3 h-3" />{task.offered_payment?.toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {data?.suggested_users?.length > 0 && (
          <Section title={t('explore.peopleToFollow')} icon={Users}>
            <div className="space-y-1">
              {data.suggested_users.map(u => (
                <Link key={u.user_id} href={`/profile/${u.user_id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold shrink-0">
                    {u.display_name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.display_name}</p>
                    {u.headline && <p className="text-xs text-muted-foreground truncate">{u.headline}</p>}
                  </div>
                  {u.is_verified && <span className="text-blue-500 text-xs">✓</span>}
                </Link>
              ))}
            </div>
          </Section>
        )}
      </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-amber-500" />
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}




