/**
 * Turns one selling section into the small cards the Spotlight strip shows,
 * so every section type fits the same fixed-height frame:
 *   - catalogue, items, menu, services, packages, events: item cards
 *     (picture, name, price, Order/Book/View);
 *   - gallery and portfolio: picture cards;
 *   - offer, about and story: one wide card (picture and shortened text).
 * Which section is shown is decided by lib/spotlight.ts.
 */
import { sectionItemBuyPayload, isGetQuote, type BuyPayload } from '@/lib/sectionItemPurchase';
import { isCatalogueSection } from '@/lib/spotlight';

export type TileKind = 'item' | 'picture' | 'wide';

export interface SpotlightTile {
  key: string;
  kind: TileKind;
  title: string;
  subtitle?: string;
  price?: string;
  image?: string;
  /** Opens the item's own page (catalogue products). */
  href?: string;
  /** What Order/Book sends to the buy sheet; null means no button. */
  buy?: Record<string, any> | BuyPayload | null;
  /** Button label: Order, Book, or Get quote. */
  action?: 'Order' | 'Book' | 'Get quote';
}

const list = (v: unknown): Array<Record<string, any>> => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
const text = (...v: unknown[]) => {
  for (const x of v) if (typeof x === 'string' && x.trim()) return x.trim();
  return undefined;
};

/** First picture of a product (`images` is a JSON array, a URL or an array). */
export function firstImage(images: unknown): string | undefined {
  if (Array.isArray(images)) return text(images[0]);
  if (typeof images !== 'string' || !images.trim()) return undefined;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? text(parsed[0]) : text(parsed);
  } catch {
    return images.trim();
  }
}

function money(price: unknown, currency?: unknown): string | undefined {
  if (price === null || price === undefined || price === '') return undefined;
  const n = Number(price);
  if (Number.isFinite(n)) return `${n.toLocaleString()} ${text(currency) ?? 'ETB'}`;
  return text(price);
}

function itemTile(it: Record<string, any>, i: number, prefix: string, fallback: string, image?: unknown): SpotlightTile {
  const quote = isGetQuote(it);
  const buy = sectionItemBuyPayload(it, fallback);
  return {
    key: `${prefix}-${i}`,
    kind: 'item',
    title: text(it.name, it.title) ?? fallback,
    subtitle: text(it.desc, it.description),
    price: quote ? undefined : text(it.price === undefined ? undefined : String(it.price)),
    image: text(image),
    buy: quote ? null : buy,
    action: quote ? 'Get quote' : buy ? 'Order' : undefined,
  };
}

