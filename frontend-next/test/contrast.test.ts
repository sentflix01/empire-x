/** Business colours stay readable (audit F-041, WCAG 1.4.3). */
import { describe, it, expect } from 'vitest';
import { contrastRatio, readableOn, fillForWhiteText, themeTextStyle } from '@/lib/contrast';

describe('contrast helpers', () => {
  it('measures WCAG contrast', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#d4af37', '#ffffff')).toBeCloseTo(2.1, 1);
  });

  it.each(['#D4AF37', '#fe9a00', '#22c55e', '#06B6D4', '#ffff00', '#2563EB', '#0F172A'])('%s becomes readable on white, under white text and on the dark card', (c) => {
    expect(contrastRatio(readableOn(c), '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#ffffff', fillForWhiteText(c))).toBeGreaterThanOrEqual(4.5);
    const style = themeTextStyle(c) as Record<string, string>;
    expect(contrastRatio(style['--biz-text-dark'], '#141b2e')).toBeGreaterThanOrEqual(4.5);
  });

  it('leaves colours that already pass unchanged', () => {
    expect(readableOn('#2563eb')).toBe('#2563eb');
    expect(fillForWhiteText('#0f172a')).toBe('#0f172a');
  });

  it('passes through values it cannot read', () => {
    expect(readableOn('rgb(1,2,3)')).toBe('rgb(1,2,3)');
    expect(readableOn(undefined)).toBe('');
  });
});
