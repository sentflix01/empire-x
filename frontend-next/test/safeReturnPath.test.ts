import { describe, expect, it } from 'vitest';
import { safeReturnPath } from '@/lib/safeReturnPath';

describe('safeReturnPath', () => {
  it('keeps same-origin paths with query and hash', () => {
    expect(safeReturnPath('/showroom/abc?tab=items#top')).toBe('/showroom/abc?tab=items#top');
    expect(safeReturnPath('/feed')).toBe('/feed');
  });

  it.each([
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    'https://evil.com',
    'evil.com',
    '',
  ])('falls back for %j', (raw) => {
    expect(safeReturnPath(raw)).toBe('/feed');
  });

  it('falls back for missing values and honours a custom fallback', () => {
    expect(safeReturnPath(null)).toBe('/feed');
    expect(safeReturnPath(undefined, '')).toBe('');
  });
});
