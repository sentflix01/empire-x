'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Check, Expand, FolderOpen, Monitor, MoreHorizontal, Palette, Smartphone, Tablet, HelpCircle, Save, Sparkles, Trash2, Zap } from 'lucide-react';
import { COLOR_PRESETS } from '@/lib/builderSections';
import { COLOUR_PALETTE, colourName } from '@/lib/colourNames';
import { contrastRatio } from '@/lib/contrast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { FONT_OPTIONS, siteFontFamily } from '@/lib/siteFonts';

export { FONT_OPTIONS } from '@/lib/siteFonts';
export type PreviewMode = 'desktop' | 'tablet' | 'mobile';

const triggerClass = 'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-secondary';
// Scrolls inside the space Radix measures, so a long menu never runs off a short screen.
const panelClass = 'w-[min(21rem,calc(100vw-1.5rem))] max-h-[min(var(--radix-popover-content-available-height,80dvh),calc(100dvh-1rem))] overflow-y-auto overscroll-contain space-y-4 p-4';

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

/**
 * One colour, chosen by sight and name — no codes needed (owner, 15 Nov 2026:
 * "users have no idea of the colour code"). The row shows the colour and its
 * name in words; Change opens a grid of named colours (one column per colour
 * family, light to dark), the device's full picker for anything else, and —
 * folded away — a brand colour code for companies that have one.
 */
function ColourChoice({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const valid = HEX6.test(text.trim());
  const slug = label.replace(/\s+/g, '-').toLowerCase();
  const current = HEX6.test(value) ? value.toLowerCase() : '#2563eb';
  const commit = () => { const v = text.trim(); if (HEX6.test(v)) onChange(v.toLowerCase()); else setText(value); };
  const selectedIndex = COLOUR_PALETTE.findIndex((c) => c.hex === current);
  // Families are columns (8), shades are rows; neutrals are the last row.
  const COLS = 8;
  const ordered = [
    ...[0, 1, 2, 3].flatMap((row) => COLOUR_PALETTE.filter((c) => c.shade !== 'neutral').filter((_, i) => i % 4 === row)),
    ...COLOUR_PALETTE.filter((c) => c.shade === 'neutral'),
  ];
  const focusAt = (i: number) => gridRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[i]?.focus();
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = ordered.length;
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'ArrowDown' ? i + COLS : e.key === 'ArrowUp' ? i - COLS : -1;
    if (next < 0 && !['ArrowLeft', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const j = Math.max(0, Math.min(n - 1, next));
    focusAt(j);
    onChange(ordered[j].hex);
  };
  const tabStop = Math.max(0, ordered.findIndex((c) => c.hex === current));
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-full ring-1 ring-border" style={{ background: current }} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-medium">{label}</p>
          <p className="truncate text-xs text-muted-foreground" data-testid={`${slug}-name`}>{colourName(current)}</p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={`${slug}-grid`}
          aria-label={`${open ? 'Done' : 'Change'} ${label.toLowerCase()}`}
          className="inline-flex h-9 shrink-0 items-center rounded-full border border-border bg-background px-3 text-sm font-medium hover:bg-secondary">
          {open ? 'Done' : 'Change'}
        </button>
      </div>
      {open && (
        <div id={`${slug}-grid`} className="space-y-2 rounded-xl bg-secondary/40 p-2">
          <div ref={gridRef} role="radiogroup" aria-label={`${label}: pick a colour`} className="grid grid-cols-8 gap-1.5">
            {ordered.map((c, i) => {
              const on = c.hex === current;
              return (
                <button key={c.hex} type="button" role="radio" aria-checked={on} aria-label={c.name} title={c.name}
                  tabIndex={i === tabStop ? 0 : -1} onKeyDown={(e) => onKey(e, i)} onClick={() => onChange(c.hex)}
                  style={{ background: c.hex }}
                  className={`flex h-7 w-7 items-center justify-center justify-self-center rounded-full ring-offset-1 ring-offset-background ${on ? 'ring-2 ring-foreground' : 'ring-1 ring-black/10'}`}>
                  {on && <Check className="h-3.5 w-3.5 text-white drop-shadow" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {selectedIndex < 0 && <p className="text-xs text-muted-foreground">Your colour now: {colourName(current)} (not in the grid).</p>}
          {/* The device's full colour picker, for any colour at all. */}
          <label className="relative flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm font-medium hover:bg-background">
            <Palette className="h-4 w-4" aria-hidden="true" />Any other colour…
            <input type="color" value={current} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: any other colour`}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
          </label>
          <button type="button" onClick={() => setShowCode((v) => !v)} aria-expanded={showCode}
            className="w-full text-left text-xs font-medium text-muted-foreground underline-offset-2 hover:underline">
            Have a brand colour code?
          </button>
          {showCode && (
            <div>
              <label htmlFor={`colour-${slug}`} className="sr-only">{label} code</label>
              <input id={`colour-${slug}`} type="text" inputMode="text" spellCheck={false} maxLength={7} value={text} placeholder="#2563EB"
                onChange={(e) => setText(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
                onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
                aria-invalid={!valid} aria-describedby={`colour-${slug}-hint`}
                className={`h-10 w-full min-w-0 rounded-lg border bg-background px-3 font-mono text-sm uppercase ${valid ? 'border-border' : 'border-destructive'}`} />
              <p id={`colour-${slug}-hint`} className="mt-1 text-[11px] text-muted-foreground">Six letters or numbers after #, e.g. #2563EB.</p>
            </div>
          )}
        </div>
      )}
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
      {/* How they look together on the site. */}
      <div aria-hidden="true" className="h-3 rounded-full" style={{ background: `linear-gradient(90deg,${colors[0]},${one ? colors[0] : colors[1]})` }} />
      <ColourChoice label="Main colour" value={colors[0]} onChange={(c) => onColors(c, one ? c : colors[1])} />
      {!one && <ColourChoice label="Second colour" value={colors[1]} onChange={(c) => onColors(colors[0], c)} />}
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
  /** Phones: Save draft lives here (the top bar has no room). */
  onSaveDraft?: () => void;
}

/** Less frequent actions. Websites are published only on NodBusiness, so there is no export. */
export function MoreMenu({ businessControls, onLoad, onClear, onFullPreview, onFeedSpotlight, onSaveDraft }: MoreMenuProps) {
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
            <Zap className="h-4 w-4" aria-hidden="true" />Feed Spotlight
          </button>
        )}
        {onSaveDraft && (
          <button type="button" className={`${item} sm:hidden`} onClick={run(onSaveDraft)}><Save className="h-4 w-4" aria-hidden="true" />Save draft</button>
        )}
        <button type="button" className={item} onClick={run(onLoad)}><FolderOpen className="h-4 w-4" aria-hidden="true" />Load saved draft</button>
        <button type="button" className={item} onClick={run(onFullPreview)}><Expand className="h-4 w-4" aria-hidden="true" />Full-screen preview</button>
        <button type="button" className={`${item} lg:hidden`} onClick={run(() => window.dispatchEvent(new Event('nodbusiness:open-page-guide')))}>
          <HelpCircle className="h-4 w-4" aria-hidden="true" />Page guide
        </button>
        <button type="button" className={`${item} lg:hidden`} onClick={run(() => window.dispatchEvent(new Event('nodbusiness:open-assistant')))}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />Ask Nodbusiness AI
        </button>
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
