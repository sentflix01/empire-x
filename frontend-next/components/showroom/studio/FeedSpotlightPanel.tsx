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
import { ArrowDown, ArrowUp, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Notify parent immediately so the live preview reacts without network latency.
  const notifyPreview = useCallback(
    (nextChoice: Choice, nextIds: string[]) => {
      if (!onPreviewChange) return;
      const { mode, ids } = toStored(nextChoice, nextIds);
      onPreviewChange(mode, ids);
    },
    [onPreviewChange],
  );

  // Explicit Save (owner, 14 Nov 2026): changes stay in this dialog until the
  // owner presses Save; Cancel discards them; closing with unsaved changes asks.
  const saved = useRef(toStored(choiceOf(initialMode, initialSectionIds), initialSectionIds.filter((id) => options.includes(id))));
  const current = toStored(choice, sectionIds);
  const isDirty = current.mode !== saved.current.mode || current.ids.join() !== saved.current.ids.join();
  const [confirmClose, setConfirmClose] = useState(false);

  const save = useCallback(async () => {
    const { mode, ids } = toStored(choice, sectionIds);
    // Not saved to the server yet (new site): Studio keeps the choice and
    // sends it with the next draft save or publish.
    if (!showroomId) { onSaved(mode, ids, 1); saved.current = { mode, ids }; onClose(); return; }
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch(`/api/showrooms/${showroomId}/spotlight`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotlight_mode: mode, spotlight_section_ids: ids, spotlight_carousel_count: 1 }),
      });
      if (res && 'ok' in res && !res.ok) throw new Error(String(res.status));
      saved.current = { mode, ids };
      onSaved(mode, ids, 1);
      onClose();
    } catch {
      setError('Could not save. Check your connection and try again.');
      setConfirmClose(false);
    } finally {
      setSaving(false);
    }
  }, [choice, sectionIds, showroomId, onSaved, onClose]);

  /** Discard: the preview goes back to what was saved. */
  const discard = useCallback(() => {
    onPreviewChange?.(saved.current.mode, saved.current.ids);
    onClose();
  }, [onPreviewChange, onClose]);

  const requestClose = useCallback(() => {
    if (isDirty) setConfirmClose(true);
    else onClose();
  }, [isDirty, onClose]);

  // Esc from anywhere in the dialog (a button that just became disabled drops
  // focus to <body>): ask before losing changes.
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (confirmRef.current) setConfirmClose(false); else requestCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const confirmRef = useRef(false);
  confirmRef.current = confirmClose;

  const pick = (next: Choice) => {
    setChoice(next);
    // When switching away from 'chosen', reset ids to empty for auto/off
    const nextIds = next === 'chosen' ? sectionIds : [];
    notifyPreview(next, next === 'chosen' ? sectionIds : nextIds);
  };

  // Compute the next list first, then update this panel and the preview: the
  // preview (in ShowroomCreate) must not be updated from inside a state
  // updater, which React reports as "update while rendering".
  const toggle = (type: string) => {
    const next = sectionIds.includes(type) ? sectionIds.filter((t) => t !== type) : [...sectionIds, type];
    setSectionIds(next);
    notifyPreview(choice, next);
  };

  const move = (type: string, dir: -1 | 1) => {
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
    : isDirty
    ? 'You have changes that are not saved yet.'
    : !showroomId
    ? 'Saved in Studio. It goes live when you publish.'
    : 'All changes saved.';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <h2 id="feed-spotlight-title" className="text-base font-bold">Feed Spotlight</h2>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close Feed Spotlight"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-5" data-testid="spotlight-settings-body">
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

      </div>

      {/* Footer: always reachable; Save is the only way changes go live. */}
      <div className="shrink-0 space-y-2 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {confirmClose && (
          <div role="alertdialog" aria-labelledby="spotlight-unsaved-title" className="rounded-xl border border-border bg-secondary/60 p-3">
            <p id="spotlight-unsaved-title" className="text-sm font-semibold">Save your changes?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Your Spotlight choice has changes that are not saved yet.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { void save(); }} disabled={saving}>Save</Button>
              <Button size="sm" variant="outline" onClick={discard}>Discard</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmClose(false)} autoFocus>Keep editing</Button>
            </div>
          </div>
        )}
        <p className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`} aria-live="polite" data-testid="spotlight-status">
          {statusText}
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" className="h-11 rounded-full px-5" onClick={discard} disabled={saving}>Cancel</Button>
          <Button className="h-11 rounded-full px-6" onClick={() => { void save(); }} disabled={saving || (!isDirty && !error && !!showroomId)}>
            {saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />Saving…</> : error ? 'Try again' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
