import SafeImage from '@/components/ui/SafeImage';
/**
 * Shared section renderer for business mini-websites and showrooms.
 */
import React, { useState } from "react";
import Link from 'next/link';

import {
  Clock, ShoppingBag, Star, Mail, Phone, MapPin, PlayCircle, CalendarCheck, Search,
  Medal, Send, Share2, Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BookmarkButton from "@/components/ui/BookmarkButton";
import { isGetQuote, sectionItemBuyPayload } from "@/lib/sectionItemPurchase";
import client from "@/api/client";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import LiveLocationSection from "@/components/showroom/LiveLocationSection";
import { MenuSection, OfferSection, OpeningHoursSection, PaymentInfoSection } from "@/components/showroom/NewPieces";

/** Sections that list the business's real products (search, categories, Order). */
export const CATALOGUE_TYPES = ["products", "featured_products", "inventory_catalog"];
export const isCatalogueSection = (type: unknown) => CATALOGUE_TYPES.includes(String(type));

/** A YouTube link in any common shape (watch, youtu.be, shorts, live, embed) → privacy-friendly embed URL. */
export function youtubeEmbedUrl(raw: unknown): string | null {
  const url = String(raw ?? "").trim();
  const id = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/))([\w-]{11})/.exec(url)?.[1];
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

/** Map for a typed address (no key needed); a saved Google "embed" link still works. */
export function mapEmbedUrl(mapUrl: unknown, address: unknown): string | null {
  const saved = String(mapUrl ?? "").trim();
  if (/^https:\/\/www\.google\.com\/maps\/embed/.test(saved)) return saved;
  const where = String(address ?? "").trim();
  return where ? `https://www.google.com/maps?q=${encodeURIComponent(where)}&output=embed` : null;
}

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

const parseImages = (img?: string | string[] | null) => { try { return JSON.parse(String(img || "[]")); } catch { return img ? [img].flat() : []; } };

/**
 * Resolve the anchor the hero CTA should scroll to, based on the sections
 * that actually exist in the template. Prefers the FIRST products-type
 * section, falls back to a menu/services section, and returns null when
 * there is no sensible target (the CTA is then hidden, not a dead link).
 *
 * Targets are always the index-based ids emitted by SectionRenderer
 * (`section-{index}`), so they resolve even when multiple products-type
 * sections exist (only the first gets the semantic `section-products` alias).
 */
export function resolveCtaTarget(sections: Array<Record<string, any>>): string {
  const list = Array.isArray(sections) ? sections : [];
  const productsIdx = list.findIndex(s => isCatalogueSection(s?.type));
  if (productsIdx >= 0) return `#section-${productsIdx}`;
  const menuIdx = list.findIndex(s => ["menu", "services", "items", "pricing"].includes(s?.type));
  // Every site page ends with a contact block, so this always lands somewhere.
  return menuIdx >= 0 ? `#section-${menuIdx}` : "#section-contact";
}

/** Index of the first products/featured_products section, or -1. */
export function firstProductsIndex(sections: Array<Record<string, any>>): number {
  const list = Array.isArray(sections) ? sections : [];
  return list.findIndex(s => isCatalogueSection(s?.type));
}

interface SectionRendererProps {
  section: Record<string, any>;
  sectionIndex: number;
  products?: Array<Record<string, any>>;
  productSearch?: string;
  productCategory?: string;
  productCategories?: string[];
  productsLoading?: boolean;
  productsLoadingMore?: boolean;
  productsError?: string;
  hasMoreProducts?: boolean;
  onLoadMoreProducts?: () => void;
  themeColor?: string;
  profile?: Record<string, any>;
  isOwner?: boolean;
  onBuy?: (product: Record<string, any>) => void;
  onGetQuote?: (serviceName: string, serviceDesc?: string) => void;
  onProductSearchChange?: (value: string) => void;
  onProductCategoryChange?: (value: string) => void;
  hours?: Array<{ day: string; hours: string }>;
  showProductLinks?: boolean;
  /** Anchor for the hero CTA; null hides the CTA (no valid target). */
  ctaTarget?: string | null;
  /**
   * True for the FIRST products/featured_products section only — renders the
   * semantic `section-products` anchor exactly once (no duplicate DOM ids).
   */
  isPrimaryProducts?: boolean;
  /** The website being shown (sign-ups, Save button); absent in Studio before the first publish. */
  showroomId?: string | null;
  /** The business the site belongs to (live location). */
  businessId?: string | null;
  /** Studio preview: forms explain they work once published instead of sending. */
  preview?: boolean;
}

