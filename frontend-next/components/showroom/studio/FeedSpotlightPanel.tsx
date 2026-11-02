'use client';
/**
 * FeedSpotlightPanel — Studio control for choosing what appears in the
 * Feed Spotlight strip on the business card.
 *
 * Three modes:
 *   Automatic  – single best section, chosen by priority (default)
 *   Choose     – owner picks 1-N sections; 2+ renders as a tab carousel
 *   Off        – no spotlight on the card
 *
 * Changes are persisted to the server with an 800 ms debounce.
 * `onPreviewChange` fires immediately on every interaction so the live
 * preview in the parent can update without waiting for the network.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '@/api/client';
import { getSectionType } from '@/lib/builderSections';
import { SPOTLIGHT_LABELS } from '@/lib/spotlight';

// ─── Types ────────────────────────────────────────────────────────────────────

type StoredMode = 'single' | 'carousel' | 'off' | null;
type Choice = 'auto' | 'chosen' | 'off';

export interface FeedSpotlightPanelProps {
  /** Showroom id to PATCH. Empty string = preview-only mode (demo / unsaved draft). */
  showroomId: string;
  activeSections: string[];
  initialMode: StoredMode;
  initialSectionIds: string[];
  initialCarouselCount: number;
  themeColor: string;
  onClose: () => void;
  /** Called after a successful server save. */
  onSaved: (mode: StoredMode, sectionIds: string[], carouselCount: number) => void;
  /**
   * Called immediately on every user interaction so the parent can update
   * the live preview without waiting for the debounced server round-trip.
   */
  onPreviewChange?: (mode: StoredMode, sectionIds: string[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Section types that are purely structural / utility and should never appear
 * as a Spotlight tab. Kept in sync with seed-demo.js and migrate78.js.
 */
const SPOTLIGHT_EXCLUDED = new Set([
  'hero', 'cta', 'contact', 'map', 'hours', 'social', 'newsletter',
  'payment_info', 'save_showroom', 'feed_ticker', 'banner',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const choiceOf = (mode: StoredMode, ids: string[]): Choice =>
  mode === 'off' ? 'off'
  : (mode === 'single' || mode === 'carousel') && ids.length > 0 ? 'chosen'
  : 'auto';

/** Derive the stored values from the current UI state. */
function toStored(choice: Choice, ids: string[]): { mode: StoredMode; ids: string[] } {
  if (choice === 'off') return { mode: 'off', ids: [] };
  if (choice === 'auto' || ids.length === 0) return { mode: null, ids: [] };
  return { mode: ids.length > 1 ? 'carousel' : 'single', ids };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedSpotlightPanel({
  showroomId,
  activeSections,
  initialMode,
  initialSectionIds,
  onClose,
  onSaved,
  onPreviewChange,
}: FeedSpotlightPanelProps) {
  const options = activeSections.filter((t) => !SPOTLIGHT_EXCLUDED.has(t));

  const [choice, setChoice] = useState<Choice>(
    choiceOf(initialMode, initialSectionIds),
  );
  const [sectionIds, setSectionIds] = useState<string[]>(
    initialSectionIds.filter((id) => options.includes(id)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = useRef(false);

  // Notify parent immediately so the live preview reacts without network latency.
  const notifyPreview = useCallback(
    (nextChoice: Choice, nextIds: string[]) => {
      if (!onPreviewChange) return;
      const { mode, ids } = toStored(nextChoice, nextIds);
      onPreviewChange(mode, ids);
    },
    [onPreviewChange],
  );

  // Persist to server with an 800 ms debounce after any user interaction.
  useEffect(() => {
    if (!showroomId || !dirty.current) return;
    const { mode, ids } = toStored(choice, sectionIds);
    const timer = setTimeout(async () => {
      setSaving(true);
      setError('');
      try {
        await apiFetch(`/api/showrooms/${showroomId}/spotlight`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spotlight_mode: mode,
            spotlight_section_ids: ids,
            spotlight_carousel_count: 1,
          }),
        });
        onSaved(mode, ids, 1);
      } catch {
        setError('Could not save. Check your connection and try again.');
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, sectionIds, showroomId]);

  const pick = (next: Choice) => {
    dirty.current = true;
    setChoice(next);
    // When switching away from 'chosen', reset ids to empty for auto/off
    const nextIds = next === 'chosen' ? sectionIds : [];
    notifyPreview(next, next === 'chosen' ? sectionIds : nextIds);
  };

  const toggle = (type: string) => {
    dirty.current = true;
    setSectionIds((prev) => {
      const next = prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type];
      notifyPreview(choice, next);
      return next;
    });
  };

  const labelFor = (type: string) =>
    getSectionType(type)?.label ?? SPOTLIGHT_LABELS[type] ?? type;

  // ── Status line ─────────────────────────────────────────────────────────────
  const statusText = error
    ? error
    : saving
    ? 'Saving…'
    : !showroomId
    ? 'Preview only — publish your site to save this setting.'
    : 'Settings saved automatically.';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <h2 className="text-base font-bold">Feed Spotlight Preview</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Feed Spotlight Preview"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Choose what visitors see on your business card in the feeds. Pick
          one section to highlight it, or several to play as a slideshow.
        </p>

        {/* Mode selector */}
        <fieldset className="space-y-1">
          <legend className="mb-2 text-sm font-semibold">What to show</legend>
          {(
            [
              ['auto',   'Automatic',        'We pick your best section automatically — products, menu, services, gallery, and more.'],
              ['chosen', 'Choose sections',  'Select one or more sections. Two or more will cycle as clickable tabs.'],
              ['off',    'Off',              'No Spotlight on your card — visitors see your description instead.'],
            ] as const
          ).map(([value, title, hint]) => (
            <label
              key={value}
              className="flex items-start gap-3 min-h-11 cursor-pointer rounded-xl px-2 py-2 hover:bg-secondary transition-colors"
            >
              <input
                type="radio"
                name="spotlight-choice"
                value={value}
                checked={choice === value}
                onChange={() => pick(value)}
                className="accent-primary mt-0.5 shrink-0"
              />
              <span className="text-sm">
                <span className="font-medium">{title}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {/* Section checklist — only visible in chosen mode */}
        {choice === 'chosen' && (
          <fieldset className="space-y-1">
            <legend className="mb-2 text-sm font-semibold">
              Sections from your page
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({options.length} available)
              </span>
            </legend>

            {options.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-xs text-muted-foreground text-center">
                Add sections to your page first — then choose which ones to
                spotlight here.
              </p>
            ) : (
              options.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-3 min-h-11 cursor-pointer rounded-xl px-2 hover:bg-secondary transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={sectionIds.includes(type)}
                    onChange={() => toggle(type)}
                    className="accent-primary h-4 w-4 shrink-0"
                  />
                  <span className="text-sm font-medium">{labelFor(type)}</span>
                  {sectionIds.includes(type) && sectionIds.length > 1 && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      Tab {sectionIds.indexOf(type) + 1}
                    </span>
                  )}
                </label>
              ))
            )}

            {options.length > 0 && sectionIds.length === 0 && (
              <p className="text-xs text-muted-foreground px-2">
                Nothing chosen yet — Automatic mode applies until you select a
                section.
              </p>
            )}
            {sectionIds.length > 1 && (
              <p className="text-xs text-muted-foreground px-2 pt-1">
                {sectionIds.length} tabs selected — visitors can click between
                them on your card.
              </p>
            )}
          </fieldset>
        )}

        {/* Status */}
        <p
          className={`text-xs px-1 ${error ? 'text-red-500' : 'text-muted-foreground'}`}
          aria-live="polite"
        >
          {statusText}
        </p>
      </div>
    </div>
  );
}
