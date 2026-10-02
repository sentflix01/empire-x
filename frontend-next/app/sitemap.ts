import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface SitemapShowroom { slug: string | null; id: string; updated_at: string }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/landing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/showrooms`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/register`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const res = await fetch(`${API}/api/showrooms/sitemap-data`, {
      next: { revalidate: 3600 },
      headers: { 'X-Real-Only': '1' },
    });
    if (res.ok) {
      const showrooms: SitemapShowroom[] = await res.json();
      const showroomRoutes = showrooms.map((s) => ({
        url: s.slug ? `${BASE}/showroom/${s.slug}` : `${BASE}/showrooms/${s.id}`,
        lastModified: new Date(s.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
      return [...staticRoutes, ...showroomRoutes];
    }
  } catch {
    // Fallback to static routes if API is unreachable
  }

  return staticRoutes;
}
