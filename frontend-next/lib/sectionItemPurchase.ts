/**
 * What "Buy Now" does on a website card (Products/Items, Services, Pricing
 * Plans, template services and packages):
 *   - linked to a catalogue product (`product_id`, set in Showroom Studio):
 *     buy that product (its real price and stock; the popup reloads it);
 *   - not linked but priced: Request to order (the seller sets the price);
 *   - neither, or "Get Quote": no Buy button.
 */
export interface SectionItem {
  name?: string;
  title?: string;
  desc?: string;
  description?: string;
  price?: string | number;
  cta?: string;
  product_id?: string;
}

export interface BuyPayload {
  id?: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  /** The price as written on the card (requests only). */
  listed_price?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isGetQuote(item: SectionItem): boolean {
  return item.price === 'Get Quote' || (!item.price && item.cta === 'Get Quote');
}

export function sectionItemBuyPayload(item: SectionItem, fallbackTitle = 'Item'): BuyPayload | null {
  const title = item.name || item.title || fallbackTitle;
  const description = item.desc || item.description;
  const priceText = item.price === undefined || item.price === null ? '' : String(item.price).trim();
  const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
  if (typeof item.product_id === 'string' && UUID.test(item.product_id)) {
    return { id: item.product_id, title, description, price, currency: 'ETB' };
  }
  if (!priceText || isGetQuote(item)) return null;
  return { title, description, price, currency: 'ETB', listed_price: priceText };
}
