'use client';
import SafeImage from '@/components/ui/SafeImage';
import Link from 'next/link';
import NextImage from 'next/image';
import React, { useState, useEffect } from "react";
import client from "@/api/client";
import { TrendingUp, ShoppingBag, Users, Hash } from "lucide-react";
import BrandLogo from '@/components/brand/BrandLogo';
import { Skeleton } from "@/components/ui/skeleton";
import PostCard from "@/components/feed/PostCard";
import { useAuth } from "@/lib/AuthContext";
import { useTranslation } from "react-i18next";
import ErrorBoundary from '@/components/ErrorBoundary';

function ProductThumbnail({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[4/3] bg-secondary/30 overflow-hidden">
      {src && !failed ? (
        <NextImage
          src={src}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, 240px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setFailed(true)}
          unoptimized
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}
    </div>
  );
}

function Explore() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hashtags, setHashtags] = useState([]);

  useEffect(() => {
    client.get("/api/trending").then(r => setData(r.data)).finally(() => setLoading(false));
    client.get("/api/hashtags/trending").then(r => setHashtags(r.data || [])).catch(() => {});
  }, []);

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-6 pt-2">
      {/* Skeleton for trending section */}
      {[1, 2].map(i => (
        <div key={i} className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(j => (
              <div key={j} className="rounded-xl border border-border/40 overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-2 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div data-page-guide="explore-header" className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-amber-500" />
          <h1 data-page-guide="explore-trending" className="font-display text-2xl font-bold">{t('explore.title')}</h1>
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
              {[...new Map<string, any>(data.trending_posts.slice(0, 5).map((p: any) => [p.id, p] as [string, any])).values()].map((p: any) => (
                <PostCard key={p.id} post={p} currentUserId={user?.id} />
              ))}
            </div>
          </Section>
        )}

        {data?.top_products?.length > 0 && (
          <Section title={t('explore.topProducts')} icon={ShoppingBag}>
            <div className="grid grid-cols-2 gap-3">
              {[...new Map<string, any>(data.top_products.map((p: any) => [p.id, p] as [string, any])).values()].map((p: any) => {
                const imgs = (() => { try { return JSON.parse(p.images || "[]"); } catch { return []; } })();
                return (
                  <Link key={p.id} href={`/products/${p.id}`} className="rounded-xl border border-border/40 overflow-hidden hover:shadow-sm transition-shadow group">
                    <ProductThumbnail src={imgs[0]} title={p.title} />
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
          <Section title={t('explore.featuredShowrooms')} icon={BrandLogo}>
            <div className="grid grid-cols-2 gap-3">
              {data.featured_showrooms.map(s => (
                <Link key={s.id} href={`/showrooms/${s.id}`} className="rounded-xl border border-border/40 overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="h-24 relative bg-gradient-to-br from-amber-100 to-amber-50 overflow-hidden">
                    {(s.cover_image || s.logo_url) ? (
                      <SafeImage fill={false} width={800} height={600} loading="lazy"
                        src={s.cover_image || s.logo_url}
                        alt={s.title}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BrandLogo className="w-8 h-8 text-amber-400" />
                      </div>
                    )}
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

export default function ExplorePage() {
  return <ErrorBoundary><Explore /></ErrorBoundary>;
}
