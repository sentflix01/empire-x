'use client';
/**
 * Studio: choose what the business card's Spotlight shows in the feeds and on
 * the owner's profile. Three choices:
 *   - Automatic (default): the best selling section, picked by priority.
 *   - Choose sections: pick ANY section the user has added to the page.
 *   - Off: no spotlight.
 */
import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '@/api/client';
import { getSectionType } from '@/lib/builderSections';
import { SPOTLIGHT_LABELS } from '@/lib/spotlight';

type StoredMode = 'single' | 'carousel' | 'off' | null;
type Choice = 'auto' | 'chosen' | 'off';

export interface FeedSpotlightPanelProps {
  showroomId: string;
  activeSections: string[];
  initialMode: StoredMode;
  initialSectionIds: string[];
  initialCarouselCount: number;
  themeColor: string;
  onClose: () => void;
  onSaved: (mode: StoredMode, sectionIds: string[], carouselCount: number) => void;
}

const choiceOf = (mode: StoredMode, ids: string[]): Choice =>
  mode === 'off' ? 'off' : (mode === 'single' || mode === 'carousel') && ids.length > 0 ? 'chosen' : 'auto';

// Sections that don't make sense in a spotlight card (purely structural/utility)
const SPOTLIGHT_EXCLUDED = new Set(['feed_ticker', 'save_showroom', 'hero', 'cta', 'payment_info', 'social', 'newsletter', 'map', 'contact', 'hours']);

export default function FeedSpotlightPanel({
  showroomId, activeSections, initialMode, initialSectionIds, onClose, onSaved,
}: FeedSpotlightPanelProps) {
  // Show ALL active sections except structural ones — not just the old SPOTLIGHT_PRIORITY subset
  const options = activeSections.filter((t) => !SPOTLIGHT_EXCLUDED.has(t));

  const [choice, setChoice] = useState<Choice>(choiceOf(initialMode, initialSectionIds));
  const [sectionIds, setSectionIds] = useState<string[]>(
    initialSectionIds.filter((id) => options.includes(id)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = useRef(false);

  const stored = (): { mode: StoredMode; ids: string[] } => {
    if (choice === 'off') return { mode: 'off', ids: [] };
    if (choice === 'auto' || sectionIds.length === 0) return { mode: null, ids: [] };
    // Preserve the order the user checked them
    return { mode: sectionIds.length > 1 ? 'carousel' : 'single', ids: sectionIds };
  };

  useEffect(() => {
    if (!showroomId || !dirty.current) return;
    const timer = setTimeout(async () => {
      const { mode, ids } = stored();
      setSaving(true);
      setError('');
      try {
        await apiFetch(`/api/showrooms/${showroomId}/spotlight`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spotlight_mode: mode, spotlight_section_ids: ids, spotlight_carousel_count: 1 }),
        });
        onSaved(mode, ids, 1);
      } catch {
        setError('Could not save. Check your connection and change the setting again.');
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, sectionIds, showroomId]);

  const pick = (next: Choice) => { dirty.current = true; setChoice(next); };
  const toggle = (type: string) => {
    dirty.current = true;
    setSectionIds((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };
  const labelFor = (type: string) =>
    getSectionType(type)?.label ?? SPOTLIGHT_LABELS[type] ?? type;

  const radio = (value: Choice, title: string, hint: string) => (
    <label className="flex items-start gap-3 min-h-11 text-sm cursor-pointer rounded-xl px-2 py-1.5 hover:bg-secondary">
      <input type="radio" name="spotlight-choice" value={value} checked={choice === value}
        onChange={() => pick(value)} className="accent-primary mt-1" />
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );

  return (
    <div className="flex flex-col h-full bg-card overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-base font-bold">Spotlight</h2>
        <button type="button" onClick={onClose} aria-label="Close Spotlight settings"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-5">
        <p className="text-xs text-muted-foreground">
          Your Spotlight shows a preview of your page on your business card in the feeds. Pick any section you want visitors to see first.
        </p>

        <fieldset className="space-y-1">
          <legend className="text-sm font-semibold mb-1">What to show</legend>
          {radio('auto', 'Automatic', 'We show your best section automatically — products first, then menu, services, gallery, and more.')}
          {radio('chosen', 'Choose sections', 'Pick one to always show it, or several to play as a slideshow.')}
          {radio('off', 'Off', 'No Spotlight on your card.')}
        </fieldset>

        {choice === 'chosen' && (
          <fieldset className="space-y-1">
            <legend className="text-sm font-semibold mb-1">
              Sections from your page
              <span className="ml-2 text-xs font-normal text-muted-foreground">({options.length} available)</span>
            </legend>
            {options.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add sections to your page first — then choose which ones to spotlight here.
              </p>
            )}
            {options.map((type) => (
              <label key={type} className="flex items-center gap-3 min-h-11 text-sm cursor-pointer rounded-xl px-2 hover:bg-secondary">
                <input type="checkbox" checked={sectionIds.includes(type)} onChange={() => toggle(type)}
                  className="accent-primary w-4 h-4 shrink-0" />
                <span className="font-medium">{labelFor(type)}</span>
              </label>
            ))}
            {options.length > 0 && sectionIds.length === 0 && (
              <p className="text-xs text-muted-foreground">Nothing chosen yet — Automatic applies.</p>
            )}
          </fieldset>
        )}

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {error || (saving ? 'Saving…' : 'Saved automatically')}
        </p>
      </div>
    </div>
  );
}
