// @ts-nocheck
import React, { useState, useEffect } from "react";
import { entities } from "@/api/entities";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Clock, Star, ShoppingBag, ArrowRight, Check, Plus, Edit2, ExternalLink, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PurchaseModal from "@/components/checkout/PurchaseModal";
import { getCategoryByValue } from "@/lib/businessTemplates";
import { findOrCreateConversation } from "@/lib/messaging";
import SectionRenderer from "@/components/showroom/SectionRenderer";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

const parseImages = (img) => { try { return JSON.parse(img || "[]"); } catch { return img ? [img] : []; } };

export default function BusinessProfile({ profile, business, user, isOwner }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseItem, setPurchaseItem] = useState(null);
  const [messaging, setMessaging] = useState(false);
  const navigate = useNavigate();

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
      if (conv) navigate(`/messages/${conv.id}`);
    } catch (e) { console.error(e); }
    setMessaging(false);
  };

  useEffect(() => {
    loadData();
  }, [profile.user_id, business?.id]);

  const loadData = async () => {
    setLoading(true);
    const [prods, ords] = await Promise.all([
      entities.Product.filter({ seller_id: profile.user_id, status: "active" }, "-created_at", 50).catch(() => []),
      isOwner ? entities.Order.filter({ seller_id: profile.user_id }, "-created_at", 10).catch(() => []) : Promise.resolve([])
    ]);
    setProducts(prods);
    setOrders(ords);
    setLoading(false);
  };

  const sections = (() => { try { return JSON.parse(biz.business_sections || "[]"); } catch { return []; } })();
  const category = getCategoryByValue(biz.business_category);
  const themeColor = biz.business_theme_color || "#D4AF37";
  const hours = (() => { try { return JSON.parse(biz.business_hours || "[]"); } catch { return []; } })();

  const handleBuy = (product) => {
    if (!user) return;
    setPurchaseItem({ ...product, product_type: "product" });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-0">
      {/* Mini-Website Container */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
        {/* Website Navbar */}
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {biz.business_logo_url ? (
              <img src={biz.business_logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: themeColor }}>
                {biz.business_name?.charAt(0) || "B"}
              </div>
            )}
            <span className="font-display font-bold text-sm" style={{ color: themeColor }}>{biz.business_name}</span>
            {profile.is_verified && <VerifiedBadge type={profile.verification_type} size="sm" />}
          </div>
          <div className="flex items-center gap-3">
            {sections.filter(s => s.title).slice(0, 4).map((s, i) => (
              <a key={i} href={`#section-${i}`} className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors">{s.title}</a>
            ))}
            {isOwner ? (
              <Link to={`/business/edit/${business?.id || ""}`}><Button size="sm" variant="outline" className="rounded-full h-7 text-xs"><Edit2 className="w-3 h-3 mr-1" /> Edit</Button></Link>
            ) : (
              <div className="flex items-center gap-2">
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
              />
            );
          })}

          {/* Contact Section */}
          <div id="section-contact" className="px-5 py-10 bg-gradient-to-br from-gray-50 to-white border-t border-border/30">
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
          <div className="px-5 py-6 bg-gray-900 text-center">
            <p className="text-xs text-white/60">© 2024 {biz.business_name}. Powered by Empire X 👑</p>
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
          <Link to={`/analytics${business?.id ? `?business=${business.id}` : ""}`}><Button size="sm" variant="secondary" className="rounded-full">View Analytics</Button></Link>
        </div>
      )}

      {/* Owner: Add Product CTA */}
      {isOwner && products.length === 0 && (
        <div className="mt-4 bg-amber-50 rounded-2xl border border-amber-200 p-5 text-center">
          <ShoppingBag className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="font-semibold text-sm">Add products to your business</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Start selling directly from your mini-website</p>
          <Link to="/products/create"><Button size="sm" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600"><Plus className="w-3 h-3 mr-1" /> Add Product</Button></Link>
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
          buyer={user}
          onClose={() => setPurchaseItem(null)}
          onPurchased={loadData}
        />
      )}
    </div>
  );
}
