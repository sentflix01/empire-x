import { describe, expect, it } from 'vitest';
import { formatAmount } from '@/lib/money';

describe('formatAmount', () => {
  it('formats decimal strings from the API like numbers', () => {
    expect(formatAmount('1500000.00')).toBe((1500000).toLocaleString());
    expect(formatAmount('100.00')).toBe('100');
    expect(formatAmount('99.5')).toBe((99.5).toLocaleString(undefined, { maximumFractionDigits: 2 }));
    expect(formatAmount(2500)).toBe((2500).toLocaleString());
  });
  it('returns nothing for missing or invalid amounts', () => {
    for (const v of [null, undefined, '', 'abc']) expect(formatAmount(v as never)).toBe('');
  });
});
