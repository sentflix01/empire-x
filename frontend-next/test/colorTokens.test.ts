/** HEX values in lib/colorTokens.ts match the CSS tokens in app/globals.css (F-046). */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { HEX } from '@/lib/colorTokens';

const css = fs.readFileSync(path.join(__dirname, '..', 'app', 'globals.css'), 'utf8');
const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'));

function hslToRgb(h: number, s: number, l: number): number[] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255));
}
const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const PAIRS: Array<[keyof typeof HEX, string]> = [
  ['primary', 'primary'], ['primarySubtle', 'primary-subtle'], ['brandSecondary', 'brand-secondary'],
  ['success', 'success'], ['warning', 'warning'], ['destructive', 'destructive'], ['rating', 'rating'],
  ['muted', 'muted-foreground'], ['border', 'border'], ['inverse', 'inverse'],
];

describe('colour tokens', () => {
  it.each(PAIRS)('HEX.%s equals --%s (light mode)', (key, cssName) => {
    const m = new RegExp(`--${cssName}:\\s+(\\d+)\\s+(\\d+)%\\s+(\\d+)%`).exec(rootBlock);
    expect(m, `--${cssName} not found`).toBeTruthy();
    const fromCss = hslToRgb(Number(m![1]), Number(m![2]), Number(m![3]));
    const fromTs = hexToRgb(HEX[key]);
    fromCss.forEach((c, i) => expect(Math.abs(c - fromTs[i])).toBeLessThanOrEqual(2));
  });
});
