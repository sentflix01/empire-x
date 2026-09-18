/**
 * Shared section renderer for business mini-websites and showrooms.
 */
import React from "react";
import Link from 'next/link';

import {
  Clock, ShoppingBag, Star, Mail, Phone, MapPin, PlayCircle, CalendarCheck,
  Medal, Send, Share2, Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BookmarkButton from "@/components/ui/BookmarkButton";

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
export function resolveCtaTarget(sections: Array<Record<string, any>>): string | null {
  const list = Array.isArray(sections) ? sections : [];
  const productsIdx = list.findIndex(s => s?.type === "products" || s?.type === "featured_products");
  if (productsIdx >= 0) return `#section-${productsIdx}`;
  const menuIdx = list.findIndex(s => s?.type === "menu" || s?.type === "services");
  return menuIdx >= 0 ? `#section-${menuIdx}` : null;
}

/** Index of the first products/featured_products section, or -1. */
export function firstProductsIndex(sections: Array<Record<string, any>>): number {
  const list = Array.isArray(sections) ? sections : [];
  return list.findIndex(s => s?.type === "products" || s?.type === "featured_products");
}

interface SectionRendererProps {
  section: Record<string, any>;
  sectionIndex: number;
  products?: Array<Record<string, any>>;
  themeColor?: string;
  profile?: Record<string, any>;
  isOwner?: boolean;
  onBuy?: (product: Record<string, any>) => void;
  onGetQuote?: (serviceName: string, serviceDesc?: string) => void;
  hours?: Array<{ day: string; hours: string }>;
  showProductLinks?: boolean;
  /** Anchor for the hero CTA; null hides the CTA (no valid target). */
  ctaTarget?: string | null;
  /**
   * True for the FIRST products/featured_products section only — renders the
   * semantic `section-products` anchor exactly once (no duplicate DOM ids).
   */
  isPrimaryProducts?: boolean;
}

export default function SectionRenderer({
  section,
  sectionIndex,
  products = [],
  themeColor = "#2563EB",
  profile = {},
  isOwner = false,
  onBuy,
  onGetQuote,
  hours = [],
  showProductLinks = true,
  ctaTarget = null,
  isPrimaryProducts = false,
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

  if (s.type === "products" || s.type === "featured_products") {
    return (
      // Index-based id is the PRIMARY anchor for nav links; the semantic
      // `section-products` id is added ONLY for the first products-type
      // section (via isPrimaryProducts) so the DOM never has duplicate ids.
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        {isPrimaryProducts && <span id="section-products" className="sr-only" aria-hidden="true" />}
        <h2 className="font-display text-lg font-bold mb-4">{s.title}</h2>
        {products.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No products available yet</p>
            {isOwner && <Link href="/products/create" className="text-xs text-amber-600 hover:underline mt-2 inline-block">Add your first product →</Link>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => {
              const imgs = parseImages(p.images);
              const card = (
                <>
                  <div className="aspect-square bg-secondary/20 relative overflow-hidden">
                    {imgs[0] ? (
                      <img loading="lazy" src={imgs[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/20"><ShoppingBag className="w-8 h-8" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    {p.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold" style={{ color: themeColor }}>{p.price?.toLocaleString()} {p.currency || "USD"}</p>
                      {!isOwner && onBuy && (
                        <Button size="sm" className="h-7 text-xs rounded-full text-white px-3" style={{ backgroundColor: themeColor }} onClick={() => onBuy(p)}>Buy</Button>
                      )}
                    </div>
                  </div>
                </>
              );
              return showProductLinks ? (
                <Link key={p.id} href={`/products/${p.id}`} className="rounded-xl border border-border/40 overflow-hidden hover:shadow-md transition-all group block">{card}</Link>
              ) : (
                <div key={p.id} className="rounded-xl border border-border/40 overflow-hidden hover:shadow-md transition-all group">{card}</div>
              );
            })}
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
        {s.aboutImage && <img loading="lazy" src={s.aboutImage} alt={aboutTitle || "About"} className="w-full max-w-sm rounded-xl object-cover mb-3 max-h-56" />}
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md whitespace-pre-line">{aboutDesc}</p>
      </div>
    );
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
            const hasPrice = item.price && item.price !== 'Get Quote';
            const isGetQuote = item.price === 'Get Quote' || (!item.price && item.cta === 'Get Quote');
            const priceNum = hasPrice ? parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0 : 0;
            return (
              <div key={i} className="p-4 rounded-xl border border-border/40 hover:border-border transition-colors hover:shadow-sm">
                <h3 className="text-sm font-semibold">{item.name || item.title}</h3>
                {(item.desc || item.description) && <p className="text-xs text-muted-foreground mt-1">{item.desc || item.description}</p>}
                {item.price && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {isGetQuote ? (
                      <button
                        type="button"
                        onClick={() => onGetQuote?.(item.name || item.title || 'Service', item.desc || item.description)}
                        className="text-sm font-bold transition-opacity hover:opacity-80 active:scale-95"
                        style={{ color: themeColor }}
                      >
                        Get Quote
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onBuy?.({
                          title: item.name || item.title || 'Service',
                          description: item.desc || item.description,
                          price: priceNum,
                          currency: 'ETB',
                          // No id — service items don't have product IDs
                        })}
                        className="text-sm font-bold hover:underline underline-offset-2 transition-opacity hover:opacity-80 active:scale-95"
                        style={{ color: themeColor }}
                      >
                        {item.price}
                      </button>
                    )}
                    {hasPrice && onBuy && !isGetQuote && (
                      <button
                        type="button"
                        onClick={() => onBuy({
                          title: item.name || item.title || 'Service',
                          description: item.desc || item.description,
                          price: priceNum,
                          currency: 'ETB',
                        })}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-white transition-opacity hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: themeColor }}
                      >
                        Buy Now
                      </button>
                    )}
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
    const hourList = hours.length > 0 ? hours : [
      { day: "Monday", hours: "9:00 AM - 6:00 PM" },
      { day: "Tuesday", hours: "9:00 AM - 6:00 PM" },
      { day: "Wednesday", hours: "9:00 AM - 6:00 PM" },
      { day: "Thursday", hours: "9:00 AM - 6:00 PM" },
      { day: "Friday", hours: "9:00 AM - 6:00 PM" },
      { day: "Saturday", hours: "10:00 AM - 4:00 PM" },
      { day: "Sunday", hours: "Closed" },
    ];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5" style={{ color: themeColor }} />{s.title}</h2>
        <div className="space-y-1 max-w-xs">
          {hourList.map((h, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-border/20">
              <span className="text-muted-foreground">{h.day}</span>
              <span className="font-medium">{h.hours}</span>
            </div>
          ))}
        </div>
      </div>
    );
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
                <img loading="lazy" src={img.url} alt={img.caption || ""} className="w-full aspect-square object-cover rounded-lg" />
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
          {galleryImages.map((img, i) => <img loading="lazy" key={i} src={img} alt="" className="w-full aspect-square object-cover rounded-lg" />)}
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
                  <img loading="lazy" src={m.image} alt={m.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-2" />
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
            {(s.email || biz.business_contact_email) && <p className="flex items-center justify-center gap-2"><Mail className="w-4 h-4" /> {s.email || biz.business_contact_email}</p>}
            {(s.phone || biz.business_contact_phone) && <p className="flex items-center justify-center gap-2"><Phone className="w-4 h-4" /> {s.phone || biz.business_contact_phone}</p>}
            {(s.location || biz.business_address) && <p className="flex items-center justify-center gap-2"><MapPin className="w-4 h-4" /> {s.location || biz.business_address}</p>}
            {s.hours && <p className="flex items-center justify-center gap-2"><Clock className="w-4 h-4" /> {s.hours}</p>}
            {s.whatsapp && <p>💬 {s.whatsapp}</p>}
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
                <img loading="lazy" src={p.image} alt={p.title || ""} className="w-full h-32 object-cover" />
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
    const embedUrl = s.vidUrl ? String(s.vidUrl).replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/") : "";
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        {(s.vidTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4">{s.vidTitle || s.title}</h2>}
        {embedUrl ? (
          <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-xl">
            <iframe src={embedUrl} title={s.vidTitle || "Video"} className="absolute inset-0 w-full h-full border-none" allowFullScreen />
          </div>
        ) : (
          <div className="rounded-xl bg-black/85 h-32 flex items-center justify-center">
            <PlayCircle className="w-10 h-10 text-white/80" />
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
        {s.mapUrl ? (
          <div className="rounded-xl overflow-hidden h-48">
            <iframe src={s.mapUrl} title={s.mapTitle || "Map"} className="w-full h-full border-none" loading="lazy" />
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
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20 text-center">
        <h2 className="font-display text-lg font-bold mb-2">{s.bookingTitle || s.title || "Book an Appointment"}</h2>
        {(s.bookingDesc || s.content) && <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{s.bookingDesc || s.content}</p>}
        <a href="#section-contact">
          <Button className="rounded-full text-white px-6" style={{ backgroundColor: themeColor }}>
            <CalendarCheck className="w-4 h-4 mr-1" /> {s.bookingBtn || "Book Now"}
          </Button>
        </a>
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
                <img loading="lazy" src={p.logo} alt={p.name || ""} className="h-10 mx-auto mb-2 object-contain" />
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

  if (s.type === "careers") {
    const jobs = Array.isArray(s.careers) ? s.careers : [];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        {(s.careersTitle || s.title) && <h2 className="font-display text-lg font-bold mb-4">{s.careersTitle || s.title}</h2>}
        <div className="space-y-2">
          {jobs.map((c, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/40 bg-card flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold">{c.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{[c.location, c.type].filter(Boolean).join(" · ")}</p>
              </div>
              <a href="#section-contact">
                <Button size="sm" className="rounded-full h-7 text-xs text-white px-4" style={{ backgroundColor: themeColor }}>Apply</Button>
              </a>
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
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <input type="email" placeholder="Enter your email" aria-label="Email address" className="px-4 py-2 rounded-full border border-border/60 bg-card text-sm w-56 outline-none focus:border-amber-400" />
          <Button className="rounded-full text-white px-5" style={{ backgroundColor: themeColor }}>
            <Send className="w-3.5 h-3.5 mr-1" /> {s.newsBtn || "Subscribe"}
          </Button>
        </div>
      </div>
    );
  }

  if (s.type === "save_showroom") {
    // The showroom/business ID to bookmark — use profile.id (business entity id)
    const showroomId = biz.id as string | undefined;
    const showroomName = (biz.business_name || biz.title || 'this showroom') as string;
    const title = s.saveTitle || s.title || 'Save this showroom';
    const desc = s.saveDesc || s.content || 'Bookmark us and find us again easily';

    if (!showroomId) return null;

    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 text-center bg-secondary/10 border-t border-border/30">
        <Bookmark className="w-8 h-8 mx-auto mb-3" style={{ color: themeColor }} />
        <h2 className="font-display text-lg font-bold mb-1">{title}</h2>
        {desc && <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">{desc}</p>}
        <div className="flex items-center justify-center">
          <BookmarkButton
            targetId={showroomId}
            targetType="showroom"
            itemData={{ title: showroomName }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 text-sm font-semibold transition-all"
          />
          <span className="ml-2 text-sm text-muted-foreground">Double-click to save</span>
        </div>
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



