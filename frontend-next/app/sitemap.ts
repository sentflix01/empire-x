import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Core public routes. Dynamic entities (showrooms/products/profiles) are
// crawlable via their public URLs; add a DB-driven section when the site
// index grows beyond these landing routes.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/landing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/showrooms`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/register`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
