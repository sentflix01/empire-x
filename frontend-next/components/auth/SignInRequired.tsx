'use client';
/**
 * Shown when the API answers 401 SIGN_IN_REQUIRED: the owner made this
 * business private, so only signed-in users can view it
 * (docs/decisions/platform-model-decisions.md §2 and §7). After signing in the
 * visitor comes back to the same page.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';

export const SIGN_IN_REQUIRED = 'SIGN_IN_REQUIRED';

/** True for an API error that means "sign in to see this". */
export function isSignInRequired(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { code?: unknown }).code === SIGN_IN_REQUIRED;
}

export default function SignInRequired({
  title = 'Sign in to view this business',
  message = 'The owner has made this business private. Sign in or create a free account to see it.',
}: { title?: string; message?: string }) {
  const returnTo = encodeURIComponent(usePathname() || '/');

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <h1 className="font-display text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Link href={`/login?return=${returnTo}`} className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Sign in
        </Link>
        <Link href={`/register?return=${returnTo}`} className="inline-flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-semibold hover:bg-secondary">
          Join free
        </Link>
      </div>
    </div>
  );
}
