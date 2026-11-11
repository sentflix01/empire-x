/**
 * Wordless "how it works" promo videos (decision "Promo videos load when
 * visible", project-brain/DECISIONS.md). Rendered from
 * scripts/promo/scenes by scripts/promo/render.mjs.
 *
 * Each clip has a small and a large rendition, each an H.264 MP4 (plays in
 * every browser) with a WebP poster. When a clip changes, bump the -vN suffix
 * here and in the render script: browsers and the service worker keep the old
 * file under its old name.
 */
export type PromoRendition = {
  width: number;
  height: number;
  mp4: string;
  poster: string;
};

export type PromoClip = { small: PromoRendition; large: PromoRendition };

const rendition = (name: string, width: number, height: number): PromoRendition => {
  const base = `/promo/${name}-${width}x${height}-v1`;
  return { width, height, mp4: `${base}.mp4`, poster: `${base}-poster.webp` };
};

export const PROMO = {
  /** 10 s, 8:3: the feed's "Build Your Mini Website" banner. */
  banner: { small: rendition('banner', 640, 240), large: rendition('banner', 1280, 480) },
  /** 24 s, 9:16: the phone on the landing hero. */
  landing: { small: rendition('landing', 480, 854), large: rendition('landing', 720, 1280) },
} as const satisfies Record<string, PromoClip>;

/**
 * The smaller rendition that still covers the frame at this pixel density.
 * The frame is filled edge to edge (object-fit: cover), so the video must be
 * at least as wide as the frame, and as tall.
 */
export function pickRendition(clip: PromoClip, frameWidth: number, frameHeight: number, dpr = 1): PromoRendition {
  const ratio = clip.small.width / clip.small.height;
  const needed = Math.max(frameWidth, frameHeight * ratio) * dpr;
  return needed > clip.small.width ? clip.large : clip.small;
}

/** srcSet for the poster image, smallest first. */
export function posterSrcSet(clip: PromoClip): string {
  return `${clip.small.poster} ${clip.small.width}w, ${clip.large.poster} ${clip.large.width}w`;
}
