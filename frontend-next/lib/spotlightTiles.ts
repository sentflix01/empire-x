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
      return section.offerTitle ? [{
        key: 'offer', kind: 'wide', title: String(section.offerTitle), subtitle: text(section.offerDesc), image: text(section.offerPhoto),
      }] : [];
    case 'about': case 'story':
      return [{
        key: 'about', kind: 'wide',
        title: text(section.aboutTitle, section.title) ?? 'About us',
        subtitle: text(section.aboutDesc, section.content),
        image: text(section.aboutImage),
      }];
    default:
      return [];
  }
}
