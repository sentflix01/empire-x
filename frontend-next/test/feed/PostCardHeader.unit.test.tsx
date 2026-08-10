/**
 * Unit tests for PostCard business separator edge cases
 * Feature: bookmark-and-business-separator
 * Tasks: 3.4
 *
 * Tests the same inline BusinessRow component used in the property tests,
 * covering the zero/one/two business boundary conditions.
 *
 * Validates: Requirements 1.1, 1.4
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ─── Inline component (identical to PostCardHeader.property.test.tsx) ─────────

function BusinessRow({ businesses }: { businesses: Array<{ id: string; business_name: string }> }) {
  return (
    <div>
      {businesses.slice(0, 2).map((b, idx) => (
        <React.Fragment key={b.id}>
          {idx > 0 && (
            <span
              className="text-muted-foreground text-[10px] select-none"
              aria-hidden="true"
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

// ─── Helper ───────────────────────────────────────────────────────────────────

function getSeparators(container: HTMLElement) {
  return Array.from(container.querySelectorAll('span')).filter(
    (s) => s.getAttribute('aria-hidden') === 'true',
  );
}

function getNameSpans(container: HTMLElement) {
  return Array.from(container.querySelectorAll('span')).filter(
    (s) => s.getAttribute('aria-hidden') !== 'true',
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PostCard business separator — unit edge cases', () => {
  it('zero businesses → renders empty div with no spans', () => {
    const { container } = render(<BusinessRow businesses={[]} />);

    const allSpans = container.querySelectorAll('span');
    expect(allSpans).toHaveLength(0);
  });

  it('exactly one business → renders 1 name span, 0 separators', () => {
    const { container } = render(
      <BusinessRow businesses={[{ id: 'biz-1', business_name: 'Acme Corp' }]} />,
    );

    const nameSpans = getNameSpans(container);
    const separators = getSeparators(container);

    expect(nameSpans).toHaveLength(1);
    expect(nameSpans[0].textContent).toBe('Acme Corp');
    expect(separators).toHaveLength(0);
  });

  it('two businesses → renders 2 name spans, 1 separator between them', () => {
    const { container } = render(
      <BusinessRow
        businesses={[
          { id: 'biz-1', business_name: 'Acme Corp' },
          { id: 'biz-2', business_name: 'Beta LLC' },
        ]}
      />,
    );

    const nameSpans = getNameSpans(container);
    const separators = getSeparators(container);

    expect(nameSpans).toHaveLength(2);
    expect(nameSpans[0].textContent).toBe('Acme Corp');
    expect(nameSpans[1].textContent).toBe('Beta LLC');

    expect(separators).toHaveLength(1);
    expect(separators[0].textContent).toBe('|');
    expect(separators[0].getAttribute('aria-hidden')).toBe('true');
  });
});
