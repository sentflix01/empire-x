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
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { getSectionType } from '@/lib/builderSections';
import { SPOTLIGHT_LABELS, canSpotlight, chosenSlides } from '@/lib/spotlight';

// ─── Types ────────────────────────────────────────────────────────────────────

type StoredMode = 'single' | 'carousel' | 'off' | null;
type Choice = 'auto' | 'chosen' | 'off';

export interface FeedSpotlightPanelProps {
  /** Showroom id to PATCH. Empty string = preview-only mode (demo / unsaved draft). */
  showroomId: string;
  activeSections: string[];
  /** The page's sections with their content, to tell the owner which choices are still empty. */
  sections?: Array<Record<string, unknown>>;
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
  sections = [],
  initialMode,
  initialSectionIds,
  onClose,
  onSaved,
  onPreviewChange,
}: FeedSpotlightPanelProps) {
  // Only sections the strip can draw (audit 2026-11-14: e.g. Rooms or an old
  // testimonials key could be ticked and then never appeared).
  const options = activeSections.filter((t, i, all) => !SPOTLIGHT_EXCLUDED.has(t) && canSpotlight(t) && all.indexOf(t) === i);
  // Catalogue sections count as filled here: their products load on the card.
  const emptyChoices = new Set(chosenSlides(sections as never, options, 1).empty);

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

  const persist = useCallback(async (mode: StoredMode, ids: string[]) => {
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch(`/api/showrooms/${showroomId}/spotlight`, {
        method: 'PATCH',
        credentials: 'include',
        keepalive: true, // finishes even if the panel just closed
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotlight_mode: mode, spotlight_section_ids: ids, spotlight_carousel_count: 1 }),
      });
      if (res && 'ok' in res && !res.ok) throw new Error(String(res.status));
      onSaved(mode, ids, 1);
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }, [showroomId, onSaved]);

  // Persist with an 800 ms debounce after any change; a change still waiting
  // when the panel closes is saved straight away (it used to be dropped).
  const pending = useRef<{ mode: StoredMode; ids: string[] } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const next = pending.current;
    pending.current = null;
    if (next && showroomId) void persist(next.mode, next.ids);
  }, [persist, showroomId]);

  useEffect(() => {
    if (!showroomId || !dirty.current) return;
    pending.current = toStored(choice, sectionIds);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  }, [choice, sectionIds, showroomId, flush]);

  // Unmount (closing Studio's overlay any way): save what is still waiting.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => flushRef.current(), []);

  const close = () => { flush(); onClose(); };

  const pick = (next: Choice) => {
    dirty.current = true;
    setChoice(next);
    // When switching away from 'chosen', reset ids to empty for auto/off
    const nextIds = next === 'chosen' ? sectionIds : [];
    notifyPreview(next, next === 'chosen' ? sectionIds : nextIds);
  };

  // Compute the next list first, then update this panel and the preview: the
  // preview (in ShowroomCreate) must not be updated from inside a state
  // updater, which React reports as "update while rendering".
  const toggle = (type: string) => {
    dirty.current = true;
    const next = sectionIds.includes(type) ? sectionIds.filter((t) => t !== type) : [...sectionIds, type];
    setSectionIds(next);
    notifyPreview(choice, next);
  };

  const move = (type: string, dir: -1 | 1) => {
    dirty.current = true;
    const i = sectionIds.indexOf(type);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sectionIds.length) return;
    const next = [...sectionIds];
    [next[i], next[j]] = [next[j], next[i]];
    setSectionIds(next);
    notifyPreview(choice, next);
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
        <h2 id="feed-spotlight-title" className="text-base font-bold">Feed Spotlight</h2>
        <button
          type="button"
          onClick={close}
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
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {labelFor(type)}
                    {emptyChoices.has(type) && (
                      <span className="block text-[11px] font-normal text-muted-foreground">No content yet: add it in Studio to show this tab.</span>
                    )}
                  </span>
                  {sectionIds.includes(type) && sectionIds.length > 1 && (
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="text-[11px] text-muted-foreground">Tab {sectionIds.indexOf(type) + 1}</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); move(type, -1); if (sectionIds.indexOf(type) <= 1) (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus(); }} disabled={sectionIds.indexOf(type) === 0}
                        aria-label={`Move ${labelFor(type)} earlier`} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-30">
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={(e) => { e.preventDefault(); move(type, 1); if (sectionIds.indexOf(type) >= sectionIds.length - 2) (e.currentTarget.previousElementSibling as HTMLElement | null)?.focus(); }} disabled={sectionIds.indexOf(type) === sectionIds.length - 1}
                        aria-label={`Move ${labelFor(type)} later`} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-30">
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
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
          className={`text-xs px-1 ${error ? 'text-destructive' : 'text-muted-foreground'}`}
          aria-live="polite"
        >
          {statusText}
          {error && showroomId && (
            <button type="button" onClick={() => { const { mode, ids } = toStored(choice, sectionIds); void persist(mode, ids); }}
              className="ml-2 font-semibold underline underline-offset-2">
              Try again
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
