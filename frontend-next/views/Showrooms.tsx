'use client'
import Link from 'next/link';
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { Crown, Search, Plus, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from 'react-i18next';
import ErrorBoundary from '@/components/ErrorBoundary';
import BookmarkButton from '@/components/ui/BookmarkButton';

function ShowroomSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <Skeleton className="h-28 w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

const CAT_LABELS = {
  business: "Business", creative: "Creative", education: "Education", events: "Events",
  nonprofit: "Nonprofit", personal: "Personal", media: "Media", startup: "Startup", community: "Community",
};

function Showrooms() {
  const { t } = useTranslation();
  const [showrooms, setShowrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    entities.Showroom.filter({ status: "published" }, "-created_at", 50)
      .then(setShowrooms)
      .finally(() => setLoading(false));
  }, []);

  const filtered = showrooms.filter(s => {
    const matchSearch = !search || s.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === t('common.all') || s.category === category;
    return matchSearch && matchCat;
  });

  return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Showrooms</h1>
            <p className="text-sm text-muted-foreground">Explore mini-websites</p>
          </div>
          <Link href="/showroom/create">
            <Button size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
              <Plus className="w-4 h-4 mr-1" /> Create
            </Button>
          </Link>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('showrooms.title') + '...'} className="pl-9 rounded-full bg-card border-border/50" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {["All", ...Object.keys(CAT_LABELS)].map(c => (
            <button key={c} onClick={() => setCategory(c)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${category === c ? "bg-amber-500 text-white" : "bg-card border border-border/50 text-muted-foreground hover:bg-secondary"}`}>
              {c === t('common.all') ? t('common.all') : CAT_LABELS[c]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <ShowroomSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold">No showrooms found</h3>
            <p className="text-sm text-muted-foreground mt-1">Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(s => (
              <div key={s.id} className="relative group">
                <Link href={`/showrooms/${s.id}`} className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-md transition-all block group">
                  <div className="h-28 relative overflow-hidden bg-gradient-to-r from-amber-100 to-amber-50">
                    {s.cover_image ? (
                      <img
                        src={s.cover_image}
                        alt={s.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Crown className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform" />
                      </div>
                    )}
                    {/* Category badge overlay */}
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
                        {CAT_LABELS[s.category] || s.category || 'Showroom'}
                      </span>
                    </div>
                    {/* Bookmark button — positioned top-right, stops link navigation */}
                    <div className="absolute top-2 right-2">
                      <BookmarkButton
                        targetId={s.id}
                        targetType="showroom"
                        itemData={{
                          title: s.title,
                          thumbnailUrl: s.cover_image || undefined,
                        }}
                        className="p-1.5 bg-black/30 hover:bg-black/50 rounded-lg backdrop-blur-sm"
                      />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-sm">{s.title}</h3>
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Eye className="w-3 h-3" /> {s.view_count || 0} views
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}

export default function ShowroomsPage() {
  return <ErrorBoundary><Showrooms /></ErrorBoundary>;
}
