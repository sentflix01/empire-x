/**
 * lib/sharePreview.ts — Server-side link-preview metadata for shared pages.
 *
 * Reads /api/share-preview (public fields only, no view counting) so links to
 * a business site or product unfurl on other apps with the right name,
 * description and image. Falls back to the site defaults when the API is slow
 * or the item is not public.
 */
import type { Metadata } from 'next';

type Preview = { title?: string | null; description?: string | null; image?: string | null; price?: number | null; currency?: string | null };

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

async function loadPreview(path: string): Promise<Preview | null> {
  try {
    const res = await fetch(`${API_BASE}/api/share-preview/${path}`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Preview;
  } catch {
    return null;
  }
}

function build(preview: Preview | null, pathname: string, fallbackTitle: string, extraDescription?: string): Metadata {
  if (!preview?.title) return { title: fallbackTitle };
  const description = [extraDescription, preview.description].filter(Boolean).join(' · ') || 'On Nodbusiness';
  const images = preview.image ? [preview.image] : undefined;
  return {
    title: preview.title,
    description,
    alternates: { canonical: pathname },
    openGraph: { title: preview.title, description, url: pathname, type: 'website', siteName: 'Nodbusiness', ...(images ? { images } : {}) },
    twitter: { card: images ? 'summary_large_image' : 'summary', title: preview.title, description, ...(images ? { images } : {}) },
  };
}

export async function showroomMetadata(slug: string): Promise<Metadata> {
  const preview = await loadPreview(`showroom/${encodeURIComponent(slug)}`);
  return build(preview, `/showroom/${encodeURIComponent(slug)}`, 'Business on Nodbusiness');
}

export async function productMetadata(id: string): Promise<Metadata> {
  const preview = await loadPreview(`product/${encodeURIComponent(id)}`);
  const price = preview?.price != null ? `${preview.price.toLocaleString('en-US')} ${preview.currency ?? 'ETB'}` : undefined;
  return build(preview, `/products/${encodeURIComponent(id)}`, 'Product on Nodbusiness', price);
}
