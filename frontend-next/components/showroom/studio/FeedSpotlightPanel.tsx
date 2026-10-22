'use client';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { apiFetch } from '@/api/client';
import { getSectionType } from '@/lib/builderSections';

export interface FeedSpotlightPanelProps {
  showroomId: string;
  activeSections: string[];
  initialMode: 'single' | 'carousel' | null;
  initialSectionIds: string[];
  initialCarouselCount: number;
  themeColor: string;
  onClose: () => void;
  onSaved: (mode: 'single' | 'carousel' | null, sectionIds: string[], carouselCount: number) => void;
}

type SpotlightMode = 'off' | 'single' | 'carousel';

export default function FeedSpotlightPanel({
  showroomId,
  activeSections,
  initialMode,
  initialSectionIds,
  initialCarouselCount,
  onClose,
  onSaved,
}: FeedSpotlightPanelProps) {
  const [mode, setMode] = useState<SpotlightMode>(initialMode ?? 'off');
  const [sectionIds, setSectionIds] = useState<string[]>(initialSectionIds);
  const [carouselCount, setCarouselCount] = useState(initialCarouselCount || 1);
  const [saving, setSaving] = useState(false);

  const maxCount = Math.max(1, sectionIds.length);

  // Auto-save with 800ms debounce
  useEffect(() => {
    if (!showroomId) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        await apiFetch(`/api/showrooms/${showroomId}/spotlight`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spotlight_mode: mode === 'off' ? null : mode,
            spotlight_section_ids: sectionIds,
            spotlight_carousel_count: carouselCount,
          }),
        });
        onSaved(mode === 'off' ? null : mode, sectionIds, carouselCount);
      } catch {
        // best-effort: the user can retry by toggling
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sectionIds, carouselCount, showroomId]);

  const toggleSection = (key: string) => {
    setSectionIds(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleCarouselCount = (v: number) => {
    setCarouselCount(Math.min(Math.max(1, v), maxCount));
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="text-base font-bold">Feed Spotlight</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Feed Spotlight"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-5">
        {/* On/off toggle */}
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>
            <span className="font-medium">Spotlight on</span>
            <span className="block text-xs text-muted-foreground">Show a section preview below your feed card</span>
          </span>
          <Switch
            checked={mode !== 'off'}
            onCheckedChange={(v) => setMode(v ? 'single' : 'off')}
            aria-label="Enable Feed Spotlight"
          />
        </label>

        {mode !== 'off' && (
          <>
            {/* Mode picker */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Display mode</legend>
              <label className="flex items-center gap-3 min-h-10 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="spotlight-mode"
                  value="single"
                  checked={mode === 'single'}
                  onChange={() => setMode('single')}
                  className="accent-primary"
                />
                <span>
                  <span className="font-medium">Single section</span>
                  <span className="block text-xs text-muted-foreground">Show one section only</span>
                </span>
              </label>
              <label className="flex items-center gap-3 min-h-10 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="spotlight-mode"
                  value="carousel"
                  checked={mode === 'carousel'}
                  onChange={() => setMode('carousel')}
                  className="accent-primary"
                />
                <span>
                  <span className="font-medium">Carousel</span>
                  <span className="block text-xs text-muted-foreground">Cycle through multiple sections automatically</span>
                </span>
              </label>
            </fieldset>

            {/* Section checkboxes */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Sections to spotlight</legend>
              <p className="text-xs text-muted-foreground">Check the sections you want to show followers.</p>
              {activeSections.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No sections active yet.</p>
              )}
              <div className="space-y-1">
                {activeSections.map((key) => {
                  const st = getSectionType(key);
                  const label = st?.label ?? key;
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-3 min-h-10 text-sm cursor-pointer rounded-xl px-2 hover:bg-secondary transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={sectionIds.includes(key)}
                        onChange={() => toggleSection(key)}
                        className="accent-primary w-4 h-4 shrink-0"
                      />
                      <span className="font-medium">{label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Carousel count — only shown in carousel mode */}
            {mode === 'carousel' && (
              <label className="flex items-center justify-between gap-3 text-sm min-h-10">
                <span>
                  <span className="font-medium">Visible at once</span>
                  <span className="block text-xs text-muted-foreground">Number of panels shown per screen (max {maxCount})</span>
                </span>
                <input
                  type="number"
                  min={1}
                  max={maxCount}
                  value={carouselCount}
                  onChange={(e) => handleCarouselCount(parseInt(e.target.value, 10) || 1)}
                  className="w-16 h-9 rounded-xl border border-border bg-background px-2 text-sm text-center"
                />
              </label>
            )}

            {/* Save indicator */}
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {saving ? 'Saving…' : 'Saved automatically'}
            </p>
          </>
        )}

        {mode === 'off' && (
          <p className="text-sm text-muted-foreground">
            Turn on spotlight to highlight a section of your showroom directly in the business feed.
          </p>
        )}
      </div>
    </div>
  );
}