/** The cards for one section. `products` fills catalogue sections. */
export function spotlightTiles(section: Record<string, any>, products: Array<Record<string, any>> = []): SpotlightTile[] {
  const type = String(section?.type ?? '');
  if (isCatalogueSection(type)) {
    return products.map((p, i) => ({
      key: `p-${p.id ?? i}`,
      kind: 'item' as const,
      title: text(p.title, p.name) ?? 'Product',
      price: money(p.price, p.currency),
      image: firstImage(p.images ?? p.image_url),
      href: p.id ? `/products/${p.id}` : undefined,
      buy: p,
      action: 'Order' as const,
    }));
  }
  switch (type) {
    case 'items':
      return list(section.items).filter((it) => text(it.name, it.title)).map((it, i) => itemTile(it, i, 'it', 'Item', it.image ?? it.photo));
    case 'menu': {
      const dishes = list(section.dishes).filter((d) => text(d.name));
      const rows = dishes.length > 0 ? dishes : list(section.items).filter((d) => text(d.name, d.title));
      return rows.map((d, i) => itemTile(d, i, 'dish', 'Dish', d.photo ?? d.image));
    }
    case 'services':
      return [...list(section.services), ...list(section.items)]
        .filter((s) => text(s.name, s.title))
        .map((s, i) => itemTile(s, i, 'svc', 'Service', s.image ?? s.photo));
    case 'pricing':
      return list(section.plans).filter((p) => text(p.name)).map((p, i) => {
        const t = itemTile(p, i, 'plan', 'Plan', p.image);
        return { ...t, subtitle: text(p.features)?.split(',').map((f) => f.trim()).filter(Boolean).join(' · '), price: t.price && text(p.period) ? `${t.price}${p.period}` : t.price };
      });
    case 'event_schedule':
      return list(section.events).filter((e) => text(e.title)).map((e, i) => ({
        key: `ev-${i}`,
        kind: 'item' as const,
        title: text(e.title) ?? 'Event',
        subtitle: [text(e.date), e.seats ? `${e.seats} seats` : undefined].filter(Boolean).join(' · ') || undefined,
        price: text(e.price),
        image: text(e.image, e.photo),
        buy: { title: text(e.title) ?? 'Event', listed_price: e.price, product_id: e.product_id },
        action: 'Book' as const,
      }));
    case 'gallery':
      return list(section.galleryImages).filter((g) => text(g.url)).map((g, i) => ({
        key: `g-${i}`, kind: 'picture' as const, title: text(g.caption) ?? '', image: text(g.url),
      }));
    case 'portfolio':
      return list(section.portfolio).filter((p) => text(p.title, p.image)).map((p, i) => ({
        key: `w-${i}`, kind: 'picture' as const, title: text(p.title) ?? '', subtitle: text(p.client), image: text(p.image),
      }));
    case 'offer':
      return section.offerTitle
        ? [{ key: 'offer', kind: 'wide' as const, title: String(section.offerTitle), subtitle: text(section.offerDesc), image: text(section.offerPhoto) }]
        : [{ key: 'offer-empty', kind: 'wide' as const, title: 'Current Offer', subtitle: 'Add an offer title and description in your site editor to show it here.' }];
    case 'about': case 'story':
      return [{
        key: 'about', kind: 'wide',
        title: text(section.aboutTitle, section.title) ?? 'About us',
        subtitle: text(section.aboutDesc, section.content),
        image: text(section.aboutImage),
      }];

    // ── All other section types: renderers for chosen-mode spotlight ────────

    case 'testimonials': {
      const reviews = [...list(section.testimonials), ...list(section.items)]
        .filter((r) => text(r.quote, r.text, r.review));
      return reviews.map((r, i) => ({
        key: `rev-${i}`, kind: 'wide' as const,
        title: text(r.author, r.name) ?? 'Customer',
        subtitle: text(r.quote, r.text, r.review),
        image: text(r.image),
      }));
    }

    case 'team': {
      const members = list(section.members).filter((m) => text(m.name));
      return members.map((m, i) => ({
        key: `tm-${i}`, kind: 'picture' as const,
        title: text(m.name) ?? 'Team member',
        subtitle: text(m.role),
        image: text(m.image),
      }));
    }

    case 'faq': {
      const faqs = [...list(section.faqs), ...list(section.items)]
        .filter((f) => text(f.question, f.title));
      return faqs.map((f, i) => ({
        key: `faq-${i}`, kind: 'wide' as const,
        title: text(f.question, f.title) ?? 'Question',
        subtitle: text(f.answer, f.desc),
      }));
    }

    case 'features': {
      const features = [...list(section.features), ...list(section.items)]
        .filter((f) => text(f.name, f.title));
      return features.map((f, i) => ({
        key: `feat-${i}`, kind: 'item' as const,
        title: text(f.name, f.title) ?? 'Feature',
        subtitle: text(f.desc, f.description),
        image: text(f.image),
      }));
    }

    case 'stats': {
      const stats = list(section.stats).filter((s) => text(s.number));
      return stats.map((s, i) => ({
        key: `st-${i}`, kind: 'item' as const,
        title: text(s.number) ?? '',
        subtitle: text(s.label),
      }));
    }

    case 'before_after': {
      const pairs = list(section.baPairs).filter((p) => text(p.after, p.before));
      return pairs.map((p, i) => ({
        key: `ba-${i}`, kind: 'picture' as const,
        title: text(p.label) ?? 'After',
        image: text(p.after, p.before),
      }));
    }

    case 'certifications': {
      const certs = list(section.certs).filter((c) => text(c.name));
      return certs.map((c, i) => ({
        key: `cert-${i}`, kind: 'item' as const,
        title: text(c.name) ?? 'Certificate',
        subtitle: [text(c.issuer), text(c.year)].filter(Boolean).join(' · ') || undefined,
      }));
    }

    case 'brands': {
      const brands = list(section.brands).filter((b) => text(b.name));
      return brands.map((b, i) => ({
        key: `br-${i}`, kind: 'picture' as const,
        title: text(b.name) ?? 'Brand',
        image: text(b.logo),
      }));
    }

    case 'caseStudies': {
      const cases = list(section.caseStudies).filter((c) => text(c.title));
      return cases.map((c, i) => ({
        key: `cs-${i}`, kind: 'wide' as const,
        title: text(c.title) ?? 'Case study',
        subtitle: text(c.result, c.summary),
      }));
    }

    case 'partners': {
      const partners = list(section.partners).filter((p) => text(p.name));
      return partners.map((p, i) => ({
        key: `pt-${i}`, kind: 'picture' as const,
        title: text(p.name) ?? 'Partner',
        image: text(p.logo),
      }));
    }

    case 'awards': {
      const awards = list(section.awards).filter((a) => text(a.title));
      return awards.map((a, i) => ({
        key: `aw-${i}`, kind: 'item' as const,
        title: text(a.title) ?? 'Award',
        subtitle: text(a.detail),
      }));
    }

    case 'industries': {
      const industries = list(section.industries).filter((ind) => text(ind.name));
      return industries.map((ind, i) => ({
        key: `ind-${i}`, kind: 'item' as const,
        title: text(ind.name) ?? 'Industry',
        subtitle: text(ind.desc),
      }));
    }

    case 'process': {
      const steps = list(section.processSteps).filter((s) => text(s.title));
      return steps.map((s, i) => ({
        key: `pr-${i}`, kind: 'item' as const,
        title: text(s.title) ?? `Step ${i + 1}`,
        subtitle: text(s.desc),
      }));
    }

    case 'delivery': {
      const zones = list(section.deliveryZones).filter((z) => text(z.zone));
      if (zones.length > 0) {
        return zones.map((z, i) => ({
          key: `dz-${i}`, kind: 'item' as const,
          title: text(z.zone) ?? 'Zone',
          subtitle: text(z.time),
          price: text(z.fee),
        }));
      }
      return section.deliveryNote ? [{
        key: 'del-note', kind: 'wide' as const,
        title: 'Delivery',
        subtitle: text(section.deliveryNote),
      }] : [];
    }

    case 'job_openings': {
      const jobs = list(section.jobs).filter((j) => text(j.title));
      return jobs.map((j, i) => ({
        key: `job-${i}`, kind: 'item' as const,
        title: text(j.title) ?? 'Position',
        subtitle: [text(j.type), text(j.salary)].filter(Boolean).join(' · ') || text(j.desc),
      }));
    }

    case 'booking':
      return [{
        key: 'book',
        kind: 'wide' as const,
        title: text(section.bookingTitle, section.title) ?? 'Book an appointment',
        subtitle: text(section.bookingDesc, section.content) ?? 'Add a description in your site editor to show it here.',
      }];

    case 'video':
      return [{
        key: 'vid',
        kind: 'wide' as const,
        title: text(section.vidTitle, section.title) ?? 'Watch',
        subtitle: text(section.vidDesc) ?? (section.vidUrl ? undefined : 'Add a video URL in your site editor to show it here.'),
      }];

    default:
      // Unknown section type — return a placeholder so the tab still renders
      return [{
        key: `${type}-placeholder`,
        kind: 'wide' as const,
        title: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        subtitle: 'Add content to this section to see it here.',
      }];
  }
}
