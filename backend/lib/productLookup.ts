/**
 * What a scanned barcode is, in this order (owner decision 2026-10-18):
 *   1. one of the seller's own products → offer "Add stock";
 *   2. the shared NodBusiness catalogue: name, description, category, brand
 *      and photo another seller entered for that barcode on an active,
 *      public product — never price, stock, cost or supplier;
 *   3. free open product databases (Open Food Facts / Beauty / Products),
 *      cached for 30 days, "not found" included;
 *   4. not found: the owner types it once and the next seller benefits.
 */
import pool from '../db/pool';
import logger from './logger';
import { productNotPrivateSql } from './siteVisibility';
import { uploadFile, validateFileBytes } from '../middleware/upload';

export interface Suggestion {
  title: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  image_url?: string | null;
  unit?: string | null;
}
export type LookupSource = 'mine' | 'nodbusiness' | 'open_food_facts' | 'open_beauty_facts' | 'open_products_facts' | 'not_found';
export interface LookupResult {
  gtin: string;
  source: LookupSource;
  existing_product?: { id: string; title: string; stock: number; price: number; currency: string; images: unknown } | null;
  suggestion?: Suggestion | null;
  /** Credit for open data, shown next to the filled form. */
  credit?: string | null;
}

/** The same product can be stored as 12-digit UPC, 13-digit EAN or 14-digit GTIN. */
export function gtinVariants(gtin13: string): string[] {
  const set = new Set([gtin13, `0${gtin13}`]);
  if (gtin13.startsWith('0')) set.add(gtin13.slice(1));
  return [...set];
}

const OPEN_DATABASES: Array<{ source: LookupSource; host: string; credit: string }> = [
  { source: 'open_food_facts', host: 'world.openfoodfacts.org', credit: 'Open Food Facts (CC BY-SA)' },
  { source: 'open_beauty_facts', host: 'world.openbeautyfacts.org', credit: 'Open Beauty Facts (CC BY-SA)' },
  { source: 'open_products_facts', host: 'world.openproductsfacts.org', credit: 'Open Products Facts (CC BY-SA)' },
];
/** Photos are copied into our storage only from these hosts (no fetching arbitrary URLs). */
export const ALLOWED_IMAGE_HOSTS = ['images.openfoodfacts.org', 'static.openfoodfacts.org', 'images.openbeautyfacts.org', 'static.openbeautyfacts.org', 'images.openproductsfacts.org', 'static.openproductsfacts.org'];
const USER_AGENT = 'NodBusiness/1.0 (+https://nodbusiness.vercel.app)';
const CACHE_DAYS = 30;

async function fetchJson(url: string, timeoutMs = 4000): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json() as Record<string, unknown>;
  } catch { return null; } finally { clearTimeout(timer); }
}

const clean = (v: unknown, max = 300): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
};

/** One open-database answer → our suggestion (null when the product isn't there). */
export function suggestionFromOpenFacts(body: Record<string, unknown> | null): Suggestion | null {
  if (!body || Number(body.status) !== 1 || !body.product || typeof body.product !== 'object') return null;
  const p = body.product as Record<string, unknown>;
  const title = clean(p.product_name) ?? clean(p.generic_name);
  if (!title) return null;
  const brand = clean(String(p.brands ?? '').split(',')[0]);
  const category = clean(String(p.categories ?? '').split(',').map((c) => c.trim()).filter(Boolean).slice(-1)[0] ?? '', 80);
  const quantity = clean(p.quantity, 40);
  return {
    title: brand && !title.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${title}` : title,
    description: clean(p.generic_name, 500) ?? (quantity ? `${title}, ${quantity}` : null),
    category,
    brand,
    image_url: clean(p.image_front_url, 1000) ?? clean(p.image_url, 1000),
    unit: quantity,
  };
}

async function fromOpenDatabases(gtin: string): Promise<{ source: LookupSource; suggestion: Suggestion | null; credit: string | null }> {
  const { rows: [cached] } = await pool.query(
    `SELECT source, data FROM barcode_lookups WHERE gtin=$1 AND fetched_at > NOW() - ($2 || ' days')::interval`,
    [gtin, String(CACHE_DAYS)],
  );
  if (cached) {
    const db = OPEN_DATABASES.find((d) => d.source === cached.source);
    return { source: cached.source, suggestion: cached.data ?? null, credit: db?.credit ?? null };
  }
  let found: { source: LookupSource; suggestion: Suggestion; credit: string } | null = null;
  for (const db of OPEN_DATABASES) {
    const suggestion = suggestionFromOpenFacts(await fetchJson(
      `https://${db.host}/api/v2/product/${gtin}.json?fields=product_name,generic_name,brands,categories,quantity,image_front_url,image_url`,
    ));
    if (suggestion) { found = { source: db.source, suggestion, credit: db.credit }; break; }
  }
  await pool.query(
    `INSERT INTO barcode_lookups (gtin, source, data, fetched_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (gtin) DO UPDATE SET source=EXCLUDED.source, data=EXCLUDED.data, fetched_at=NOW()`,
    [gtin, found?.source ?? 'not_found', found ? JSON.stringify(found.suggestion) : null],
  ).catch((err) => logger.warn({ err: (err as Error).message }, 'barcode cache write failed'));
  return found ?? { source: 'not_found', suggestion: null, credit: null };
}

