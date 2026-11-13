import type { Metadata } from 'next';
import LandingContent from '@/components/landing/LandingContent';
import { BRAND } from '@/lib/brandAssets';
import { SHOWROOM_TEMPLATES } from '@/lib/showroomTemplates';

// Force dynamic rendering so Next.js serves this page from the server on
// every request. This ensures the Content-Security-Policy header set in
// next.config.ts (including 'unsafe-inline') is applied and not bypassed
// by Vercel's CDN static cache.
export const dynamic = 'force-dynamic';

const description =
  'Share your moments, build your showroom and buy or sell with anyone. People, creators and businesses connect, share and trade in one app.';

export const metadata: Metadata = {
  title: 'Nodbusiness: build, connect, share, buy and sell in one app',
  description,
  openGraph: {
    title: 'Nodbusiness: build, connect, share, buy and sell in one app',
    description,
    images: [BRAND.logo],
  },
};

/** The page itself is components/landing/LandingContent.tsx (translatable text). */
export default function LandingPage() {
  // Counted from the template registry so the page never states a number the product doesn't have.
  return <LandingContent templateCount={Object.keys(SHOWROOM_TEMPLATES).length} />;
}
