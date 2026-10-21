import React from 'react';
import Link from 'next/link';
import SafeImage from '@/components/ui/SafeImage';

interface ProductMessageBubbleProps {
  metadata: Record<string, unknown>;
  isMe: boolean;
}

export default function ProductMessageBubble({ metadata }: ProductMessageBubbleProps) {
  const productId = typeof metadata.product_id === 'string' ? metadata.product_id : '';
  const name      = typeof metadata.name === 'string' ? metadata.name : 'Product';
  const price     = typeof metadata.price === 'number' ? metadata.price : (typeof metadata.price === 'string' ? parseFloat(metadata.price) : null);
  const image     = typeof metadata.image === 'string' ? metadata.image : null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm max-w-[260px] overflow-hidden">
      {image && (
        /* relative + h-32 so fill=true SafeImage has a sized container */
        <div className="relative w-full h-32 overflow-hidden bg-secondary">
          <SafeImage
            src={image}
            alt={name}
            className="object-cover"
            fallback="🛍️"
          />
        </div>
      )}
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold text-foreground line-clamp-2">{name}</p>
        {price !== null && !Number.isNaN(price) && (
          <p className="text-sm font-medium text-primary">
            {price.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
          </p>
        )}
        {productId && (
          <Link
            href={`/products/${productId}`}
            className="mt-2 block w-full text-center text-xs font-medium rounded-lg py-1.5 transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
          >
            View Product
          </Link>
        )}
      </div>
    </div>
  );
}
