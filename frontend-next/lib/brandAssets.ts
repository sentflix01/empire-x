/**
 * Logo and icon file addresses (docs/brand/BRAND_BOOK.md).
 *
 * When a logo file changes, give it a new name (bump the -vN suffix) and add
 * the old name to BRAND_RENAMES. Browsers, the old service worker and
 * installed apps keep copies under the old name; a new name is never in
 * those caches, so every visitor sees the new logo on the next page load.
 * Old names redirect (next.config.ts), so links elsewhere keep working.
 */
export const BRAND = {
  /** Still of the intro video's last frame (scripts/brand/render-icons.mjs). */
  icon: '/brand/nodbusiness-icon-v2.webp',
  logo: '/brand/nodbusiness-logo-v2.svg',
  logoWhite: '/brand/nodbusiness-logo-white-v2.svg',
  /** 288 px re-encode of nodbusiness-intro.mp4; shown at 144 px at most. */
  introVideo: '/brand/nodbusiness-intro-288-v2.mp4',
  favicon: '/icons/nodbusiness-icon-v2.png',
  appIcon192: '/icons/icon-192-v2.png',
  appIcon512: '/icons/icon-512-v2.png',
} as const;

/** Earlier names → current file. */
export const BRAND_RENAMES: ReadonlyArray<readonly [string, string]> = [
  ['/brand/nodbusiness-icon.svg', BRAND.icon],
  ['/brand/nodbusiness-logo.svg', BRAND.logo],
  ['/brand/nodbusiness-logo-white.svg', BRAND.logoWhite],
  ['/brand/nodbusiness-intro-288.mp4', BRAND.introVideo],
  ['/icons/nodbusiness-icon.svg', BRAND.favicon],
  ['/icons/icon-192.png', BRAND.appIcon192],
  ['/icons/icon-512.png', BRAND.appIcon512],
];
