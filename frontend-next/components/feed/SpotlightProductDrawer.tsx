'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { findOrCreateConversation } from '@/lib/messaging';
import type { SpotlightItem } from './FeedSpotlightWidget';

export interface SpotlightProductDrawerProps {
  item: SpotlightItem;
  businessName: string;
  ownerId: string;
  showroomSlug: string;
  themeColor: string;
  currentUserId?: string;
  onClose: () => void;
  onBuy: (item: SpotlightItem) => void;
}

export default function SpotlightProductDrawer({
  item,
  businessName,
  ownerId,
  showroomSlug,
  themeColor,
  currentUserId,
  onClose,
  onBuy,
}: SpotlightProductDrawerProps) {
  const router = useRouter();
  const [messaging, setMessaging] = React.useState(false);
  const name = item.name ?? item.title ?? 'Item';
  const description = item.desc ?? item.description ?? '';
  const imageSrc = item.image ?? item.photo;

  const handleContactSeller = async () => {
    if (!currentUserId || messaging) return;
    setMessaging(true);
    try {
      const conv = await findOrCreateConversation(
        { id: currentUserId },
        ownerId,
        businessName,
      );
      if (conv) {
        onClose();
        router.push(`/messages/${conv.id}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMessaging(false);
    }
  };

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          key="spotlight-backdrop"
          className="fixed inset-0 z-40 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Drawer */}
        <motion.div
          key="spotlight-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={`${name} details`}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card shadow-xl p-5 space-y-4 max-h-[70vh] overflow-y-auto"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Product image */}
          {imageSrc && (
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-secondary/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Name and price */}
          <div className="space-y-0.5">
            <h3 className="text-base font-bold">{name}</h3>
            {item.price && (
              <p className="text-sm font-bold" style={{ color: themeColor }}>
                {item.price}
              </p>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}

          {/* Action row */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="flex-1 h-11 rounded-full font-semibold text-sm text-white transition-opacity hover:opacity-90 active:scale-95"
              style={{ backgroundColor: themeColor }}
              onClick={() => onBuy(item)}
            >
              Buy Now
            </button>
            {currentUserId && currentUserId !== ownerId && (
              <button
                type="button"
                className="flex-1 h-11 rounded-full border border-border font-semibold text-sm transition-colors hover:bg-secondary active:scale-95 disabled:opacity-50"
                onClick={handleContactSeller}
                disabled={messaging}
              >
                {messaging ? 'Opening…' : 'Contact Seller'}
              </button>
            )}
          </div>

          {/* Full showroom link */}
          <Link
            href={`/showroom/${showroomSlug}`}
            className="flex items-center justify-center text-xs font-medium"
            style={{ color: themeColor }}
            onClick={onClose}
          >
            View Full Showroom →
          </Link>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
