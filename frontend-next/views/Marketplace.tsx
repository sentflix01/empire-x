'use client';
import Link from 'next/link';
import Image from 'next/image';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import client from "@/api/client";
import { Search, Plus, ShoppingBag, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ErrorBoundary from '@/components/ErrorBoundary';

function Marketplace() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const CATEGORIES = [
    t('marketplace.categories.all'), t('marketplace.categories.electronics'),
    t('marketplace.categories.fashion'), t('marketplace.categories.food'),
    t('marketplace.categories.services'), t('marketplace.categories.handmade'),
    t('marketplace.categories.beauty'), t('marketplace.categories.home'),
    t('marketplace.categories.other'),
  ];
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [user, setUser] = useState(null);
  const [paymentBanner, setPaymentBanner] = useState<"success"|"failed"|"cancelled"|null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const PAGE_SIZE = 24;

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
    loadProducts(true);
    const payment = searchParams?.get("payment");
    if (payment === "success") {
      setPaymentBanner("success");
      toast.success("💳 Payment confirmed! Your order has been placed.");
      window.history.replaceState({}, '', '/marketplace');
    } else if (payment === "cancelled") {
      setPaymentBanner("cancelled");
      toast.info("Checkout cancelled — you were not charged.");
      window.history.replaceState({}, '', '/marketplace');
    } else if (payment === "failed") {
      setPaymentBanner("failed");
      toast.error("Payment was not completed. Please try again.");
      window.history.replaceState({}, '', '/marketplace');
    }
  }, []);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadMore(); },
      { rootMargin: '400px' }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading]);

  const loadProducts = async (reset = false) => {
    if (reset) { setLoading(true); offsetRef.current = 0; setHasMore(true); }
    try {
      const { data } = await client.get('/api/products', {
        params: { status: 'active', sort: '-created_at', limit: PAGE_SIZE, offset: reset ? 0 : offsetRef.current }
      });
      const rows = Array.isArray(data) ? data : [];
      setProducts(reset ? rows : prev => {
        const seen = new Set(prev.map(p => p.id));
        return [...prev, ...rows.filter(p => !seen.has(p.id))];
      });
      offsetRef.current = (reset ? 0 : offsetRef.current) + rows.length;
      if (rows.length < PAGE_SIZE) setHasMore(false);
    } catch { if (reset) setProducts([]); }
    if (reset) setLoading(false);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadProducts(false);
    setLoadingMore(false);
  }, [loadingMore, hasMore]);

  const filtered = products.filter(p => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === t('marketplace.categories.all') || p.category === category;
    return matchSearch && matchCat;
  });

  const parseImages = (img) => {
    if (!img) return [];
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    const normalise = (url: string) =>
      url && url.startsWith('/') ? `${API_BASE}${url}` : url;
    try {
      const arr = JSON.parse(img);
      return Array.isArray(arr) ? arr.map(normalise) : [normalise(img)];
    } catch {
      return img ? [normalise(img)] : [];
    }
  };

  return (
      <div className="max-w-4xl mx-auto">

        {/* Payment return banner (Chapa / Stripe — provider-neutral) */}
        {paymentBanner === "success" && (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200 text-green-800">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600" />
            <div>
              <p className="font-semibold text-sm">Payment Successful!</p>
              <p className="text-xs text-green-700">Your payment was confirmed. The seller will contact you shortly.</p>
            </div>
            <button onClick={() => setPaymentBanner(null)} className="ml-auto text-green-500 hover:text-green-700">✕</button>
          </div>
        )}
        {paymentBanner === "cancelled" && (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
            <XCircle className="w-5 h-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold text-sm">Checkout Cancelled</p>
              <p className="text-xs text-amber-700">You left before completing payment — you were not charged. Try again whenever you're ready.</p>
            </div>
            <button onClick={() => setPaymentBanner(null)} className="ml-auto text-amber-500 hover:text-amber-700">✕</button>
          </div>
        )}
        {paymentBanner === "failed" && (
          <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800">
            <XCircle className="w-5 h-5 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold text-sm">Payment Not Completed</p>
              <p className="text-xs text-red-700">Your payment was not processed. You can try again or place a COD order.</p>
            </div>
            <button onClick={() => setPaymentBanner(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        <div className="flex items-start justify-between mb-6 gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold">{t('marketplace.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('marketplace.subtitle')}</p>
          </div>
          <Link href="/products/create" className="shrink-0">
            <Button size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
              <Plus className="w-4 h-4 mr-1" /> {t('marketplace.listProduct')}
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('marketplace.search')} className="pl-9 rounded-full bg-card border-border/50" />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === c
                  ? "bg-amber-500 text-white"
                  : "bg-card border border-border/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold">{t('marketplace.noProducts')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('marketplace.beFirst')}</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(product => {
              const images = parseImages(product.images);
              return (
                <Link key={product.id} href={`/products/${product.id}`} className="group">
                  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-md transition-all">
                    <div className="aspect-square bg-secondary/30 relative overflow-hidden">
                      {images[0] ? (
                        <Image src={images[0]} alt={product.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <ShoppingBag className="w-10 h-10" />
                        </div>
                      )}
                      {product.status === "sold_out" && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Badge variant="secondary" className="bg-white/90">{t('marketplace.outOfStock')}</Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium truncate">{product.title}</h3>
                      <p className="text-amber-600 font-bold text-sm mt-1">
                        {product.price?.toLocaleString()} {product.currency || "ETB"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          {/* Infinite scroll sentinel — only when not filtering locally */}
          {!search && category === t('marketplace.categories.all') && (
            <>
              <div ref={sentinelRef} className="h-4" />
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              )}
              {!hasMore && products.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">All products loaded</p>
              )}
            </>
          )}
          </>
        )}
      </div>
  );
}

export default function MarketplacePage() {
  return <ErrorBoundary><Marketplace /></ErrorBoundary>;
}
