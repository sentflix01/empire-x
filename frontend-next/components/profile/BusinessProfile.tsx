'use client'
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from "react";
import { entities } from "@/api/entities";

import { Mail, Phone, MapPin, ShoppingBag, Plus, Edit2, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/brand/BrandLogo";
import { Badge } from "@/components/ui/badge";
import PurchaseModal from "@/components/checkout/PurchaseModal";
import { findOrCreateConversation } from "@/lib/messaging";
import SectionRenderer, { resolveCtaTarget, firstProductsIndex } from "@/components/showroom/SectionRenderer";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeImage from "@/components/ui/SafeImage";


export default function BusinessProfile({ profile, business, user, isOwner }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseItem, setPurchaseItem] = useState(null);
  const [messaging, setMessaging] = useState(false);
  const router = useRouter();

  // Merge: prefer business entity fields, fall back to profile's embedded business fields
  const biz = { ...profile, ...business };

  const handleMessage = async () => {
    if (!user || messaging) return;
    setMessaging(true);
    try {
      const conv = await findOrCreateConversation(
        user,
        profile.user_id,
        biz.business_name || profile.display_name
      );
      if (conv) router.push(`/messages/${conv.id}`);
    } catch (e) { console.error(e); }
    setMessaging(false);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [prods, ords] = await Promise.all([
      entities.Product.filter({ seller_id: profile.user_id, status: "active" }, "-created_at", 50).catch(() => []),
      isOwner ? entities.Order.filter({ seller_id: profile.user_id }, "-created_at", 10).catch(() => []) : Promise.resolve([])
    ]);
    setProducts(prods);
    setOrders(ords);
    setLoading(false);
  }, [profile.user_id, isOwner]);

  useEffect(() => {
    loadData();
  }, [loadData, business?.id]);

  const sections = (() => { try { return JSON.parse(biz.business_sections || "[]"); } catch { return []; } })();
  const ctaTarget = resolveCtaTarget(sections);
  const productsIdx = firstProductsIndex(sections);
  const themeColor = biz.business_theme_color || "#2563EB";
  const hours = (() => { try { return JSON.parse(biz.business_hours || "[]"); } catch { return []; } })();

  const handleBuy = (product) => {
    // Guests can buy: the Buy view asks for name, phone and email.
    setPurchaseItem({ ...product, product_type: "product" });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-0">
      {/* Mini-Website Container */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
        {/* Website Navbar — static, not sticky (sticky causes z-index overlap with contact section) */}
        <div className="bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            {biz.business_logo_url ? (
              <SafeImage src={biz.business_logo_url} alt={biz.business_name || 'Business logo'} className="w-7 h-7 rounded-lg object-cover shrink-0"
                fallback={<div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: themeColor }}>{biz.business_name?.charAt(0) || "B"}</div>} />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: themeColor }}>
                {biz.business_name?.charAt(0) || "B"}
              </div>
            )}
            <span className="font-display font-bold text-sm truncate" style={{ color: themeColor }}>{biz.business_name}</span>
            {profile.is_verified && <VerifiedBadge type={profile.verification_type} size="sm" />}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sections.filter(s => s.title).slice(0, 3).map(s => (
              <a key={s.title} href={`#section-${sections.indexOf(s)}`} className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">{s.title}</a>
            ))}
            {isOwner ? (
              <div className="flex items-center gap-1.5">
                {biz.showroom_slug && <Link href={`/showroom/${biz.showroom_slug}`}><Button size="sm" variant="outline" className="rounded-full h-7 text-xs"><ExternalLink className="w-3 h-3 mr-1" /> View site</Button></Link>}
                <Link href={biz.showroom_id ? `/showroom/create?edit=${biz.showroom_id}` : `/business/edit?id=${business?.id || ""}`}><Button size="sm" variant="outline" className="rounded-full h-7 text-xs"><Edit2 className="w-3 h-3 mr-1" /> Edit</Button></Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="rounded-full h-7 text-xs" onClick={handleMessage} disabled={messaging}>
                  <MessageSquare className="w-3 h-3 mr-1" /> {messaging ? "..." : "Message"}
                </Button>
                <Button size="sm" className="rounded-full h-7 text-xs text-white" style={{ backgroundColor: themeColor }}>
                  <a href={`#section-contact`}>Contact</a>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Render Sections */}
        <div className="space-y-0">
          {sections.map((section, idx) => {
            const sectionProducts = section.type === "products" || section.type === "featured_products" ? products : [];

            return (
              <SectionRenderer
                key={idx}
                section={section}
                sectionIndex={idx}
                products={sectionProducts}
                themeColor={themeColor}
                profile={biz}
                isOwner={isOwner}
                onBuy={handleBuy}
                hours={hours}
                ctaTarget={ctaTarget}
                isPrimaryProducts={idx === productsIdx}
              />
            );
          })}

          {/* Contact Section */}
          <div id="section-contact" className="px-5 py-10 bg-secondary/30 border-t border-border/30">
            <div className="max-w-md mx-auto text-center">
              <h2 className="font-display text-xl font-bold mb-4">Get in Touch</h2>
              <div className="space-y-2 text-sm">
                {biz.business_contact_email && (
                  <a href={`mailto:${biz.business_contact_email}`} className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground">
                    <Mail className="w-4 h-4" /> {biz.business_contact_email}
                  </a>
                )}
                {biz.business_contact_phone && (
                  <a href={`tel:${biz.business_contact_phone}`} className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground">
                    <Phone className="w-4 h-4" /> {biz.business_contact_phone}
                  </a>
                )}
                {biz.business_address && (
                  <p className="flex items-center justify-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" /> {biz.business_address}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-6 bg-muted text-center">
            <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">© {new Date().getFullYear()} {biz.business_name}. Powered by <BrandLogo className="w-3.5 h-3.5" /> Nodbusiness</p>
          </div>
        </div>
      </div>

      {/* Owner: Analytics Dashboard */}
      {isOwner && (
        <div className="mt-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold">Business Analytics</h3>
            <p className="text-sm text-white/80 mt-0.5">Track sales, views & engagement</p>
          </div>
          <Link href={`/analytics${business?.id ? `?business=${business.id}` : ""}`}><Button size="sm" variant="secondary" className="rounded-full">View Analytics</Button></Link>
        </div>
      )}

      {/* Owner: Add Product CTA */}
      {isOwner && products.length === 0 && (
        <div className="mt-4 bg-amber-50 rounded-2xl border border-amber-200 p-5 text-center">
          <ShoppingBag className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="font-semibold text-sm">Add products to your business</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Start selling directly from your mini-website</p>
          <Link href="/products/create"><Button size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600"><Plus className="w-3 h-3 mr-1" /> Add Product</Button></Link>
        </div>
      )}

      {/* Owner: Recent Orders */}
      {isOwner && orders.length > 0 && (
        <div className="mt-4 bg-card rounded-2xl border border-border/50 p-5">
          <h3 className="font-semibold text-sm mb-3">Recent Orders</h3>
          <div className="space-y-2">
            {orders.slice(0, 5).map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{o.product_title}</p>
                  <p className="text-xs text-muted-foreground">{o.buyer_name} • {o.quantity}x</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-600">{o.total_price?.toLocaleString()} {o.currency}</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5">{o.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {purchaseItem && (
        <PurchaseModal
          item={purchaseItem}
          seller={biz}
          businessId={business?.id ?? null}
          buyer={user ?? undefined}
          onClose={() => setPurchaseItem(null)}
        />
      )}
    </div>
  );
}
