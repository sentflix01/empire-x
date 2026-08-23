'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import BookmarkButton from '@/components/ui/BookmarkButton';
import { useTranslation } from 'react-i18next';

interface Product {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  images?: string;
  status?: string;
}

interface ProductCardProps {
  product: Product;
  images: string[];
}

export default function ProductCard({ product, images }: ProductCardProps) {
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
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                unoptimized
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
            <p className="text-amber-600 font-bold text-sm mt-1">
              {product.price?.toLocaleString()} {product.currency || 'USD'}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
