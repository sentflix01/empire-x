'use client';
import React from 'react';
import { getSectionType } from '@/lib/builderSections';
import FeedSpotlightWidget from '@/components/feed/FeedSpotlightWidget';

export interface FeedSpotlightPreviewProps {
  activeSections: string[];
  spotlightMode: 'off' | 'single' | 'carousel';
  spotlightSectionIds: string[];
  spotlightCarouselCount: number;
  themeColor: string;
  businessName: string;
}

export default function FeedSpotlightPreview({
  spotlightMode,
  spotlightSectionIds,
  spotlightCarouselCount,
  themeColor,
  businessName,
}: FeedSpotlightPreviewProps) {
  if (spotlightMode === 'off' || !spotlightSectionIds.length) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Spotlight is off — turn it on above to see a preview.
      </div>
    );
  }

  // Build minimal fake sections so the widget has something to render
  const fakeSections = spotlightSectionIds.map((id) => {
    const st = getSectionType(id);
    return {
      type: id,
      title: st?.label ?? id,
      subtitle: 'Preview text',
      cta: 'Shop Now',
      items: [
        { name: 'Sample item', price: 'ETB 200', desc: 'A sample product' },
        { name: 'Another item', price: 'ETB 350', desc: 'Another product' },
      ],
      services: [
        { name: 'Sample service', price: 'ETB 500', desc: 'A sample service' },
      ],
    };
  });

  const initial = businessName.charAt(0).toUpperCase();

  return (
    <div className="p-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
      {/* Mock feed card frame */}
      <div className="pointer-events-none rounded-2xl border border-border/50 overflow-hidden bg-card shadow-sm opacity-90">
        {/* Fake cover gradient */}
        <div
          className="h-14 w-full"
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}
        />
        {/* Fake header */}
        <div className="px-3 pb-2 -mt-5 relative flex items-end gap-2">
          <div
            className="w-10 h-10 rounded-lg border-2 border-white flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: themeColor }}
          >
            {initial}
          </div>
          <div className="min-w-0 pb-1">
            <p className="text-xs font-bold truncate">{businessName}</p>
          </div>
        </div>

        {/* Spotlight widget (pointer-events-none from parent) */}
        <FeedSpotlightWidget
          sections={fakeSections}
          spotlightMode={spotlightMode as 'single' | 'carousel'}
          spotlightSectionIds={spotlightSectionIds}
          spotlightCarouselCount={spotlightCarouselCount}
          themeColor={themeColor}
          businessName={businessName}
          showroomSlug="preview"
          ownerId="preview"
          onProductClick={() => {}}
        />
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        This is how it will look in the feed
      </p>
    </div>
  );
}
