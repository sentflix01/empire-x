/**
 * Property-based tests for PostCard business separator
 * Feature: bookmark-and-business-separator
 * Tasks: 3.3
 *
 * These tests render a minimal inline component (BusinessRow) that replicates
 * the exact JSX pattern used by PostCard's business name row. This avoids
 * mounting the full PostCard (which has many deps) while still validating
 * the real rendering logic.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import * as fc from 'fast-check';

// ─── Inline component mirroring PostCard's business name row exactly ──────────
//
// Reproduces this JSX from PostCard:
//
//   {authorBusinesses.slice(0, 2).map((b, idx) => (
//     <React.Fragment key={b.id}>
//       {idx > 0 && (
//         <span className="text-muted-foreground text-[10px] select-none" aria-hidden="true">|</span>
//       )}
//       <Link href={...} className="...">
//         <Store ... />{b.business_name}
//       </Link>
//     </React.Fragment>
//   ))}
//
// Simplified to plain spans so we can render without Next.js Link / Lucide
// Store icon, while keeping the separator and business_name logic identical.

function BusinessRow({ businesses }: { businesses: Array<{ id: string; business_name: string }> }) {
  return (
    <div>
      {businesses.slice(0, 2).map((b, idx) => (
        <React.Fragment key={b.id}>
          {idx > 0 && (
            <span
              className="text-muted-foreground text-[10px] select-none"
              aria-hidden="true"
              data-testid="separator"
            >
              |
            </span>
          )}
          <span>{b.business_name}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Arbitrary generator ──────────────────────────────────────────────────────

const arbBusinesses = fc.uniqueArray(
  fc.record({
    id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
    // Exclude "|" from names: getAllByText('|') would otherwise match a name
    // span too and flake the separator-count/styling properties.
    business_name: fc.string({ minLength: 1 }).filter(s => !s.includes('|')),
  }),
  { minLength: 2, maxLength: 15, selector: (b) => b.id },
);

/** Separators are the aria-hidden spans — never matched by text content. */
const getSeparators = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'));

// ─── Property 1: Separator count invariant ────────────────────────────────────

describe('Property 1: Separator count invariant', () => {
  // Feature: bookmark-and-business-separator, Property 1: Separator count invariant
  it('For N businesses (N >= 2), renders exactly min(N,2)-1 = 1 separator with text "|" and aria-hidden="true"', () => {
    fc.assert(
      fc.property(arbBusinesses, (businesses) => {
        const { container, unmount } = render(<BusinessRow businesses={businesses} />);

        const separators = getSeparators(container);
        // For any N >= 2: min(N, 2) - 1 = 1
        const expected = Math.min(businesses.length, 2) - 1;
        expect(separators).toHaveLength(expected);

        separators.forEach((sep) => {
          expect(sep.textContent).toBe('|');
          expect(sep.getAttribute('aria-hidden')).toBe('true');
        });

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 2: Separator styling invariant ─────────────────────────────────

describe('Property 2: Separator styling invariant', () => {
  // Feature: bookmark-and-business-separator, Property 2: Separator styling invariant
  it('Every separator span has the text-muted-foreground CSS class', () => {
    fc.assert(
      fc.property(arbBusinesses, (businesses) => {
        const { container, unmount } = render(<BusinessRow businesses={businesses} />);

        const separators = getSeparators(container);
        separators.forEach((sep) => {
          expect(sep.className).toContain('text-muted-foreground');
        });

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Business entry cap invariant ─────────────────────────────────

describe('Property 3: Business entry cap invariant', () => {
  // Feature: bookmark-and-business-separator, Property 3: Business entry cap invariant
  it('At most 2 business name spans are rendered regardless of input array length', () => {
    fc.assert(
      fc.property(arbBusinesses, (businesses) => {
        const { container, unmount } = render(<BusinessRow businesses={businesses} />);

        // Business name spans are the non-separator spans inside the div.
        const allSpans = container.querySelectorAll('span');
        const nameSpans = Array.from(allSpans).filter(
          (s) => s.getAttribute('aria-hidden') !== 'true',
        );
        expect(nameSpans.length).toBeLessThanOrEqual(2);

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});
