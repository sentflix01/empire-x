'use client';
/**
 * Actions for a signed-out visitor who opened a business page from a QR code
 * or shared link (docs/decisions/platform-model-decisions.md, decision 11):
 * go to the landing page, or start Demo practice. The page itself always
 * shows Real content; Demo is reached only through Try Demo.
 */
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TryDemoButton from '@/components/landing/TryDemoButton';
import { useAuth } from '@/lib/AuthContext';

/**
 * likelyGuest: the server saw no sign-in hint cookie (nb_auth), so the bar is
 * in the first HTML instead of appearing above the page once the sign-in check
 * finishes, which pushed the whole page down (CLS 0.13, performance audit
 * 2026-11-09). Without the hint it still waits for the check.
 */
export default function QrVisitorActions({ likelyGuest = false }: { likelyGuest?: boolean }) {
  const { isAuthenticated, authChecked } = useAuth();
  if (isAuthenticated || (!authChecked && !likelyGuest)) return null;

  return (
    <nav aria-label="Visitor" className="mx-auto mb-4 flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href="/landing"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-6 text-sm font-semibold text-foreground transition hover:bg-secondary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Landing
      </Link>
      <TryDemoButton />
    </nav>
  );
}
