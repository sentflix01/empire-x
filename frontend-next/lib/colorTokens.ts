/**
 * The colour system (audit F-046; docs/brand/COLOR_SYSTEM.md) for places that
 * cannot use Tailwind classes.
 *
 * - `token.*` are CSS values that follow light/dark mode. Use them in inline
 *   styles on DOM elements.
 * - `HEX.*` are the light-mode values for places that cannot read CSS
 *   variables: map libraries (SVG attributes), chart libraries, canvas and the
 *   server-rendered share image. `test/colorTokens.test.ts` keeps them equal
 *   to app/globals.css.
 *
 * Do not add new colours here without adding them to globals.css first.
 */
export const token = {
  primary: 'hsl(var(--primary))',
  primaryForeground: 'hsl(var(--primary-foreground))',
  primarySubtle: 'hsl(var(--primary-subtle))',
  brandSecondary: 'hsl(var(--brand-secondary))',
  brandSecondarySubtle: 'hsl(var(--brand-secondary-subtle))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
  rating: 'hsl(var(--rating))',
  muted: 'hsl(var(--muted-foreground))',
  border: 'hsl(var(--border))',
  inverse: 'hsl(var(--inverse))',
} as const;

export const HEX = {
  primary: '#2563eb',
  primarySubtle: '#eff6ff',
  brandSecondary: '#7c3aed',
  success: '#157a3a',
  warning: '#b45309',
  destructive: '#c81e1e',
  rating: '#d97706',
  muted: '#606876',
  border: '#dfe2e7',
  inverse: '#0f172a',
  white: '#ffffff',
} as const;

/**
 * Series colours for charts with several categories, in order. Distinct in
 * hue and lightness so neighbouring series stay apart for people with
 * red-green colour blindness; always pair them with labels or a legend.
 */
export const CHART_SERIES = [HEX.primary, HEX.brandSecondary, HEX.success, HEX.warning, HEX.destructive, HEX.muted] as const;

/** Personal and business identity colours (profile toggle, map markers). */
export const IDENTITY = {
  personal: { css: token.primary, hex: HEX.primary },
  business: { css: token.brandSecondary, hex: HEX.brandSecondary },
} as const;

/**
 * Layering scale for inline styles (audit F-046). Same values as the
 * --z-index-* tokens in app/globals.css, which Tailwind classes use
 * (z-modal, z-toast…); `test/colorTokens.test.ts` keeps them equal.
 */
export const Z = {
  raised: 10,
  overlay: 50,
  modal: 100,
  fullscreen: 200,
  toast: 500,
  splash: 1200,
  progress: 1300,
} as const;
