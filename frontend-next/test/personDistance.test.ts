import { describe, it, expect } from 'vitest';
import { formatPersonDistance } from '@/lib/personDistance';

describe('formatPersonDistance', () => {
  it('shows the floor bucket as "< 0.5 km"', () => {
    expect(formatPersonDistance(0.5)).toBe('< 0.5 km away');
    expect(formatPersonDistance(0)).toBe('< 0.5 km away');
  });

  it('shows larger distances in 0.5 km steps, never in metres', () => {
    expect(formatPersonDistance(1)).toBe('≈ 1 km away');
    expect(formatPersonDistance(2.5)).toBe('≈ 2.5 km away');
    // A finer value (for example from people search) is rounded up too.
    expect(formatPersonDistance(2.3)).toBe('≈ 2.5 km away');
    expect(formatPersonDistance(0.7)).toBe('≈ 1 km away');
  });

  it('returns null without a usable distance', () => {
    expect(formatPersonDistance(null)).toBeNull();
    expect(formatPersonDistance(undefined)).toBeNull();
    expect(formatPersonDistance(NaN)).toBeNull();
  });
});
