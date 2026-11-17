'use client';
/**
 * FeedSpotlightPreview — live preview of how the business card's Spotlight
 * strip will look in the feeds. Rendered by the same BusinessSpotlight
 * component that visitors actually see.
 */
import React, { useState } from 'react';
import BusinessSpotlight from '@/components/feed/BusinessSpotlight';
import { SPOTLIGHT_LABELS, chosenSlides } from '@/lib/spotlight';
import { getSectionType } from '@/lib/builderSections';

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
  /** The site is live and the editor has changes not published yet: the feed still shows the live version. */
  unpublishedChanges?: boolean;
  /** Opens a section's form in Studio ("Fill it in"). */
  onFillSection?: (type: string) => void;
  /** The site's description: an empty About shows it, as on the website and the feed. */
  description?: string;
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
  unpublishedChanges = false,
  onFillSection,
  description = '',
}: FeedSpotlightPreviewProps) {
  // What the strip really draws (it reports back once products are known);
  // the header and the note always agree with it.
  const [drawn, setDrawn] = useState<string[] | null>(null);
  const chosen = spotlightMode === 'single' || spotlightMode === 'carousel';
  const status = chosen ? chosenSlides(sections as never, spotlightSectionIds, 1) : null;
  const drawnChosen = drawn ? drawn.filter((t) => spotlightSectionIds.includes(t)) : null;
  const shown = !chosen ? 0 : drawnChosen ? drawnChosen.length : status ? (spotlightMode === 'single' ? Math.min(1, status.shown.length) : status.shown.length) : 0;
  // Chosen but not drawn: no content yet, or a catalogue with no products.
  const notShown = chosen
    ? [...new Set(spotlightSectionIds)].filter((t) => (drawnChosen ? !drawnChosen.includes(t) : status?.empty.includes(t)) && (spotlightMode !== 'single' || t === spotlightSectionIds[0]))
    : [];
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
            : spotlightMode === null || !status
            ? 'Automatic mode'
            : notShown.length > 0
            ? `${shown + notShown.length} tabs`
            : shown > 1
            ? `${shown} tabs`
            : shown === 1 ? '1 section' : 'Automatic mode'}
        </p>
      </div>
      {unpublishedChanges && (
        <p data-testid="spotlight-unpublished-note" className="rounded-lg bg-primary/10 px-3 py-2 text-[11px] text-foreground">
          This preview uses your latest changes. Tap Update to publish them, and your feed card shows them too.
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
            profile={{ business_name: businessName, display_name: businessName, business_description: description }}
            isOwner
            eager
            onShownChange={setDrawn}
            showEmptyChosen
            onFillSection={onFillSection}
          />
        </div>
      )}

      {/* Ticked sections without content are dashed tabs in this preview only (owner, 17 Nov 2026). */}
      {notShown.length > 0 && (
        <p data-testid="spotlight-empty-note" className="text-[11px] text-muted-foreground">
          Dashed tabs ({notShown.map((t) => getSectionType(t)?.label ?? SPOTLIGHT_LABELS[t] ?? t).join(', ')}) have no content yet: on your card visitors see &ldquo;See more on our page&rdquo; there until you fill them in.
        </p>
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
