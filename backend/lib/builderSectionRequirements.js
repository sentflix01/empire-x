// Shared server-side section entitlement rules. Keep the tier labels aligned
// with frontend-next/lib/builderSections.ts; the policy test enforces parity.
const BUILDER_SECTION_TIERS = Object.freeze({
  freemium: Object.freeze([
    'hero', 'about', 'items', 'gallery', 'services',
    'contact', 'social', 'pricing', 'team', 'faq', 'features', 'stats',
    'payment_info', 'hours', 'menu', 'offer',
    // sections added in builder overhaul
    'delivery', 'certifications', 'brands', 'event_schedule',
    // feed announcement bar (scrolling ticker on the business feed card)
    'feed_ticker',
  ]),
  premium: Object.freeze([
    'portfolio', 'newsletter', 'video', 'map', 'cta', 'process', 'booking',
    // sections added in builder overhaul
    'before_after', 'job_openings',
    // rooms with an availability calendar (migrate90)
    'rooms',
  ]),
  pro: Object.freeze([
    'caseStudies', 'partners', 'awards', 'industries',
    'inventory_catalog', 'live_location_tracking', 'save_showroom',
  ]),
});
// Types owners can no longer add (decision "Reviews are platform-owned and
// mandatory"): owner-typed testimonials. Old saved sites may still contain
// them; they are skipped here and stripped on save, never a reason to refuse.
const RETIRED_SECTIONS = Object.freeze(new Set(['testimonials']));
const KNOWN_SECTIONS = new Set(Object.values(BUILDER_SECTION_TIERS).flat());
const PREMIUM_SECTIONS = new Set(BUILDER_SECTION_TIERS.premium);
const PRO_SECTIONS = new Set(BUILDER_SECTION_TIERS.pro);

function normalizeSections(value) {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const sections = [];
  const seen = new Set();
  for (const value of parsed) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const key = value.type ?? value.key;
    if (typeof key === 'string' && RETIRED_SECTIONS.has(key)) continue;
    if (typeof key !== 'string' || !KNOWN_SECTIONS.has(key) || seen.has(key)) return null;
    seen.add(key);
    sections.push(value);
  }
  return sections.length ? sections : null;
}

function getRequiredBusinessTier(value) {
  const sections = normalizeSections(value);
  if (!sections) return null;
  let required = sections.length > 25 ? 'pro' : sections.length > 5 ? 'premium' : 'normal';
  for (const section of sections) {
    const key = String(section.type ?? section.key);
    if (PRO_SECTIONS.has(key)) return 'pro';
    if (PREMIUM_SECTIONS.has(key) && required === 'normal') required = 'premium';
  }
  return required;
}

module.exports = { BUILDER_SECTION_TIERS, RETIRED_SECTIONS, normalizeSections, getRequiredBusinessTier };
