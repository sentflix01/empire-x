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
  'Build your business showroom from ready templates or from scratch, change any part at any time with no code, then publish and sell. Customers book, buy and pay you directly.';

export const metadata: Metadata = {
  title: 'Nodbusiness: build, edit and sell from your own business showroom',
  description,
  openGraph: {
    title: 'Nodbusiness: build, edit and sell from your own business showroom',
    description,
    images: [BRAND.logo],
  },
};

/** The page itself is components/landing/LandingContent.tsx (translatable text). */
export default function LandingPage() {
  // Counted from the template registry so the page never states a number the product doesn't have.
  return <LandingContent templateCount={Object.keys(SHOWROOM_TEMPLATES).length} />;
}
