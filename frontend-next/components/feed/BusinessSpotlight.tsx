'use client';
/**
 * BusinessSpotlight: a fixed-height strip on every business card showing one
 * selling section as small cards (picture, name, price, Order/View). When
 * there are more cards than fit, it slides sideways: arrows on the sides,
 * dots below, and swipe on touch screens. About and offers show as one wide
 * card; galleries as picture cards. Several chosen sections switch with
 * labels at the top, inside the same frame, so every card has the same size.
 *
 * Which sections show (automatic / off / chosen) is decided by lib/spotlight.ts;
 * how each becomes cards, by lib/spotlightTiles.ts.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowRight } from 'lucide-react';
import client from '@/api/client';
import SafeImage from '@/components/ui/SafeImage';
import { SPOTLIGHT_LABELS, isCatalogueSection, resolveSpotlight, type SpotlightSection } from '@/lib/spotlight';
import { spotlightTiles, type SpotlightTile } from '@/lib/spotlightTiles';

const PRODUCT_LIMIT = 12;

/** The strip's fixed height (px): label row 36 + cards 188 + dots 24. */
export const SPOTLIGHT_HEIGHT = 248;

export interface BusinessSpotlightProps {
  sections: SpotlightSection[];
  spotlightMode?: string | null;
  spotlightSectionIds?: unknown;
  themeColor: string;
  ownerId: string;
  businessId?: string | null;
  showroomId?: string | null;
  /** Business details (name, description) for the empty state. */
  profile?: Record<string, any>;
  /** Buyers order through the Buy sheet; omitted for the owner's own card. */
  onBuy?: (item: Record<string, any>) => void;
  isOwner?: boolean;
  /** Where "See all" and the empty state lead (the business's site). */
  visitHref?: string;
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

const frame = 'border-t border-border/40 overflow-hidden';

export default function BusinessSpotlight({
  sections, spotlightMode, spotlightSectionIds, themeColor, ownerId, businessId,
  profile = {}, onBuy, isOwner = false, visitHref, eager = false,
}: BusinessSpotlightProps) {
  const [rootRef, inView] = useInView<HTMLElement>(eager);
  const hasCatalogue = useMemo(() => sections.some((s) => isCatalogueSection(s?.type)), [sections]);
  // Without a catalogue section, products are still the fallback when no section has anything to show.
  const needsProducts = useMemo(
    () => spotlightMode !== 'off' && (hasCatalogue || resolveSpotlight(sections, spotlightMode, spotlightSectionIds, 0).slides.length === 0),
    [sections, spotlightMode, spotlightSectionIds, hasCatalogue],
  );
  const [products, setProducts] = useState<Array<Record<string, any>>>([]);
  const [productsLoaded, setProductsLoaded] = useState(!needsProducts);
  const [active, setActive] = useState(0);

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
      .catch(() => { /* no catalogue cards without products */ })
      .finally(() => { if (!cancelled) setProductsLoaded(true); });
    return () => { cancelled = true; };
  }, [needsProducts, inView, productsLoaded, businessId, ownerId]);

  const slides = useMemo(() => {
    const picked = resolveSpotlight(sections, spotlightMode, spotlightSectionIds, products.length).slides;
    if (picked.length > 0 || hasCatalogue || products.length === 0 || spotlightMode === 'off') return picked;
    // Nothing on the site to show, but the business sells products: show those.
    return [{ section: { type: 'products', title: 'Products' } as SpotlightSection, index: sections.length }];
  }, [sections, spotlightMode, spotlightSectionIds, products.length, hasCatalogue]);

  useEffect(() => { if (active >= slides.length) setActive(0); }, [active, slides.length]);

  const current = slides[Math.min(active, Math.max(0, slides.length - 1))];
  const tiles = useMemo(
    () => (current ? spotlightTiles(current.section, isCatalogueSection(current.section.type) ? products : []) : []),
    [current, products],
  );

  // Same height while products load, so the card never jumps.
  if (!productsLoaded) {
    return <section ref={rootRef} aria-hidden="true" className={`${frame} animate-pulse bg-secondary/20`} style={{ height: SPOTLIGHT_HEIGHT }} />;
  }
  // No slides at all → show the business description.
  if (!current) {
    return <EmptySpotlight rootRef={rootRef} profile={profile} visitHref={visitHref} themeColor={themeColor} />;
  }

  const label = (s: SpotlightSection) => SPOTLIGHT_LABELS[String(s.type)] ?? 'Spotlight';

  // Current tab has no renderable tiles (e.g. products section before products
  // load, or an empty section the owner explicitly chose). Show the tab strip
  // so the user can switch to another tab, with a brief placeholder below.
  const noContent = tiles.length === 0;

  return (
    <section ref={rootRef} aria-label={`Spotlight: ${label(current.section)}`} className={frame} style={{ height: SPOTLIGHT_HEIGHT }}>
      <div className="flex h-9 items-center justify-between gap-2 px-4">
        {slides.length > 1 ? (
          <div role="tablist" aria-label="Spotlight sections" className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto">
            {slides.map((s, i) => (
              <button key={`${s.index}-${s.section.type}`} type="button" role="tab" aria-selected={i === active}
                onClick={() => setActive(i)}
                className={`h-7 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors ${i === active ? 'text-white' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'}`}
                style={i === active ? { backgroundColor: themeColor } : undefined}>
                {label(s.section)}
              </button>
            ))}
          </div>
        ) : (
          <h4 className="truncate text-xs font-bold uppercase tracking-wide" style={{ color: themeColor }}>{label(current.section)}</h4>
        )}
        {visitHref && (
          <Link href={visitHref} className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
            See all <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>
      {noContent ? (
        <div className="flex h-[212px] items-center justify-center px-4">
          <p className="text-xs text-muted-foreground text-center">
            {isCatalogueSection(current.section.type)
              ? 'Products loading…'
              : 'No content added to this section yet.'}
          </p>
        </div>
      ) : (
        <TileStrip
          key={`${current.index}-${current.section.type}`}
          tiles={tiles}
          label={label(current.section)}
          themeColor={themeColor}
          onBuy={isOwner ? undefined : onBuy}
        />
      )}
    </section>
  );
}

function EmptySpotlight({ rootRef, profile, visitHref, themeColor }: {
  rootRef: React.Ref<HTMLElement>; profile: Record<string, any>; visitHref?: string; themeColor: string;
}) {
  const about = typeof profile.business_description === 'string' ? profile.business_description.trim() : '';
  return (
    <section ref={rootRef} aria-label="About this business" className={`${frame} flex flex-col justify-center gap-3 px-4`} style={{ height: SPOTLIGHT_HEIGHT }}>
      <p className="line-clamp-6 text-sm leading-relaxed text-muted-foreground">
        {about || 'This business hasn’t added products or services to show here yet.'}
      </p>
      {visitHref && (
        <Link href={visitHref} className="inline-flex h-9 w-fit items-center gap-1 rounded-full px-4 text-xs font-semibold text-white" style={{ backgroundColor: themeColor }}>
          Visit the business <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

/** The sideways-sliding row: snaps to each card, arrows and dots page through it. */
export function TileStrip({ tiles, label, themeColor, onBuy }: {
  tiles: SpotlightTile[]; label: string; themeColor: string; onBuy?: (item: Record<string, any>) => void;
}) {
  const row = useRef<HTMLUListElement | null>(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  const measure = useCallback(() => {
    const el = row.current;
    if (!el || !el.clientWidth) return;
    const count = Math.max(1, Math.ceil((el.scrollWidth - 1) / el.clientWidth));
    setPages(count);
    const max = el.scrollWidth - el.clientWidth;
    setPage(max <= 0 ? 0 : el.scrollLeft >= max - 2 ? count - 1 : Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  useEffect(() => {
    measure();
    const el = row.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, tiles.length]);

  const goTo = (p: number) => {
    const el = row.current;
    if (!el) return;
    const target = Math.max(0, Math.min(pages - 1, p));
    el.scrollTo({ left: target * el.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    setPage(target);
  };

  const arrow = 'absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-card/95 shadow-md hover:bg-secondary';
  return (
    <>
      <div className="relative h-[188px]">
        <ul
          ref={row}
          onScroll={measure}
          tabIndex={0}
          aria-label={`${label}: ${tiles.length} ${tiles.length === 1 ? 'item' : 'items'}. Scroll sideways for more`}
          className="no-scrollbar flex h-full snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {tiles.map((t) => <Tile key={t.key} tile={t} themeColor={themeColor} onBuy={onBuy} />)}
        </ul>
        {pages > 1 && page > 0 && (
          <button type="button" onClick={() => goTo(page - 1)} aria-label={`Previous ${label}`} className={`${arrow} left-1`}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {pages > 1 && page < pages - 1 && (
          <button type="button" onClick={() => goTo(page + 1)} aria-label={`More ${label}`} className={`${arrow} right-1`}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="flex h-6 items-center justify-center gap-1" aria-hidden={pages <= 1}>
        {pages > 1 && Array.from({ length: pages }, (_, i) => (
          <button key={i} type="button" onClick={() => goTo(i)} aria-label={`Page ${i + 1} of ${pages}`} aria-current={i === page ? 'true' : undefined}
            className="flex h-6 w-6 items-center justify-center">
            <span className="block h-1.5 rounded-full transition-all"
              style={{ width: i === page ? 16 : 6, backgroundColor: i === page ? themeColor : 'hsl(var(--muted-foreground) / 0.35)' }} />
          </button>
        ))}
      </div>
    </>
  );
}

function Tile({ tile, themeColor, onBuy }: { tile: SpotlightTile; themeColor: string; onBuy?: (item: Record<string, any>) => void }) {
  if (tile.kind === 'wide') {
    return (
      <li className="flex h-full w-full shrink-0 snap-start overflow-hidden rounded-xl border border-border/40 bg-card">
        {tile.image && (
          <SafeImage fill={false} width={320} height={360} loading="lazy" src={tile.image} alt="" className="h-full w-2/5 shrink-0 object-cover" />
        )}
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <p className="line-clamp-2 text-sm font-semibold">{tile.title}</p>
          {tile.subtitle && <p className="mt-1 line-clamp-5 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{tile.subtitle}</p>}
        </div>
      </li>
    );
  }
  if (tile.kind === 'picture') {
    return (
      <li className="relative h-full w-[132px] shrink-0 snap-start overflow-hidden rounded-xl bg-secondary/30">
        {tile.image && <SafeImage fill={false} width={264} height={360} loading="lazy" src={tile.image} alt={tile.title} className="h-full w-full object-cover" />}
        {(tile.title || tile.subtitle) && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-white">
            {tile.title && <p className="truncate text-xs font-semibold">{tile.title}</p>}
            {tile.subtitle && <p className="truncate text-[11px] opacity-90">{tile.subtitle}</p>}
          </div>
        )}
      </li>
    );
  }
  const picture = (
    <div className="h-[92px] w-full overflow-hidden bg-secondary/30">
      {tile.image
        ? <SafeImage fill={false} width={264} height={184} loading="lazy" src={tile.image} alt="" className="h-full w-full object-cover" />
        : <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${themeColor}14` }}>
            <ShoppingBag className="h-7 w-7" style={{ color: themeColor }} aria-hidden="true" />
          </div>}
    </div>
  );
  const words = (
    <div className="px-2 pt-1.5">
      <p className="truncate text-xs font-semibold" title={tile.title}>{tile.title}</p>
      <p className="truncate text-xs font-bold" style={{ color: themeColor }}>
        {tile.price ?? <span className="font-normal text-muted-foreground">{tile.subtitle ?? ' '}</span>}
      </p>
    </div>
  );
  const canBuy = Boolean(onBuy && tile.buy && tile.action && tile.action !== 'Get quote');
  return (
    <li className="flex h-full w-[132px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border/40 bg-card">
      {tile.href ? <Link href={tile.href} className="block">{picture}{words}</Link> : <>{picture}{words}</>}
      <div className="mt-auto px-2 pb-2">
        {canBuy ? (
          <button type="button" onClick={() => onBuy!(tile.buy as Record<string, any>)} aria-label={`${tile.action} ${tile.title}`}
            className="h-8 w-full rounded-full text-xs font-semibold text-white active:scale-95" style={{ backgroundColor: themeColor }}>
            {tile.action}
          </button>
        ) : tile.href ? (
          <Link href={tile.href} aria-label={`View ${tile.title}`}
            className="flex h-8 w-full items-center justify-center rounded-full border border-border/60 text-xs font-semibold hover:bg-secondary">
            View
          </Link>
        ) : null}
      </div>
    </li>
  );
}
