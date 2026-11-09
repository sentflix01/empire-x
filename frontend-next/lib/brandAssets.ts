/**
 * Logo and icon file addresses (docs/brand/BRAND_BOOK.md).
 *
 * When a logo file changes, give it a new name (bump the -vN suffix) and add
 * the old name to BRAND_RENAMES. Browsers, the old service worker and
 * installed apps keep copies under the old name; a new name is never in
 * those caches, so every visitor sees the new logo on the next page load.
 * Old names redirect (next.config.ts), so links elsewhere keep working.
 *
 * The SVGs are drawn by scripts/brand/build-logo.mjs; the PNG and ICO files
 * are rendered from them by scripts/brand/render-icons.mjs.
 */
export const BRAND = {
  /** Standard icon: light and dark backgrounds. */
  icon: '/brand/nodbusiness-icon-v3.svg',
  /** White ring around the disc: for blue backgrounds. */
  iconOnBlue: '/brand/nodbusiness-icon-on-blue-v3.svg',
  /** 24 px and below: bolder lines, larger boxes. */
  iconSmall: '/brand/nodbusiness-icon-small-v3.svg',
  iconOnBlueSmall: '/brand/nodbusiness-icon-on-blue-small-v3.svg',
  logo: '/brand/nodbusiness-logo-v3.svg',
  logoWhite: '/brand/nodbusiness-logo-white-v3.svg',
  /** 288 px re-encode of nodbusiness-intro.mp4; shown at 144 px at most. */
  introVideo: '/brand/nodbusiness-intro-288-v2.mp4',
  favicon: '/icons/nodbusiness-icon-v3.png',
  appIcon192: '/icons/icon-192-v3.png',
  appIcon512: '/icons/icon-512-v3.png',
} as const;

/** Earlier names → current file. */
export const BRAND_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ['/brand/nodbusiness-icon.svg', BRAND.icon],
  ['/brand/nodbusiness-icon-v2.webp', BRAND.icon],
  ['/brand/nodbusiness-logo.svg', BRAND.logo],
  ['/brand/nodbusiness-logo-v2.svg', BRAND.logo],
  ['/brand/nodbusiness_logo.svg', BRAND.logo],
  ['/brand/nodbusiness_logo_allcaps.svg', BRAND.logo],
  ['/brand/nodbusiness_logo_lowercase-o.svg', BRAND.logo],
  ['/brand/nodbusiness-logo-white.svg', BRAND.logoWhite],
  ['/brand/nodbusiness-logo-white-v2.svg', BRAND.logoWhite],
  ['/brand/nodbusiness-intro-288.mp4', BRAND.introVideo],
  ['/icons/nodbusiness-icon.svg', BRAND.favicon],
  ['/icons/nodbusiness-icon-v2.png', BRAND.favicon],
  ['/icons/icon-192.png', BRAND.appIcon192],
  ['/icons/icon-192-v2.png', BRAND.appIcon192],
  ['/icons/icon-512.png', BRAND.appIcon512],
  ['/icons/icon-512-v2.png', BRAND.appIcon512],
];
