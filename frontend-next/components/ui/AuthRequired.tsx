'use client';
/**
 * AuthRequired — shown when a protected page gets a 401.
 * Gives users a clear path to log back in instead of a broken spinner.
 */
import Link from 'next/link';
import { Lock } from 'lucide-react';

interface AuthRequiredProps {
  message?: string;
  returnPath?: string;
}

export default function AuthRequired({ message = 'You need to sign in to view this page.', returnPath }: AuthRequiredProps) {
  const loginHref = returnPath ? `/login?return=${encodeURIComponent(returnPath)}` : '/login';
  const registerHref = returnPath ? `/register?return=${encodeURIComponent(returnPath)}` : '/register';
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] px-6 text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
        <Lock className="w-7 h-7 text-amber-600" />
      </div>
      <div>
        <h3 className="font-bold text-base mb-1">Sign in required</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      </div>
      <div className="flex gap-3 mt-2">
        <Link
          href={loginHref}
          className="h-10 px-6 rounded-xl bg-amber-500 text-white font-semibold text-sm flex items-center hover:bg-amber-600 transition-colors"
        >
          Sign In
        </Link>
        <Link
          href={registerHref}
          className="h-10 px-6 rounded-xl border border-border font-semibold text-sm flex items-center hover:bg-secondary/50 transition-colors"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}