export async function lookupBarcode(sellerId: string, gtin: string): Promise<LookupResult> {
  const variants = gtinVariants(gtin);
  const { rows: [mine] } = await pool.query(
    `SELECT id, title, stock, price, currency, images FROM products
      WHERE seller_id=$1 AND barcode = ANY($2::text[]) AND status <> 'archived' ORDER BY created_at LIMIT 1`,
    [sellerId, variants],
  );
  if (mine) return { gtin, source: 'mine', existing_product: { ...mine, price: Number(mine.price), stock: Number(mine.stock) }, suggestion: null, credit: null };

  // Shared catalogue: the most common naming across other sellers' public, active products.
  const { rows: [shared] } = await pool.query(
    `SELECT p.title, (ARRAY_AGG(p.description ORDER BY p.created_at) FILTER (WHERE p.description IS NOT NULL AND p.description <> ''))[1] AS description,
            (ARRAY_AGG(p.category ORDER BY p.created_at) FILTER (WHERE p.category IS NOT NULL AND p.category <> ''))[1] AS category,
            (ARRAY_AGG(p.manufacturer ORDER BY p.created_at) FILTER (WHERE p.manufacturer IS NOT NULL))[1] AS brand,
            (ARRAY_AGG(p.images ORDER BY p.created_at) FILTER (WHERE p.images IS NOT NULL))[1] AS images,
            (ARRAY_AGG(p.unit ORDER BY p.created_at))[1] AS unit
       FROM products p
      WHERE p.barcode = ANY($1::text[]) AND p.seller_id <> $2 AND p.status = 'active' AND ${productNotPrivateSql('p')}
      GROUP BY p.title ORDER BY COUNT(*) DESC, MIN(p.created_at) LIMIT 1`,
    [variants, sellerId],
  );
  if (shared) {
    let image: string | null = null;
    try {
      const imgs = typeof shared.images === 'string' ? JSON.parse(shared.images) : shared.images;
      image = Array.isArray(imgs) && typeof imgs[0] === 'string' ? imgs[0] : null;
    } catch { image = null; }
    return {
      gtin, source: 'nodbusiness', existing_product: null, credit: 'NodBusiness sellers',
      suggestion: { title: shared.title, description: shared.description, category: shared.category, brand: shared.brand, image_url: image, unit: shared.unit && shared.unit !== 'pcs' ? shared.unit : null },
    };
  }

  const open = await fromOpenDatabases(gtin);
  return { gtin, source: open.source, existing_product: null, suggestion: open.suggestion, credit: open.credit };
}

/** Copy an open-database photo into our storage (allow-listed hosts, images only, ≤ 5 MB). */
export async function importProductImage(rawUrl: string): Promise<string> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw Object.assign(new Error('Invalid image link'), { status: 422 }); }
  if (url.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.includes(url.hostname)) {
    throw Object.assign(new Error('This photo can’t be copied automatically. Add your own photo instead.'), { status: 422 });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal, redirect: 'error' });
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!res.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw Object.assign(new Error('That photo could not be loaded.'), { status: 422 });
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 5 * 1024 * 1024) throw Object.assign(new Error('That photo is too large.'), { status: 422 });
    const bad = await validateFileBytes(buf, type);
    if (bad) throw Object.assign(new Error(bad), { status: 422 });
    return await uploadFile(buf, `scan-${Date.now()}.${type.split('/')[1]}`, type);
  } finally { clearTimeout(timer); }
}
