'use client';
/**
 * app/offline/page.tsx — Shown by the service worker when navigation fails
 * due to no network connection.
 *
 * The service worker (public/sw.js) falls back to cache; if the cache misses
 * too, it serves this page from the pre-cached shell.
 */
import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';

export default function OfflinePage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-6 text-center">
      <BrandLogo className="w-16 h-16 mb-6 text-primary" size={64} label="Nodbusiness" />

      <h1 className="text-2xl font-bold mb-2">You&apos;re offline</h1>
      <p className="text-muted-foreground mb-8 max-w-xs">
        Check your internet connection and try again. Any unsaved changes are safe.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>

      <Link
        href="/feed"
        className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
      >
        Go to home
      </Link>
    </div>
  );
}
