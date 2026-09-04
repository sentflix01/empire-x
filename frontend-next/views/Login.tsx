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
  const dest = (returnTo && returnTo.startsWith('/')) ? returnTo : '/feed';

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const googleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    const tryRender = () => {
      if (disposed || !googleRef.current || googleReady) return false;
      const ok = renderGoogleSignInButton(googleRef.current, {
        width: Math.min(400, Math.max(280, googleRef.current.clientWidth || window.innerWidth - 64)),
        onSuccess: () => { window.location.href = dest; },
        onError: () => setError('Google sign-in failed. Please try email and password below.'),
      });
      if (ok) { setGoogleReady(true); setGoogleUnavailable(false); }
      return ok;
    };
    if (tryRender()) return;
    const t = window.setInterval(tryRender, 100);
    const to = window.setTimeout(() => {
      window.clearInterval(t);
      if (!disposed && !googleReady) setGoogleUnavailable(true);
    }, 5000);
    return () => { disposed = true; window.clearInterval(t); window.clearTimeout(to); };
  }, [googleReady, dest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      window.location.href = dest;
    } catch (err: unknown) {
      const e = err as { code?: string; status?: number; response?: { status?: number }; error?: string; message?: string };
      if (e?.code === 'email_not_verified') {
        window.location.href = `/register?verify=${encodeURIComponent(email.trim().toLowerCase())}`;
        return;
      }
      if (e?.status === 404 || e?.response?.status === 404) { window.location.href = '/404'; return; }
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
          <div className="flex h-10 items-center justify-center rounded-lg border border-input">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
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

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
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
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</> : 'Sign in'}
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
