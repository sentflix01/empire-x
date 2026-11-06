/**
 * Readable versions of colours chosen by businesses (audit F-041, WCAG 1.4.3).
 *
 * A business theme colour such as the default gold #D4AF37 is only 2.1:1 on
 * white. These helpers keep the hue and darken (or, on dark backgrounds,
 * lighten) it just enough to reach 4.5:1. Decorative uses (gradients,
 * borders) keep the original colour.
 */
import type { CSSProperties } from 'react';

type Rgb = [number, number, number];

export const AA_TEXT = 4.5;
const LIGHT_BG = '#ffffff';
const DARK_CARD = '#141b2e'; // hsl(222 39% 13%), the dark theme's card

function parseHex(value: string | null | undefined): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((value ?? '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

const toHex = (rgb: Rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
  const x = parseHex(a); const y = parseHex(b);
  if (!x || !y) return 1;
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

/** The colour mixed toward black (or white) in small steps until it reaches `min` against `against`. */
export function readableOn(color: string | null | undefined, against: string = LIGHT_BG, min = AA_TEXT): string {
  const rgb = parseHex(color);
  const bg = parseHex(against);
  if (!rgb || !bg) return color ?? '';
  const target: Rgb = luminance(bg) > 0.18 ? [0, 0, 0] : [255, 255, 255];
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const mixed = rgb.map((v, i) => v + (target[i] - v) * t) as Rgb;
    if (contrastRatio(toHex(mixed), against) >= min) return toHex(mixed);
  }
  return toHex(target);
}

/** A fill that keeps white text on it readable. */
export function fillForWhiteText(color: string | null | undefined): string {
  return readableOn(color, '#ffffff');
}

/**
 * Style for text in a business colour: readable on light and dark themes.
 * Use with className="biz-text" (defined in app/globals.css).
 */
export function themeTextStyle(color: string | null | undefined): CSSProperties {
  return { '--biz-text': readableOn(color, LIGHT_BG), '--biz-text-dark': readableOn(color, DARK_CARD) } as CSSProperties;
}
