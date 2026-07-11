'use client';
import Link from 'next/link';
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { auth } from "@/api/auth";
import { Search, Plus, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export default function Marketplace() {
  const { t } = useTranslation();
  const CATEGORIES = [
    t('marketplace.categories.all'), t('marketplace.categories.electronics'),
    t('marketplace.categories.fashion'), t('marketplace.categories.food'),
    t('marketplace.categories.services'), t('marketplace.categories.handmade'),
    t('marketplace.categories.beauty'), t('marketplace.categories.home'),
    t('marketplace.categories.other'),
  ];
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [user, setUser] = useState(null);

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const data = await entities.Product.filter({ status: "active" }, "-created_at", 50);
    setProducts(data);
    setLoading(false);
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === t('marketplace.categories.all') || p.category === category;
    return matchSearch && matchCat;
  });

  const parseImages = (img) => {
    if (!img) return [];
    try { return JSON.parse(img); } catch { return img ? [img] : []; }
  };

  return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold">{t('marketplace.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('marketplace.subtitle')}</p>
          </div>
          <Link href="/products/create">
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(product => {
              const images = parseImages(product.images);
              return (
                <Link key={product.id} href={`/products/${product.id}`} className="group">
                  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-md transition-all">
                    <div className="aspect-square bg-secondary/30 relative overflow-hidden">
                      {images[0] ? (
                        <img src={images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
        )}
      </div>
  );
}



