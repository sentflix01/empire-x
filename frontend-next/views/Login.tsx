'use client';
import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { auth } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/AuthLayout";
import { renderGoogleSignInButton } from "@/lib/googleAuth";
import ErrorBoundary from '@/components/ErrorBoundary';

function Login() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return");
  const dest = (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) ? returnTo : '/feed';

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const googleRef = useRef<HTMLDivElement | null>(null);

  // Pre-warm the backend on login page load to prevent cold-start timeout
  // Render free tier sleeps after 15 min — this silent ping wakes it up
  // so the actual login call succeeds quickly instead of timing out
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    fetch(`${API}/health`, { method: 'GET', signal: AbortSignal.timeout(55000) })
      .catch(() => {}); // fire-and-forget, ignore errors
  }, []);

  useEffect(() => {
    // renderGoogleSignInButton is synchronous — no GIS script dependency.
    // Render once on mount; no polling needed.
    if (!googleRef.current || googleReady) return;
    const ok = renderGoogleSignInButton(googleRef.current, {
      buttonText: 'signin_with',
      onSuccess: async (_result) => {
        // Every account always goes to /choose-mode.
        window.location.href = '/choose-mode';
      },
      onError: (err) => setError(
        err.message === 'Sign-in was cancelled.'
          ? ''
          : 'Google sign-in failed. Please try email and password below.'
      ),
    });
    if (ok) setGoogleReady(true);
    else setGoogleUnavailable(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Show a "waking up" hint after 5s if backend is slow (cold start)
    const slowTimer = setTimeout(() => {
      setError('Server is waking up… this takes up to 30 seconds on first load. Please wait.');
    }, 5000);
    try {
      const loginResult = await auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      clearTimeout(slowTimer);
      setError('');
      // Every account — including is_demo — always goes to /choose-mode.
      window.location.href = '/choose-mode';
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
          <div className="flex h-10 items-center justify-center rounded-lg border border-input text-sm text-muted-foreground">
            Google Sign-In unavailable
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
