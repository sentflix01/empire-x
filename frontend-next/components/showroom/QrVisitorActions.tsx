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

export default function QrVisitorActions() {
  const { isAuthenticated, authChecked } = useAuth();
  if (!authChecked || isAuthenticated) return null;

  return (
    <nav aria-label="Visitor" className="mx-auto mb-4 flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href="/landing"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Landing
      </Link>
      <TryDemoButton />
    </nav>
  );
}
