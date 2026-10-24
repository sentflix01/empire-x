'use client';
/**
 * What a business chat is about: a product, an order (with its status), a
 * showroom or a quote request. A snapshot of the title and photo; the price
 * and stock live on the linked page, so the card never shows a stale price.
 */
import Link from 'next/link';
import { ClipboardList, Package, ShoppingBag, Store } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';

export interface ContextCardData { kind: 'product' | 'order' | 'showroom' | 'quote'; id?: string; title: string; image?: string | null; url?: string; status?: string }

const META = {
  product: { label: 'Product', Icon: ShoppingBag },
  order: { label: 'Order', Icon: Package },
  showroom: { label: 'Showroom', Icon: Store },
  quote: { label: 'Quote request', Icon: ClipboardList },
} as const;

export function parseContextCard(content: string): ContextCardData | null {
  try {
    const card = JSON.parse(content) as ContextCardData;
    return card && typeof card.title === 'string' && card.kind in META ? card : null;
  } catch { return null; }
}

export default function ContextCard({ content, mine }: { content: string; mine?: boolean }) {
  const card = parseContextCard(content);
  if (!card) return null;
  const { label, Icon } = META[card.kind];
  const status = card.status ? ` · ${card.status.charAt(0).toUpperCase()}${card.status.slice(1).replace(/_/g, ' ')}` : '';
  const body = (
    <div className={`flex w-full max-w-xs items-center gap-3 rounded-2xl border bg-card p-2.5 text-left shadow-sm ${mine ? 'border-primary/30' : 'border-border'}`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
        {card.image
          ? <SafeImage fill={false} width={48} height={48} src={card.image} alt="" className="h-full w-full object-cover" />
          : <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3 w-3" aria-hidden="true" />{label}{status}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">{card.title}</p>
        {card.url && <p className="text-xs font-medium text-primary">View</p>}
      </div>
    </div>
  );
  return card.url
    ? <Link href={card.url} aria-label={`${label}: ${card.title}. View`} className="block">{body}</Link>
    : <div role="note" aria-label={`${label}: ${card.title}`}>{body}</div>;
}
