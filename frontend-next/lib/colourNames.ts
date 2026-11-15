/**
 * Colours people can pick by sight and name, no codes (owner, 15 Nov 2026:
 * "users have no idea of the colour code"). Eight families in four shades,
 * plus neutrals, and a namer that gives any colour a plain name (a template's
 * colour or one picked with the device's full colour picker).
 */

export interface NamedColour { hex: string; name: string; family: string; shade: 'light' | 'bright' | 'deep' | 'dark' | 'neutral' }

const FAMILIES: Array<{ family: string; shades: [string, string, string, string] }> = [
  { family: 'Red',    shades: ['#f87171', '#dc2626', '#b91c1c', '#7f1d1d'] },
  { family: 'Orange', shades: ['#fb923c', '#ea580c', '#c2410c', '#7c2d12'] },
  { family: 'Gold',   shades: ['#fbbf24', '#d97706', '#b45309', '#78350f'] },
  { family: 'Green',  shades: ['#4ade80', '#16a34a', '#15803d', '#14532d'] },
  { family: 'Teal',   shades: ['#2dd4bf', '#0d9488', '#0f766e', '#134e4a'] },
  { family: 'Blue',   shades: ['#60a5fa', '#2563eb', '#1d4ed8', '#1e3a8a'] },
  { family: 'Purple', shades: ['#a78bfa', '#7c3aed', '#6d28d9', '#4c1d95'] },
  { family: 'Pink',   shades: ['#f472b6', '#db2777', '#be185d', '#831843'] },
];
const SHADES = ['light', 'bright', 'deep', 'dark'] as const;
const SHADE_WORD: Record<(typeof SHADES)[number], string> = { light: 'Light', bright: '', deep: 'Deep', dark: 'Dark' };

export const COLOUR_PALETTE: NamedColour[] = [
  ...FAMILIES.flatMap(({ family, shades }) => shades.map((hex, i) => ({
    hex, family, shade: SHADES[i], name: [SHADE_WORD[SHADES[i]], family.toLowerCase()].filter(Boolean).join(' ').replace(/^(\w)/, (c) => c.toUpperCase()),
  }))),
  { hex: '#78716c', name: 'Stone', family: 'Neutral', shade: 'neutral' },
  { hex: '#475569', name: 'Slate', family: 'Neutral', shade: 'neutral' },
  { hex: '#1f2937', name: 'Charcoal', family: 'Neutral', shade: 'neutral' },
  { hex: '#000000', name: 'Black', family: 'Neutral', shade: 'neutral' },
];

const HEX6 = /^#?([0-9a-f]{6})$/i;

function rgb(hex: string): [number, number, number] | null {
  const m = HEX6.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** "Redmean" distance: cheap and close to how people see colour differences. */
function distance(a: [number, number, number], b: [number, number, number]): number {
  const r = (a[0] + b[0]) / 2;
  const [dr, dg, db] = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  return Math.sqrt((2 + r / 256) * dr * dr + 4 * dg * dg + (2 + (255 - r) / 256) * db * db);
}

/** The palette colour nearest to any colour; its name describes the colour in words. */
export function nearestColour(hex: string): NamedColour | null {
  const c = rgb(hex);
  if (!c) return null;
  let best: NamedColour | null = null; let bestD = Infinity;
  for (const p of COLOUR_PALETTE) {
    const d = distance(c, rgb(p.hex)!);
    if (d < bestD) { bestD = d; best = p; }
  }
  // Very light colours read as "White" or "Cream" rather than the nearest light shade.
  const lum = (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000;
  if (lum > 235) return { hex: hex.toLowerCase(), name: Math.max(...c) - Math.min(...c) > 12 ? 'Cream' : 'White', family: 'Neutral', shade: 'neutral' };
  return best;
}

/** Plain name for any colour, e.g. "Deep blue"; "Custom colour" if it cannot be read. */
export function colourName(hex: string): string {
  return nearestColour(hex)?.name ?? 'Custom colour';
}

export const isExactPaletteColour = (hex: string) => COLOUR_PALETTE.some((p) => p.hex === hex.trim().toLowerCase());
