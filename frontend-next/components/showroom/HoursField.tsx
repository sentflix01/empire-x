'use client';
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_WEEK, readOpeningHours, type DayHours } from '@/lib/openingHours';

/** Studio's weekly hours picker: a switch per day and two time boxes. */
export default function HoursField({ id, value, onChange }: { id: string; value: unknown; onChange: (v: DayHours[]) => void }) {
  const week = readOpeningHours(value) ?? DEFAULT_WEEK;
  const set = (i: number, patch: Partial<DayHours>) => onChange(week.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <fieldset id={id} className="space-y-1.5">
      <legend className="sr-only">Opening hours</legend>
      {!readOpeningHours(value) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          <span>Not set yet. These are usual hours.</span>
          <button type="button" onClick={() => onChange(DEFAULT_WEEK)} className="min-h-9 rounded-full bg-amber-500 px-3 font-semibold text-white">Use these hours</button>
        </div>
      )}
      {week.map((d, i) => (
        <div key={d.day} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 px-2.5 py-1.5">
          <label className="flex min-h-10 w-32 items-center gap-2 text-sm font-medium">
            <Switch checked={d.open} onCheckedChange={(open: boolean) => set(i, { open })} aria-label={`Open on ${d.day}`} />
            {d.day.slice(0, 3)}
          </label>
          {d.open ? (
            <span className="flex items-center gap-1 text-sm">
              <input type="time" value={d.from} onChange={(e) => set(i, { from: e.target.value })} aria-label={`${d.day} opens at`}
                className="min-h-10 rounded-lg border border-border/60 bg-card px-2 dark:bg-background" />
              <span aria-hidden="true">–</span>
              <input type="time" value={d.to} onChange={(e) => set(i, { to: e.target.value })} aria-label={`${d.day} closes at`}
                className="min-h-10 rounded-lg border border-border/60 bg-card px-2 dark:bg-background" />
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Closed</span>
          )}
        </div>
      ))}
    </fieldset>
  );
}
