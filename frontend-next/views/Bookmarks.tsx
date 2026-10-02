'use client';
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import NextImage from 'next/image';
import client from "@/api/client";
import { Bookmark, ShoppingBag, Crown, ClipboardList, FileText, Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ErrorState from "@/components/ui/ErrorState";
import ErrorBoundary from '@/components/ErrorBoundary';
import BookmarkButton from "@/components/ui/BookmarkButton";
import { useAppStore } from "@/store";
import { useAuth } from "@/lib/AuthContext";

function Bookmarks() {
  const { t } = useTranslation();
  const TABS = [
    { key:"all",     label: t('bookmarks.all') },
    { key:"post",    label: t('bookmarks.posts'),     icon:FileText   },
    { key:"product", label: t('bookmarks.products'),  icon:ShoppingBag },
    { key:"showroom",label: t('bookmarks.showrooms'), icon:Crown       },
    { key:"task",    label: t('bookmarks.tasks'),     icon:ClipboardList },
    { key:"alerts",  label: t('bookmarks.alerts'),    icon:Bell        },
  ];

  const savedIds = useAppStore(s => s.savedIds);
  const hydrate  = useAppStore(s => s.hydrate);
  const storeError = useAppStore(s => s.error);
  const isHydrating = useAppStore(s => s.isHydrating);
  const { user, authChecked } = useAuth();

  const [tab, setTab] = useState("all");
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Hydrate only when the store has no bookmarks yet
  useEffect(() => {
    if (Object.keys(savedIds).length === 0) {
      hydrate();
    }
  }, [hydrate, savedIds]);

  useEffect(() => {
    if (tab === "alerts") loadAlerts();
  }, [tab]);

  const loadAlerts = async () => {
    setAlertsLoading(true);
    try {
      const { data } = await client.get("/api/wishlists/price-alerts");
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load price alerts");
    }
    setAlertsLoading(false);
  };

  const handleRemoveAlert = async (productId) => {
    try {
      await client.delete(`/api/wishlists/price-alerts/${productId}`);
      setAlerts(prev => prev.filter(a => a.product_id !== productId));
      toast.success(t('bookmarks.removeAlert'));
    } catch { toast.error(t('bookmarks.removeAlertFailed')); }
  };

  // Pure in-memory filtering from the store
  const filtered = Object.values(savedIds).filter(
    item => tab === 'all' || item.target_type === tab
  );

  return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Bookmark className="w-6 h-6 text-amber-500"/>
          <h1 className="font-display text-2xl font-bold">{t('bookmarks.title')}</h1>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${tab===t.key?"bg-amber-500 text-white":"bg-card border border-border/50 text-muted-foreground hover:bg-secondary"}`}>
              {t.icon && <t.icon className="w-3.5 h-3.5"/>}{t.label}
            </button>
          ))}
        </div>

        {/* Price Alerts tab */}
        {tab === "alerts" && (
          alertsLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"/></div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3"/>
              <p className="font-semibold">{t('bookmarks.noPriceAlerts')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('bookmarks.noPriceAlertsSubtitle')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(a => {
                const imgs = (() => { try { return JSON.parse(a.images || "[]"); } catch { return []; } })();
                const dropped = a.is_triggered;
                const pct = a.current_price > 0
                  ? Math.round(((a.current_price - a.target_price) / a.current_price) * 100)
                  : 0;
                return (
                  <div key={a.product_id} className={`bg-card rounded-2xl border p-4 flex items-center gap-3 ${dropped ? "border-green-300 dark:border-green-700" : "border-border/50"}`}>
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl bg-secondary/30 shrink-0 overflow-hidden relative">
                      {imgs[0]
                        ? <NextImage src={imgs[0]} alt={a.title} fill className="object-cover" unoptimized />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-muted-foreground/20"/></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${a.product_id}`} className="text-sm font-semibold hover:underline line-clamp-1">{a.title}</Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Current: <span className="font-medium text-foreground">{parseFloat(a.current_price).toLocaleString()} {a.currency}</span>
                        {" · "}Target: <span className="font-medium text-amber-600">{parseFloat(a.target_price).toLocaleString()}</span>
                      </p>
                      {dropped ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full mt-1">
                          {t('bookmarks.priceDropped')}
                        </span>
                      ) : pct > 0 ? (
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">{t('bookmarks.priceAboveTarget', { pct })}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full mt-1">
                          {t('bookmarks.priceAtTarget')}
                        </span>
                      )}
                    </div>
                    <button onClick={() => handleRemoveAlert(a.product_id)}
                      className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Bookmarks tabs */}
        {tab !== "alerts" && (
          isHydrating ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"/></div>
          ) : (storeError || (!user && authChecked)) && filtered.length === 0 ? (
            <ErrorState
              message={!user ? 'Sign in to see your bookmarks' : storeError}
              onRetry={!user ? () => { window.location.href = '/login?return=/bookmarks'; } : () => hydrate()}
            />
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Bookmark className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3"/>
              <p className="text-muted-foreground">{t('bookmarks.noBookmarks')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(savedItem => {
                const { target_id, target_type, title, thumbnailUrl } = savedItem;
                return (
                  <div key={target_id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-start gap-3">
                    {thumbnailUrl && (
                      <div className="w-12 h-12 rounded-xl bg-secondary/30 shrink-0 overflow-hidden relative">
                        <NextImage src={thumbnailUrl} alt={title || target_type} fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {target_type === "post" && (
                        <p className="text-sm line-clamp-2">{title || t('bookmarks.untitled')}</p>
                      )}
                      {target_type === "product" && (
                        <Link href={`/products/${target_id}`} className="hover:underline">
                          <p className="text-sm font-medium">{title || t('bookmarks.untitled')}</p>
                        </Link>
                      )}
                      {target_type === "showroom" && (
                        <Link href={`/businesses`} className="hover:underline">
                          <p className="text-sm font-medium">{title || t('bookmarks.untitled')}</p>
                        </Link>
                      )}
                      {target_type === "task" && (
                        <Link href="/tasks" className="hover:underline">
                          <p className="text-sm font-medium">{title || t('bookmarks.untitled')}</p>
                        </Link>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1 capitalize">{target_type}</p>
                    </div>
                    <BookmarkButton
                      targetId={target_id}
                      targetType={target_type}
                      itemData={{ title, thumbnailUrl }}
                      className="shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
  );
}




export default function BookmarksPage() {
  return <ErrorBoundary><Bookmarks /></ErrorBoundary>;
}
