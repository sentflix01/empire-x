/**
 * YouTube links in any common shape (watch, youtu.be, shorts, live, embed).
 * Used by the website's Video section and the feed Spotlight's Video tile.
 */
const ID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/))([\w-]{11})/;

/** The 11-character video id, or null when the link is not a YouTube video. */
export function youtubeId(raw: unknown): string | null {
  return ID.exec(String(raw ?? '').trim())?.[1] ?? null;
}

/** Privacy-friendly embed URL (youtube-nocookie.com, allowed by the CSP frame-src). */
export function youtubeEmbedUrl(raw: unknown): string | null {
  const id = youtubeId(raw);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

/** The video's thumbnail picture (any HTTPS image is allowed by the CSP img-src). */
export function youtubeThumbnail(raw: unknown): string | null {
  const id = youtubeId(raw);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