export default function SectionRenderer({
  section,
  sectionIndex,
  products = [],
  productSearch = '',
  productCategory = '',
  productCategories = [],
  productsLoading = false,
  productsLoadingMore = false,
  productsError = '',
  hasMoreProducts = false,
  onLoadMoreProducts,
  themeColor = "#2563EB",
  profile = {},
  isOwner = false,
  onBuy,
  onGetQuote,
  onProductSearchChange,
  onProductCategoryChange,
  hours = [],
  showProductLinks = true,
  ctaTarget = null,
  isPrimaryProducts = false,
  showroomId = null,
  businessId = null,
  preview = false,
}: SectionRendererProps) {
  const s = section;
  const biz = (profile ?? {}) as Record<string, any>;

  if (s.type === "hero" || s.type === "banner") {
    // Builder heroes may carry their own gradient colors (heroBg/heroBg2);
    // legacy templates fall back to the soft theme-color wash.
    const hasCustomBg = Boolean(s.heroBg);
    const bg = hasCustomBg
      ? `linear-gradient(135deg, ${s.heroBg}, ${s.heroBg2 || s.heroBg})`
      : `linear-gradient(135deg, ${themeColor}15, ${themeColor}05)`;
    return (
      <div id={`section-${sectionIndex}`} className="relative px-5 py-12 text-center" style={{ background: bg }}>
        <div className="max-w-md mx-auto">
          <h1 className={`font-display text-2xl font-bold mb-2 ${hasCustomBg ? "text-white" : ""}`} style={hasCustomBg ? undefined : { color: themeColor }}>{s.title || biz.business_name || biz.title || "Welcome"}</h1>
          {(s.subtitle || biz.description || biz.business_description) && (
            <p className={`text-sm mb-4 ${hasCustomBg ? "text-white/85" : "text-muted-foreground"}`}>{s.subtitle || biz.description || biz.business_description}</p>
          )}
          {s.cta && ctaTarget && (
            <a href={ctaTarget}>
              {hasCustomBg ? (
                <Button className="rounded-full px-6 bg-white/90 hover:bg-white" style={{ color: s.heroBg }}>{s.cta}</Button>
              ) : (
                <Button className="rounded-full text-white px-6" style={{ backgroundColor: themeColor }}>{s.cta}</Button>
              )}
            </a>
          )}
        </div>
      </div>
    );
  }

  if (isCatalogueSection(s.type)) {
    const showStock = s.type !== "inventory_catalog" || s.showStock === true || s.showStock === "true";
    return (
      // Index-based id is the PRIMARY anchor for nav links; the semantic
      // `section-products` id is added ONLY for the first products-type
      // section (via isPrimaryProducts) so the DOM never has duplicate ids.
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        {isPrimaryProducts && <span id="section-products" className="sr-only" aria-hidden="true" />}
        <h2 className="font-display text-lg font-bold mb-4">{s.title || s.catalogTitle}</h2>
        {s.enableSearch !== false && onProductSearchChange && (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Search products and services"
                placeholder={s.searchPlaceholder || 'Search by name, description, or category'}
                value={productSearch}
                onChange={event => onProductSearchChange(event.target.value)}
                className="pl-9"
              />
            </div>
            {productCategories.length > 1 && onProductCategoryChange && (
              <select
                aria-label="Filter products by category"
                value={productCategory}
                onChange={event => onProductCategoryChange(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-48"
              >
                <option value="">All categories</option>
                {productCategories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            )}
          </div>
        )}
        {productsLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground" role="status">Loading catalog…</p>
        ) : productsError ? (
          <p className="py-6 text-center text-sm text-destructive" role="alert">{productsError}</p>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {productSearch || productCategory ? 'No matching products. Try a different search or category.' : 'No products available yet'}
            </p>
            {(isOwner || preview) && <Link href="/products/create" className="text-xs text-amber-600 hover:underline mt-2 inline-block">Add your first product →</Link>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3" aria-live="polite">
            {products.map(p => {
              const imgs = parseImages(p.images);
              const cardContent = (
                <div className="group">
                  <div className="aspect-square bg-secondary/20 relative overflow-hidden">
                    {imgs[0] ? (
                      <SafeImage fill={false} width={800} height={600} loading="lazy" src={imgs[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/20"><ShoppingBag className="w-8 h-8" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    {p.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold" style={{ color: themeColor }}>{p.price?.toLocaleString()} {p.currency || "USD"}</p>
                      {!isOwner && onBuy && showStock && (
                        <span className="text-xs text-muted-foreground">{Number(p.stock) > 0 ? `${p.stock} left` : 'Check availability'}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
              const productCard = (
                <div key={p.id} className="rounded-xl border border-border/40 overflow-hidden hover:shadow-md transition-all">
                  {showProductLinks ? (
                    <Link href={`/products/${p.id}`} className="block">{cardContent}</Link>
                  ) : cardContent}
                  {!isOwner && onBuy && (
                    <div className="px-3 pb-3">
                      <Button size="sm" className="h-8 w-full rounded-full text-white" style={{ backgroundColor: themeColor }} onClick={() => onBuy(p)}>
                        Order
                      </Button>
                    </div>
                  )}
                </div>
              );
              return productCard;
            })}
          </div>
        )}
        {!productsLoading && !productsError && products.length > 0 && hasMoreProducts && onLoadMoreProducts && (
          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-w-36 rounded-full"
              onClick={onLoadMoreProducts}
              disabled={productsLoadingMore}
            >
              {productsLoadingMore ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (s.type === "about" || s.type === "story") {
    // Builder shape: aboutTitle/aboutDesc/aboutImage; legacy: title/content.
    const aboutTitle = s.aboutTitle || s.title;
    const aboutDesc = s.aboutDesc || s.content || biz.business_description || biz.description;
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        {aboutTitle && <h2 className="font-display text-lg font-bold mb-3">{aboutTitle}</h2>}
        {s.aboutImage && <SafeImage fill={false} width={800} height={600} loading="lazy" src={s.aboutImage} alt={aboutTitle || "About"} className="w-full max-w-sm rounded-xl object-cover mb-3 max-h-56" />}
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md whitespace-pre-line">{aboutDesc}</p>
      </div>
    );
  }

  // Studio menus (dishes); older template menus fall through to the services layout.
  if (s.type === "menu" && Array.isArray(s.dishes)) {
    return <MenuSection s={s} sectionIndex={sectionIndex} onBuy={onBuy} themeColor={themeColor} />;
  }

  if (s.type === "offer") {
    return <OfferSection s={s} sectionIndex={sectionIndex} ctaTarget={ctaTarget} isOwner={isOwner} preview={preview} themeColor={themeColor} />;
  }

  if (s.type === "payment_info") {
    return <PaymentInfoSection s={s} sectionIndex={sectionIndex} businessId={businessId || biz.business_id || null} isOwner={isOwner} preview={preview} themeColor={themeColor} />;
  }

  if (s.type === "services" || s.type === "menu") {
    // Builder shape: servTitle + services[]{name,desc}; legacy: title + items[]{name|title,description,price}.
    const servTitle = s.servTitle || s.title;
    const servList = s.services || s.items || [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        {servTitle && <h2 className="font-display text-lg font-bold mb-4">{servTitle}</h2>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {servList.map((item, i) => {
            const isQuote = isGetQuote(item);
            const buy = sectionItemBuyPayload(item, 'Service');
            return (
              <div key={i} className="p-4 rounded-xl border border-border/40 hover:border-border transition-colors hover:shadow-sm">
                <h3 className="text-sm font-semibold">{item.name || item.title}</h3>
                {(item.desc || item.description) && <p className="text-xs text-muted-foreground mt-1">{item.desc || item.description}</p>}
                {(item.price || buy) && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {isQuote ? (
                      <button
                        type="button"
                        onClick={() => onGetQuote?.(item.name || item.title || 'Service', item.desc || item.description)}
                        className="text-sm font-bold transition-opacity hover:opacity-80 active:scale-95"
                        style={{ color: themeColor }}
                      >
                        Get Quote
                      </button>
                    ) : item.price ? (
                      <button
                        type="button"
                        onClick={() => buy && onBuy?.(buy)}
                        className="text-sm font-bold hover:underline underline-offset-2 transition-opacity hover:opacity-80 active:scale-95"
                        style={{ color: themeColor }}
                      >
                        {item.price}
                      </button>
                    ) : <span />}
                    {buy && onBuy && !isQuote && <CardBuyButton themeColor={themeColor} onClick={() => onBuy(buy)} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (s.type === "features" || s.type === "process") {
    // Builder shapes: featTitle/features[]{name,desc} OR processTitle/processSteps[]{title,desc};
    // legacy business templates: title + items[]{title,desc}.
    const headTitle = s.featTitle || s.processTitle || s.title;
    const steps = s.processSteps || s.features || s.items || [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        {headTitle && <h2 className="font-display text-lg font-bold mb-4">{headTitle}</h2>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: themeColor }}>{i + 1}</div>
              <h3 className="text-sm font-semibold">{item.name || item.title}</h3>
              {item.desc && <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "testimonials") {
    // Builder shape: testTitle + testimonials[]{quote,author,role}; legacy: title + items[]{text|review,name|author}.
    const testTitle = s.testTitle || s.title;
    const reviews = s.testimonials || s.items || [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        {testTitle && <h2 className="font-display text-lg font-bold mb-4">{testTitle}</h2>}
        <div className="space-y-3">
          {reviews.map((item, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/40" style={{ backgroundColor: themeColor + "08" }}>
              <div className="flex gap-1 mb-2">{[1,2,3,4,5].map(star => <Star key={star} className="w-3 h-3 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-sm italic">"{item.quote || item.text || item.review}"</p>
              <p className="text-xs font-semibold mt-2">— {item.author || item.name}{item.role ? `, ${item.role}` : ""}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "faq") {
    // Builder shape: faqTitle + faqs[]{question,answer}; legacy: title + items[].
    const faqTitle = s.faqTitle || s.title;
    const faqs = s.faqs || s.items || [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        {faqTitle && <h2 className="font-display text-lg font-bold mb-4">{faqTitle}</h2>}
        <div className="space-y-2">
          {faqs.map((item, i) => (
            <details key={i} className="p-4 rounded-xl border border-border/40 bg-card">
              <summary className="text-sm font-medium cursor-pointer">{item.question || item.title}</summary>
              <p className="text-sm text-muted-foreground mt-2">{item.answer || item.desc}</p>
            </details>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "hours") {
    return <OpeningHoursSection s={s} sectionIndex={sectionIndex} legacyHours={hours} isOwner={isOwner} preview={preview} themeColor={themeColor} />;
  }

  if (s.type === "gallery") {
    // Builder shape: galleryTitle + galleryImages[]{url,caption}; legacy: business cover image(s).
    const galleryTitle = s.galleryTitle || s.title;
    const builderImages: Array<Record<string, any>> = Array.isArray(s.galleryImages) ? s.galleryImages.filter((g: any) => g?.url) : [];
    if (builderImages.length > 0) {
      return (
        <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
          {galleryTitle && <h2 className="font-display text-lg font-bold mb-4">{galleryTitle}</h2>}
          <div className="grid grid-cols-3 gap-2">
            {builderImages.map((img, i) => (
              <figure key={i} className="relative">
                <SafeImage fill={false} width={800} height={600} loading="lazy" src={img.url} alt={img.caption || ""} className="w-full aspect-square object-cover rounded-lg" />
                {img.caption && <figcaption className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-b-lg truncate">{img.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
      );
    }
    const images = parseImages(biz.business_cover_url || biz.cover_url || biz.cover_image);
    const galleryImages = images.length ? images : [
      `https://picsum.photos/seed/${biz.business_name || biz.title || 'gallery'}-1/400/400`,
      `https://picsum.photos/seed/${biz.business_name || biz.title || 'gallery'}-2/400/400`,
      `https://picsum.photos/seed/${biz.business_name || biz.title || 'gallery'}-3/400/400`,
    ];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        {galleryTitle && <h2 className="font-display text-lg font-bold mb-4">{galleryTitle}</h2>}
        <div className="grid grid-cols-3 gap-2">
          {galleryImages.map((img, i) => <SafeImage fill={false} width={800} height={600} loading="lazy" key={i} src={img} alt="" className="w-full aspect-square object-cover rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (s.type === "instructor" || s.type === "team") {
    // Builder shape: teamTitle + members[]{name,role,image,bio}; legacy instructor: profile-based card.
    const members: Array<Record<string, any>> = Array.isArray(s.members) ? s.members.filter((m: any) => m?.name) : [];
    if (members.length > 0) {
      return (
        <div id={`section-${sectionIndex}`} className="px-5 py-10">
          {(s.teamTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4">{s.teamTitle || s.title}</h2>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {members.map((m, i) => (
              <div key={i} className="p-4 rounded-xl border border-border/40 text-center">
                {m.image ? (
                  <SafeImage fill={false} width={800} height={600} loading="lazy" src={m.image} alt={m.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-2" />
                ) : (
                  <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: themeColor }}>{(m.name || "?").charAt(0)}</div>
                )}
                <h3 className="text-sm font-semibold">{m.name}</h3>
                {m.role && <p className="text-xs mt-0.5" style={{ color: themeColor }}>{m.role}</p>}
                {m.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{m.bio}</p>}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 text-center">
        {s.title && <h2 className="font-display text-lg font-bold mb-4">{s.title}</h2>}
        <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: themeColor }}>
          {(biz.display_name || biz.business_name || biz.title)?.charAt(0) || "E"}
        </div>
        <h3 className="font-semibold">{biz.display_name || biz.business_name || biz.title}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{biz.bio || biz.business_description || biz.description || "Experienced professional in City, Country."}</p>
      </div>
    );
  }

  if (s.type === "contact") {
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/30 border-t border-border/30">
        <span id="section-contact" className="sr-only" aria-hidden="true" />
        <div className="max-w-md mx-auto text-center">
          <h2 className="font-display text-xl font-bold mb-4">{s.title || "Get in Touch"}</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            {(s.email || biz.business_contact_email) && <a href={`mailto:${s.email || biz.business_contact_email}`} className="flex min-h-10 items-center justify-center gap-2 hover:text-foreground"><Mail className="w-4 h-4" /> {s.email || biz.business_contact_email}</a>}
            {(s.phone || biz.business_contact_phone) && <a href={`tel:${String(s.phone || biz.business_contact_phone).replace(/[^\d+]/g, "")}`} className="flex min-h-10 items-center justify-center gap-2 hover:text-foreground"><Phone className="w-4 h-4" /> {s.phone || biz.business_contact_phone}</a>}
            {(s.location || biz.business_address) && <p className="flex items-center justify-center gap-2"><MapPin className="w-4 h-4" /> {s.location || biz.business_address}</p>}
            {s.hours && <p className="flex items-center justify-center gap-2"><Clock className="w-4 h-4" /> {s.hours}</p>}
            {digits(s.whatsapp) && (
              <a href={`https://wa.me/${digits(s.whatsapp)}`} target="_blank" rel="noopener noreferrer"
                className="mx-auto mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25d366] px-5 text-sm font-semibold text-white">
                <WhatsAppIcon /> Chat on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Builder-only section types (registry: lib/builderSections.ts) ──────────

  if (s.type === "items") {
    const items = Array.isArray(s.items) ? s.items : [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        {(s.itemsTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4">{s.itemsTitle || s.title}</h2>}
        <div className="grid grid-cols-2 gap-3">
          {items.map((it, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/40 text-center hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: themeColor + "15" }}>
                <ShoppingBag className="w-5 h-5" style={{ color: themeColor }} />
              </div>
              <h3 className="text-sm font-semibold">{it.name}</h3>
              {it.desc && <p className="text-xs text-muted-foreground mt-1">{it.desc}</p>}
              {it.price && <p className="text-sm font-bold mt-2" style={{ color: themeColor }}>{it.price}</p>}
              {(() => {
                const buy = sectionItemBuyPayload(it, 'Item');
                return buy && onBuy ? <div className="mt-2 flex justify-center"><CardBuyButton themeColor={themeColor} onClick={() => onBuy(buy)} /></div> : null;
              })()}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "pricing") {
    const plans = Array.isArray(s.plans) ? s.plans : [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        {(s.pricingTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4">{s.pricingTitle || s.title}</h2>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plans.map((p, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/40 bg-card text-center">
              <h3 className="text-sm font-semibold">{p.name}</h3>
              <p className="text-xl font-bold my-2" style={{ color: themeColor }}>
                {p.price}<span className="text-xs text-muted-foreground font-normal">{p.period}</span>
              </p>
              {p.features && (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {String(p.features).split(",").map((f, j) => f.trim() ? <li key={j}>{f.trim()}</li> : null)}
                </ul>
              )}
              {(() => {
                const buy = sectionItemBuyPayload(p, 'Plan');
                return buy && onBuy ? <div className="mt-3 flex justify-center"><CardBuyButton themeColor={themeColor} onClick={() => onBuy(buy)} /></div> : null;
              })()}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "stats") {
    const stats = Array.isArray(s.stats) ? s.stats : [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        {(s.statsTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4 text-center">{s.statsTitle || s.title}</h2>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((st, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/40 bg-card text-center">
              <p className="text-2xl font-bold" style={{ color: themeColor }}>{st.number}</p>
              <p className="text-xs text-muted-foreground mt-1">{st.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "portfolio") {
    const projects = Array.isArray(s.portfolio) ? s.portfolio : [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        {(s.portTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4">{s.portTitle || s.title}</h2>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map((p, i) => (
            <div key={i} className="rounded-xl border border-border/40 overflow-hidden bg-card">
              {p.image ? (
                <SafeImage fill={false} width={800} height={600} loading="lazy" src={p.image} alt={p.title || ""} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-secondary/40 flex items-center justify-center text-muted-foreground/30"><ShoppingBag className="w-8 h-8" /></div>
              )}
              <div className="p-3">
                <h3 className="text-sm font-semibold">{p.title}</h3>
                {p.client && <p className="text-xs mt-0.5" style={{ color: themeColor }}>{p.client}</p>}
                {p.desc && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.desc}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "video") {
    const embedUrl = youtubeEmbedUrl(s.vidUrl);
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        {(s.vidTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4">{s.vidTitle || s.title}</h2>}
        {embedUrl ? (
          <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-xl">
            <iframe src={embedUrl} title={s.vidTitle || "Video"} className="absolute inset-0 w-full h-full border-none" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
          </div>
        ) : (
          <div className="rounded-xl bg-black/85 h-32 flex flex-col items-center justify-center gap-1 text-white/80">
            <PlayCircle className="w-10 h-10" />
            {(isOwner || preview) && <p className="text-xs">{s.vidUrl ? "This doesn't look like a YouTube link." : "Paste a YouTube link to show your video."}</p>}
          </div>
        )}
        {s.vidDesc && <p className="text-xs text-muted-foreground text-center mt-2">{s.vidDesc}</p>}
      </div>
    );
  }

  if (s.type === "map") {
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        {(s.mapTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4">{s.mapTitle || s.title}</h2>}
        {mapEmbedUrl(s.mapUrl, s.address || s.location || biz.business_address) ? (
          <div className="space-y-2">
            <div className="rounded-xl overflow-hidden h-48">
              <iframe src={mapEmbedUrl(s.mapUrl, s.address || s.location || biz.business_address)!} title={s.mapTitle || "Map"} className="w-full h-full border-none" loading="lazy" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{s.address || s.location || biz.business_address}</p>
              {(s.address || s.location || biz.business_address) && (
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address || s.location || biz.business_address)}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-1 rounded-full px-4 text-sm font-semibold text-white" style={{ backgroundColor: themeColor }}>
                  <MapPin className="h-4 w-4" aria-hidden="true" />Directions
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-card border border-border/40 p-6 text-center">
            <MapPin className="w-7 h-7 mx-auto mb-2" style={{ color: themeColor }} />
            <p className="text-sm">{s.address || s.location || biz.business_address || "Address will appear here"}</p>
          </div>
        )}
      </div>
    );
  }

  if (s.type === "cta") {
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-12 text-center" style={{ background: s.ctaBg || themeColor }}>
        <h2 className="font-display text-xl font-bold text-white mb-2">{s.ctaTitle || s.title || "Ready to get started?"}</h2>
        {(s.ctaDesc || s.content) && <p className="text-sm text-white/85 mb-4">{s.ctaDesc || s.content}</p>}
        {(s.ctaBtn || s.cta) && (
          <a href="#section-contact">
            <Button className="rounded-full px-6 bg-white/90 hover:bg-white" style={{ color: s.ctaBg || themeColor }}>{s.ctaBtn || s.cta}</Button>
          </a>
        )}
      </div>
    );
  }

  if (s.type === "booking") {
    const requestName = s.requestName || s.bookingTitle || s.title || "Appointment request";
    const buttonLabel = s.bookingBtn || "Request an appointment";
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20 text-center">
        <h2 className="font-display text-lg font-bold mb-2">{s.bookingTitle || s.title || "Book an Appointment"}</h2>
        {(s.bookingDesc || s.content) && <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{s.bookingDesc || s.content}</p>}
        {onGetQuote ? (
          <Button type="button" onClick={() => onGetQuote(requestName, s.bookingDesc || s.content)} className="rounded-full text-white px-6" style={{ backgroundColor: themeColor }}>
            <CalendarCheck className="w-4 h-4 mr-1" /> {buttonLabel}
          </Button>
        ) : (
          <a href="#section-contact" className="inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-medium text-white" style={{ backgroundColor: themeColor }}>
            <CalendarCheck className="w-4 h-4 mr-1" /> {buttonLabel}
          </a>
        )}
      </div>
    );
  }

  if (s.type === "caseStudies") {
    const cases = Array.isArray(s.caseStudies) ? s.caseStudies : [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        {(s.caseTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4">{s.caseTitle || s.title}</h2>}
        <div className="space-y-3">
          {cases.map((c, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/40 bg-card" style={{ borderLeft: `4px solid ${themeColor}` }}>
              <h3 className="text-sm font-semibold">{c.title}</h3>
              {c.summary && <p className="text-xs text-muted-foreground mt-1">{c.summary}</p>}
              {c.result && <p className="text-xs font-semibold text-green-600 mt-2">✅ {c.result}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "partners") {
    const partners = Array.isArray(s.partners) ? s.partners : [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        {(s.partnersTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4 text-center">{s.partnersTitle || s.title}</h2>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {partners.map((p, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/40 bg-card text-center">
              {p.logo ? (
                <SafeImage fill={false} width={800} height={600} loading="lazy" src={p.logo} alt={p.name || ""} className="h-10 mx-auto mb-2 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold" style={{ backgroundColor: themeColor }}>{(p.name || "?").charAt(0)}</div>
              )}
              <h3 className="text-sm font-semibold">{p.name}</h3>
              {p.note && <p className="text-xs text-muted-foreground mt-0.5">{p.note}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "awards") {
    const awards = Array.isArray(s.awards) ? s.awards : [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        {(s.awardsTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4">{s.awardsTitle || s.title}</h2>}
        <div className="space-y-2">
          {awards.map((a, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border/40">
              <Medal className="w-5 h-5 shrink-0 mt-0.5" style={{ color: themeColor }} />
              <div>
                <h3 className="text-sm font-semibold">{a.title}</h3>
                {a.detail && <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "industries") {
    const industries = Array.isArray(s.industries) ? s.industries : [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        {(s.industriesTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4 text-center">{s.industriesTitle || s.title}</h2>}
        <div className="grid grid-cols-2 gap-3">
          {industries.map((ind, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/40 text-center">
              <h3 className="text-sm font-semibold">{ind.name}</h3>
              {ind.desc && <p className="text-xs text-muted-foreground mt-1">{ind.desc}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "social") {
    const socials = [
      { url: s.facebook, label: "Facebook" },
      { url: s.instagram, label: "Instagram" },
      { url: s.telegram, label: "Telegram" },
      { url: s.youtube, label: "YouTube" },
      { url: s.tiktok, label: "TikTok" },
      { url: s.twitter, label: "Twitter / X" },
      { url: s.linkedin, label: "LinkedIn" },
    ].filter(x => x.url);
    if (socials.length > 0) {
      return (
        <div id={`section-${sectionIndex}`} className="px-5 py-6 border-t border-border/30">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {socials.map(({ url, label }) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:shadow-sm transition-all">
                <Share2 className="w-3 h-3" style={{ color: themeColor }} /> {label}
              </a>
            ))}
          </div>
        </div>
      );
    }
  }

  if (s.type === "newsletter") {
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20 text-center">
        <h2 className="font-display text-lg font-bold mb-2">{s.newsTitle || s.title || "Stay Updated"}</h2>
        {(s.newsDesc || s.content) && <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{s.newsDesc || s.content}</p>}
        <NewsletterForm showroomId={showroomId} preview={preview} buttonLabel={s.newsBtn || "Subscribe"} themeColor={themeColor} />
      </div>
    );
  }

  if (s.type === "live_location_tracking") {
    return (
      <div id={`section-${sectionIndex}`}>
        <LiveLocationSection businessId={businessId || biz.business_id || null} title={s.locationTitle || s.title || "Find us live"} isOwner={isOwner} themeColor={themeColor} />
      </div>
    );
  }

  if (s.type === "save_showroom") {
    // The showroom/business ID to bookmark — use profile.id (business entity id)
    const saveId = (showroomId || biz.id) as string | undefined;
    const showroomName = (biz.business_name || biz.title || 'this showroom') as string;
    const title = s.saveTitle || s.title || 'Save this showroom';
    const desc = s.saveDesc || s.content || 'Bookmark us and find us again easily';


    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 text-center bg-secondary/10 border-t border-border/30">
        <Bookmark className="w-8 h-8 mx-auto mb-3" style={{ color: themeColor }} />
        <h2 className="font-display text-lg font-bold mb-1">{title}</h2>
        {desc && <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">{desc}</p>}
        <div className="flex items-center justify-center">
          {saveId && !preview ? (
            <BookmarkButton
              targetId={saveId}
              targetType="showroom"
              itemData={{ title: showroomName }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 text-sm font-semibold transition-all"
            />
          ) : (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-5 text-sm font-semibold text-muted-foreground">
              <Bookmark className="h-4 w-4" aria-hidden="true" /> Save
            </span>
          )}
        </div>
        {(preview || !saveId) && <p className="mt-2 text-xs text-muted-foreground">Visitors can save your website once it is published.</p>}
      </div>
    );
  }

  return (
    <div id={`section-${sectionIndex}`} className="px-5 py-8">
      <h2 className="font-display text-lg font-bold mb-2">{s.title}</h2>
      <p className="text-sm text-muted-foreground">{s.content || s.subtitle || ""}</p>
    </div>
  );
}


/** Email sign-up that saves to the owner's list (POST /api/showrooms/:id/newsletter). */
function NewsletterForm({ showroomId, preview, buttonLabel, themeColor }: { showroomId?: string | null; preview: boolean; buttonLabel: string; themeColor: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const live = Boolean(showroomId) && !preview;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!live) return;
    setError("");
    setState("sending");
    try {
      await client.post(`/api/showrooms/${showroomId}/newsletter`, { email });
      setState("done");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not sign you up. Try again."));
      setState("idle");
    }
  };
  if (state === "done") return <p role="status" className="text-sm font-medium text-emerald-700">Thanks! You're on the list.</p>;
  return (
    <form onSubmit={submit} className="mx-auto max-w-md">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" aria-label="Email address"
          className="min-h-11 px-4 py-2 rounded-full border border-border/60 bg-card text-sm w-56 outline-none focus:border-amber-400" />
        <Button type="submit" disabled={!live || state === "sending"} className="min-h-11 rounded-full text-white px-5" style={{ backgroundColor: themeColor }}>
          <Send className="w-3.5 h-3.5 mr-1" /> {buttonLabel}
        </Button>
      </div>
      {!live && <p className="mt-2 text-xs text-muted-foreground">Sign-ups start once your website is published.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </form>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

/** The small "Buy Now" pill on website cards. */
function CardBuyButton({ themeColor, onClick }: { themeColor: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-white transition-opacity hover:opacity-90 active:scale-95"
      style={{ backgroundColor: themeColor }}
    >
      Buy Now
    </button>
  );
}
