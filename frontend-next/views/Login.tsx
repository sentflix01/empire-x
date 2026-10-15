'use client';
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { auth } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/AuthLayout";
import { describeGoogleOAuthError, renderGoogleSignInButton } from "@/lib/googleAuth";
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/lib/AuthContext';
import { safeReturnPath } from '@/lib/safeReturnPath';

function Login() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { completeLogin } = useAuth();
  const returnTo = searchParams.get("return");
  const dest = safeReturnPath(returnTo);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const googleRef = useRef<HTMLDivElement | null>(null);

  const continueAfterLogin = useCallback(async (result: {
    onboarding_mode?: 'demo' | 'real' | null;
    is_demo?: boolean;
  }) => {
    if (result.is_demo) {
      setError('This legacy Demo login needs to be linked to a Real account before it can be used here.');
      return;
    }
    await completeLogin();
    router.replace(dest);
  }, [completeLogin, dest, router]);

  // Pre-warm the backend on login page load to prevent cold-start timeout
  // Render free tier sleeps after 15 min — this silent ping wakes it up
  // so the actual login call succeeds quickly instead of timing out
  useEffect(() => {
    const configuredApi = process.env.NEXT_PUBLIC_API_BASE_URL;
    const API = configuredApi || 'http://localhost:3001';
    let apiHost: string;
    try {
      apiHost = new URL(API).hostname.replace(/^\[|\]$/g, '');
    } catch {
      return;
    }

    // A local backend is already addressed by normal auth requests. Warming
    // it here creates noisy connection-refused errors when only the frontend
    // is running, and Strict Mode replays effects in development. Keep the
    // cold-start wake-up for explicitly configured remote APIs.
    if (!configuredApi || ['localhost', '127.0.0.1', '::1'].includes(apiHost)) return;

    fetch(`${API}/health`, { method: 'GET', signal: AbortSignal.timeout(55000) })
      .catch(() => {}); // fire-and-forget, ignore errors
  }, []);

  useEffect(() => {
    // renderGoogleSignInButton is synchronous — no GIS script dependency.
    // Render once on mount; no polling needed.
    if (!googleRef.current || googleReady) return;
    const ok = renderGoogleSignInButton(googleRef.current, {
      buttonText: 'signin_with',
      onSuccess: (result) => {
        void continueAfterLogin(result).catch((err: unknown) => {
          const e = err as { response?: { data?: { error?: string } }; message?: string };
          setError(e.response?.data?.error || e.message || 'Could not restore your saved account mode. Please try again.');
        });
      },
      onError: (err) => {
        if (err.message === 'Sign-in was cancelled.') return setError('');
        if (/invalid_client|oauth client was not found/i.test(err.message)) return setError(describeGoogleOAuthError(err.message));
        if (/active OAuth client|Google sign-in did not complete/i.test(err.message)) return setError(err.message);
        if (/popup.*closed|closed.*popup/i.test(err.message)) return setError('Sign-in popup was closed. Please try again.');
        if (/could not be verified/i.test(err.message)) return setError('Sign-in could not be verified. Check that the frontend and backend use the same Google OAuth client ID.');
        setError('Google sign-in failed. Please try email and password below.');
      },
    });
    if (ok) setGoogleReady(true);
    else setGoogleUnavailable(true);
  }, [continueAfterLogin, googleReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Show a "waking up" hint after 5s if backend is slow (cold start)
    const slowTimer = setTimeout(() => {
      setError('Server is waking up… this takes up to 30 seconds on first load. Please wait.');
    }, 5000);
    try {
      const result = await auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      clearTimeout(slowTimer);
      setError('');
      await continueAfterLogin(result as {
        onboarding_mode?: 'demo' | 'real' | null;
        is_demo?: boolean;
      });
    } catch (err: unknown) {
      clearTimeout(slowTimer);
      const e = err as { code?: string; status?: number; response?: { status?: number }; error?: string; message?: string; isTimeout?: boolean };
      if (e?.code === 'email_not_verified') {
        window.location.href = `/register?verify=${encodeURIComponent(email.trim().toLowerCase())}`;
        return;
      }
      if (e?.status === 404 || e?.response?.status === 404) { window.location.href = '/404'; return; }
      if (e?.isTimeout) {
        setError('Server is taking too long to respond. Please try again in a few seconds.');
        return;
      }
      setError(e?.error || e?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back to Nodbusiness"
      footer={
        <>
          Don&apos;t have an account?{' '}
      <Link href="/register" className="font-medium text-primary hover:underline">Create account</Link>
        </>
      }
    >
      {/* Google button */}
      <div className="mb-6">
        {!googleReady && !googleUnavailable && (
          <div className="flex h-10 items-center justify-center gap-2 rounded-lg border border-input text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Setting up Google Sign-In…</span>
          </div>
        )}
        {googleUnavailable && (
          <div role="status" className="rounded-lg border border-input px-3 py-2 text-center text-sm text-muted-foreground">
            Google sign-in is not configured for this environment. Use email and password.
          </div>
        )}
        <div ref={googleRef} className="flex min-h-10 w-full justify-center" aria-label="Sign in with Google" />
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">or</span>
        </div>
      </div>

      {/* Error / Info */}
      {error && (
        <div className={`mb-4 rounded-lg px-3 py-2.5 text-sm ${
          error.includes('waking') || error.includes('taking too long')
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
            : 'bg-destructive/10 text-destructive'
        }`}>
          {error.includes('waking') && '⏳ '}{error}
        </div>
      )}

      {/* Email/password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-10"
            required
            maxLength={254}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-10 pr-10"
              required
              maxLength={128}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{error.includes('waking') ? 'Waking server…' : 'Signing in…'}</> : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By signing in you agree to our{' '}
        <Link href="/service-agreement?tab=terms" className="underline hover:text-foreground">Terms</Link>
        {' '}and{' '}
        <Link href="/service-agreement?tab=privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return <ErrorBoundary><Suspense><Login /></Suspense></ErrorBoundary>;
}
