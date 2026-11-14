'use client';
import React, { useEffect, useState } from 'react';
import { Check, Expand, FolderOpen, Monitor, MoreHorizontal, Palette, Smartphone, Tablet, Trash2, Zap } from 'lucide-react';
import { COLOR_PRESETS } from '@/lib/builderSections';
import { contrastRatio } from '@/lib/contrast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { FONT_OPTIONS, siteFontFamily } from '@/lib/siteFonts';

export { FONT_OPTIONS } from '@/lib/siteFonts';
export type PreviewMode = 'desktop' | 'tablet' | 'mobile';

const triggerClass = 'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary';
const panelClass = 'w-[min(20rem,calc(100vw-1.5rem))] space-y-4 p-4';

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

export interface StyleMenuProps {
  colors: [string, string];
  onColors: (c1: string, c2: string) => void;
  font: string;
  onFont: (font: string) => void;
  darkEditor: boolean;
  onDarkEditor: (v: boolean) => void;
  whatsapp: boolean;
  onWhatsapp: (v: boolean) => void;
  previewMode: PreviewMode;
  onPreviewMode: (m: PreviewMode) => void;
}

/** Colours, lettering, and how the editor looks: big targets, no colour codes. */
export function StyleMenu(p: StyleMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClass} aria-label="Style: colours and lettering">
          <Palette className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Style</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className={panelClass}>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Colours</legend>
          <div className="grid grid-cols-5 gap-2">
            {COLOR_PRESETS.map(([c1, c2], i) => {
              const selected = sameColour(p.colors[0], c1) && sameColour(p.colors[1], c2);
              return (
                <button key={i} type="button" onClick={() => p.onColors(c1, c2)} aria-label={`Colour ${i + 1}`} aria-pressed={selected}
                  style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
                  className={`flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 ring-offset-background ${selected ? 'ring-2 ring-foreground' : 'ring-1 ring-border'}`}>
                  {selected && <Check className="h-4 w-4 text-white drop-shadow" aria-hidden="true" />}
                </button>
              );
            })}
            {/* The site's own colours when they are not a preset (a template's colours or the owner's pick). */}
            {!COLOR_PRESETS.some(([c1, c2]) => sameColour(p.colors[0], c1) && sameColour(p.colors[1], c2)) && (
              <span role="img" aria-label="Your colours (selected)" data-testid="custom-colour-swatch"
                style={{ background: `linear-gradient(135deg,${p.colors[0]},${p.colors[1]})` }}
                className="flex h-11 w-11 items-center justify-center rounded-full ring-2 ring-foreground ring-offset-2 ring-offset-background">
                <Check className="h-4 w-4 text-white drop-shadow" aria-hidden="true" />
              </span>
            )}
          </div>
          <CustomColours colors={p.colors} onColors={p.onColors} />
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Lettering</legend>
          <div className="space-y-1.5">
            {FONT_OPTIONS.map((f) => (
              <button key={f} type="button" onClick={() => p.onFont(f)} aria-pressed={p.font === f}
                style={{ fontFamily: siteFontFamily(f) }}
                className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 text-left text-base ${p.font === f ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}>
                {f}{p.font === f && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Preview size</legend>
          <div className="grid grid-cols-3 gap-1.5">
            {([['desktop', Monitor, 'Computer'], ['tablet', Tablet, 'Tablet'], ['mobile', Smartphone, 'Phone']] as const).map(([m, Icon, label]) => (
              <button key={m} type="button" onClick={() => p.onPreviewMode(m)} aria-pressed={p.previewMode === m}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs ${p.previewMode === m ? 'border-primary bg-primary/5 font-semibold' : 'border-border hover:bg-secondary'}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />{label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="border-t border-border pt-2">
          <ToggleRow label="WhatsApp button" hint="A round chat button on your site" checked={p.whatsapp} onChange={p.onWhatsapp} />
          <ToggleRow label="Dark editor" hint="Only changes Studio, not your site" checked={p.darkEditor} onChange={p.onDarkEditor} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

const HEX6 = /^#[0-9a-f]{6}$/i;
const sameColour = (a: string, b: string) => String(a).toLowerCase() === String(b).toLowerCase();

/** One colour: the system colour picker plus its hex code, typed or pasted. */
function ColourField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  const valid = HEX6.test(text.trim());
  const id = `colour-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const commit = () => { const v = text.trim(); if (HEX6.test(v)) onChange(v.toLowerCase()); else setText(value); };
  return (
    <div className="flex items-center gap-2">
      <input type="color" aria-label={`${label}: pick a colour`} value={HEX6.test(value) ? value.toLowerCase() : '#2563eb'}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-11 shrink-0 cursor-pointer rounded-full border border-border bg-transparent p-0.5 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0 [&::-moz-color-swatch]:rounded-full" />
      <label htmlFor={id} className="sr-only">{label} code</label>
      <input id={id} type="text" inputMode="text" spellCheck={false} maxLength={7} value={text}
        onChange={(e) => setText(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
        onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
        aria-invalid={!valid}
        className={`h-11 w-full min-w-0 rounded-xl border bg-background px-3 font-mono text-sm uppercase ${valid ? 'border-border' : 'border-destructive'}`} />
    </div>
  );
}

/**
 * Any colours the owner wants (audit 2026-11-14: only ten presets existed).
 * Light colours still work: the site darkens them behind white text so it
 * stays readable (lib/contrast fillForWhiteText).
 */
function CustomColours({ colors, onColors }: { colors: [string, string]; onColors: (c1: string, c2: string) => void }) {
  const [one, setOne] = useState(sameColour(colors[0], colors[1]));
  const light = [colors[0], one ? colors[0] : colors[1]].some((c) => HEX6.test(c) && contrastRatio(c, '#ffffff') < 3);
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border p-3" data-testid="custom-colours">
      <p className="text-xs font-semibold">Your colours</p>
      <ColourField label="Colour 1" value={colors[0]} onChange={(c) => onColors(c, one ? c : colors[1])} />
      {!one && <ColourField label="Colour 2" value={colors[1]} onChange={(c) => onColors(colors[0], c)} />}
      <ToggleRow label="Use one colour" hint="No gradient: the same colour everywhere" checked={one}
        onChange={(v) => { setOne(v); if (v) onColors(colors[0], colors[0]); }} />
      {light && (
        <p className="text-[11px] text-muted-foreground">
          This is a light colour. Behind white text we darken it slightly, so your words stay easy to read.
        </p>
      )}
    </div>
  );
}

export interface MoreMenuProps {
  /** Business picker and visibility, when the owner has them. */
  businessControls?: React.ReactNode;
  onLoad: () => void;
  onClear: () => void;
  onFullPreview: () => void;
  onFeedSpotlight?: () => void;
}

/** Less frequent actions. Websites are published only on NodBusiness, so there is no export. */
export function MoreMenu({ businessControls, onLoad, onClear, onFullPreview, onFeedSpotlight }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const item = 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-secondary';
  const run = (fn: () => void) => () => { fn(); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmClear(false); }}>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClass} aria-label="More options">
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">More</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className={`${panelClass} space-y-1`}>
        {businessControls && <div className="space-y-2 border-b border-border pb-3">{businessControls}</div>}
        {onFeedSpotlight && (
          <button type="button" className={item} onClick={run(onFeedSpotlight)}>
            <Zap className="h-4 w-4" aria-hidden="true" />Feed Spotlight Preview
          </button>
        )}
        <button type="button" className={item} onClick={run(onLoad)}><FolderOpen className="h-4 w-4" aria-hidden="true" />Load saved draft</button>
        <button type="button" className={item} onClick={run(onFullPreview)}><Expand className="h-4 w-4" aria-hidden="true" />Full-screen preview</button>
        {confirmClear ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive-subtle p-3 text-sm">
            <p className="font-medium text-destructive-subtle-foreground">Start over? Your words and photos here will be cleared.</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={run(onClear)} className="min-h-10 flex-1 rounded-full bg-destructive px-3 text-sm font-semibold text-white hover:bg-destructive/90">Clear</button>
              <button type="button" onClick={() => setConfirmClear(false)} className="min-h-10 flex-1 rounded-full border border-border bg-background px-3 text-sm">Keep</button>
            </div>
          </div>
        ) : (
          <button type="button" className={`${item} text-destructive hover:bg-destructive-subtle`} onClick={() => setConfirmClear(true)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />Clear draft
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
