'use client';
/**
 * Who can view a business, its site and its products
 * (docs/decisions/platform-model-decisions.md §2 and §7). The server enforces
 * the choice; this only lets the owner make it.
 */
import { Globe, Lock } from 'lucide-react';

export type BusinessVisibility = 'public' | 'private';

export const VISIBILITY_OPTIONS: ReadonlyArray<{ value: BusinessVisibility; label: string; help: string }> = [
  { value: 'public', label: 'Public', help: 'Anyone can open it from a QR code or link and buy without an account. It can appear in search engines.' },
  { value: 'private', label: 'Private', help: 'Only signed-in users can view it and buy. Hidden from guests, guest feeds and search engines.' },
];

export function asVisibility(value: unknown): BusinessVisibility {
  return value === 'private' ? 'private' : 'public';
}

/** Full radio group for forms. */
export function VisibilityFieldset({ value, onChange, disabled }: { value: BusinessVisibility; onChange: (v: BusinessVisibility) => void; disabled?: boolean }) {
  return (
    <fieldset className="rounded-xl border border-border/50 p-3" disabled={disabled}>
      <legend className="px-1 text-sm font-medium">Who can view this business</legend>
      {VISIBILITY_OPTIONS.map((option) => {
        const Icon = option.value === 'public' ? Globe : Lock;
        return (
          <label key={option.value} className="flex cursor-pointer items-start gap-2 rounded-lg py-1.5 text-sm">
            <input type="radio" name="business-visibility" className="mt-1" value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
            <span>
              <span className="flex items-center gap-1 font-medium"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.help}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** Compact select for toolbars. */
export function VisibilitySelect({ value, onChange, disabled }: { value: BusinessVisibility; onChange: (v: BusinessVisibility) => void; disabled?: boolean }) {
  return (
    <select
      aria-label="Who can view this website"
      title={VISIBILITY_OPTIONS.find((o) => o.value === value)?.help}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(asVisibility(event.target.value))}
      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
    >
      <option value="public">Public</option>
      <option value="private">Private (sign-in)</option>
    </select>
  );
}
