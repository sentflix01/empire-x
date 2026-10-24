/**
 * The data a business card needs (feeds and profile): the business merged
 * with its published showroom, which carries the site's sections, cover,
 * logo, theme and spotlight settings.
 *
 * The business feed did this merge itself while the personal feed and the
 * profile used the bare business row, so their cards had no sections and no
 * spotlight. Every card now goes through these helpers.
 */
import { entities } from '@/api/entities';
import { spotlightSectionIds } from '@/lib/spotlightSections';

type Row = Record<string, any>;

const sectionsJson = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value ?? []));

function contactLocation(json: string): string {
  try {
    const list = JSON.parse(json);
    const contact = Array.isArray(list) ? list.find((s: Row) => s?.type === 'contact') : null;
    return String(contact?.location ?? '');
  } catch { return ''; }
}

/** A published showroom shaped as a business card entry. */
export function showroomToFeedBusiness(showroom: Row): Row {
  const json = sectionsJson(showroom.sections);
  return {
    ...showroom,
    id: String(showroom.id),
    owner_id: String(showroom.owner_id ?? ''),
    business_id: showroom.business_id ? String(showroom.business_id) : null,
    business_name: String(showroom.title ?? 'Business'),
    business_category: String(showroom.category ?? 'other'),
    business_theme_color: String(showroom.theme_color ?? '#2563EB'),
    business_logo_url: String(showroom.logo_url ?? ''),
    business_cover_url: String(showroom.cover_image ?? ''),
    business_description: String(showroom.description ?? ''),
    business_address: contactLocation(json),
    business_sections: json,
    showroom_id: String(showroom.id),
    showroom_slug: String(showroom.slug ?? ''),
    spotlight_mode: (showroom.spotlight_mode as string | null) ?? null,
    spotlight_section_ids: JSON.stringify(spotlightSectionIds(showroom.spotlight_section_ids)),
    spotlight_carousel_count: typeof showroom.spotlight_carousel_count === 'number' ? showroom.spotlight_carousel_count : 1,
  };
}

const nameKey = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase();

/** The published showroom that belongs to this business: linked by id, else same owner and name. */
export function showroomForBusiness(business: Row, showrooms: Row[]): Row | undefined {
  return showrooms.find((s) => s.business_id && String(s.business_id) === String(business.id))
    ?? showrooms.find((s) => s.owner_id === business.owner_id && nameKey(s.title) === nameKey(business.business_name));
}

/**
 * A business as a card entry: its showroom's site when published (keeping the
 * business id for products and checkout), else the business profile itself.
 */
export function businessToFeedBusiness(business: Row, showrooms: Row[]): Row {
  const site = showroomForBusiness(business, showrooms);
  if (!site) return { ...business, business_id: String(business.id) };
  return { ...showroomToFeedBusiness(site), business_id: String(business.id), business_record_id: String(business.id) };
}

/** Every business card entry for one owner, newest business first. */
export async function loadOwnerFeedBusinesses(ownerId: string): Promise<Row[]> {
  if (!ownerId) return [];
  const [businesses, showrooms] = await Promise.all([
    (entities.Business.filter({ owner_id: ownerId }, '-created_at', 20) as Promise<Row[]>).catch(() => [] as Row[]),
    (entities.Showroom.filter({ owner_id: ownerId, status: 'published' }, '-created_at', 20) as Promise<Row[]>).catch(() => [] as Row[]),
  ]);
  const published = showrooms.filter((s) => s.status === 'published');
  const entries = businesses.map((b) => businessToFeedBusiness(b, published));
  // A published site with no business profile still deserves its card.
  for (const site of published) {
    if (!businesses.some((b) => showroomForBusiness(b, [site]))) entries.push(showroomToFeedBusiness(site));
  }
  return entries;
}
