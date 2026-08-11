// @ts-nocheck
'use client';
import React, { useState } from "react";
import Link from 'next/link';
import { auth } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { useTranslation } from "react-i18next";
import ErrorBoundary from '@/components/ErrorBoundary';

function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      window.location.href = "/feed";
    } catch (err) {
      if (err?.code === 'email_not_verified') {
        window.location.href = `/register?verify=${encodeURIComponent(email.trim().toLowerCase())}`;
        return;
      }
      // ADMIN_ONLY_MODE: 404 from backend → redirect to 404 page
      if (err?.status === 404 || err?.response?.status === 404) {
        window.location.href = '/404';
        return;
      }
      setError(err.error || err.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const g = (window as any).__googleSignIn;
      if (!g) {
        throw new Error("Google Sign-In is not ready. Please wait a moment and try again, or use email/password below.");
      }
      await g();
      window.location.href = "/feed";
    } catch (err: any) {
      // Show a helpful message instead of silently failing
      const msg = err?.message || "";
      if (msg.includes("not available") || msg.includes("not ready")) {
        setError(msg);
      } else if (msg.includes("popup") || msg.includes("closed")) {
        setError("Sign-in popup was closed. Please try again.");
      } else if (msg.includes("network") || msg.includes("Network")) {
        setError("Network error during Google sign-in. Please check your connection.");
      } else {
        setError("Google sign-in failed. Please try again or use email/password below.");
      }
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
      <Button variant="outline" className="w-full h-12 text-sm font-medium mb-6" onClick={handleGoogle} disabled={loading}>
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in with Google...</>
        ) : (
          <><GoogleIcon className="w-5 h-5 mr-2" />{t('auth.continueWithGoogle')}</>
        )}
      </Button>

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
          <p><strong>{t('auth.devLoginHint')}</strong> admin@empirex.app / Admin1234!</p>
          <p>Test user: test@empirex.app / Test1234!</p>
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
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
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
            <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('auth.loggingIn')}</>
          ) : t('auth.login')}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return <ErrorBoundary><Login /></ErrorBoundary>;
}
