/**
 * The data a business card needs (feeds and profile): the business merged
 * with its published showroom, which carries the site's sections, cover,
 * logo, theme and spotlight settings.
 *
 * The business feed did this merge itself while the personal feed and the
 * profile used the bare business row, so their cards had no sections and no
 * spotlight. Every card now goes through these helpers.
 */
import { entities } from '@/lib/api/entities';
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

const updatedAt = (row: Row) => Date.parse(String(row.updated_at ?? row.created_at ?? '')) || 0;
/** The most recently updated row: the site as its owner last changed it. */
const latest = (rows: Row[]) => rows.reduce<Row | undefined>((best, row) => (!best || updatedAt(row) > updatedAt(best) ? row : best), undefined);

/** The published showroom that belongs to this business: linked by id, else same owner and name; the latest one if several. */
export function showroomForBusiness(business: Row, showrooms: Row[]): Row | undefined {
  return latest(showrooms.filter((s) => s.business_id && String(s.business_id) === String(business.id)))
    ?? latest(showrooms.filter((s) => s.owner_id === business.owner_id && nameKey(s.title) === nameKey(business.business_name)));
}

/**
 * The sections a card's Spotlight may show: only those of a published site,
 * as the owner last saved them. A business profile's own sections are the
 * template's samples (BusinessCreate), so a card without a site shows its
 * real products instead (owner, 16 Nov 2026: "only use the user's current
 * updated sections, not new sample").
 */
export function spotlightSectionsOf(card: Row): Array<Record<string, any>> {
  if (!card.showroom_id) return [];
  try {
    const list = typeof card.business_sections === 'string' ? JSON.parse(card.business_sections) : card.business_sections;
    return Array.isArray(list) ? list.filter((s) => s && typeof s === 'object') : [];
  } catch { return []; }
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
