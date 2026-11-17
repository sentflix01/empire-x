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
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowRight, Play } from 'lucide-react';
import client from '@/lib/api/client';
import SafeImage from '@/components/ui/SafeImage';
import { SPOTLIGHT_LABELS, isCatalogueSection, resolveSpotlight, spotlightMissing, canSpotlight, type SpotlightSection } from '@/lib/spotlight';
import { spotlightSectionIds as chosenIdsOf } from '@/lib/spotlightSections';
import { spotlightTiles, type SpotlightTile } from '@/lib/spotlightTiles';
import { themeTextStyle, fillForWhiteText } from '@/lib/contrast';

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
  /** Studio's preview: told which section types the strip really draws, once products are known. */
  onShownChange?: (types: string[]) => void;
  /**
   * Owner's Studio preview only (owner, 17 Nov 2026): every chosen section is a
   * tab; one without content shows a dashed card with what it needs. Visitors'
   * cards never set this, so the feed only shows sections with content.
   */
  showEmptyChosen?: boolean;
  /** With showEmptyChosen: "Fill it in" on a dashed card opens that section in Studio. */
  onFillSection?: (type: string) => void;
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
  profile = {}, onBuy, isOwner = false, visitHref, eager = false, onShownChange,
  showEmptyChosen = false, onFillSection,
}: BusinessSpotlightProps) {
  const [rootRef, inView] = useInView<HTMLElement>(eager);
  const hasCatalogue = useMemo(() => sections.some((s) => isCatalogueSection(s?.type)), [sections]);
  // Without a catalogue section, products are still the fallback when no section has anything to show.
  const needsProducts = useMemo(
    () => spotlightMode !== 'off' && (hasCatalogue || resolveSpotlight(sections, spotlightMode, spotlightSectionIds, 0).slides.length === 0),
    [sections, spotlightMode, spotlightSectionIds, hasCatalogue],
  );
  const [products, setProducts] = useState<Array<Record<string, any>>>([]);
  // 'idle' until products are first needed, then loaded once. Decided per
  // render (not frozen at the first one): a catalogue tab ticked later in
  // Studio still loads them (owner, 15 Nov 2026).
  const [productsState, setProductsState] = useState<'idle' | 'done'>('idle');
  const productsLoaded = !needsProducts || productsState === 'done';
  // The active tab is remembered by section, so adding, removing or moving
  // other tabs never switches what the visitor is looking at.
  const [activeType, setActiveType] = useState<string | null>(null);
  const panelId = `spotlight-${useId().replace(/:/g, "")}`;
  const tablistRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!needsProducts || !inView || productsState === 'done') return;
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
      .finally(() => { if (!cancelled) setProductsState('done'); });
    return () => { cancelled = true; };
  }, [needsProducts, inView, productsState, businessId, ownerId]);

  // Every slide with the cards it draws; a slide that draws nothing is dropped
  // so one empty tab never blanks the whole strip.
  const slides = useMemo(() => {
    const withTiles = (list: Array<{ section: SpotlightSection; index: number }>) => list
      .map((sl) => ({ ...sl, tiles: spotlightTiles(sl.section, isCatalogueSection(sl.section.type) ? products : []) }))
      .filter((sl) => sl.tiles.length > 0);
    const picked = withTiles(resolveSpotlight(sections, spotlightMode, spotlightSectionIds, products.length).slides);
    const chosenMode = spotlightMode === 'single' || spotlightMode === 'carousel';
    if (chosenMode) {
      // Every chosen section shows, in the owner's order (owner, 17 Nov 2026:
      // "the tabs on the feed like the preview"). A section without content:
      //   - About: the business description, as the website's About does;
      //   - otherwise visitors get a "See more on our page" card, and the
      //     owner's Studio preview a dashed card saying what it needs.
      const ids = [...new Set(chosenIdsOf(spotlightSectionIds))].filter(canSpotlight);
      const description = typeof profile.business_description === 'string' ? profile.business_description.trim() : '';
      const all = (spotlightMode === 'single' ? ids.slice(0, 1) : ids).flatMap((type) => {
        const real = picked.find((sl) => String(sl.section.type) === type);
        if (real) return [real];
        const index = sections.findIndex((x) => String(x?.type) === type);
        if (index === -1) return [];
        const section = sections[index];
        const title = SPOTLIGHT_LABELS[type] ?? type;
        if ((type === 'about' || type === 'story') && description) {
          const about: SpotlightTile = { key: 'about-description', kind: 'wide', title: String(section.aboutTitle || '').trim() || 'About us', subtitle: description };
          return [{ section, index, tiles: [about] }];
        }
        const tile: SpotlightTile = showEmptyChosen
          ? { key: `todo-${type}`, kind: 'placeholder', section: type, title, subtitle: spotlightMissing(section, products.length) ?? 'Add content to show this tab.' }
          : { key: `visit-${type}`, kind: 'visit', section: type, title };
        return [{ section, index, tiles: [tile], ...(showEmptyChosen ? { placeholder: true } : {}) }];
      });
      if (all.length > 0) return all;
    }
    if (picked.length > 0 || hasCatalogue || products.length === 0 || spotlightMode === 'off') return picked;
    // Nothing on the site to show, but the business sells products: show those.
    return withTiles([{ section: { type: 'products', title: 'Products' } as SpotlightSection, index: sections.length }]);
  }, [sections, spotlightMode, spotlightSectionIds, products, hasCatalogue, showEmptyChosen, profile.business_description]);

  const activeIndex = Math.max(0, slides.findIndex((sl) => String(sl.section.type) === activeType));
  const current = slides[activeIndex];
  const tiles = current?.tiles ?? [];
  const active = activeIndex;
  const setActive = useCallback((i: number) => setActiveType(String(slides[i]?.section.type ?? '') || null), [slides]);

  // Only real tabs count as shown (dashed preview tabs are not on the card yet).
  const shownKey = productsLoaded ? slides.filter((sl) => !('placeholder' in sl)).map((sl) => String(sl.section.type)).join(',') : null;
  const onShownRef = useRef(onShownChange);
  onShownRef.current = onShownChange;
  useEffect(() => { if (shownKey !== null) onShownRef.current?.(shownKey ? shownKey.split(',') : []); }, [shownKey]);

  // Keep the active tab visible by scrolling the tab row sideways only; never
  // scrollIntoView, which also scrolls the page and Studio's preview pane.
  useEffect(() => {
    const row = tablistRef.current;
    const tab = row?.querySelectorAll<HTMLElement>('[role="tab"]')[active];
    if (!row || !tab) return;
    const left = tab.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft) row.scrollTo?.({ left });
    else if (left + tab.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollTo?.({ left: left + tab.offsetWidth - row.clientWidth });
  }, [active, slides.length]);

  // Same height while products load, so the card never jumps.
  if (!productsLoaded) {
    return <section ref={rootRef} aria-hidden="true" className={`${frame} animate-pulse bg-secondary/20`} style={{ height: SPOTLIGHT_HEIGHT }} />;
  }
  if (!current || tiles.length === 0) {
    return <EmptySpotlight rootRef={rootRef} profile={profile} visitHref={visitHref} themeColor={themeColor} />;
  }

  const label = (s: SpotlightSection) => SPOTLIGHT_LABELS[String(s.type)] ?? 'Spotlight';
  return (
    <section ref={rootRef} aria-label={`Spotlight: ${label(current.section)}`} className={frame} style={{ height: SPOTLIGHT_HEIGHT }}>
      <div className="flex h-9 items-center justify-between gap-2 px-4">
        {slides.length > 1 ? (
          <div ref={tablistRef} role="tablist" aria-label="Spotlight sections" className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto"
            onKeyDown={(e) => {
              // WAI-ARIA tabs: arrows move between tabs, Home/End jump to the ends.
              const last = slides.length - 1;
              const next = e.key === 'ArrowRight' ? (active >= last ? 0 : active + 1)
                : e.key === 'ArrowLeft' ? (active <= 0 ? last : active - 1)
                : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
              if (next < 0) return;
              e.preventDefault();
              setActive(next);
              const tab = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
              tab?.focus();
            }}>
            {slides.map((s, i) => (
              <button key={`${s.index}-${s.section.type}`} type="button" role="tab" aria-selected={i === active}
                id={`${panelId}-tab-${i}`} aria-controls={`${panelId}-panel`} tabIndex={i === active ? 0 : -1}
                onClick={() => setActive(i)}
                className={`h-7 shrink-0 rounded-full px-3 text-xs font-semibold transition-colors ${i === active ? 'text-white' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'}`}
                style={i === active ? { backgroundColor: fillForWhiteText(themeColor) } : undefined}>
                {label(s.section)}{'placeholder' in s ? <span className="sr-only"> (no content yet)</span> : null}
              </button>
            ))}
          </div>
        ) : (
          <h4 className="biz-text truncate text-xs font-bold uppercase tracking-wide" style={{ ...themeTextStyle(themeColor) }}>{label(current.section)}</h4>
        )}
        {visitHref && (
          <Link href={visitHref} className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
            See all <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div id={`${panelId}-panel`} role={slides.length > 1 ? 'tabpanel' : undefined}
        aria-labelledby={slides.length > 1 ? `${panelId}-tab-${Math.min(active, slides.length - 1)}` : undefined}>
      <TileStrip
        key={`${current.index}-${current.section.type}`}
        tiles={tiles}
        label={label(current.section)}
        themeColor={themeColor}
        onBuy={isOwner ? undefined : onBuy}
        onFillSection={onFillSection}
        visitHref={visitHref}
      />
      </div>
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
        <Link href={visitHref} className="inline-flex h-9 w-fit items-center gap-1 rounded-full px-4 text-xs font-semibold text-white" style={{ backgroundColor: fillForWhiteText(themeColor) }}>
          Visit the business <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

/** The sideways-sliding row: snaps to each card, arrows and dots page through it. */
export function TileStrip({ tiles, label, themeColor, onBuy, onFillSection, visitHref }: {
  tiles: SpotlightTile[]; label: string; themeColor: string; onBuy?: (item: Record<string, any>) => void; onFillSection?: (type: string) => void; visitHref?: string;
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
          {tiles.map((t) => <Tile key={t.key} tile={t} themeColor={themeColor} onBuy={onBuy} onFillSection={onFillSection} visitHref={visitHref} />)}
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

/** The video's picture with a play button; pressing it plays the video in the card. */
function VideoTile({ tile }: { tile: SpotlightTile }) {
  const [playing, setPlaying] = useState(false);
  return (
    <li className="relative h-full w-full shrink-0 snap-start overflow-hidden rounded-xl bg-black">
      {playing && tile.video ? (
        <iframe
          src={`${tile.video}?autoplay=1&rel=0`}
          title={tile.title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label={`Play video: ${tile.title}`}
          className="group relative block h-full w-full text-left">
          {tile.image && <SafeImage fill={false} width={480} height={360} loading="lazy" src={tile.image} alt="" className="h-full w-full object-cover opacity-90" />}
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition-transform group-hover:scale-110">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-white">
            <span className="block truncate text-sm font-semibold">{tile.title}</span>
            {tile.subtitle && <span className="block truncate text-xs opacity-90">{tile.subtitle}</span>}
          </span>
        </button>
      )}
    </li>
  );
}

function Tile({ tile, themeColor, onBuy, onFillSection, visitHref }: { tile: SpotlightTile; themeColor: string; onBuy?: (item: Record<string, any>) => void; onFillSection?: (type: string) => void; visitHref?: string }) {
  if (tile.kind === 'video') return <VideoTile tile={tile} />;
  if (tile.kind === 'visit') {
    return (
      <li className="flex h-full w-full shrink-0 snap-start flex-col items-start justify-center gap-2 rounded-xl border border-border/40 bg-secondary/20 px-4" data-testid={`spotlight-visit-${tile.section}`}>
        <p className="text-sm font-semibold">{tile.title}</p>
        <p className="text-xs text-muted-foreground">See more on our page.</p>
        {visitHref && (
          <Link href={visitHref} className="inline-flex h-9 items-center gap-1 rounded-full px-4 text-xs font-semibold text-white" style={{ backgroundColor: fillForWhiteText(themeColor) }}>
            Visit <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </li>
    );
  }
  if (tile.kind === 'placeholder') {
    return (
      <li className="flex h-full w-full shrink-0 snap-start flex-col items-start justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4" data-testid={`spotlight-todo-${tile.section}`}>
        <p className="text-sm font-semibold">{tile.title}</p>
        <p className="text-xs text-muted-foreground">{tile.subtitle}</p>
        <p className="text-[11px] text-muted-foreground">Until it has content, visitors see &ldquo;See more on our page&rdquo; here.</p>
        {onFillSection && tile.section && (
          <button type="button" onClick={() => onFillSection(tile.section!)} aria-label={`Fill in ${tile.title}`}
            className="rounded-full border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
            Fill it in
          </button>
        )}
      </li>
    );
  }
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
            <ShoppingBag className="biz-text h-7 w-7" style={{ ...themeTextStyle(themeColor) }} aria-hidden="true" />
          </div>}
    </div>
  );
  const words = (
    <div className="px-2 pt-1.5">
      <p className="truncate text-xs font-semibold" title={tile.title}>{tile.title}</p>
      <p className="biz-text truncate text-xs font-bold" style={{ ...themeTextStyle(themeColor) }}>
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
            className="h-8 w-full rounded-full text-xs font-semibold text-white active:scale-95" style={{ backgroundColor: fillForWhiteText(themeColor) }}>
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
