/**
 * Shared section renderer for business mini-websites and showrooms.
 */
import React from "react";
import Link from 'next/link';

import { Clock, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const parseImages = (img?: string | string[] | null) => { try { return JSON.parse(String(img || "[]")); } catch { return img ? [img].flat() : []; } };

interface SectionRendererProps {
  section: Record<string, any>;
  sectionIndex: number;
  products?: Array<Record<string, any>>;
  themeColor?: string;
  profile?: Record<string, any>;
  isOwner?: boolean;
  onBuy?: (product: Record<string, any>) => void;
  hours?: Array<{ day: string; hours: string }>;
  showProductLinks?: boolean;
}

export default function SectionRenderer({
  section,
  sectionIndex,
  products = [],
  themeColor = "#2563EB",
  profile = {},
  isOwner = false,
  onBuy,
  hours = [],
  showProductLinks = true,
}: SectionRendererProps) {
  const s = section;
  const biz = (profile ?? {}) as Record<string, any>;

  if (s.type === "hero" || s.type === "banner") {
    return (
      <div id={`section-${sectionIndex}`} className="relative px-5 py-12 text-center" style={{ background: `linear-gradient(135deg, ${themeColor}15, ${themeColor}05)` }}>
        <div className="max-w-md mx-auto">
          <h1 className="font-display text-2xl font-bold mb-2" style={{ color: themeColor }}>{s.title || biz.business_name || biz.title || "Welcome"}</h1>
          {(s.subtitle || biz.description || biz.business_description) && (
            <p className="text-sm text-muted-foreground mb-4">{s.subtitle || biz.description || biz.business_description}</p>
          )}
          {s.cta && (
            <a href="#section-products">
              <Button className="rounded-full text-white px-6" style={{ backgroundColor: themeColor }}>{s.cta}</Button>
            </a>
          )}
        </div>
      </div>
    );
  }

  if (s.type === "products" || s.type === "featured_products") {
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
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
                      <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/20"><ShoppingBag className="w-8 h-8" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    {p.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold" style={{ color: themeColor }}>{p.price?.toLocaleString()} {p.currency || "ETB"}</p>
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
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        <h2 className="font-display text-lg font-bold mb-3">{s.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{s.content || biz.business_description || biz.description}</p>
      </div>
    );
  }

  if (s.type === "services" || s.type === "menu") {
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        <h2 className="font-display text-lg font-bold mb-4">{s.title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(s.items || []).map((item, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/40 hover:border-amber-300 transition-colors">
              <h3 className="text-sm font-semibold">{item.name || item.title}</h3>
              {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
              {item.price && <p className="text-sm font-bold mt-2" style={{ color: themeColor }}>{item.price}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "features" || s.type === "process") {
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        <h2 className="font-display text-lg font-bold mb-4">{s.title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(s.items || []).map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: themeColor }}>{i + 1}</div>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              {item.desc && <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "testimonials") {
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10">
        <h2 className="font-display text-lg font-bold mb-4">{s.title}</h2>
        <div className="space-y-3">
          {(s.items || []).map((item, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/40" style={{ backgroundColor: themeColor + "08" }}>
              <div className="flex gap-1 mb-2">{[1,2,3,4,5].map(star => <Star key={star} className="w-3 h-3 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-sm italic">"{item.text || item.review}"</p>
              <p className="text-xs font-semibold mt-2">— {item.name || item.author}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (s.type === "faq") {
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        <h2 className="font-display text-lg font-bold mb-4">{s.title}</h2>
        <div className="space-y-2">
          {(s.items || []).map((item, i) => (
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
    const images = parseImages(biz.business_cover_url || biz.cover_url || biz.cover_image);
    const galleryImages = images.length ? images : [
      `https://picsum.photos/seed/${biz.business_name || biz.title || 'gallery'}-1/400/400`,
      `https://picsum.photos/seed/${biz.business_name || biz.title || 'gallery'}-2/400/400`,
      `https://picsum.photos/seed/${biz.business_name || biz.title || 'gallery'}-3/400/400`,
    ];
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 bg-secondary/20">
        <h2 className="font-display text-lg font-bold mb-4">{s.title}</h2>
        <div className="grid grid-cols-3 gap-2">
          {galleryImages.map((img, i) => <img key={i} src={img} alt="" className="w-full aspect-square object-cover rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (s.type === "instructor" || s.type === "team") {
    return (
      <div id={`section-${sectionIndex}`} className="px-5 py-10 text-center">
        <h2 className="font-display text-lg font-bold mb-4">{s.title}</h2>
        <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: themeColor }}>
          {(biz.display_name || biz.business_name || biz.title)?.charAt(0) || "E"}
        </div>
        <h3 className="font-semibold">{biz.display_name || biz.business_name || biz.title}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{biz.bio || biz.business_description || biz.description || "Experienced professional in Addis Ababa, Ethiopia."}</p>
      </div>
    );
  }

  if (s.type === "contact") {
    return (
      <div id={`section-contact`} className="px-5 py-10 bg-gradient-to-br from-gray-50 to-white border-t border-border/30">
        <div className="max-w-md mx-auto text-center">
          <h2 className="font-display text-xl font-bold mb-4">{s.title || "Get in Touch"}</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            {(s.email || biz.business_contact_email) && <p>{s.email || biz.business_contact_email}</p>}
            {(s.phone || biz.business_contact_phone) && <p>{s.phone || biz.business_contact_phone}</p>}
            {(s.location || biz.business_address) && <p>{s.location || biz.business_address}</p>}
          </div>
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



