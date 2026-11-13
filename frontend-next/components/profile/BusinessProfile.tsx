'use client'
import Link from 'next/link';
import React, { useState, useEffect, useCallback } from "react";
import { entities, type Business, type Order, type Product, type Showroom, type UserProfile } from "@/lib/api/entities";
import type { AuthUser } from "@/lib/AuthContext";
import { sectionList } from "@/lib/showroomSectionsCodec";

import { Mail, Phone, MapPin, ShoppingBag, Plus, Edit2, MessageSquare, ExternalLink, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/brand/BrandLogo";
import { Badge } from "@/components/ui/badge";
import PurchaseModal from "@/components/checkout/PurchaseModal";

type PurchaseItem = React.ComponentProps<typeof PurchaseModal>['item'];
import { useStartChat } from "@/lib/messaging";
import SectionRenderer, { resolveCtaTarget, firstProductsIndex, isCatalogueSection } from "@/components/showroom/SectionRenderer";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeImage from "@/components/ui/SafeImage";
import WebsiteStatusBanner from "@/components/profile/WebsiteStatusBanner";
import { themeTextStyle, fillForWhiteText } from '@/lib/contrast';
import { formatAmount } from '@/lib/money';
import { RatingSummary } from '@/components/ui/Stars';
import BusinessReviews from '@/components/business/BusinessReviews';


/**
 * The business's published Studio site, if any: the most recently updated
 * published showroom linked to `businessId`. The API already drops sites that
 * are expired, private to guests, or past the 24-hour grace after a plan ends.
 */
export function pickPublishedSite<T extends { status?: string; business_id?: unknown; updated_at?: string }>(showrooms: T[] | null | undefined, businessId: string | null | undefined): T | null {
  if (!businessId || !Array.isArray(showrooms)) return null;
  const matches = showrooms.filter(s => s?.status === "published" && String(s.business_id ?? "") === String(businessId));
  matches.sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
  return matches[0] ?? null;
}

/** A business shown on a profile: a business record, possibly built from a published site. */
export type ProfileBusinessRecord = Business & { showroom_id?: string; showroom_slug?: string };

interface BusinessProfileProps {
  profile: UserProfile;
  business: ProfileBusinessRecord | null;
  user: AuthUser | null;
  isOwner: boolean;
}

export default function BusinessProfile({ profile, business, user, isOwner }: BusinessProfileProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [site, setSite] = useState<Showroom | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseItem, setPurchaseItem] = useState<PurchaseItem | null>(null);

  // Merge: prefer business entity fields, fall back to profile's embedded business fields
  const biz = { ...profile, ...business };

  // Opens the chat with this business (or the person, when there's no business record).
  const chat = useStartChat();
  const handleMessage = () => { void chat.start({ businessId: business?.id ?? null, userId: profile.user_id }); };
  const messaging = chat.busy;

  const loadData = useCallback(async () => {
    setLoading(true);
    const [prods, ords, sites] = await Promise.all([
      entities.Product.filter({ seller_id: profile.user_id, status: "active" }, "-created_at", 50).catch(() => []),
      isOwner ? entities.Order.filter({ seller_id: profile.user_id }, "-created_at", 10).catch(() => []) : Promise.resolve([]),
      business?.id
        ? entities.Showroom.filter({ owner_id: profile.user_id, status: "published" }, "-updated_at", 50).catch(() => [] as Showroom[])
        : Promise.resolve([] as Showroom[]),
    ]);
    setProducts(prods);
    setOrders(ords);
    setSite(pickPublishedSite(sites, business?.id));
    setLoading(false);
  }, [profile.user_id, isOwner, business?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Prefer the owner's published Studio site; the category template's sample
  // sections are only a fallback for businesses without one.
  const sections = sectionList(site ? site.sections : biz.business_sections);
  const ctaTarget = resolveCtaTarget(sections);
  const productsIdx = firstProductsIndex(sections);
  const themeColor = (site && site.theme_color) || biz.business_theme_color || "#2563EB";
  const siteContactIdx = site ? sections.findIndex(s => s?.type === "contact") : -1;
  const contactHref = siteContactIdx >= 0 ? `#section-${siteContactIdx}` : "#section-contact";
  const sectionProfile = site
    ? { ...biz, ...site, business_name: site.title || biz.business_name, business_description: site.description ?? biz.business_description, display_name: site.title || biz.business_name }
    : biz;
  const siteSlug = site ? site.slug : biz.showroom_slug;
  const siteEditId = site ? site.id : biz.showroom_id;
  const hours = (() => { try { return JSON.parse(String(biz.business_hours || "[]")); } catch { return []; } })();

  const handleBuy = (product: Record<string, any>) => {
    // Guests can buy: the Buy view asks for name, phone and email. Studio cards
    // carry their own product_type (linked product or website item).
    const item = { ...product, title: String(product.title ?? product.name ?? '') };
    setPurchaseItem(site ? item : { ...item, product_type: "product" });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div data-page-guide="profile-business-tab" className="space-y-0">
      {/* Owner only: why the business isn't visible yet, and the one action that fixes it. */}
      {isOwner && business?.id && (
        <WebsiteStatusBanner businessId={String(business.id)} ownerId={String(profile.user_id)} businessCategory={biz.business_category} />
      )}

      {/* Mini-Website Container */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
        {/* Website Navbar — static, not sticky (sticky causes z-index overlap with contact section) */}
        <div className="bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            {biz.business_logo_url ? (
              <SafeImage src={biz.business_logo_url} alt={biz.business_name || 'Business logo'} className="w-7 h-7 rounded-lg object-cover shrink-0"
                fallback={<div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: fillForWhiteText(themeColor) }}>{biz.business_name?.charAt(0) || "B"}</div>} />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: fillForWhiteText(themeColor) }}>
                {biz.business_name?.charAt(0) || "B"}
              </div>
            )}
            <span className="biz-text font-display font-bold text-sm truncate" style={{ ...themeTextStyle(themeColor) }}>{biz.business_name}</span>
            {profile.is_verified && <VerifiedBadge type={profile.verification_type} size="sm" />}
            <RatingSummary average={business?.average_rating} count={business?.review_count} className="shrink-0" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sections.filter(s => s.title).slice(0, 3).map(s => (
              <a key={s.title} href={`#section-${sections.indexOf(s)}`} className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">{s.title}</a>
            ))}
            {isOwner ? (
              <div className="flex items-center gap-1.5">
                {siteSlug && <Link href={`/showroom/${siteSlug}`}><Button size="sm" variant="outline" className="rounded-full h-7 text-xs"><ExternalLink className="w-3 h-3 mr-1" /> View site</Button></Link>}
                <Link href={siteEditId ? `/showroom/create?edit=${siteEditId}` : `/business/edit?id=${business?.id || ""}`}><Button size="sm" variant="outline" className="rounded-full h-7 text-xs"><Edit2 className="w-3 h-3 mr-1" /> Edit</Button></Link>
                {(sections.some(s => s.type === "rooms") || biz.business_category === "Hospitality & Tourism") && business?.id && (
                  <Link href={`/business/rooms?business=${business.id}`}><Button size="sm" variant="outline" className="rounded-full h-7 text-xs"><BedDouble className="w-3 h-3 mr-1" aria-hidden="true" /> Rooms</Button></Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="rounded-full h-7 text-xs" onClick={handleMessage} disabled={messaging}>
                  <MessageSquare className="w-3 h-3 mr-1" /> {messaging ? "..." : "Message"}
                </Button>
                <Button size="sm" className="rounded-full h-7 text-xs text-white" style={{ backgroundColor: fillForWhiteText(themeColor) }}>
                  <a href={contactHref}>Contact</a>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Render Sections */}
        <div className="space-y-0">
          {sections.map((section, idx) => {
            const sectionProducts = isCatalogueSection(section.type) ? products : [];

            return (
              <SectionRenderer
                key={idx}
                section={section}
                sectionIndex={idx}
                products={sectionProducts}
                themeColor={themeColor}
                profile={sectionProfile}
                isOwner={isOwner}
                onBuy={site && isOwner ? undefined : handleBuy}
                hours={hours}
                ctaTarget={ctaTarget}
                isPrimaryProducts={idx === productsIdx}
                showroomId={site?.id ?? null}
                businessId={business?.id ? String(business.id) : null}
              />
            );
          })}

          {business?.id && <BusinessReviews businessId={String(business.id)} />}

          {/* Contact Section (a Studio site with its own contact section skips it) */}
          {siteContactIdx < 0 && <div id="section-contact" className="px-5 py-10 bg-secondary/30 border-t border-border/30">
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
          </div>}

          {/* Footer */}
          <div className="px-5 py-6 bg-muted text-center">
            <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">© {new Date().getFullYear()} {biz.business_name}. Powered by <BrandLogo className="w-3.5 h-3.5" /> Nodbusiness</p>
          </div>
        </div>
      </div>

      {/* Owner: Analytics Dashboard */}
      {isOwner && (
        <div className="mt-4 bg-primary rounded-2xl p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold">Business Analytics</h3>
            <p className="text-sm text-white/80 mt-0.5">Track sales, views & engagement</p>
          </div>
          <Link href={`/analytics${business?.id ? `?business=${business.id}` : ""}`}><Button size="sm" variant="secondary" className="rounded-full">View Analytics</Button></Link>
        </div>
      )}

      {/* Owner: Add Product CTA */}
      {isOwner && products.length === 0 && (
        <div className="mt-4 bg-primary-subtle rounded-2xl border border-primary/30 p-5 text-center">
          <ShoppingBag className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-sm">Add products to your business</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Start selling directly from your mini-website</p>
          <Link href="/products/create"><Button size="sm" className="rounded-full bg-primary"><Plus className="w-3 h-3 mr-1" /> Add Product</Button></Link>
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
                  <p className="text-sm font-bold text-primary">{formatAmount(o.total_price)} {o.currency}</p>
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
          seller={site ? { ...biz, user_id: site.owner_id ?? profile.user_id, business_name: site.title || biz.business_name } : biz}
          showroomId={site?.id}
          businessId={business?.id ?? null}
          buyer={user ?? undefined}
          onClose={() => setPurchaseItem(null)}
        />
      )}
    </div>
  );
}
