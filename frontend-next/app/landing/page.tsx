import type { Metadata } from 'next';
import LandingContent from '@/components/landing/LandingContent';
import { SHOWROOM_TEMPLATES } from '@/lib/showroomTemplates';

// Force dynamic rendering so Next.js serves this page from the server on
// every request. This ensures the Content-Security-Policy header set in
// next.config.ts (including 'unsafe-inline') is applied and not bypassed
// by Vercel's CDN static cache.
export const dynamic = 'force-dynamic';

const description =
  'Share your moments, build your showroom and buy or sell with anyone. People, creators and businesses connect, share and trade in one app.';

export const metadata: Metadata = {
  // absolute: the root template would add "| Nodbusiness" a second time.
  title: { absolute: 'Nodbusiness: build, connect, share, buy and sell in one app' },
  description,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Nodbusiness: build, connect, share, buy and sell in one app',
    description,
    // A 1200×630 raster card (many apps do not show SVG previews; NU-14).
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Nodbusiness' }],
  },
};

/** The page itself is components/landing/LandingContent.tsx (translatable text). */
export default function LandingPage() {
  // Counted from the template registry so the page never states a number the product doesn't have.
  return <LandingContent templateCount={Object.keys(SHOWROOM_TEMPLATES).length} />;
}
