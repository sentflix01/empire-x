'use client';
import React, { Suspense, useState, useEffect, useRef } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { auth } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { renderGoogleSignInButton } from "@/lib/googleAuth";
import { useTranslation } from "react-i18next";
import ErrorBoundary from '@/components/ErrorBoundary';

function Login() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  // Render the real GIS button with retry + 5-second timeout.
  // Identical pattern to Register.tsx — no window.__googleSignIn coupling.
  useEffect(() => {
    let disposed = false;

    const renderButton = () => {
      if (disposed || !googleButtonRef.current || googleButtonReady) return false;
      const dest = (returnTo && returnTo.startsWith('/')) ? returnTo : '/feed';
      const rendered = renderGoogleSignInButton(googleButtonRef.current, {
        width: Math.min(384, Math.max(280, (googleButtonRef.current?.clientWidth || window.innerWidth - 64) || 384)),
        onSuccess: () => { window.location.href = dest; },
        onError: (err) => {
          const msg = err?.message ?? '';
          if (msg.includes('could not be verified') || msg.includes('not configured')) {
            setError(msg);
          } else if (msg.includes('popup') || msg.includes('closed')) {
            setError('Sign-in popup was closed. Please try again.');
          } else if (msg.includes('network') || msg.includes('Network')) {
            setError('Network error during Google sign-in. Please check your connection.');
          } else {
            setError('Google sign-in failed. Please try again or use email/password below.');
          }
        },
      });
      if (rendered) {
        setGoogleButtonReady(true);
        setGoogleUnavailable(false);
      }
      return rendered;
    };

    if (renderButton()) return;
    const retryTimer = window.setInterval(renderButton, 100);
    const timeoutTimer = window.setTimeout(() => {
      window.clearInterval(retryTimer);
      if (!disposed && !googleButtonReady) setGoogleUnavailable(true);
    }, 5000);

    return () => {
      disposed = true;
      window.clearInterval(retryTimer);
      window.clearTimeout(timeoutTimer);
    };
  }, [googleButtonReady, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      const dest = (returnTo && returnTo.startsWith('/')) ? returnTo : '/feed';
      window.location.href = dest;
    } catch (err: any) {
      if (err?.code === 'email_not_verified') {
        window.location.href = `/register?verify=${encodeURIComponent(email.trim().toLowerCase())}`;
        return;
      }
      if (err?.status === 404 || err?.response?.status === 404) {
        window.location.href = '/404';
        return;
      }
      setError(err.error || err.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            {t('auth.createOne')}
          </Link>
        </>
      }
    >
      {/* GIS-rendered button — same pattern as Register.tsx */}
      <div
        ref={googleButtonRef}
        className="mb-2 flex min-h-11 w-full justify-center"
        aria-label={t('auth.continueWithGoogle')}
      />
      {!googleButtonReady && !googleUnavailable && (
        <p className="mb-4 text-center text-xs text-muted-foreground">Setting up Google Sign-In…</p>
      )}
      {googleUnavailable && (
        <p className="mb-4 text-center text-xs text-muted-foreground">
          Google Sign-In unavailable. Use email and password below.
        </p>
      )}

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">{t('auth.or')}</span>
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
          <p><strong>{t('auth.devLoginHint')}</strong> admin@nodbusiness.app / Admin1234!</p>
          <p>Test user: test@nodbusiness.app / Test1234!</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
              maxLength={254}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-12"
              required
              maxLength={128}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('auth.loggingIn')}</>
            : t('auth.login')}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return <ErrorBoundary><Suspense><Login /></Suspense></ErrorBoundary>;
}
