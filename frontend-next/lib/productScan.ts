/**
 * Scan to add products: ask the backend what a scanned code is
 * (GET /api/products/lookup/:code), copy a suggested open-database photo into
 * our storage, and save a quick-scan list in one go.
 */
import client from '@/api/client';

export type LookupSource = 'mine' | 'nodbusiness' | 'open_food_facts' | 'open_beauty_facts' | 'open_products_facts' | 'not_found';
export interface ScanSuggestion { title: string; description?: string | null; category?: string | null; brand?: string | null; image_url?: string | null; unit?: string | null }
export interface ExistingProduct { id: string; title: string; stock: number; price: number; currency: string; images?: unknown }
export type LookupResponse =
  | { kind: 'text'; text: string; message: string }
  | { kind: 'gtin'; gtin: string; source: LookupSource; existing_product?: ExistingProduct | null; suggestion?: ScanSuggestion | null; credit?: string | null };

export async function lookupCode(code: string): Promise<LookupResponse> {
  return (await client.get(`/api/products/lookup/${encodeURIComponent(code.trim())}`)).data;
}

/** Our own copy of a suggested photo; photos already in our storage are kept as they are. */
export async function importPhoto(url: string): Promise<string> {
  if (!/^https:\/\/(images|static)\.open(food|beauty|products)facts\.org\//.test(url)) return url;
  return (await client.post('/api/products/import-image', { url })).data.url;
}

export type BatchItem =
  | { product_id: string; add_stock: number }
  | { title: string; price: number; stock: number; barcode?: string; description?: string | null; category?: string | null; manufacturer?: string | null; unit?: string | null; images?: string[] };

export async function saveScanBatch(items: BatchItem[], businessId?: string): Promise<{ created: string[]; updated: string[] }> {
  return (await client.post('/api/products/scan-batch', { items, ...(businessId ? { business_id: businessId } : {}) })).data;
}

export const SOURCE_LABEL: Record<LookupSource, string> = {
  mine: 'your products',
  nodbusiness: 'NodBusiness sellers',
  open_food_facts: 'Open Food Facts',
  open_beauty_facts: 'Open Beauty Facts',
  open_products_facts: 'Open Products Facts',
  not_found: '',
};

export const PRODUCT_CATEGORIES = ['Electronics', 'Fashion', 'Food', 'Services', 'Handmade', 'Beauty', 'Home', 'Other'];

/**
 * A suggested category ("Sodas", "Shampoos") → one of ours. Exact matches win;
 * otherwise the database it came from decides (food → Food, beauty → Beauty).
 */
export function productCategory(suggested: string | null | undefined, source: LookupSource | undefined): string {
  const exact = PRODUCT_CATEGORIES.find((c) => c.toLowerCase() === String(suggested ?? '').trim().toLowerCase());
  if (exact) return exact;
  if (source === 'open_food_facts') return 'Food';
  if (source === 'open_beauty_facts') return 'Beauty';
  return '';
}
