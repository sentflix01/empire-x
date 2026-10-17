'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { entities } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';

interface OwnProduct { id: string; title: string; price?: number | string; currency?: string; status?: string }

// One request per builder session, shared by every card's picker.
let cache: { userId: string; products: Promise<OwnProduct[]> } | null = null;
function ownProducts(userId: string): Promise<OwnProduct[]> {
  if (!cache || cache.userId !== userId) {
    cache = {
      userId,
      products: entities.Product.filter({ seller_id: userId }, '-created_at', 100)
        .then((rows) => (rows as unknown as OwnProduct[]).filter((p) => p.status !== 'deleted'))
        .catch(() => { cache = null; return []; }),
    };
  }
  return cache.products;
}

interface Props {
  id: string;
  value: string;
  onChange: (productId: string) => void;
}

/**
 * Links a website card to one of the owner's catalogue products. Linked
 * cards sell the product itself (its real price and stock); unlinked priced
 * cards become "Request to order".
 */
export default function ProductPicker({ id, value, onChange }: Props) {
  const { user } = useAuth();
  const [products, setProducts] = useState<OwnProduct[] | null>(null);

  useEffect(() => {
    if (!user?.id) { setProducts([]); return; }
    let cancelled = false;
    ownProducts(String(user.id)).then((rows) => { if (!cancelled) setProducts(rows); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const linked = products?.find((p) => p.id === value);
  const missing = Boolean(value) && products !== null && !linked;

  return (
    <div className="space-y-1">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={products === null}
        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-card text-foreground dark:bg-background focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        <option value="">Not linked: buyers send a request</option>
        {missing && <option value={value}>Linked product (no longer available)</option>}
        {(products ?? []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}{p.price !== undefined && p.price !== null ? ` · ${Number(p.price).toLocaleString()} ${p.currency ?? 'ETB'}` : ''}{p.status && p.status !== 'active' ? ` (${p.status})` : ''}
          </option>
        ))}
      </select>
      {products !== null && products.length === 0 && (
        <p className="text-[10px] text-muted-foreground">
          No products yet. <Link href="/products/create" className="text-primary underline">Add a product</Link> to sell this card directly.
        </p>
      )}
      {missing && <p className="text-[10px] text-destructive">The linked product was removed. Choose another or unlink it.</p>}
    </div>
  );
}
