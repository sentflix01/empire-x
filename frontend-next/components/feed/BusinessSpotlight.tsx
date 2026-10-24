'use client';
/**
 * BusinessSpotlight: shows one of a business's selling sections (products,
 * menu, services, packages, offers, events, work) at its real size, exactly
 * as the section looks on the business's site, using the site renderer.
 * Several chosen sections play as a carousel. See lib/spotlight.ts for the
 * rules (automatic / off / chosen) that apply to every account.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import client from '@/api/client';
import SectionRenderer from '@/components/showroom/SectionRenderer';
import { SPOTLIGHT_LABELS, isCatalogueSection, resolveSpotlight, type SpotlightSection } from '@/lib/spotlight';

const SLIDE_MS = 6000;
const PRODUCT_LIMIT = 4;

export interface BusinessSpotlightProps {
  sections: SpotlightSection[];
  spotlightMode?: string | null;
  spotlightSectionIds?: unknown;
  themeColor: string;
  ownerId: string;
  businessId?: string | null;
  showroomId?: string | null;
  /** Business details the section renderer uses for fallbacks (name, description). */
  profile?: Record<string, any>;
  /** Buyers order through the Buy sheet; omitted for the owner's own card. */
  onBuy?: (item: Record<string, any>) => void;
  isOwner?: boolean;
  /** Load products right away instead of when the card scrolls into view (tests, previews). */
  eager?: boolean;
}

function useInView<T extends Element>(eager: boolean) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(eager);
  useEffect(() => {
    if (seen || !ref.current || typeof IntersectionObserver === 'undefined') { if (!seen) setSeen(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { rootMargin: '300px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export default function BusinessSpotlight({
  sections, spotlightMode, spotlightSectionIds, themeColor, ownerId, businessId, showroomId,
  profile = {}, onBuy, isOwner = false, eager = false,
}: BusinessSpotlightProps) {
  const [rootRef, inView] = useInView<HTMLDivElement>(eager);
  const hasCatalogue = useMemo(() => sections.some((s) => isCatalogueSection(s?.type)), [sections]);
  // Without a catalogue section, products are still the fallback when no section has anything to show.
  const needsProducts = useMemo(
    () => spotlightMode !== 'off' && (hasCatalogue || resolveSpotlight(sections, spotlightMode, spotlightSectionIds, 0).slides.length === 0),
    [sections, spotlightMode, spotlightSectionIds, hasCatalogue],
  );
  const [products, setProducts] = useState<Array<Record<string, any>>>([]);
  const [productsLoaded, setProductsLoaded] = useState(!needsProducts);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Catalogue sections show the business's real products: fetch a few once the card is near the screen.
  useEffect(() => {
    if (!needsProducts || !inView || productsLoaded) return;
    let cancelled = false;
    const params: Record<string, string | number> = { status: 'active', limit: PRODUCT_LIMIT };
    if (businessId) params.business_id = businessId; else params.seller_id = ownerId;
    client.get('/api/products', { params })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : [];
        setProducts(rows.slice(0, PRODUCT_LIMIT));
      })
      .catch(() => { /* no catalogue slide without products */ })
      .finally(() => { if (!cancelled) setProductsLoaded(true); });
    return () => { cancelled = true; };
  }, [needsProducts, inView, productsLoaded, businessId, ownerId]);

  const { slides, carousel } = useMemo(() => {
    const picked = resolveSpotlight(sections, spotlightMode, spotlightSectionIds, products.length);
    if (picked.slides.length > 0 || hasCatalogue || products.length === 0 || spotlightMode === 'off') return picked;
    // Nothing on the site to show, but the business sells products: show those.
    return { slides: [{ section: { type: 'products', title: 'Products' }, index: sections.length }], carousel: false };
  }, [sections, spotlightMode, spotlightSectionIds, products.length, hasCatalogue]);

  useEffect(() => { if (active >= slides.length) setActive(0); }, [active, slides.length]);

  useEffect(() => {
    if (!carousel || paused || prefersReducedMotion()) return;
    const t = setInterval(() => setActive((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [carousel, paused, slides.length]);

  // Wait for products before deciding, so a catalogue slide doesn't pop in after another one.
  if (!productsLoaded) return <div ref={rootRef} aria-hidden="true" className="min-h-[1px]" />;
  if (slides.length === 0) return <div ref={rootRef} aria-hidden="true" />;

  const current = slides[Math.min(active, slides.length - 1)];
  const label = SPOTLIGHT_LABELS[String(current.section.type)] ?? 'Spotlight';
  const go = (step: number) => setActive((i) => (i + step + slides.length) % slides.length);

  return (
    <section
      ref={rootRef}
      aria-roledescription={carousel ? 'carousel' : undefined}
      aria-label={carousel ? `Spotlight: ${slides.length} sections` : `Spotlight: ${label}`}
      className="border-t border-border/40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div aria-live={carousel && paused ? 'polite' : 'off'}>
        <SectionRenderer
          key={`${current.index}-${current.section.type}`}
          section={current.section}
          sectionIndex={current.index}
          products={isCatalogueSection(current.section.type) ? products : []}
          themeColor={themeColor}
          profile={profile}
          isOwner={isOwner}
          onBuy={isOwner ? undefined : onBuy}
          isPrimaryProducts={false}
          showroomId={showroomId ?? null}
          businessId={businessId ?? null}
        />
      </div>
      {carousel && (
        <div className="flex items-center justify-center gap-3 px-4 pb-3">
          <button type="button" onClick={() => go(-1)} aria-label="Previous spotlight section"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card hover:bg-secondary">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-1.5" role="group" aria-label="Choose a spotlight section">
            {slides.map((s, i) => (
              <button key={`${s.index}-${s.section.type}`} type="button" onClick={() => setActive(i)}
                aria-label={`Show ${SPOTLIGHT_LABELS[String(s.section.type)] ?? 'section'}`}
                aria-current={i === active ? 'true' : undefined}
                className="flex h-6 w-6 items-center justify-center">
                <span className="block h-2 rounded-full transition-all"
                  style={{ width: i === active ? 18 : 8, backgroundColor: i === active ? themeColor : 'hsl(var(--muted-foreground) / 0.35)' }} />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => go(1)} aria-label="Next spotlight section"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card hover:bg-secondary">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
