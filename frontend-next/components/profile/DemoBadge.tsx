// @ts-check
import React from 'react';

/**
 * DemoBadge — small badge that marks AI-generated demo/seed accounts.
 *
 * Usage:
 *   {profile.is_seed && <DemoBadge />}
 */
export function DemoBadge() {
  return (
    <span
      aria-label="AI-generated demo account"
      className="bg-primary-subtle text-primary-subtle-foreground text-xs font-semibold px-1.5 py-0.5 rounded"
    >
      Demo
    </span>
  );
}
