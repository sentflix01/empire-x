'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SpotlightItem {
  name?: string;
  title?: string;
  desc?: string;
  description?: string;
  price?: string;
  product_id?: string;
  image?: string;
  photo?: string;
}

interface Section {
  type: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  heroBg?: string;
  heroBg2?: string;
  location?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  aboutTitle?: string;
  aboutDesc?: string;
  items?: SpotlightItem[];
  services?: SpotlightItem[];
  galleryImages?: Array<{ url?: string; caption?: string }>;
  dishes?: SpotlightItem[];
  testimonials?: Array<{ quote?: string; author?: string; role?: string }>;
  features?: Array<{ name?: string; desc?: string }>;
  stats?: Array<{ number?: string; label?: string }>;
  plans?: Array<{ name?: string; price?: string; period?: string; features?: string; product_id?: string }>;
  events?: Array<{ title?: string; date?: string; price?: string; seats?: string; product_id?: string }>;
  [key: string]: unknown;
}

export interface FeedSpotlightWidgetProps {
  sections: Section[];
  spotlightMode: 'single' | 'carousel';
  spotlightSectionIds: string[];
  spotlightCarouselCount: number;
  themeColor: string;
  businessName: string;
  showroomSlug: string;
  ownerId: string;
  onProductClick: (item: SpotlightItem) => void;
}

function HeroPanel({ section, themeColor, showroomSlug }: { section: Section; themeColor: string; showroomSlug: string }) {
  const bg = section.heroBg ?? themeColor;
  const bg2 = section.heroBg2 ?? bg;
  return (
    <div
      className="p-3 flex flex-col gap-1"
      style={{ background: `linear-gradient(135deg, ${bg}, ${bg2})` }}
    >
      {section.title && (
        <p className="text-sm font-bold text-white truncate">{section.title}</p>
      )}
      {section.subtitle && (
        <p className="text-xs text-white/80 line-clamp-2">{section.subtitle}</p>
      )}
      {section.cta && (
        <Link
          href={`/showroom/${showroomSlug}`}
          className="mt-1 self-start rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/30 transition-colors"
        >
          {section.cta}
        </Link>
      )}
    </div>
  );
}

