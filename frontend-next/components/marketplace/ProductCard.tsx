'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import BookmarkButton from '@/components/ui/BookmarkButton';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '@/lib/money';
import { canOptimizeImage } from '@/lib/media';

interface Product {
  id: string;
  title: string;
  /** Number or decimal string ("100.00") as the API sends it. */
  price?: number | string;
  currency?: string;
  images?: string | null;
  status?: string;
}

interface ProductCardProps {
  product: Product;
  images: string[];
  /** First row on screen: load the photo right away (it is usually the LCP). */
  eager?: boolean;
}

export default function ProductCard({ product, images, eager = false }: ProductCardProps) {
  const { t } = useTranslation();

  return (
    <div className="relative group">
      <Link href={`/products/${product.id}`} className="group">
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-md transition-all">
          <div className="aspect-square bg-secondary/30 relative overflow-hidden">
            {images[0] ? (
              <Image
                src={images[0]}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 50vw, 300px"
                loading={eager ? 'eager' : 'lazy'}
                fetchPriority={eager ? 'high' : 'auto'}
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                unoptimized={!canOptimizeImage(images[0])}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                <ShoppingBag className="w-10 h-10" />
              </div>
            )}
            {product.status === 'sold_out' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Badge variant="secondary" className="bg-white/90">
                  {t('marketplace.outOfStock')}
                </Badge>
              </div>
            )}
            {/* Bookmark button — positioned top-right, stops link navigation */}
            <div className="absolute top-2 right-2">
              <BookmarkButton
                targetId={product.id}
                targetType="product"
                itemData={{
                  title: product.title,
                  thumbnailUrl: images[0],
                }}
                className="p-1.5 bg-black/30 hover:bg-black/50 rounded-lg backdrop-blur-sm"
              />
            </div>
          </div>
          <div className="p-3">
            <h3 className="text-sm font-medium truncate">{product.title}</h3>
            <p className="text-primary font-bold text-sm mt-1">
              {formatAmount(product.price)} {product.currency || 'USD'}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
