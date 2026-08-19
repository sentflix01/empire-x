// @ts-nocheck
'use client';
import React, { useEffect, useRef, useState } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import client, { storeToken } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, Gift, CheckSquare, Square, Shield, FileText } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import { toast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import { renderGoogleSignInButton } from "@/lib/googleAuth";
import ErrorBoundary from '@/components/ErrorBoundary';

function Register() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const verificationEmail = searchParams.get("verify")?.trim().toLowerCase() || "";
  const { t } = useTranslation();

  const [email, setEmail] = useState(verificationEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [showOtp, setShowOtp] = useState(Boolean(verificationEmail));
  const [otpCode, setOtpCode] = useState("");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;

    const renderGoogleButton = () => {
      if (disposed || !googleButtonRef.current || googleButtonReady) return false;
      const rendered = renderGoogleSignInButton(googleButtonRef.current, {
        width: Math.min(384, Math.max(280, (googleButtonRef.current?.clientWidth || window.innerWidth - 64) || 384)),
        onSuccess: (result) => {
          if (result?.access_token) storeToken(result.access_token);
          window.location.href = '/';
        },
        onError: () => {
          setGoogleLoading(false);
          setError('Google Sign-In could not be completed. Please try again or register with email and password.');
        },
      });
      if (rendered) {
        setGoogleButtonReady(true);
        setGoogleUnavailable(false);
      }
      return rendered;
    };

    if (renderGoogleButton()) return;
    const retryTimer = window.setInterval(renderGoogleButton, 100);
    const timeoutTimer = window.setTimeout(() => {
      window.clearInterval(retryTimer);
      if (!disposed && !googleButtonReady) setGoogleUnavailable(true);
    }, 5000);

    return () => {
      disposed = true;
      window.clearInterval(retryTimer);
      window.clearTimeout(timeoutTimer);
    };
  }, [googleButtonReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!agreed) {
      setError("You must agree to the Terms of Service and Privacy Policy to create an account.");
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await client.post('/api/auth/register', { email: normalizedEmail, password });
      setEmail(normalizedEmail);
      setShowOtp(true);
    } catch (err) {
      // ADMIN_ONLY_MODE: 404 from backend → redirect to 404 page silently
      if (err?.status === 404 || err?.response?.status === 404) {
        window.location.href = '/404';
        return;
      }
      setError(err.error || err.message || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await client.post('/api/auth/verify-otp', { email, otpCode });
      if (result?.data?.access_token) {
        storeToken(result.data.access_token);
      }
      if (refCode) {
        try {
          await client.post('/api/referral/apply', { code: refCode });
        } catch {
          // Silently ignore — referral errors shouldn't block registration
        }
      }
      window.location.href = "/onboarding";
    } catch (err) {
      setError(err.error || err.message || t('auth.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await client.post('/api/auth/resend-otp', { email });
      toast({ title: t('auth.codeSentTitle'), description: t('auth.codeSentDesc') });
    } catch (err) {
      setError(err.error || err.message || t('auth.failedResend'));
    }
  };

  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title={t('auth.verifyEmail')} subtitle={`${t('auth.otpSent')} ${email}`}>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
        <div className="flex flex-col items-center gap-2 mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
              <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          <p className="text-xs text-muted-foreground md:hidden">Tap to enter code</p>
        </div>
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('auth.verifying')}</> : t('auth.verify')}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('auth.didntReceive')}{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">{t('auth.resend')}</button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.hasAccount')}{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">{t('auth.login')}</Link>
        </>
      }
    >
      <div ref={googleButtonRef} className="mb-6 flex min-h-11 w-full justify-center" aria-label={t('auth.continueWithGoogle')} />
      {!googleButtonReady && !googleUnavailable && (
        <p className="mb-6 -mt-4 text-center text-xs text-muted-foreground">Loading Google Sign-In…</p>
      )}
      {googleUnavailable && (
        <p className="mb-6 -mt-4 text-center text-xs text-muted-foreground">
          Google Sign-In is unavailable on this browser. You can still create an account with email and password below.
        </p>
      )}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">{t('auth.or')}</span>
        </div>
      </div>
      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      {refCode && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('auth.referralApplied', { code: refCode })}
          </p>
        </div>
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
          <Label htmlFor="password">{t('auth.password')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t('auth.confirmPassword')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        {/* ── Agreement checkbox ── comes BEFORE submit so iOS keyboard "Go" triggers submit */}
        <div>
          <button
            type="button"
            onClick={() => setAgreed(v => !v)}
            className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
              agreed
                ? 'border-primary/50 bg-primary/5'
                : 'border-border/60 bg-secondary/30 hover:border-primary/30'
            }`}
          >
            <div className={`mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${agreed ? 'bg-primary' : 'border-2 border-muted-foreground/40'}`}>
              {agreed && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              I agree to Nodbusiness's{' '}
              <Link
                href="/service-agreement?tab=terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-primary font-semibold hover:underline"
              >
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link
                href="/service-agreement?tab=privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-primary font-semibold hover:underline"
              >
                Privacy Policy
              </Link>
              . I confirm I am at least 18 years old.
            </p>
          </button>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !agreed}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('auth.creatingAccount')}</> : t('auth.register')}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return <ErrorBoundary><Register /></ErrorBoundary>;
}
