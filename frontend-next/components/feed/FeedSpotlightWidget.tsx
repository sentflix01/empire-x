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
  const items: SpotlightItem[] = (section.items ?? section.dishes ?? []).slice(0, 4);
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

function ContactPanel({ section, themeColor, showroomSlug }: { section: Section; themeColor: string; showroomSlug: string }) {
  const href = section.phone ? `tel:${section.phone}` : `/showroom/${showroomSlug}`;
  return (
    <div className="p-3 flex items-center justify-between gap-2">
      <div className="min-w-0">
        {section.title && <p className="text-xs font-semibold truncate">{section.title}</p>}
        {section.location && (
          <p className="text-xs text-muted-foreground truncate">{section.location}</p>
        )}
      </div>
      <Link
        href={href}
        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-80"
        style={{ backgroundColor: themeColor }}
      >
        Contact Us
      </Link>
    </div>
  );
}

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
  const images = (section.galleryImages ?? []).slice(0, 4);
  if (!images.length) {
    return <div className="p-3 text-xs text-muted-foreground italic">No photos</div>;
  }
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <div className="flex gap-2 p-3" style={{ width: 'max-content' }}>
        {images.map((img, i) => (
          <div key={i} className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-secondary/30">
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
  const services: SpotlightItem[] = (section.services ?? section.items ?? []).slice(0, 3);
  if (!services.length) {
    return <div className="p-3 text-xs text-muted-foreground italic">No services listed</div>;
  }
  return (
    <div className="divide-y divide-border/30">
      {services.map((svc, i) => (
        <div key={i} className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{svc.name ?? svc.title}</p>
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

    case 'contact':
      return <ContactPanel section={section} themeColor={themeColor} showroomSlug={showroomSlug} />;

    case 'about':
      return <AboutPanel section={section} showroomSlug={showroomSlug} themeColor={themeColor} />;

    case 'gallery':
      return <GalleryPanel section={section} />;

    case 'services':
      return <ServicesPanel section={section} themeColor={themeColor} onProductClick={onProductClick} />;

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
