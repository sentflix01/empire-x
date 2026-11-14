/**
 * Colours of the logo artwork itself, which must match the logo files that
 * scripts/brand/build-logo.mjs writes (public/brand/*-v3.svg). They are part
 * of the drawing, not interface colours, so they live here rather than in
 * lib/colorTokens.ts (this file is exempt in scripts/check-color-tokens.mjs).
 */
export const LOGO_COLORS = {
  /** Brand blue disc. */
  blue: '#2563eb',
  /** Globe face gradient, light centre to edge. */
  faceLight: '#5b8ff7',
  faceDark: '#2f6cf0',
} as const;
