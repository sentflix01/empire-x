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
  products: 'Products', featured_products: 'Featured products', inventory_catalog: 'Catalogue',
  items: 'Items', menu: 'Menu', services: 'Services', pricing: 'Packages', offer: 'Offer',
  event_schedule: 'Events', gallery: 'Gallery', portfolio: 'Portfolio', about: 'About', story: 'Our story',
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
    default: return false;
  }
}

export const isSpotlightType = (type: unknown) => SPOTLIGHT_PRIORITY.includes(String(type));
const rank = (type: unknown) => SPOTLIGHT_PRIORITY.indexOf(String(type));

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
  const candidates = (Array.isArray(sections) ? sections : [])
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => isSpotlightType(section?.type) && sectionHasContent(section, productCount, now))
    // One slide per type: the first section of that type on the site.
    .filter(({ section }, i, all) => all.findIndex((c) => c.section.type === section.type) === i)
    .sort((a, b) => rank(a.section.type) - rank(b.section.type));

  const chosenTypes = spotlightSectionIds(chosen);
  if ((mode === 'single' || mode === 'carousel') && chosenTypes.length > 0) {
    const picked = candidates.filter(({ section }) => chosenTypes.includes(String(section.type)));
    if (picked.length > 0) {
      const slides = mode === 'single' ? picked.slice(0, 1) : picked;
      return { slides, carousel: slides.length > 1 };
    }
    // The chosen sections are empty or gone: fall back to automatic rather than show nothing.
  }
  return { slides: candidates.slice(0, 1), carousel: false };
}

/** Section types the owner can choose for their spotlight, in priority order (Studio panel). */
export function spotlightChoices(sections: SpotlightSection[]): string[] {
  const types = new Set((Array.isArray(sections) ? sections : []).map((s) => String(s?.type)));
  return SPOTLIGHT_PRIORITY.filter((t) => types.has(t));
}

export { isCatalogueSection };