function ItemsPanel({ section, themeColor, onProductClick }: { section: Section; themeColor: string; onProductClick: (item: SpotlightItem) => void }) {
  // 3 items max with image slots — keeps the feed card compact
  const raw: SpotlightItem[] = section.items ?? section.dishes ?? [];
  const items = raw.slice(0, 3);
  if (!items.length) {
    return (
      <div className="p-3 text-xs text-muted-foreground italic">No items to show</div>
    );
  }
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <div className="flex gap-2 p-3" style={{ width: 'max-content' }}>
        {items.map((item, i) => (
          <div
            key={i}
            className="flex flex-col rounded-lg border border-border/40 bg-background overflow-hidden w-28 shrink-0 cursor-pointer hover:shadow-sm transition-shadow active:scale-95"
            onClick={() => onProductClick(item)}
            role="button"
            tabIndex={0}
            aria-label={`View ${item.name ?? item.title ?? 'item'}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onProductClick(item); }}
          >
            <div className="w-full aspect-square bg-secondary/30 flex items-center justify-center">
              {(item.image ?? item.photo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image ?? item.photo}
                  alt={item.name ?? item.title ?? ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="text-xl text-muted-foreground/20">🛍</span>
              )}
            </div>
            <div className="p-1.5 flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold truncate">{item.name ?? item.title}</p>
              {item.price && (
                <p className="text-[11px] font-bold" style={{ color: themeColor }}>{item.price}</p>
              )}
              <button
                type="button"
                className="mt-0.5 rounded text-[10px] font-semibold py-0.5 px-1 text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: themeColor }}
                onClick={(e) => { e.stopPropagation(); onProductClick(item); }}
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ContactPanel intentionally removed — address is already visible on the business card above the spotlight.
// Rendering it here would duplicate the location that appears under the business name.

function AboutPanel({ section, showroomSlug, themeColor }: { section: Section; showroomSlug: string; themeColor: string }) {
  const text = section.aboutDesc ?? section.subtitle ?? '';
  return (
    <div className="p-3 flex flex-col gap-1">
      {section.aboutTitle && (
        <p className="text-xs font-semibold">{section.aboutTitle}</p>
      )}
      {text && (
        <p className="text-xs text-muted-foreground line-clamp-2">{text}</p>
      )}
      <Link
        href={`/showroom/${showroomSlug}`}
        className="text-[11px] font-medium mt-0.5"
        style={{ color: themeColor }}
      >
        Read more →
      </Link>
    </div>
  );
}

function GalleryPanel({ section }: { section: Section }) {
  // 3 max with images — keeps the card compact
  const images = (section.galleryImages ?? []).slice(0, 3);
  if (!images.length) {
    return <div className="p-3 text-xs text-muted-foreground italic">No photos</div>;
  }
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <div className="flex gap-2 p-3" style={{ width: 'max-content' }}>
        {images.map((img, i) => (
          <div key={i} className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-secondary/30">
            {img.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.url}
                alt={img.caption ?? `Photo ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-xl text-muted-foreground/20">🖼</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesPanel({ section, themeColor, onProductClick }: { section: Section; themeColor: string; onProductClick: (item: SpotlightItem) => void }) {
  // 5 max — text-only rows are compact
  const services: SpotlightItem[] = (section.services ?? section.items ?? []).slice(0, 5);
  if (!services.length) {
    return <div className="p-3 text-xs text-muted-foreground italic">No services listed</div>;
  }
  return (
    <div className="divide-y divide-border/30">
      {services.map((svc, i) => (
        <div key={i} className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{svc.name ?? svc.title}</p>
            {(svc.desc ?? svc.description) && (
              <p className="text-[11px] text-muted-foreground truncate">{svc.desc ?? svc.description}</p>
            )}
            {svc.price && <p className="text-[11px] font-bold" style={{ color: themeColor }}>{svc.price}</p>}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: themeColor }}
            onClick={() => onProductClick(svc)}
          >
            Request
          </button>
        </div>
      ))}
    </div>
  );
}

function TestimonialsPanel({ section }: { section: Section }) {
  type Testimonial = { quote?: string; author?: string; role?: string };
  const list = ((section.testimonials ?? []) as Testimonial[]).slice(0, 3);
  if (!list.length) return <div className="p-3 text-xs text-muted-foreground italic">No testimonials yet</div>;
  return (
    <div className="divide-y divide-border/30">
      {list.map((t, i) => (
        <div key={i} className="px-3 py-2">
          <p className="text-xs text-muted-foreground italic line-clamp-2">"{t.quote}"</p>
          <p className="text-[11px] font-semibold mt-0.5">{t.author}{t.role ? ` · ${t.role}` : ''}</p>
        </div>
      ))}
    </div>
  );
}

function FeaturesPanel({ section, themeColor }: { section: Section; themeColor: string }) {
  type Feature = { name?: string; desc?: string };
  const list = ((section.features ?? []) as Feature[]).slice(0, 5);
  if (!list.length) return <div className="p-3 text-xs text-muted-foreground italic">No features listed</div>;
  return (
    <div className="divide-y divide-border/30">
      {list.map((f, i) => (
        <div key={i} className="flex items-start gap-2 px-3 py-2">
          <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: themeColor }}>{i + 1}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{f.name}</p>
            {f.desc && <p className="text-[11px] text-muted-foreground truncate">{f.desc}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsPanel({ section, themeColor }: { section: Section; themeColor: string }) {
  type Stat = { number?: string; label?: string };
  const list = ((section.stats ?? []) as Stat[]).slice(0, 4);
  if (!list.length) return <div className="p-3 text-xs text-muted-foreground italic">No stats listed</div>;
  return (
    <div className="grid grid-cols-2 gap-px bg-border/30 overflow-hidden">
      {list.map((s, i) => (
        <div key={i} className="flex flex-col items-center justify-center py-3 bg-card">
          <p className="text-base font-bold" style={{ color: themeColor }}>{s.number}</p>
          <p className="text-[11px] text-muted-foreground text-center px-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function PricingPanel({ section, themeColor, onProductClick }: { section: Section; themeColor: string; onProductClick: (item: SpotlightItem) => void }) {
  type Plan = { name?: string; price?: string; period?: string; features?: string; product_id?: string };
  // 3 max — pricing cards need breathing room
  const plans = ((section.plans ?? []) as Plan[]).slice(0, 3);
  if (!plans.length) return <div className="p-3 text-xs text-muted-foreground italic">No pricing listed</div>;
  return (
    <div className="flex gap-2 p-3 overflow-x-auto overscroll-x-contain" style={{ width: 'max-content' }}>
      {plans.map((p, i) => (
        <div key={i} className="w-28 shrink-0 rounded-lg border border-border/40 bg-background p-2 flex flex-col gap-1">
          <p className="text-[11px] font-semibold truncate">{p.name}</p>
          <p className="text-sm font-bold" style={{ color: themeColor }}>{p.price}<span className="text-[10px] font-normal text-muted-foreground">{p.period}</span></p>
          <button
            type="button"
            className="mt-auto rounded text-[10px] font-semibold py-0.5 px-1 text-white"
            style={{ backgroundColor: themeColor }}
            onClick={() => onProductClick({ name: p.name, price: p.price, product_id: p.product_id })}
          >
            Choose
          </button>
        </div>
      ))}
    </div>
  );
}

function EventSchedulePanel({ section, themeColor, onProductClick }: { section: Section; themeColor: string; onProductClick: (item: SpotlightItem) => void }) {
  type Ev = { title?: string; date?: string; price?: string; seats?: string; product_id?: string };
  // 5 max — text rows
  const events = ((section.events ?? []) as Ev[]).slice(0, 5);
  if (!events.length) return <div className="p-3 text-xs text-muted-foreground italic">No upcoming events</div>;
  return (
    <div className="divide-y divide-border/30">
      {events.map((ev, i) => (
        <div key={i} className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{ev.title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{ev.date}{ev.seats ? ` · ${ev.seats} seats` : ''}</p>
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            {ev.price && <p className="text-[11px] font-bold" style={{ color: themeColor }}>{ev.price}</p>}
            <button
              type="button"
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: themeColor }}
              onClick={() => onProductClick({ name: ev.title, price: ev.price, product_id: ev.product_id })}
            >
              Book
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DefaultPanel({ section, themeColor, showroomSlug }: { section: Section; themeColor: string; showroomSlug: string }) {
  return (
    <div className="p-3 flex items-center justify-between gap-2">
      <p className="text-xs font-semibold truncate">{section.title ?? 'Visit Showroom'}</p>
      <Link
        href={`/showroom/${showroomSlug}`}
        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-80"
        style={{ backgroundColor: themeColor }}
      >
        Visit Showroom
      </Link>
    </div>
  );
}

function renderSpotlightSection(
  section: Section,
  themeColor: string,
  showroomSlug: string,
  onProductClick: (item: SpotlightItem) => void,
) {
  switch (section.type) {
    case 'hero':
    case 'banner':
      return <HeroPanel section={section} themeColor={themeColor} showroomSlug={showroomSlug} />;

    case 'items':
    case 'featured_products':
    case 'inventory_catalog':
    case 'menu':
      return <ItemsPanel section={section} themeColor={themeColor} onProductClick={onProductClick} />;

    case 'gallery':
      return <GalleryPanel section={section} />;

    case 'services':
      return <ServicesPanel section={section} themeColor={themeColor} onProductClick={onProductClick} />;

    case 'testimonials':
      return <TestimonialsPanel section={section} />;

    case 'features':
      return <FeaturesPanel section={section} themeColor={themeColor} />;

    case 'stats':
      return <StatsPanel section={section} themeColor={themeColor} />;

    case 'pricing':
      return <PricingPanel section={section} themeColor={themeColor} onProductClick={onProductClick} />;

    case 'event_schedule':
      return <EventSchedulePanel section={section} themeColor={themeColor} onProductClick={onProductClick} />;

    case 'about':
      return <AboutPanel section={section} showroomSlug={showroomSlug} themeColor={themeColor} />;

    // contact is intentionally not rendered here — address is already visible on the card
    default:
      return <DefaultPanel section={section} themeColor={themeColor} showroomSlug={showroomSlug} />;
  }
}

export default function FeedSpotlightWidget({
  sections,
  spotlightMode,
  spotlightSectionIds,
  spotlightCarouselCount,
  themeColor,
  showroomSlug,
  onProductClick,
}: FeedSpotlightWidgetProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const matched = sections.filter(s => spotlightSectionIds.includes(s.type));

  // Auto-advance carousel — stable interval, no restart on every tick
  useEffect(() => {
    if (spotlightMode !== 'carousel' || matched.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % matched.length);
    }, 4000);
    return () => clearInterval(id);
  }, [spotlightMode, matched.length]);

  if (!matched.length) return null;

  const visibleCount = Math.min(spotlightCarouselCount, matched.length);

  return (
    <div className="mx-4 mb-3 rounded-xl border border-border/40 bg-secondary/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Spotlight
        </span>
        <Link
          href={`/showroom/${showroomSlug}`}
          className="text-[10px] font-medium"
          style={{ color: themeColor }}
        >
          Visit showroom →
        </Link>
      </div>

      {spotlightMode === 'single' ? (
        renderSpotlightSection(matched[0], themeColor, showroomSlug, onProductClick)
      ) : (
        <div>
          {/* Carousel panels — horizontal sliding track */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${(activeIndex * 100) / visibleCount}%)` }}
            >
              {matched.map((section, idx) => (
                <div
                  key={idx}
                  className="shrink-0"
                  style={{ width: `${100 / visibleCount}%` }}
                >
                  {renderSpotlightSection(section, themeColor, showroomSlug, onProductClick)}
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          {matched.length > 1 && (
            <div className="flex items-center justify-between px-3 pb-2 pt-1">
              <button
                type="button"
                aria-label="Previous section"
                className="rounded-full border border-border/40 p-1 hover:bg-secondary transition-colors"
                onClick={() => setActiveIndex(prev => (prev - 1 + matched.length) % matched.length)}
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <div className="flex gap-1">
                {matched.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to section ${i + 1}`}
                    className="rounded-full transition-all"
                    style={{
                      width: i === activeIndex ? 16 : 6,
                      height: 6,
                      backgroundColor: i === activeIndex ? themeColor : themeColor + '40',
                    }}
                    onClick={() => setActiveIndex(i)}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Next section"
                className="rounded-full border border-border/40 p-1 hover:bg-secondary transition-colors"
                onClick={() => setActiveIndex(prev => (prev + 1) % matched.length)}
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
