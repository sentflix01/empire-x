/**
 * Business Spotlight: which of a business's own sections a visitor sees on
 * its card in the feeds and on the owner's profile.
 *
 * One rule for every account (real and demo, showroom or business profile):
 *   - Automatic (spotlight_mode null): the single highest-priority selling
 *     section that has content.
 *   - Off ('off'): nothing.
 *   - Chosen ('single' or 'carousel' with section types): those sections,
 *     in priority order; more than one plays as a carousel.
 *
 * A spotlight shows what the business sells (products, menu, services with
 * prices, packages, offers, events, its work) and never the hero, contact,
 * map, hours or other details the card already shows.
 */
import { spotlightSectionIds } from '@/lib/spotlightSections';
import { isCatalogueSection } from '@/components/showroom/SectionRenderer';

export type SpotlightSection = Record<string, any>;

/** Selling-point section types, highest priority first (owner decision, 24 Oct 2026). */
export const SPOTLIGHT_PRIORITY: readonly string[] = [
  'products', 'featured_products', 'inventory_catalog', // the real product catalogue
  'items',                                              // products typed into the site
  'menu',
  'services',
  'pricing',                                            // packages / plans
  'offer',
  'event_schedule',
  'gallery',
  'portfolio',
  'about', 'story',                                     // only with a picture
];

export const SPOTLIGHT_LABELS: Record<string, string> = {
  products: 'Products', featured_products: 'Featured', inventory_catalog: 'Catalogue',
  items: 'Items', menu: 'Menu', services: 'Services', pricing: 'Packages', offer: 'Offer',
  event_schedule: 'Events', gallery: 'Gallery', portfolio: 'Portfolio', about: 'About', story: 'Our story',
  team: 'Team', faq: 'FAQ', features: 'Why us', stats: 'Numbers',
  before_after: 'Before & After', job_openings: 'Hiring', delivery: 'Delivery',
  certifications: 'Certified', brands: 'Brands', caseStudies: 'Case studies',
  partners: 'Partners', awards: 'Awards', industries: 'Industries', process: 'Process',
  booking: 'Booking', video: 'Video',
};

const list = (v: unknown): any[] => (Array.isArray(v) ? v : []);

function offerIsLive(s: SpotlightSection, now: Date): boolean {
  if (!s.offerTitle) return false;
  if (!s.offerEnds) return true;
  const ends = new Date(String(s.offerEnds));
  return Number.isNaN(ends.getTime()) || ends.getTime() >= now.getTime();
}

/** True when the section has something worth showing (a spotlight never shows an empty block). */
export function sectionHasContent(s: SpotlightSection, productCount: number, now = new Date()): boolean {
  switch (s?.type) {
    case 'products': case 'featured_products': case 'inventory_catalog': return productCount > 0;
    case 'items': return list(s.items).some((i) => i?.name || i?.title);
    case 'menu': return list(s.dishes).some((d) => d?.name) || list(s.items).some((i) => i?.name || i?.title);
    case 'services': return list(s.services).length > 0 || list(s.items).length > 0;
    case 'pricing': return list(s.plans).length > 0;
    case 'offer': return offerIsLive(s, now);
    case 'event_schedule': return list(s.events).length > 0;
    case 'gallery': return list(s.galleryImages).some((g) => g?.url);
    case 'portfolio': return list(s.portfolio).length > 0;
    case 'about': case 'story': return Boolean(s.aboutImage) && Boolean(s.aboutDesc || s.content);
    // Extended sections — show if they have any content
    case 'team': return list(s.members).length > 0;
    case 'faq': return list(s.faqs).length > 0 || list(s.items).length > 0;
    case 'features': return list(s.features).length > 0 || list(s.items).length > 0;
    case 'stats': return list(s.stats).length > 0;
    case 'before_after': return list(s.baPairs).length > 0;
    case 'job_openings': return list(s.jobs).length > 0;
    case 'delivery': return list(s.deliveryZones).length > 0 || Boolean(s.deliveryNote);
    case 'certifications': return list(s.certs).length > 0;
    case 'brands': return list(s.brands).length > 0;
    case 'caseStudies': return list(s.caseStudies).length > 0;
    case 'partners': return list(s.partners).length > 0;
    case 'awards': return list(s.awards).length > 0;
    case 'industries': return list(s.industries).length > 0;
    case 'process': return list(s.processSteps).length > 0;
    case 'booking': return Boolean(s.bookingTitle || s.bookingDesc);
    case 'video': return Boolean(s.vidUrl);
    default: return false;
  }
}

export const isSpotlightType = (type: unknown) => SPOTLIGHT_PRIORITY.includes(String(type));

