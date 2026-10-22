'use client';
import React, { useState } from 'react';
import { Check, Expand, FolderOpen, Monitor, MoreHorizontal, Palette, Save, Smartphone, Tablet, Trash2, Zap } from 'lucide-react';
import { COLOR_PRESETS } from '@/lib/builderSections';
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
              const selected = p.colors[0] === c1 && p.colors[1] === c2;
              return (
                <button key={i} type="button" onClick={() => p.onColors(c1, c2)} aria-label={`Colour ${i + 1}`} aria-pressed={selected}
                  style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
                  className={`flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 ring-offset-background ${selected ? 'ring-2 ring-foreground' : 'ring-1 ring-border'}`}>
                  {selected && <Check className="h-4 w-4 text-white drop-shadow" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
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

export interface MoreMenuProps {
  /** Business picker and visibility, when the owner has them. */
  businessControls?: React.ReactNode;
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
  onFullPreview: () => void;
  onFeedSpotlight?: () => void;
}

/** Less frequent actions. Websites are published only on NodBusiness, so there is no export. */
export function MoreMenu({ businessControls, onSave, onLoad, onClear, onFullPreview, onFeedSpotlight }: MoreMenuProps) {
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
        <button type="button" className={item} onClick={run(onSave)}><Save className="h-4 w-4" aria-hidden="true" />Save draft</button>
        <button type="button" className={item} onClick={run(onLoad)}><FolderOpen className="h-4 w-4" aria-hidden="true" />Load saved draft</button>
        <button type="button" className={item} onClick={run(onFullPreview)}><Expand className="h-4 w-4" aria-hidden="true" />Full-screen preview</button>
        {confirmClear ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-500/30 dark:bg-red-500/10">
            <p className="font-medium text-red-900 dark:text-red-100">Start over? Your words and photos here will be cleared.</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={run(onClear)} className="min-h-10 flex-1 rounded-full bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700">Clear</button>
              <button type="button" onClick={() => setConfirmClear(false)} className="min-h-10 flex-1 rounded-full border border-border bg-background px-3 text-sm">Keep</button>
            </div>
          </div>
        ) : (
          <button type="button" className={`${item} text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10`} onClick={() => setConfirmClear(true)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />Clear draft
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
