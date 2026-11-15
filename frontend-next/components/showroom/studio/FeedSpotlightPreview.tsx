'use client';
/**
 * FeedSpotlightPreview — live preview of how the business card's Spotlight
 * strip will look in the feeds. Rendered by the same BusinessSpotlight
 * component that visitors actually see.
 */
import React from 'react';
import BusinessSpotlight from '@/components/feed/BusinessSpotlight';
import { SPOTLIGHT_LABELS, chosenSlides } from '@/lib/spotlight';

export interface FeedSpotlightPreviewProps {
  sections: Array<Record<string, any>>;
  spotlightMode: 'off' | 'single' | 'carousel' | null;
  spotlightSectionIds: string[];
  themeColor: string;
  /** Second colour of the site's gradient (defaults to the first). */
  themeColor2?: string;
  businessName: string;
  ownerId: string;
  businessId?: string | null;
}

export default function FeedSpotlightPreview({
  sections,
  spotlightMode,
  spotlightSectionIds,
  themeColor,
  themeColor2,
  businessName,
  ownerId,
  businessId,
}: FeedSpotlightPreviewProps) {
  // What will really show: chosen sections with content (catalogue counts as filled).
  const status = spotlightMode === 'single' || spotlightMode === 'carousel'
    ? chosenSlides(sections as never, spotlightSectionIds, 1) : null;
  const shown = status ? (spotlightMode === 'single' ? Math.min(1, status.shown.length) : status.shown.length) : 0;
  return (
    <div className="p-4 space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live Preview
        </p>
        <span className="h-px flex-1 bg-border" />
        <p className="text-[11px] text-muted-foreground">
          {spotlightMode === 'off'
            ? 'Spotlight off'
            : spotlightMode === null || !status || shown === 0
            ? 'Automatic mode'
            : shown > 1
            ? `${shown} tabs`
            : '1 section'}
        </p>
      </div>
      {status && status.empty.length > 0 && (
        <p data-testid="spotlight-empty-note" className="rounded-lg bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
          Not shown yet, no content: {status.empty.map((t) => SPOTLIGHT_LABELS[t] ?? t).join(', ')}. Add it in Studio and the tab appears.
        </p>
      )}

      {spotlightMode === 'off' ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Spotlight is off — visitors see your description in its place.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm">
          {/* Simulated business card header */}
          <div
            className="h-12 w-full"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor2 || themeColor})` }}
            aria-hidden="true"
          />
          <p className="truncate px-3 pt-2 text-xs font-bold">{businessName}</p>

          {/* The actual spotlight strip */}
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
      )}

      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        {spotlightMode === 'off'
          ? 'Switch to Automatic or Choose sections to show a spotlight strip.'
          : spotlightSectionIds.length > 1
          ? 'Visitors can click the tabs to switch between your chosen sections.'
          : 'Fill in your sections with content to see it here. Products, services and prices show as cards.'}
      </p>
    </div>
  );
}
