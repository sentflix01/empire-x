'use client';
/**
 * Studio: a live preview of the business card's Spotlight, built from the
 * owner's real sections and rendered by the same component visitors see.
 */
import React from 'react';
import BusinessSpotlight from '@/components/feed/BusinessSpotlight';

export interface FeedSpotlightPreviewProps {
  /** The site's sections as they will be published. */
  sections: Array<Record<string, any>>;
  spotlightMode: 'off' | 'single' | 'carousel' | null;
  spotlightSectionIds: string[];
  themeColor: string;
  businessName: string;
  ownerId: string;
  businessId?: string | null;
}

export default function FeedSpotlightPreview({
  sections, spotlightMode, spotlightSectionIds, themeColor, businessName, ownerId, businessId,
}: FeedSpotlightPreviewProps) {
  if (spotlightMode === 'off') {
    return <p className="p-4 text-center text-sm text-muted-foreground">Spotlight is off, so your card shows your description in its place.</p>;
  }
  return (
    <div className="p-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
      <div className="rounded-2xl border border-border/50 overflow-hidden bg-card shadow-sm">
        <div className="h-12 w-full" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }} />
        <p className="px-3 pt-2 text-xs font-bold truncate">{businessName}</p>
        <BusinessSpotlight
          sections={sections}
          spotlightMode={spotlightMode}
          spotlightSectionIds={spotlightSectionIds}
          themeColor={themeColor}
          ownerId={ownerId}
          businessId={businessId ?? null}
          profile={{ business_name: businessName, display_name: businessName }}
          isOwner
          eager
        />
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        If you see your description instead, none of your sections has something to sell yet (for example products, prices or pictures). Every card is the same size; more items slide sideways.
      </p>
    </div>
  );
}