/**
 * Every section type the Spotlight strip can draw (lib/spotlightTiles.ts has a
 * card layout for each). An owner may choose any of these; Automatic mode
 * still only picks selling types (SPOTLIGHT_PRIORITY).
 */
export const SPOTLIGHT_TILE_TYPES: readonly string[] = [
  ...SPOTLIGHT_PRIORITY,
  'team', 'faq', 'features', 'stats', 'before_after', 'certifications', 'brands', 'caseStudies',
  'partners', 'awards', 'industries', 'process', 'delivery', 'job_openings', 'booking', 'video',
];
export const canSpotlight = (type: unknown) => SPOTLIGHT_TILE_TYPES.includes(String(type));
const rank = (type: unknown) => {
  const idx = SPOTLIGHT_PRIORITY.indexOf(String(type));
  return idx === -1 ? 999 : idx; // unknown types sort last
};

export interface ResolvedSpotlight {
  /** Sections to show, with their index in the full section list, best first. */
  slides: Array<{ section: SpotlightSection; index: number }>;
  carousel: boolean;
}

/**
 * Picks what to spotlight. `productCount` is how many active products the
 * business has (catalogue sections show those products).
 */
export function resolveSpotlight(
  sections: SpotlightSection[],
  mode: unknown,
  chosen: unknown,
  productCount: number,
  now = new Date(),
): ResolvedSpotlight {
  if (mode === 'off') return { slides: [], carousel: false };

  const allSections = Array.isArray(sections) ? sections : [];

  // ── Chosen mode: every section the owner chose, in the owner's order ──
  // (Studio audit 2026-11-14: chosen sections used to be limited to selling
  // types and re-sorted by priority, so ticked tabs went missing.) A chosen
  // section is skipped only while it has nothing to show, so a tab is never
  // blank; catalogue sections wait for products.
  const chosenTypes = spotlightSectionIds(chosen);
  if ((mode === 'single' || mode === 'carousel') && chosenTypes.length > 0) {
    const picked = chosenSlides(allSections, chosenTypes, productCount, now).shown;
    if (picked.length > 0) {
      const slides = mode === 'single' ? picked.slice(0, 1) : picked;
      return { slides, carousel: slides.length > 1 };
    }
    // All chosen sections are invalid or empty → fall through to automatic
  }

  // ── Automatic mode: single best section, no tabs (correct behaviour) ──
  // Priority-sorted; only SPOTLIGHT_PRIORITY types qualify for automatic.
  // Catalogue sections are excluded when productCount === 0 (products not yet
  // loaded or the business genuinely has none) so we fall to the next best.
  const candidates = allSections
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => isSpotlightType(section?.type) && sectionHasContent(section, productCount, now))
    // One slide per type: the first section of that type on the site.
    .filter(({ section }, i, all) => all.findIndex((c) => c.section.type === section.type) === i)
    .sort((a, b) => rank(a.section.type) - rank(b.section.type));

  if (candidates.length === 0) return { slides: [], carousel: false };
  // Automatic: single best section only — no tabs
  return { slides: candidates.slice(0, 1), carousel: false };
}

/**
 * The chosen sections that will show (in the owner's order) and the ones that
 * cannot show yet because they have no content (for the Studio panel).
 */
export function chosenSlides(sections: SpotlightSection[], chosen: unknown, productCount: number, now = new Date()) {
  const all = Array.isArray(sections) ? sections : [];
  const shown: Array<{ section: SpotlightSection; index: number }> = [];
  const empty: string[] = [];
  const seen = new Set<string>();
  for (const type of spotlightSectionIds(chosen)) {
    if (seen.has(type) || !canSpotlight(type)) continue;
    seen.add(type);
    const index = all.findIndex((s) => String(s?.type) === type);
    if (index === -1) continue; // removed from the page
    const s = all[index];
    // Chosen on purpose: About may show with words only (Automatic wants a picture).
    const aboutText = (type === 'about' || type === 'story') && Boolean(String(s.aboutDesc ?? s.content ?? '').trim());
    if (sectionHasContent(s, productCount, now) || aboutText) shown.push({ section: s, index });
    else empty.push(type);
  }
  return { shown, empty };
}

/** Section types the owner can choose for their spotlight, in priority order (Studio panel). */
export function spotlightChoices(sections: SpotlightSection[]): string[] {
  const types = new Set((Array.isArray(sections) ? sections : []).map((s) => String(s?.type)));
  return SPOTLIGHT_PRIORITY.filter((t) => types.has(t));
}

export { isCatalogueSection };
